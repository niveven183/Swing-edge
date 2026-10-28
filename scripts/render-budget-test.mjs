// scripts/render-budget-test.mjs — `npm run test:perf` (B-460, wave 1 F5).
//
// 🔴 MEASURED 28.10 (WAVE1-DIAGNOSIS §F5): the 276-hook root component re-rendered 84×/min with
// nobody touching the tab — 66 of them from two intervals: `setTickerIdx` every 2 s (0 readers) and
// `setPulse` every 1.5 s (3 dots). Both are gone; the dots blink in CSS. This file is the SHAPE gate
// that keeps them gone. The render COUNT is `npm run probe:renders` (a real browser — not in verify).
//
// ⛔ Comments are stripped before every check: the removal is documented in the source, and a
// gate that reads its own documentation as code is blind (it would go red on the comment, or green
// on a comment that merely mentions the right class).
// ⛔ An anchor that does not match exactly as expected is RED, never a skip (B-272).

import { readFileSync } from "node:fs";

const read = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");
const stripJs = (s) => s
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")      // JSX {/* … */}
  .replace(/\/\*[\s\S]*?\*\//g, "")          // /* … */
  .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");  // // … (not inside a URL)
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "");

const appRaw = read("../SwingEdge_App.jsx");
const app = stripJs(appRaw);
const css = stripCss(read("../src/index.css"));

let pass = 0, fail = 0;
const check = (id, name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ✅ ${id}. ${name}`); }
  else { fail++; console.error(`  ❌ ${id}. ${name}${detail ? ` — ${detail}` : ""}`); }
};

console.log("\n── render budget (B-460) ──────────────────────────────────\n");

check("M1", "SwingEdge_App.jsx read and stripped (extraction failure is red)", app.length > 100000 && app.length < appRaw.length);

// ── the two timers ──
check("P1", "⛔ tickerIdx / setTickerIdx in code", !/\b(?:set)?[tT]ickerIdx\b/.test(app));
check("P2", "⛔ pulse state: ⛔ setPulse · ⛔ useState for `pulse` · ⛔ `pulse ?`",
  !/\bsetPulse\b/.test(app) && !/\[\s*pulse\s*,/.test(app) && !/\bpulse\s*\?/.test(app));

// ── a ledger of the root's intervals: a NEW one is a decision, ⛔ a drive-by (B-462 breaks down the rest) ──
const INTERVALS = ["setMarketState(getMarketState())", "run, getRefreshInterval(marketState)", "run, getOverviewRefreshInterval(marketState)", "setTiltTick(x => x + 1)"];
const found = [...app.matchAll(/setInterval\(\s*([^\n]*)/g)].map((m) => m[1]);
const unknown = found.filter((f) => !INTERVALS.some((k) => f.includes(k)));
check("P3", `setInterval in the root = the ${INTERVALS.length} known (marketState · prices · overview · tilt) — ⛔ a new one`,
  found.length === INTERVALS.length && unknown.length === 0, `found ${found.length}: ${unknown.join(" | ").slice(0, 160)}`);

// ── the three consumers, in CSS ──
const openDots = (app.match(/se-pulse-opacity/g) || []).length;
check("C1", "header market dot: `se-pulse-opacity` ONLY while MARKET_STATE.OPEN · closed ⇒ inline 0.85",
  /className=\{`w-2 h-2 rounded-full transition-colors\$\{marketState === MARKET_STATE\.OPEN \? " se-pulse-opacity" : ""\}`\}/.test(app)
    && /opacity: marketState === MARKET_STATE\.OPEN \? undefined : 0\.85,/.test(app));
check("C2", "footer market dot: `se-pulse-opacity` ONLY while open · closed ⇒ inline 0.85",
  /className=\{`w-1\.5 h-1\.5 rounded-full transition-colors\$\{fOpen \? " se-pulse-opacity" : ""\}`\} style=\{\{ backgroundColor: fBadge\.color, opacity: fOpen \? undefined : 0\.85 \}\}/.test(app));
check("C3", "Market Overview dot: `se-pulse-emerald`, every market state (as before)",
  (app.match(/className="w-1\.5 h-1\.5 rounded-full se-pulse-emerald"/g) || []).length === 1);
check("C4", "exactly 2 `se-pulse-opacity` + 1 `se-pulse-emerald` in the root", openDots === 2 && (app.match(/se-pulse-emerald/g) || []).length === 1, `opacity=${openDots}`);

// ── the CSS: same 3 s cycle, and NO motion under reduced-motion ──
check("S1", "@keyframes se-pulse-opacity 0.55 ↔ 1 on a 3 s step-end cycle",
  /@keyframes se-pulse-opacity \{ 0% \{ opacity: 0\.55; \} 50% \{ opacity: 1; \}/.test(css) && /\.se-pulse-opacity \{ animation: se-pulse-opacity 3s step-end infinite; \}/.test(css));
check("S2", ".se-pulse-emerald: glow (::before, livePulse + 3 s on/off) + #047857 frame (::after, 3 s)",
  /\.se-pulse-emerald::before \{[^}]*animation: livePulse 2s ease-in-out infinite, se-pulse-on 3s step-end infinite;/.test(css)
    && /\.se-pulse-emerald::after \{[^}]*background-color: #047857;[^}]*animation: se-pulse-off 3s linear infinite;/.test(css));
const rm = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).find((b) => /se-pulse/.test(b)) || "";
check("S3", "prefers-reduced-motion ⇒ animation: none !important on all three animated layers",
  /\.se-pulse-opacity \{ animation: none !important;/.test(rm) && /\.se-pulse-emerald::before \{ animation: none !important;/.test(rm) && /\.se-pulse-emerald::after \{ animation: none !important;/.test(rm));

console.log(`\n── ${pass}/${pass + fail} passed ──`);
if (fail) process.exit(1);
console.log("render budget: OK — no root timer for a blinking dot\n");
