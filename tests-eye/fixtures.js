// tests-eye/fixtures.js — deterministic image fixtures for C-064, generated at run time.
//
// ⛔ No binary fixture is committed: every byte is produced here from a fixed seed, so
// what the test uploads is reviewable as code and identical on every run (the sha256 of
// each file is printed and lands in the evidence manifest).
//
// Generated ONCE per run in Chromium (globalSetup) and uploaded byte-identically by both
// devices — WebKit has no `ctx.filter` and renders text differently, so generating per
// device would make the two arms measure two different inputs.
//
// MEASURED CALIBRATION (04.10, docs/plans/PLAN-2026-10-04-c064-eye-auto.md §0):
//   · F1 = gradient + noise ±20 at 4032×3024. Full-range noise (F1x) comes out of the
//     stored profile at 657KB / 249KB — ABOVE the 200KB cap on both rungs — so it is
//     REJECTED by design. A "photo" made of pure noise would turn step a red because of
//     the fixture, ⛔ the product; it is used in step c as the rejection path instead.
//   · F2 axis labels at 33px = an ~11pt label on a 3× phone (Niv, 04.10). 13px (F2s)
//     is the stress row, F2b is a 1920×1080 desktop screenshot with 12px labels.

import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { STORED_LADDER, STORED_CAP_BYTES } from "../src/lib/imageResize.js";

export const FIXTURE_DIR = join(process.cwd(), "eye-evidence", "fixtures");
export const MIN_PHOTO_BYTES = 3.5 * 1024 * 1024;

// Eight known axis labels. ⛔ round numbers only: a mix of digit shapes (1/4/7, 3/8, 5/6/9)
// is what makes the read discriminating.
export const PRICES = ["184.25", "186.50", "188.75", "191.10", "193.40", "195.85", "197.20", "199.65"];
export const PRICES_B = ["412.35", "415.80", "419.15", "422.60", "426.05", "429.40", "433.95", "437.70"];

const CHARTS = {
  F2: { w: 1170, h: 2532, font: 33, prices: PRICES, gate: true },
  F2s: { w: 1170, h: 2532, font: 13, prices: PRICES, gate: false },
  F2b: { w: 1920, h: 1080, font: 12, prices: PRICES_B, gate: false },
};

/** The price-axis strip of a chart, in SOURCE pixels. OCR crops it relative to the source size. */
export const stripOf = ({ w, font }) => {
  const sw = Math.max(150, Math.round(font * 7));
  return { x: w - sw, w: sw };
};

// Runs inside the browser. Pure function of its arguments (seeded LCG).
function generateInPage({ charts, photoSeeds, ladder }) {
  const lcg = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32); };
  const toB64 = (c, type, q) => c.toDataURL(type, q).split(",")[1];
  const out = {};

  const photo = (seed, amp) => {
    const r = lcg(seed);
    const W = 4032, H = 3024, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d"), im = g.createImageData(W, H), d = im.data;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, base = [(x / W) * 200, (y / H) * 180, 120 + seed * 10];
      for (let k = 0; k < 3; k++) d[i + k] = Math.max(0, Math.min(255, base[k] + (r() - 0.5) * amp));
      d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    return toB64(c, "image/jpeg", 0.95);
  };
  for (const s of photoSeeds) out[`F1_${s}`] = photo(s, 40);

  // F1x — must stay ABOVE the cap after downscaling, on every rung. Per-pixel noise does
  // NOT: the downscale averages it into flat grey (measured 04.10: a first F1x was accepted).
  // Random colour BLOCKS of 6px survive a 1400/1000px downscale as ~2px random detail, which
  // JPEG cannot compress. The contract is MEASURED below with the real ladder numbers.
  {
    const r = lcg(99), W = 4032, H = 3024, B = 6, c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    for (let y = 0; y < H; y += B) for (let x = 0; x < W; x += B) {
      g.fillStyle = `rgb(${(r() * 256) | 0},${(r() * 256) | 0},${(r() * 256) | 0})`;
      g.fillRect(x, y, B, B);
    }
    out.F1x = toB64(c, "image/jpeg", 0.95);
    out.__F1xRungs = ladder.map(({ edge, quality }) => {
      const s = Math.min(1, edge / Math.max(W, H)), k = document.createElement("canvas");
      k.width = Math.round(W * s); k.height = Math.round(H * s);
      k.getContext("2d").drawImage(c, 0, 0, k.width, k.height);
      return Math.round(k.toDataURL("image/jpeg", quality).length * 0.75);
    });
  }

  for (const [name, { w: W, h: H, font, prices, strip }] of Object.entries(charts)) {
    const r = lcg(42);
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const g = c.getContext("2d");
    g.fillStyle = "#0b0f14"; g.fillRect(0, 0, W, H);
    g.strokeStyle = "#1c2430";
    for (let i = 0; i < 20; i++) { const y = (H / 22) * (i + 1); g.beginPath(); g.moveTo(0, y); g.lineTo(strip.x, y); g.stroke(); }
    let y = H / 2;
    for (let x = 20; x < strip.x - 20; x += 14) {
      const o = y, cl = y + (r() - 0.5) * (H / 40);
      g.fillStyle = cl < o ? "#26a69a" : "#ef5350";
      g.fillRect(x, Math.min(o, cl), 9, Math.abs(cl - o) + 2);
      y = Math.max(H * 0.1, Math.min(H * 0.9, cl));
    }
    g.font = `${font}px sans-serif`; g.fillStyle = "#b2b5be";
    const top = H * 0.1, step = (H * 0.8) / (prices.length - 1);
    prices.slice().reverse().forEach((t, i) => g.fillText(t, strip.x + 10, top + i * step));
    out[name] = toB64(c, "image/png");
  }
  return out;
}

/** globalSetup entry: generate, check the fixture contract, write files + manifest. */
export async function generateFixtures(browser) {
  const page = await browser.newPage();
  const charts = Object.fromEntries(Object.entries(CHARTS).map(([k, v]) => [k, { ...v, strip: stripOf(v) }]));
  const b64 = await page.evaluate(generateInPage, { charts, photoSeeds: [1, 2, 3, 4, 5], ladder: STORED_LADDER });
  await page.close();
  const rungs = b64.__F1xRungs;
  delete b64.__F1xRungs;
  console.log(`[fixtures] F1x on the stored ladder: ${rungs.map((b, i) => `${STORED_LADDER[i].edge}px/${STORED_LADDER[i].quality} → ${b} B`).join(" · ")} (cap ${STORED_CAP_BYTES})`);
  if (!rungs.every((b) => b > STORED_CAP_BYTES)) throw new Error(`[fixtures] F1x fits the cap on a rung (${rungs.join("/")}) — it would not exercise the rejection path in step c`);

  mkdirSync(FIXTURE_DIR, { recursive: true });
  const manifest = {};
  const put = (name, file, mime, buf, meta = {}) => {
    writeFileSync(join(FIXTURE_DIR, file), buf);
    manifest[name] = { file, mime, bytes: buf.length, sha256: createHash("sha256").update(buf).digest("hex"), ...meta };
  };
  for (const [name, data] of Object.entries(b64)) {
    const buf = Buffer.from(data, "base64");
    const chart = charts[name];
    put(name, `${name}.${chart ? "png" : "jpg"}`, chart ? "image/png" : "image/jpeg", buf,
      chart ? { w: chart.w, h: chart.h, font: chart.font, prices: chart.prices, strip: chart.strip, gate: chart.gate } : {});
  }
  // F3a — not an image at all, wearing a .jpg name and an image MIME type.
  put("F3a", "F3a.jpg", "image/jpeg", Buffer.from("e2e-c064: this file is plain text, not an image\n".repeat(64)));
  // F3b — a real PNG cut inside its header: signature + partial IHDR, zero pixel data.
  // ⚠️ Cut in the HEADER on purpose: a JPEG cut mid-scan is decoded PARTIALLY by browsers
  // and fires `load`, which would test the browser's leniency, ⛔ the app's rejection path.
  put("F3b", "F3b.png", "image/png", Buffer.from(b64.F2, "base64").subarray(0, 24));

  // Fixture contract — a fixture that does not have the property its step relies on is a
  // hard failure here, ⛔ a confusing red three steps later.
  for (const k of ["F1_1", "F1_2", "F1_3", "F1_4", "F1_5", "F1x"]) {
    if (manifest[k].bytes < MIN_PHOTO_BYTES) throw new Error(`[fixtures] ${k} is ${manifest[k].bytes} bytes < ${MIN_PHOTO_BYTES} (≥3.5MB required)`);
  }
  const hashes = new Set(["F1_1", "F1_2", "F1_3", "F1_4", "F1_5"].map((k) => manifest[k].sha256));
  if (hashes.size !== 5) throw new Error("[fixtures] the five F1 photos are not distinct — step b could not tell them apart");

  writeFileSync(join(FIXTURE_DIR, "manifest.json"), JSON.stringify(manifest, null, 2));
  for (const [k, m] of Object.entries(manifest)) console.log(`[fixtures] ${k.padEnd(5)} ${String(m.bytes).padStart(9)} B  sha256=${m.sha256.slice(0, 16)}`);
  return manifest;
}

export function readManifest() {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, "manifest.json"), "utf8"));
}

/** Playwright `setInputFiles` payload for a fixture. */
export function fileFor(manifest, name) {
  const m = manifest[name];
  if (!m) throw new Error(`[fixtures] unknown fixture ${name}`);
  return { name: `e2e-c064-${m.file}`, mimeType: m.mime, buffer: readFileSync(join(FIXTURE_DIR, m.file)) };
}
