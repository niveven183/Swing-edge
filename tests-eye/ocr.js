// tests-eye/ocr.js — the readability PROXY for C-064 ⓓ: "are the axis prices still legible
// after the stored profile?". OCR stands in for the eye; that gap is registered (DECISIONS
// 04.10), ⛔ hidden.
//
// THE PREPROCESSING IS FROZEN AND IDENTICAL FOR EVERY ARM (measured 04.10 — plan §0③):
//   raw OCR over the whole chart read 0/8 EVEN ON THE ORIGINAL, so some preprocessing is
//   unavoidable. What keeps it honest is that it is fixed BEFORE any measurement and applied
//   the same way to the original (control), the stored image (treatment) and the mutant:
//     crop the price-axis strip in SOURCE-relative coordinates · rescale to 3× source size ·
//     invert + grayscale · tesseract PSM 11 · whitelist 0-9 and '.'.
//   Rescaling to the SOURCE size is what a person does when they pinch-zoom the stored image
//   on the phone: it cannot restore detail that the profile threw away.
//
// ⛔ Do not tune any of these per arm, and ⛔ never after seeing a red — that is softening a
// threshold to make a red go away (prompt §8).
//
// Runs in Chromium regardless of the device under test: WebKit has no `ctx.filter`, and the
// proxy must measure the IMAGE, ⛔ the engine doing the measuring.

import { chromium } from "@playwright/test";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import Tesseract from "tesseract.js";

const require = createRequire(import.meta.url);
const LANG_PATH = join(dirname(require.resolve("@tesseract.js-data/eng/package.json")), "4.0.0_best_int");
const SCALE = 3;

let browser = null;
let worker = null;

async function prep(dataUrl, meta) {
  if (!browser) browser = await chromium.launch(process.env.EYE_CHROMIUM ? { executablePath: process.env.EYE_CHROMIUM } : {});
  const page = await browser.newPage();
  try {
    const png = await page.evaluate(async ({ dataUrl, meta, SCALE }) => {
      const im = new Image();
      im.src = dataUrl;
      await im.decode();
      const fx = im.naturalWidth / meta.w;
      const fy = im.naturalHeight / meta.h;
      const c = document.createElement("canvas");
      c.width = meta.strip.w * SCALE;
      c.height = meta.h * SCALE;
      const g = c.getContext("2d");
      g.imageSmoothingQuality = "high";
      g.filter = "invert(1) grayscale(1)";
      g.drawImage(im, meta.strip.x * fx, 0, meta.strip.w * fx, meta.h * fy, 0, 0, c.width, c.height);
      return { url: c.toDataURL("image/png"), natural: [im.naturalWidth, im.naturalHeight] };
    }, { dataUrl, meta, SCALE });
    return png;
  } finally {
    await page.close();
  }
}

/**
 * Read the axis prices out of an image. Returns { hits, of, found[], missing[], text, natural }.
 * `hits` counts EXACT string matches of the known prices — "199.68" for "199.65" is a miss.
 */
export async function readPrices(dataUrl, meta) {
  const { url, natural } = await prep(dataUrl, meta);
  if (!worker) {
    worker = await Tesseract.createWorker("eng", 1, { langPath: LANG_PATH, gzip: true, cacheMethod: "none" });
    await worker.setParameters({ tessedit_char_whitelist: "0123456789.", tessedit_pageseg_mode: "11" });
  }
  const { data } = await worker.recognize(Buffer.from(url.split(",")[1], "base64"));
  const tokens = data.text.split(/\s+/).filter(Boolean);
  const found = meta.prices.filter((p) => tokens.includes(p));
  return {
    hits: found.length,
    of: meta.prices.length,
    found,
    missing: meta.prices.filter((p) => !found.includes(p)),
    text: tokens.join(" "),
    natural,
  };
}

export async function closeOcr() {
  if (worker) await worker.terminate();
  if (browser) await browser.close();
  worker = null;
  browser = null;
}
