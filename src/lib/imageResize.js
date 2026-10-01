// src/lib/imageResize.js — one source of truth for "an image is small enough to send".
//
// WHY THIS EXISTS. Three upload paths (handleImageUpload, handleAnalyzerImageUpload,
// handleChartFileFallback) read a File with FileReader.readAsDataURL and POSTed the
// raw bytes to /api/ocr. A modern Android screenshot is routinely 8–12MB, and the
// endpoint caps the payload at 6MB — so the request came back 400 image_too_large,
// the catch set status:"error", and the trader saw a generic failure with no way to
// know that RESIZING would have fixed it. The screen-capture path (grabChartFrame)
// had the resize logic and worked; the three file paths did not. Same feature, two
// behaviours, decided by which button was pressed.
//
// THE SPLIT IS DELIBERATE. canvas does not exist in node, so a monolithic
// "resize this file" function could only ever be checked by matching source text.
// The arithmetic — the aspect-ratio math and the base64 ratio — is where a silent
// regression actually hides (an off-by-one in the ratio, a Math.round in the wrong
// direction, a cap compared before the encode instead of after). So it lives in
// fitDimensions and exceedsCap, which are pure and are asserted by RUNNING them in
// scripts/capability-guard-test.mjs. Only the canvas orchestration is source-checked.
//
// grabChartFrame imports the four constants from here rather than holding its own
// copies. Its parameters, flow and output are unchanged — this is deduplication of
// literals, not a refactor. CLAUDE.md §13 (מקור-אמת-אחד): the same cap written in
// two places is the drift the rule exists to prevent.

// The longest edge any image is allowed to keep. 2000px is what grabChartFrame has
// used since the capture path shipped; Vision gains nothing above it.
export const MAX_EDGE_PX = 2000;

// /api/ocr rejects payloads above this. Compared against DECODED bytes, not the
// data-URL length — see exceedsCap.
export const OCR_CAP_BYTES = 6 * 1024 * 1024;

// First encode quality, and the retry used only when the first result still exceeds
// the cap. Both frozen from grabChartFrame.
export const Q_PRIMARY = 0.92;
export const Q_FALLBACK = 0.8;

/**
 * Scale (w,h) down so the longest edge is at most `max`, preserving aspect ratio.
 * Never scales UP: an image already within the cap is returned untouched, so a
 * small chart screenshot is not resampled for nothing.
 */
export function fitDimensions(w, h, max = MAX_EDGE_PX) {
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) {
    throw new Error("empty_frame");
  }
  const longest = Math.max(w, h);
  if (longest <= max) return { w: Math.round(w), h: Math.round(h) };
  const scale = max / longest;
  return {
    // Math.max(1, …) guards the degenerate case of an extreme aspect ratio, where
    // the short edge would otherwise round to 0 and produce a zero-area canvas.
    w: Math.max(1, Math.round(w * scale)),
    h: Math.max(1, Math.round(h * scale)),
  };
}

/**
 * Does this data-URL exceed the server cap once decoded?
 *
 * base64 encodes 3 bytes as 4 characters, so decoded ≈ length × 3/4. Using the
 * raw string length here would over-estimate by a third and trigger a needless
 * second encode on images that were already fine.
 */
export function exceedsCap(dataURLLength, capBytes = OCR_CAP_BYTES) {
  if (!Number.isFinite(dataURLLength) || dataURLLength < 0) return false;
  return dataURLLength * 0.75 > capBytes;
}

/**
 * Read a File, scale it to MAX_EDGE_PX, and return a JPEG data-URL under the cap.
 *
 * REJECTS rather than falling back to the raw file. Sending raw is the bug this
 * module exists to remove, so a fallback to it would reproduce the failure in
 * exactly the case where it is most likely. Callers surface the rejection as their
 * existing status:"error", which is visible to the trader.
 */
export function fileToResizedDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error("no_file")); return; }
    if (typeof FileReader === "undefined" || typeof document === "undefined") {
      reject(new Error("unsupported_environment"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode_failed"));
      img.onload = () => {
        try {
          const { w, h } = fitDimensions(img.naturalWidth, img.naturalHeight);
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          let dataURL = canvas.toDataURL("image/jpeg", Q_PRIMARY);
          if (exceedsCap(dataURL.length)) {
            dataURL = canvas.toDataURL("image/jpeg", Q_FALLBACK);
          }
          resolve(dataURL);
        } catch (e) {
          reject(e instanceof Error ? e : new Error("resize_failed"));
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// STORED IMAGES — an image that is KEPT (localStorage mirror + settings blob), not SENT.
//
// WHY A SECOND PROFILE. `fileToResizedDataURL` above is sized for /api/ocr (6MB). A kept
// image lands in localStorage, whose quota is ~5.2M characters PER ORIGIN and is shared
// with the trades cache — and the playbook is written there TWICE (swingEdgePlaybook +
// the swingEdgeSettings mirror). Measured 01.10 (B-015): a 3.9MB screenshot still came out
// of the OCR profile at 1.0MB, so five setups filled the origin and the sixth vanished on
// reload with no message. The decision (Niv, 01.10, D3): 1400px · q.7 · cap 200KB ·
// fallback 1000px/.55 · ABOVE THE CAP = REJECT. Rejecting is deliberate: a fallback to
// the raw file is the very bug this profile removes.
export const STORED_MAX_EDGE_PX = 1400;
export const STORED_Q_PRIMARY = 0.7;
export const STORED_FALLBACK_EDGE_PX = 1000;
export const STORED_Q_FALLBACK = 0.55;
export const STORED_CAP_BYTES = 200 * 1024;

export const STORED_LADDER = [
  { edge: STORED_MAX_EDGE_PX, quality: STORED_Q_PRIMARY },
  { edge: STORED_FALLBACK_EDGE_PX, quality: STORED_Q_FALLBACK },
];

/**
 * Walk the ladder and return the first encoding under STORED_CAP_BYTES; throw when none fits.
 * `encode(edge, quality)` is injected so the DECISION is runnable in node (no canvas there) —
 * the same split as fitDimensions/exceedsCap above.
 */
export function chooseStoredEncoding(encode) {
  for (const { edge, quality } of STORED_LADDER) {
    const url = encode(edge, quality);
    if (typeof url === "string" && !exceedsCap(url.length, STORED_CAP_BYTES)) return url;
  }
  throw new Error("image_too_large_for_storage");
}

/** Read a File and return a JPEG data-URL ≤ STORED_CAP_BYTES, or REJECT (never the raw file). */
export function fileToStoredDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!file) { reject(new Error("no_file")); return; }
    if (typeof FileReader === "undefined" || typeof document === "undefined") {
      reject(new Error("unsupported_environment"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode_failed"));
      img.onload = () => {
        try {
          resolve(chooseStoredEncoding((edge, quality) => {
            const { w, h } = fitDimensions(img.naturalWidth, img.naturalHeight, edge);
            const canvas = document.createElement("canvas");
            canvas.width = w;
            canvas.height = h;
            canvas.getContext("2d").drawImage(img, 0, 0, w, h);
            return canvas.toDataURL("image/jpeg", quality);
          }));
        } catch (e) {
          reject(e instanceof Error ? e : new Error("resize_failed"));
        }
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}
