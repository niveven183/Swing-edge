// scripts/eye-focus-probe.mjs — the RED-BEFORE arm for tests-eye/modal-focus.spec.js (B-415).
//
//   npm run probe:eye:focus                                pixel7 only (local)
//   EYE_PROJECTS=pixel7,iphone14 npm run probe:eye:focus   both devices (CI)
//
// ⛔ NOT in the verify chain (a real browser + two `vite build`s) — `probe:` ≠ `test:`.
// Plan: docs/plans/PLAN-2026-10-12-b415-modal-focus.md
//
//   HEAD     the tree as committed                                   ⇒ every cell green
//   MUT-RAF  useModalA11y's rAF re-focus unconditional again (pre-fix)  ⇒ both "keeps focus" cells RED
//            on the B-415 message; the ⚪ idle cells stay green (they are the a11y fence, ⛔ evidence)
//
// ⛔ A mutant that survives means the spec is BLIND ⇒ exit 1. Shared machinery: scripts/lib/eyeBuild.mjs.

import { mkdtemp, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { makeOnce, assertCleanTargets, buildTree, serve, runSpec, readResults } from "./lib/eyeBuild.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const HOOK = join(ROOT, "src", "hooks", "useModalA11y.js");
const PROJECTS = (process.env.EYE_PROJECTS || "pixel7").split(",").map((s) => s.trim()).filter(Boolean);
const OUT = join(ROOT, "eye-evidence", "probe-focus");

let failures = 0;
const ok = (id, cond, label, detail = "") => {
  console.log(`${cond ? "✅" : "❌"} ${id}  ${label}${!cond && detail ? `\n      ${detail}` : ""}`);
  if (!cond) failures++;
};
const die = (msg) => { console.log(`\n❌ eye-focus-probe: ${msg}`); process.exit(1); };

// ═══ META ═══════════════════════════════════════════════════════════════════
const once = makeOnce(die);
assertCleanTargets(ROOT, [HOOK], die);
const GUARD = `const raf = requestAnimationFrame(() => {
      const a = document.activeElement;
      if (a === container || !container.contains(a)) focusFirst();
    });`;
const ARMS = {
  HEAD: [],
  "MUT-RAF": [[HOOK, GUARD, () => "const raf = requestAnimationFrame(focusFirst);"]],
};
const hookSrc = readFileSync(HOOK, "utf8");
for (const [arm, muts] of Object.entries(ARMS)) for (const [, find] of muts) once(hookSrc, find, arm);
ok("META", true, `mutation anchor matches exactly once · target clean in git · projects=${PROJECTS.join(",")}`);

// ═══ BUILD · SERVE · RUN ════════════════════════════════════════════════════
const WORK = await mkdtemp(join(tmpdir(), "eye-focus-"));
// "close modal · #close-exit — the field keeps focus…" ⇒ "close:keeps" / "close:idle"
const KEY = (title) => {
  const m = /^(close modal|log-trade form) · .* — (⚪ idle|the field keeps focus)/.exec(title);
  return m ? `${m[1] === "close modal" ? "close" : "log"}:${m[2].startsWith("⚪") ? "idle" : "keeps"}` : undefined;
};
const verdicts = {};
for (const arm of Object.keys(ARMS)) {
  console.log(`\n── ${arm} ──`);
  const dist = await buildTree({ root: ROOT, arm, outDir: join(WORK, `dist-${arm}`), mutations: ARMS[arm], once, die });
  const { server, port } = await serve(dist);
  const json = join(OUT, `${arm}.json`);
  const run = await runSpec({ root: ROOT, spec: "tests-eye/modal-focus.spec.js", projects: PROJECTS, port, json, evidenceDir: join(OUT, arm) });
  server.close();
  if (!run.ok) die(`${arm}: the spec produced no JSON report (exit ${run.status})\n${run.out.slice(-3000)}`);
  verdicts[arm] = readResults(json, KEY);
  for (const [k, v] of Object.entries(verdicts[arm]).sort()) console.log(`   ${k.padEnd(22)} ${v.status}${v.status !== "passed" ? `  — ${v.msg.slice(0, 300)}` : ""}`);
}

console.log("\n── verdicts ──");
for (const p of PROJECTS) {
  const v = (arm, k) => verdicts[arm][`${p}:${k}`] || { status: "missing", msg: "" };
  const cells = ["close:keeps", "close:idle", "log:keeps", "log:idle"];
  const head = cells.map((k) => [k, v("HEAD", k)]);
  ok(`HEAD/${p}`, head.every(([, r]) => r.status === "passed"), "all four cells green on the committed tree",
    head.filter(([, r]) => r.status !== "passed").map(([k, r]) => `${k}:${r.status} ${r.msg.split("\n")[0]}`).join(" | "));
  const keeps = ["close:keeps", "log:keeps"].map((k) => [k, v("MUT-RAF", k)]);
  ok(`MUT-RAF/${p}`, keeps.every(([, r]) => r.status === "failed" && /B-415: two frames after open, focus moved/.test(r.msg)),
    `both "keeps focus" cells RED on the B-415 message (${keeps.map(([k, r]) => `${k}=${r.status}`).join(" · ")})`,
    keeps.map(([k, r]) => `${k}: ${r.msg.split("\n")[0] || "mutant SURVIVED"}`).join(" | "));
  const idle = ["close:idle", "log:idle"].map((k) => [k, v("MUT-RAF", k)]);
  ok(`MUT-RAF/${p} ⚪`, idle.every(([, r]) => r.status === "passed"), "idle cells green under the mutant too — the fence measures first focus, ⛔ the fix",
    idle.filter(([, r]) => r.status !== "passed").map(([k, r]) => `${k}:${r.status} ${r.msg.split("\n")[0]}`).join(" | "));
}

await rm(WORK, { recursive: true, force: true });
console.log(failures ? `\n❌ eye-focus-probe: ${failures} verdict(s) failed — the spec is not proven` : "\n✅ eye-focus-probe — HEAD green · MUT-RAF red on both fields · ⚪ idle green in both trees");
process.exit(failures ? 1 : 0);
