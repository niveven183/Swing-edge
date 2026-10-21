// scripts/eye-firstrun-probe.mjs — the RED-BEFORE arm for tests-eye/firstrun.spec.js (activation wave 1).
//
//   npm run probe:eye:firstrun                                   iphone14,iphone14tall,pixel7,desktop1440
//   EYE_PROJECTS=pixel7,desktop1440 npm run probe:eye:firstrun    (an arm runs on its projects ∩ these)
//   node scripts/eye-firstrun-probe.mjs --arms HEAD,MUT-STICKY    a subset
//
// ⛔ NOT in the verify chain (real browser + one `vite build` per arm) — `probe:` ≠ `test:`.
// Plan: docs/plans/PLAN-2026-10-21-firstrun-activation.md · diagnosis: docs/audits/FIRSTRUN-DIAGNOSIS-2026-10-21.md
//
//   HEAD              the committed tree                                         ⇒ every scene green
//   BEFORE            the six product files as they were at faf691a (= main)     ⇒ path · dashboard · actions RED
//   MUT-DASH          dashboard «add first trade» back to setTab('journal')      ⇒ B-443 (P2) RED
//   MUT-WELCOME       the welcome CTA back to «close only»                       ⇒ the tap budget RED
//   MUT-CONTRAST      the welcome card back to a fixed dark surface               ⇒ B-444 (light) RED
//   MUT-FOLD          the CTA back below the bullets                              ⇒ B-446 «welcome» RED (iPhone 14)
//   MUT-FOOTER        the form body no longer shrinks ⇒ the footer is pushed out ⇒ B-446 «Log Trade» RED
//   MUT-KB            the keyboard (visualViewport) listener removed              ⇒ B-446 G1 RED (iPhone 14)
//   MUT-MODALPAD      the banner reserve removed from Close Trade + Edit          ⇒ B-446 «edit/close» RED
//   MUT-TOAST         `[role="status"][class*="fixed"]` back in the toast rule     ⇒ B-447 (empty region) RED
//   MUT-TOASTTEXT     the light-only toast text colour removed                     ⇒ B-447 (toast text) RED
//   MUT-TRADESLOADED  firstTrade without `tradesLoaded`                            ⇒ B-445 (existing user) RED
//   MUT-STICKY        the action column no longer sticky                           ⇒ B-448 RED
//
// A mutant counts as KILLED only when its scene is red WITH ITS OWN message (⛔ any red — an unrelated
// failure would certify a blind gate). ⛔ A mutant that survives, or a BEFORE that goes green ⇒ exit 1.
// Shared machinery (mutate · build · restore-and-prove · serve · run): scripts/lib/eyeBuild.mjs.

import { mkdtemp } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec, readResults } from "./lib/eyeBuild.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BEFORE_REF = "faf691a"; // main, the tree the diagnosis measured (product files = 23d8ea8)
const ALL = (process.env.EYE_PROJECTS || "iphone14,iphone14tall,pixel7,desktop1440").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, "eye-evidence", "probe-firstrun");
const argArms = (() => { const i = process.argv.indexOf("--arms"); return i > 0 ? process.argv[i + 1].split(",") : null; })();

let failures = 0;
const ok = (id, cond, label, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
  if (!cond) failures++;
};
const die = (msg) => { console.log(`\n❌ eye-firstrun-probe: ${msg}`); process.exit(1); };
const once = makeOnce(die);

const F = (p) => join(ROOT, p);
const APP = F("SwingEdge_App.jsx");
const WEL = F("src/components/WelcomeAnnouncement.jsx");
const TOAST = F("src/components/ToastProvider.jsx");
const CSS = F("src/index.css");
const EDIT = F("src/components/EditTradeModal.jsx");
const HOOK = F("src/hooks/useKeepFocusedVisible.js");
const PRODUCT = [APP, WEL, TOAST, CSS, EDIT];
assertCleanTargets(ROOT, [...PRODUCT, HOOK], die);

const show = (f) => execFileSync("git", ["show", `${BEFORE_REF}:${f.replace(ROOT + "/", "")}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const WHOLE = /^[\s\S]+$/;
const CTA_RX = /\n {10}\{\/\* CTA — the ONE primary action, above the fold \*\/\}\n[\s\S]*?<\/button>\n/;
const welSrc = readFileSync(WEL, "utf8");
const ctaBlock = (welSrc.match(CTA_RX) || [""])[0];

// Each arm: [mutations, projects it needs, --grep, the message its red must carry]
const ARMS = {
  HEAD: { muts: [], projects: ALL, grep: null, expect: null },
  BEFORE: { muts: PRODUCT.map((f) => { const old = show(f); return [f, WHOLE, () => old]; }), projects: ALL, grep: null, expect: { path: /B-443\/B-445: \d+ taps/, dashboard: /B-443/, actions: /B-448/ } },
  "MUT-DASH": { muts: [[APP, "onClick={openTradeForm}\n                    className=\"bg-blue-500", () => "onClick={() => setTab('journal')}\n                    className=\"bg-blue-500"]], projects: ["pixel7", "desktop1440"], grep: "dashboard CTA", expect: { dashboard: /B-443/ } },
  "MUT-WELCOME": { muts: [[WEL, "onClick={primaryIsFirstTrade ? onLogTrade : onStart}", () => "onClick={onStart}"]], projects: ["pixel7", "desktop1440"], grep: "path · ", expect: { path: /B-443\/B-445: \d+ taps/ } },
  "MUT-CONTRAST": { muts: [[WEL, "bg-white dark:bg-[#0A100D]", () => "bg-[#0A100D]"]], projects: ["pixel7"], grep: "path · ", expect: { path: /B-444 \(light\)/ } },
  "MUT-FOLD": { muts: [[WEL, CTA_RX, () => "\n"], [WEL, "          {/* Tagline */}\n", () => ctaBlock.slice(1) + "          {/* Tagline */}\n"]], projects: ["iphone14"], grep: "path · ", expect: { path: /B-446: «welcome/ } },
  "MUT-FOOTER": { muts: [[APP, "<div ref={logBodyRef} className=\"p-5 space-y-4 overflow-y-auto min-h-0 flex-1\">", () => "<div ref={logBodyRef} className=\"p-5 space-y-4 overflow-y-auto shrink-0\">"]], projects: ["pixel7", "desktop1440"], grep: "path · ", expect: { path: /B-446: «form: Log Trade»/ } },
  "MUT-KB": { muts: [[HOOK, "    vv?.addEventListener(\"resize\", fit);\n", () => ""]], projects: ["iphone14"], grep: "path · ", expect: { path: /B-446 G1: with the keyboard/ } },
  "MUT-MODALPAD": {
    muts: [
      [EDIT, "    <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4\"\n      style={{ paddingBottom: \"calc(1rem + var(--se-bottom-overlay, 0px))\" }}>", () => "    <div className=\"fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4\">"],
      [EDIT, "max-h-[calc(90vh-var(--se-bottom-overlay,0px))]", () => "max-h-[90vh]"],
      [APP, "          // B-446 (21.10) — the bottom-banner reserve Log Trade has had since B-404 (consent z-91 over z-50).\n          style={{ paddingBottom: \"calc(1rem + var(--se-bottom-overlay, 0px))\" }}>", () => ">"],
    ],
    projects: ["iphone14", "pixel7"], grep: "path · ", expect: { path: /B-446: «(edit|close-trade)/ },
  },
  "MUT-TOAST": { muts: [[CSS, "[class*=\"toast\"] {\n  background: var(--surface-elevated);", () => "[class*=\"toast\"],\n[role=\"status\"][class*=\"fixed\"] {\n  background: var(--surface-elevated);"]], projects: ["pixel7"], grep: "path · ", expect: { path: /B-447 \(empty/ } },
  "MUT-TOASTTEXT": { muts: [[TOAST, "<span className={`flex-1 text-xs leading-relaxed ${s.lightText}`}>", () => "<span className=\"flex-1 text-xs leading-relaxed\">"]], projects: ["pixel7"], grep: "path · ", expect: { path: /B-447: success toast text/ } },
  "MUT-TRADESLOADED": { muts: [[APP, "firstTrade={tradesLoaded && realTrades.length === 0}", () => "firstTrade={realTrades.length === 0}"]], projects: ["pixel7"], grep: "welcome label", expect: { "label-with-trades": /B-445: an existing user/ } },
  "MUT-STICKY": {
    muts: [
      [APP, "${h===t.colAction ? \"sticky end-0 z-[1] ", () => "${h===t.colAction ? \" "],
      [APP, "<td className={`p-3 sticky end-0 z-[1] ", () => "<td className={`p-3 "],
    ],
    projects: ["desktop1440"], grep: "journal actions", expect: { actions: /B-448/ },
  },
};
if (!ctaBlock) die("MUT-FOLD: the welcome CTA block was not found (anchor moved) — re-anchor (B-272)");
// Every anchor must match exactly once in the LIVE bytes (sequential mutations of one file are checked by
// buildTree as it applies them).
for (const [arm, a] of Object.entries(ARMS)) {
  const seen = new Set();
  for (const [f, find] of a.muts) if (!seen.has(f)) { seen.add(f); once(readFileSync(f, "utf8"), find, arm); }
}
ok("META", true, `all first anchors per file match exactly once · targets clean · projects=${ALL.join(",")}`);

const arms = argArms || Object.keys(ARMS);
for (const a of arms) if (!ARMS[a]) die(`unknown arm ${a}`);

// Verdict key per test: "path-he" · "dashboard-en" · "label-with-trades-he" · "actions-en"
const KEY = (title) => {
  const m = /^(path|dashboard CTA|welcome label|journal actions) · (he|en)(?: · (with-trades|empty-control))? —/.exec(title);
  if (!m) return null;
  const scene = { "path": "path", "dashboard CTA": "dashboard", "welcome label": `label-${m[3]}`, "journal actions": "actions" }[m[1]];
  return `${scene}-${m[2]}`;
};

const WORK = await mkdtemp(join(tmpdir(), "eye-firstrun-"));
const verdicts = {};
for (const arm of arms) {
  const a = ARMS[arm];
  const projects = a.projects.filter((p) => ALL.includes(p));
  console.log(`\n── ${arm} ── projects=${projects.join(",") || "(none)"}${a.grep ? ` grep="${a.grep}"` : ""}`);
  if (!projects.length) { ok(arm, false, "no project of this arm is in EYE_PROJECTS — the arm measured nothing"); continue; }
  const dist = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: a.muts, once, die });
  const { server, port } = await serve(dist);
  const json = join(OUT, `${arm}.json`);
  const run = await runSpec({ root: ROOT, spec: "tests-eye/firstrun.spec.js", projects, port, json, evidenceDir: join(OUT, arm), grep: a.grep });
  server.close();
  if (!run.ok) die(`${arm}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  verdicts[arm] = readResults(json, KEY);
  for (const [k, v] of Object.entries(verdicts[arm]).sort()) console.log(`   ${k.padEnd(36)} ${v.status}${v.status !== "passed" && v.status !== "skipped" ? `  — ${v.msg.slice(0, 500)}` : ""}`);
}

console.log("\n── verdicts ──");
for (const arm of arms) {
  const v = verdicts[arm];
  if (!v) continue;
  const ran = Object.entries(v).filter(([, x]) => x.status !== "skipped");
  if (arm === "HEAD") {
    const bad = ran.filter(([, x]) => x.status !== "passed");
    ok("HEAD", ran.length > 0 && bad.length === 0, `${ran.length - bad.length}/${ran.length} scenes green on the committed tree`, bad.map(([k, x]) => `${k}: ${x.msg.slice(0, 300)}`).join("\n      "));
    continue;
  }
  for (const [scene, rx] of Object.entries(ARMS[arm].expect)) {
    const cells = ran.filter(([k]) => k.split(":")[1].startsWith(`${scene}-`));
    const killed = cells.filter(([, x]) => x.status !== "passed" && rx.test(x.msg));
    ok(arm, cells.length > 0 && killed.length > 0, `${scene}: ${killed.length}/${cells.length} cells red with ${rx}`, cells.map(([k, x]) => `${k}: ${x.status} ${x.msg.slice(0, 200)}`).join("\n      "));
  }
}
console.log(failures ? `\n❌ ${failures} failure(s) — a blind gate or a red HEAD` : "\n✅ eye-firstrun-probe: HEAD green · BEFORE red · every mutant killed by its own message");
process.exit(failures ? 1 : 0);
