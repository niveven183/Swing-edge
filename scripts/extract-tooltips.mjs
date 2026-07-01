import fs from 'fs';
import os from 'os';
import path from 'path';

// Intermediate hand-off files consumed by build-glossary.mjs (kept out of the repo)
const TT_TMP = path.join(os.tmpdir(), 'swingedge-tt.json');
const TL_TMP = path.join(os.tmpdir(), 'swingedge-tl.json');

let src = fs.readFileSync('src/data/tooltips.js','utf8');

// Extract the two objects by evaluating in a sandbox-ish way:
// Replace 'export const' with 'globalThis.' to capture
src = src.replace(/export const TRADING_TOOLTIPS/, 'globalThis.__TT');
src = src.replace(/export const TERM_LABELS/, 'globalThis.__TL');
// Remove any other exports (resolveSetupKey etc.) - keep only object literals we need
// Neutralize remaining 'export ' keywords
src = src.replace(/export (const|function|default)/g, '$1');

await import('data:text/javascript,' + encodeURIComponent(src));

const TT = globalThis.__TT || {};
const TL = globalThis.__TL || {};
fs.writeFileSync(TT_TMP, JSON.stringify(TT,null,2));
fs.writeFileSync(TL_TMP, JSON.stringify(TL,null,2));
console.log('TRADING_TOOLTIPS keys:', Object.keys(TT).length);
console.log('TERM_LABELS keys:', Object.keys(TL).length);
// coverage check
const langs=['en','he','es','pt','ar'];
let ttFull=0, tlFull=0;
for(const k of Object.keys(TT)) if(langs.every(l=>TT[k]&&TT[k][l])) ttFull++;
for(const k of Object.keys(TL)) if(langs.every(l=>TL[k]&&TL[k][l])) tlFull++;
console.log('TT full 5-lang:', ttFull+'/'+Object.keys(TT).length);
console.log('TL full 5-lang:', tlFull+'/'+Object.keys(TL).length);
