// scripts/b435-alert.mjs — B-435 (Niv 17.10, 2ג): was playbook.spec b red on production, and if so, what does
// the issue say.
//
//   node scripts/b435-alert.mjs <playwright-json> <evidence-dir> <issue-body-out>
//
// Writes `red=<projects>` to $GITHUB_OUTPUT (empty: b was green on every device that ran it). On red it writes
// the issue body: run · commit · devices · the first line of each failure · the `[B-435 diag]` lines of the
// red device (tests-eye/b435diag.js — keys only), which then outlive the 14-day artifact and the log.
// The body is written INSIDE the evidence dir, BEFORE the leak scan (scripts/eye-evidence-scan.mjs) — the repo
// and its issues are public, so the workflow publishes it only if that scan passed.
//
// ⛔ A SILENT «not red». A missing or unparseable report, or a report with no scene b at all, exits 2: the alert
// cannot see, and saying «green» there is the R-4 this whole detector exists to remove.

import { readFileSync, writeFileSync, appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const [jsonPath, evidenceDir, outPath] = process.argv.slice(2);
const die = (m) => { console.error(`❌ b435-alert: ${m}`); process.exit(2); };
if (!jsonPath || !evidenceDir || !outPath) die("usage: b435-alert.mjs <playwright-json> <evidence-dir> <issue-body-out>");
if (!existsSync(jsonPath)) die(`no Playwright report at ${jsonPath} — the test step never wrote one; the alert cannot see`);
let report;
try { report = JSON.parse(readFileSync(jsonPath, "utf8")); } catch (e) { die(`the report is unparseable (${e.message})`); }

const SCENE = /^b · five setups with photos/;
const redact = (s) => String(s ?? "")
  .replace(/[\w.+-]+@[\w.-]+\.\w+/g, "<email>")
  .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "<jwt>")
  .replace(/sb-[\w-]+-auth-token/g, "<auth-key>")
  .replace(/\u001b\[[0-9;]*m/g, "");

const seen = [];
const red = [];
const walk = (suite) => {
  for (const s of suite.suites || []) walk(s);
  for (const spec of suite.specs || []) {
    if (!SCENE.test(spec.title)) continue;
    for (const t of spec.tests || []) {
      seen.push(t.projectName);
      if (t.status === "unexpected") {
        const last = (t.results || []).at(-1) || {};
        const msg = redact(last.error?.message || last.errors?.[0]?.message || `status ${last.status ?? "unknown"}`).split("\n").filter(Boolean).slice(0, 3).join(" / ");
        red.push({ project: t.projectName, status: last.status ?? "unknown", msg: msg.slice(0, 600) });
      }
    }
  }
};
walk(report);
if (!seen.length) die("the report holds no run of playbook.spec «b · five setups…» — renamed, filtered out, or never reached; the alert cannot see");

const out = process.env.GITHUB_OUTPUT;
const line = `red=${red.map((r) => r.project).join(",")}`;
if (out) appendFileSync(out, line + "\n");
console.log(`b435-alert: scene b ran on ${seen.join(",")} · ${line || "red="}`);
if (!red.length) process.exit(0);

const { GITHUB_SERVER_URL: srv, GITHUB_REPOSITORY: repo, GITHUB_RUN_ID: run, GITHUB_SHA: sha, GITHUB_EVENT_NAME: event } = process.env;
const body = [
  `🔴 **B-435 recurred** — \`playbook.spec\` b red on production · ${red.length}/${seen.length} devices (${red.map((r) => r.project).join(", ")})`,
  "",
  `Run: ${srv}/${repo}/actions/runs/${run} · commit \`${String(sha).slice(0, 7)}\` · event \`${event}\``,
  `Evidence artifact (90 days): \`b435-evidence-${run}\``,
  "",
  ...red.map((r) => `- **${r.project}** (${r.status}): ${r.msg}`),
  "",
  "Classify against `docs/audits/B435-ERROR-PATHS-2026-10-17.md`: an older `updated_at` after a newer one in `net=`/`db=` is the late-orphan-write hypothesis (row 10); a `quota=` count other than 0 is localStorage pressure; a journal op whose key is `#<id>` is a setup the device no longer holds.",
  "",
];
for (const r of red) {
  const f = join(evidenceDir, r.project, "b435-diag-playbook-b.txt");
  body.push(`### ${r.project} — \`[B-435 diag]\``);
  if (!existsSync(f)) body.push(`_no diag file at \`${f}\` — the scene died before its first step_`);
  else body.push("```", redact(readFileSync(f, "utf8")).trim(), "```");
  body.push("");
}
// ⛔ `@`: the leak scan counts every `@` in a text file (the body is scanned before it is published).
let text = body.join("\n").replace(/@/g, "(at)");
const MAX = 60_000; // GitHub's issue/comment limit is 65,536 characters
if (text.length > MAX) text = text.slice(0, MAX) + `\n\n_… truncated at ${MAX} characters — the full diag is in the artifact_`;
writeFileSync(outPath, text);
console.log(`b435-alert: issue body ${text.length} chars → ${outPath}`);
