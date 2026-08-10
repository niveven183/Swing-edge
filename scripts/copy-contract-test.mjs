// scripts/copy-contract-test.mjs — text that explains a DERIVED value must not
// hard-code an example of it, and colour that carries meaning must be legible.
//
// WHY THIS EXISTS. The capital wave (09.08) fixed the ENGINE and left the TEXT
// that explains it wrong. `maxRiskPct` is derived — SwingEdge_App.jsx:1243,
// min(5, max(3, riskPct × 2)) — but the riskLimits tooltip shipped with "(1%)…
// (3%)…roughly 3 trades" written in as literal example numbers. That copy is
// correct for the 20/32 users whose riskPct is exactly 1 and WRONG for the
// other 12/32 (0.5→8 · 1.5→3 · 2→1). Nothing announced the divergence, because
// a sentence cannot fail a build.
//
// The tooltip infrastructure is static: TermTooltip({ term, lang, label,
// children }) resolves `entry[lang] || entry.en` and accepts no parameters.
// Threading riskPct through it would touch TermTooltip, InfoTooltip and 40+
// call sites — an infrastructure wave to fix a tagging bug. The decision
// (DECISIONS 2026-08-10) was generic phrasing instead: name the RELATION and
// the formula constants, never a per-user example. Assertions 1-4 defend that.
//
// THE FLOOR IS PART OF THE RELATION. min() caps at 5% and max() floors at 3%,
// so a 0.5% trader gets a 3% portfolio cap — six full positions, not three —
// and the floor was invisible on screen. Assertion 4 requires both constants
// to survive in the copy, so a future edit cannot quietly drop the half of the
// formula that only affects the 8/32 users at 0.5%.
//
// GLOSSARY DRIFT (assertion 5). src/data/glossary.json holds a generated COPY
// of every tooltip, built by `npm run glossary`. That script is in neither
// `build` nor `verify`, so editing tooltips.js alone leaves the stale sentence
// alive in the glossary with nothing to notice. This assertion is the notice.
//
// CONTRAST (assertions 8-15). The onboarding recommendation banner — the first
// screen a new user sees — rendered text-emerald-400 on bg-emerald-500/10.
// tokens.css:9 makes :root LIGHT (--bg-elevated: #FFFFFF), so in light mode
// that composites to green-on-green at 1.75:1 against a 4.5:1 AA floor. All
// four families failed, not just the reported green. These assertions COMPUTE
// the WCAG 2.1 ratio from the palette rather than trusting the eye, and they
// check both modes, because the dark value was never the broken one and a
// naive fix would break it.
//
// LANG (assertions 6-7). Static source assertions, the same honest limit as
// capability-guard-test: they prove the write is WRITTEN, not that it RUNS.

import { readFileSync } from "node:fs";
import { TRADING_TOOLTIPS } from "../src/data/tooltips.js";

const read = (p) => readFileSync(new URL(p, import.meta.url), "utf8");
const landingSrc = read("../src/components/LandingPage.jsx");
const onboardSrc = read("../src/components/OnboardingScreen.jsx");
const glossary = JSON.parse(read("../src/data/glossary.json"));

const LANGS = ["en", "he", "es", "pt", "ar"];

let pass = 0;
const failures = [];
function check(id, label, ok, detail = "") {
  if (ok) { pass++; console.log(`✅ ${id}  ${label}`); }
  else { failures.push({ id, label, detail }); console.error(`❌ ${id}  ${label}${detail ? `\n      ${detail}` : ""}`); }
}

// ── §1 — the riskLimits tooltip is generic ──────────────────────────────────
const riskLimits = TRADING_TOOLTIPS.riskLimits;

{
  const bad = LANGS.filter((l) => /\(\s*1\s*%\s*\)/.test(riskLimits[l] || ""));
  check("1", "riskLimits carries no literal \"(1%)\" example", bad.length === 0,
    bad.length ? `present in: ${bad.join(", ")}` : "");
}

{
  const bad = LANGS.filter((l) => /\(\s*3\s*%\s*\)/.test(riskLimits[l] || ""));
  check("2", "riskLimits carries no literal \"(3%)\" example", bad.length === 0,
    bad.length ? `present in: ${bad.join(", ")}` : "");
}

// A hard-coded position COUNT is the same bug wearing different clothes: "roughly
// 3 trades" is only true at riskPct === 1. Matched as "a digit near a plural
// trade-noun" rather than "\b3 trades\b" — \b is meaningless against Hebrew and
// Arabic script, and English separates them ("3 full-size trades").
{
  const NOUN = "trades|operaciones|operações|صفقات|עסקאות";
  const COUNT = new RegExp(`\\d[^.\\n]{0,15}?(?:${NOUN})`);
  const bad = LANGS.filter((l) => COUNT.test(riskLimits[l] || ""));
  check("3", "riskLimits states no hard-coded position count", bad.length === 0,
    bad.length ? `present in: ${bad.join(", ")}` : "");
}

// The formula constants are NOT example numbers — 3% and 5% are true for every
// user. Dropping them would make the copy generic AND useless.
{
  const bad = LANGS.filter((l) => {
    const s = riskLimits[l] || "";
    return !/3\s*%/.test(s) || !/5\s*%/.test(s);
  });
  check("4", "riskLimits still names both formula bounds (3% floor, 5% cap)", bad.length === 0,
    bad.length ? `missing a bound in: ${bad.join(", ")}` : "");
}

{
  const g = glossary?.riskLimits?.desc ?? glossary?.riskLimits?.description ?? null;
  const drifted = g === null
    ? ["glossary.json has no riskLimits desc — shape changed"]
    : LANGS.filter((l) => (g[l] || "") !== (riskLimits[l] || ""));
  check("5", "glossary.json riskLimits matches tooltips.js (run `npm run glossary`)",
    Array.isArray(drifted) && drifted.length === 0,
    Array.isArray(drifted) ? `drifted: ${drifted.join(", ")}` : "");
}

// ── §4 — the landing language toggle writes the document lang ───────────────
check("6", "LandingPage writes document.documentElement.lang",
  /document\.documentElement\.lang\s*=/.test(landingSrc));

check("7", "LandingPage writes document.documentElement.dir",
  /document\.documentElement\.dir\s*=/.test(landingSrc));

// ── §3 — onboarding recommendation banner clears WCAG AA in BOTH modes ──────
// Tailwind v3 palette, only the shades this file can reference.
const PALETTE = {
  emerald: { 400: "#34D399", 500: "#10B981", 600: "#059669", 700: "#047857" },
  cyan:    { 400: "#22D3EE", 500: "#06B6D4", 600: "#0891B2", 700: "#0E7490" },
  violet:  { 400: "#A78BFA", 500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9" },
  amber:   { 400: "#FBBF24", 500: "#F59E0B", 600: "#D97706", 700: "#B45309" },
};
// The card the banner sits inside — OnboardingScreen.jsx:520.
const CARD_LIGHT = "#FFFFFF"; // tokens.css:9  --bg-elevated
const CARD_DARK  = "#0d1424"; // literal in the same className
const AA = 4.5;

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const over = (fg, alpha, bg) => {
  const f = rgb(fg), b = rgb(bg);
  return "#" + f.map((v, i) => Math.round(v * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, "0")).join("");
};
const lum = (h) => {
  const c = rgb(h).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [l1, l2] = [lum(a), lum(b)];
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

// Parse colorMap out of the source so the assertion tracks the real object.
const mapBlock = onboardSrc.slice(
  onboardSrc.indexOf("const colorMap"),
  onboardSrc.indexOf("};", onboardSrc.indexOf("const colorMap")),
);
const families = [...mapBlock.matchAll(/(\w+):\s*\{([^}]*)\}/g)].map(([, key, body]) => {
  const bg = body.match(/bg:\s*"bg-(\w+)-(\d+)\/(\d+)"/);
  const iconLight = body.match(/icon:\s*"text-(\w+)-(\d+)/);
  const iconDark = body.match(/dark:text-(\w+)-(\d+)/);
  return { key, bg, iconLight, iconDark };
});

check("8", "colorMap parsed with all four families", families.length === 4,
  `parsed: ${families.map((f) => f.key).join(", ") || "none"}`);

for (const f of families) {
  if (!f.bg || !f.iconLight) {
    check(`${f.key}-parse`, `${f.key}: bg + icon shades readable`, false, "className shape changed");
    continue;
  }
  const [, bgName, bgShade, alphaRaw] = f.bg;
  const alpha = Number(alphaRaw) / 100;
  const bgHex = PALETTE[bgName]?.[bgShade];

  const [, ltName, ltShade] = f.iconLight;
  const ltHex = PALETTE[ltName]?.[ltShade];
  if (!bgHex || !ltHex) {
    check(`${f.key}-palette`, `${f.key}: shades known to the palette table`, false,
      `bg-${bgName}-${bgShade} / text-${ltName}-${ltShade}`);
    continue;
  }

  const lightBg = over(bgHex, alpha, CARD_LIGHT);
  const rLight = ratio(ltHex, lightBg);
  check(`${f.key}-light`, `${f.key}: light mode ≥ ${AA}:1`, rLight >= AA,
    `text-${ltName}-${ltShade} ${ltHex} on ${lightBg} = ${rLight.toFixed(2)}:1`);

  // Dark mode was never the broken one — this guards the fix from breaking it.
  const dk = f.iconDark ? PALETTE[f.iconDark[1]]?.[f.iconDark[2]] : ltHex;
  const darkBg = over(bgHex, alpha, CARD_DARK);
  const rDark = ratio(dk, darkBg);
  check(`${f.key}-dark`, `${f.key}: dark mode ≥ ${AA}:1`, rDark >= AA,
    `${dk} on ${darkBg} = ${rDark.toFixed(2)}:1`);
}

// ── verdict ─────────────────────────────────────────────────────────────────
const total = pass + failures.length;
console.log(`\n${pass}/${total} assertions passed`);
if (failures.length) {
  console.error(`\n${failures.length}/${total} FAILED:`);
  for (const f of failures) console.error(`  ❌ ${f.id}  ${f.label}`);
  process.exit(1);
}
console.log("✅ derived copy is generic, lang is written, banner clears AA");
