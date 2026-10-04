#!/usr/bin/env node
// B-375 — verify the red-finding evidence INSIDE the drill run, and print only
// structured fields to the run log (readable through the Actions API).
//
// Why this exists: the artifact lives on *.blob.core.windows.net, which the
// cloud dev environment cannot reach. Reading the evidence where it is produced,
// and printing a fixed set of fields, closes C-062 without downloading anything.
//
// ⛔ Raw content is never printed: no matching lines, no file bodies. The leak
// scan prints COUNTS per pattern only, and the QA password is read from the
// environment and never echoed.
//
// Exit 1 when: any leak pattern matches · the evidence cannot be read · a crumb
// field is an empty string (an empty value is an invention, B-375 follow-up).
//
// Usage: node scripts/verify-evidence.mjs [evidenceDir] [findingsJson]

import fs from 'node:fs';
import path from 'node:path';
import { redactText, LEAK_PATTERNS } from '../tests-sentinel/evidence.js';

const [dir = 'sentinel-evidence', findingsPath = 'browser-findings-auth.json'] = process.argv.slice(2);
const secret = process.env.SENTINEL_QA_PASSWORD || '';
const problems = [];
const say = (s) => console.log(s);
// EVERY printed value passes the same scrubber the evidence was written with,
// plus the password. Measured 28.09 on a planted tree: without it, section 4
// echoed a planted JWT and password straight into the run log.
const short = (s, n = 120) => {
  // redactText wants real JWT segment lengths; the log is stricter: any eyJ run.
  const t = redactText(String(s), [secret]).replace(/eyJ[\w.-]*/g, '[eyJ…]').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
};

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { problems.push(`${p}: ${e.message.split('\n')[0]}`); return null; }
}

function walk(d) {
  const out = [];
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) out.push(...walk(p)); else out.push(p);
  }
  return out;
}

// ── 1. findings ──────────────────────────────────────────────────────────────
say('── 1. ממצאים (browser-findings-auth.json) ──');
const findings = readJson(findingsPath);
let reds = 0;
if (Array.isArray(findings)) {
  reds = findings.filter((f) => f.severity === 'red').length;
  say(`  סה"כ ${findings.length} · אדומים ${reds}/${findings.length}`);
  for (const f of findings) say(`  · ${f.severity} ${f.fp}`);
} else if (findings) {
  problems.push(`${findingsPath}: אינו מערך`);
}

// ── 2. evidence tree ─────────────────────────────────────────────────────────
if (!fs.existsSync(dir)) {
  problems.push(`${dir}: תיקיית הראיות ⛔ קיימת`);
  say(`\n⛔ ${dir} ⛔ קיימת — אין מה לאמת`);
} else {
  const files = walk(dir);
  const createDir = fs.readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && /create-failed/.test(e.name)).map((e) => path.join(dir, e.name));

  say(`\n── 2. תיקיות ראיה: ${fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory()).length} ──`);
  if (createDir.length !== 1) {
    problems.push(`תיקיות create-failed: ${createDir.length} (נדרשת 1)`);
    say(`  ⛔ תיקיות create-failed: ${createDir.length}`);
  }
  for (const d of createDir) {
    say(`  ${path.basename(d)}:`);
    for (const f of fs.readdirSync(d).sort()) say(`    · ${f} — ${fs.statSync(path.join(d, f)).size} בתים`);

    // ── 3. crumb ──
    const log = readJson(path.join(d, 'log.json'));
    say('\n── 3. crumb pre-submit ──');
    const crumb = log?.crumbs?.find((c) => c.name === 'pre-submit');
    if (!crumb) {
      problems.push('crumb pre-submit ⛔ נמצא');
      say('  ⛔ crumb pre-submit ⛔ נמצא');
    } else {
      for (const key of ['capital', 'shares', 'settingsHydration']) {
        const v = crumb.data?.[key];
        if (typeof v !== 'string' || v === '') {
          problems.push(`crumb.${key} ריק או חסר`);
          say(`  ${key}: ⛔ ריק או חסר (${JSON.stringify(v)})`);
        } else {
          say(`  ${key}: ${short(v)}`);
        }
      }
      say(`  (dtMs של ה-crumb: ${crumb.dtMs})`);
    }

    // ── 4. transient ──
    say('\n── 4. transient (צמתים שחיו ≤10s) ──');
    const tr = Array.isArray(log?.transient) ? log.transient : [];
    if (!tr.length) say('  (ריק)');
    for (const t of tr) say(`  · dtMs=${t.dtMs} livedMs=${t.livedMs} — ${short(t.text)}`);
  }

  // ── 5. manifest ──
  say('\n── 5. manifest ──');
  for (const m of files.filter((f) => /manifest-.*\.json$/.test(f))) {
    const rows = readJson(m) || [];
    say(`  ${path.basename(m)}: ${rows.length} שורות`);
    for (const r of rows) say(`  · ${r.fp} — ${short(r.status, 90)}`);
  }

  // ── 6. leak scan: COUNTS only ──
  // Text files (.json/.html) get every pattern. Binary files (PNG) skip '@' —
  // 0x40 is an ordinary byte in compressed image data, so a hit there measures
  // the codec, not a leak. That exclusion is printed, never silent.
  say(`\n── 6. סריקת דליפה — ${files.length} קבצים · ספירות בלבד ──`);
  if (!secret) problems.push('SENTINEL_QA_PASSWORD חסר ⇒ סריקת הסיסמה ⛔ רצה');
  const PATTERNS = LEAK_PATTERNS;
  const isText = (f) => /\.(json|html|txt)$/i.test(f);
  const binaryEyJ = [];
  let total = 0;
  for (const [name, re, scope] of PATTERNS) {
    let n = 0;
    for (const f of files) {
      if (scope === 'text-only' && !isText(f)) continue;
      const hits = (fs.readFileSync(f).toString('latin1').match(re) || []).length;
      if (name === 'eyJ' && !isText(f) && hits) binaryEyJ.push(`${path.basename(f)}×${hits}`);
      n += hits;
    }
    total += n;
    say(`  ${name}: ${n}${scope === 'text-only' ? '  (קבצי טקסט בלבד)' : ''}`);
  }
  if (secret) {
    let n = 0;
    for (const f of files) n += fs.readFileSync(f).toString('latin1').split(secret).length - 1;
    total += n;
    say(`  סיסמת ה-QA: ${n}`);
  } else {
    say('  סיסמת ה-QA: לא נמדד — הסוד חסר');
  }
  if (binaryEyJ.length) say(`  ⚠️ eyJ בקבצים בינאריים: ${binaryEyJ.join(' · ')}`);
  if (total > 0) problems.push(`סריקת דליפה: ${total} התאמות`);
}

say('\n' + '─'.repeat(60));
if (problems.length) {
  say(`🔴 verify-evidence: ${problems.length} בעיות`);
  for (const p of problems) say(`  • ${p}`);
  process.exit(1);
}
say('✅ verify-evidence: 0 בעיות');
