#!/usr/bin/env node
// scripts/eye-evidence-scan.mjs — leak scan for the C-064 eye-suite evidence BEFORE it is
// uploaded as an artifact (public repo ⇒ world-readable). Same patterns as the sentinel's
// verify-evidence (`LEAK_PATTERNS`, tests-sentinel/evidence.js) plus the QA email and
// password read from the environment.
//
// ⛔ Prints COUNTS only — never a matching line, never a file body.
// Exit 1 when: any pattern matches · the directory is missing or empty · a secret the scan
// is supposed to look for is absent from the environment (a scan that could not look is
// not a clean scan).
//
// Usage: node scripts/eye-evidence-scan.mjs [dir=eye-evidence]

import fs from 'node:fs';
import path from 'node:path';
import { LEAK_PATTERNS } from '../tests-sentinel/evidence.js';

const dir = process.argv[2] || 'eye-evidence';
const secrets = [['QA password', process.env.SENTINEL_QA_PASSWORD], ['QA email', process.env.SENTINEL_QA_EMAIL]];
const problems = [];

const walk = (d) => fs.readdirSync(d, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

if (!fs.existsSync(dir)) {
  console.log(`🔴 ${dir} does not exist — nothing was scanned`);
  process.exit(1);
}
const files = walk(dir);
if (!files.length) problems.push(`${dir} is empty`);
console.log(`── eye-evidence leak scan: ${files.length} files · counts only ──`);
const isText = (f) => /\.(json|html|txt|md)$/i.test(f);
let total = 0;
// ⚠️ Binary files (PNG/JPEG) are mostly compressed noise: a bare 3-byte `eyJ` turns up in
// them by chance (measured 04.10 — 1 hit in 18 hermetic files, no token anywhere). In a binary
// file `eyJ` therefore counts only in full JWT SHAPE; a real token is three base64url runs.
const JWT_SHAPE = /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g;
for (const [name, re, scope] of LEAK_PATTERNS) {
  let n = 0;
  for (const f of files) {
    if (scope === 'text-only' && !isText(f)) continue;
    const rx = name === 'eyJ' && !isText(f) ? JWT_SHAPE : re;
    n += (fs.readFileSync(f).toString('latin1').match(rx) || []).length;
  }
  total += n;
  console.log(`  ${name}: ${n}${scope === 'text-only' ? '  (text files only)' : name === 'eyJ' ? '  (binary files: full JWT shape only)' : ''}`);
}
for (const [name, value] of secrets) {
  if (!value) { problems.push(`${name} missing from the environment — that scan could not run`); console.log(`  ${name}: not measured`); continue; }
  let n = 0;
  for (const f of files) n += fs.readFileSync(f).toString('latin1').split(value).length - 1;
  total += n;
  console.log(`  ${name}: ${n}`);
}
if (total) problems.push(`${total} leak match(es)`);
if (problems.length) {
  console.log(`🔴 eye-evidence-scan: ${problems.join(' · ')}`);
  process.exit(1);
}
console.log('✅ eye-evidence-scan: 0 matches');
