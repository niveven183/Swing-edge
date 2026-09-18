// B-335 — the sentinel alert must report WHAT WAS MEASURED, never accuse a module
// that did not run.
//
// 17.09 20:35, run 35271690173: sentinel-auth.spec.js:437 (the one-shot entry gate
// of deleteRow) threw, so :444 (click "delete") and :447 (confirm in the dialog)
// NEVER RAN — yet the alert said "check handleDeleteTrade and ConfirmProvider".
// Niv built a prompt on that sentence. The defect is not the gate (that is B-334);
// it is that 13 of the 33 add() sites weld a fixed prose cause onto a multi-root
// error.
//
// ⚠️ THIS HARNESS MEASURES SHAPE, NOT TRUTH. A green run proves the known-false
// sentences are gone and that `got` references a measured binding. It CANNOT know
// whether the replacement text is a GOOD diagnosis. Same boundary as C1–C12 in
// test:equitystate. Never read green here as "the alerts are trustworthy".
//
// ⚠️ AND IT IS GAMEABLE: `reason: `${e.message}`` would duplicate `got` and pass.
// That is why every ledger row is an exact FINGERPRINT of the sentence measured on
// 2058cf0/8db32a5 — not a test for "has interpolation".

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AUTH = path.join(ROOT, 'tests-sentinel/sentinel-auth.spec.js');
const PUBLIC = path.join(ROOT, 'tests-sentinel/sentinel-public.spec.js');

let pass = 0;
let fail = 0;
const fails = [];

function check(id, label, ok, detail) {
  if (ok) {
    pass += 1;
    console.log(`  ✓ ${id} — ${label}`);
  } else {
    fail += 1;
    fails.push(`${id} — ${label}${detail ? `\n      ${detail}` : ''}`);
    console.log(`  ✗ ${id} — ${label}`);
    if (detail) console.log(`      ${detail}`);
  }
}

// ── META ─────────────────────────────────────────────────────────────────────
// Extraction failure is a HARD RED, never a skip (B-272). A rename or a reformat
// must STOP the chain, not quietly measure nothing.
console.log('\n── META — החילוץ עצמו ──');

let authSrc = '';
let publicSrc = '';
try {
  authSrc = fs.readFileSync(AUTH, 'utf8');
  publicSrc = fs.readFileSync(PUBLIC, 'utf8');
} catch (e) {
  console.error(`\n🔴 M1 — קריאת קבצי הסנטינל נכשלה: ${e.message}`);
  process.exit(1);
}

check('M1', 'שני קבצי הסנטינל נקראו ו⛔ ריקים',
  authSrc.length > 1000 && publicSrc.length > 500,
  `auth=${authSrc.length}b · public=${publicSrc.length}b`);

const SIG = 'function add(component, fp, severity, emoji, checked, got, reason, fix, risk)';
check('M2', 'חתימת `add()` זהה בשני הקבצים · עוגן יחיד בכל אחד',
  authSrc.split(SIG).length === 2 && publicSrc.split(SIG).length === 2,
  `auth=${authSrc.split(SIG).length - 1} · public=${publicSrc.split(SIG).length - 1} התאמות. ⛔ דילוג — שינוי חתימה עוצר את השרשרת`);

// Balance parens from each `add(` to get the full call text.
function addCalls(src) {
  const out = [];
  const re = /\badd\(/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    // Skip the declaration itself.
    if (src.slice(Math.max(0, m.index - 9), m.index) === 'function ') continue;
    let depth = 0;
    let i = m.index + 3;
    for (; i < src.length; i += 1) {
      if (src[i] === '(') depth += 1;
      else if (src[i] === ')') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    if (depth !== 0) return null; // unbalanced ⇒ hard red
    out.push({ index: m.index, text: src.slice(m.index, i + 1) });
  }
  return out;
}

const authCalls = addCalls(authSrc);
const publicCalls = addCalls(publicSrc);

check('M3', 'סוגריים מאוזנים בכל אתרי `add()` · החילוץ הצליח',
  authCalls !== null && publicCalls !== null,
  'סוגריים לא מאוזנים ⇒ אדום קשה, ⛔ דילוג (B-272)');

if (authCalls === null || publicCalls === null) {
  console.error('\n🔴 חילוץ נכשל — עוצר.');
  process.exit(1);
}

check('M4', 'האוכלוסייה `33` אתרי `add()` — `27` auth + `6` public',
  authCalls.length === 27 && publicCalls.length === 6,
  `נמדד auth=${authCalls.length} · public=${publicCalls.length}. מכנה שזז פירושו שהמנייה של B-335 כבר ⛔ תקפה`);

const all = [
  ...authCalls.map((c) => ({ ...c, file: 'auth', src: authSrc })),
  ...publicCalls.map((c) => ({ ...c, file: 'public', src: publicSrc })),
];

// ── LEDGER ───────────────────────────────────────────────────────────────────
// 13 sites × the EXACT sentence measured on 8db32a5 that accuses a module which
// may not have run. Each must be ABSENT. 13 red today → 0 after.
const LEDGER = [
  ['L1', 'public|render_landing', 'got', 'הרכיבים לא נראו תוך 15 שניות — הדף לא רונדר'],
  ['L2', 'public|render_app', 'got', 'טופס ההתחברות לא נראה תוך 15 שניות — /app לא רונדר'],
  ['L3', 'auth|login-failed', 'got', 'סרגל הטאבים לא נראה אחרי הכניסה: '],
  ['L4', 'auth|journal-open', 'got', 'הטבלה לא נראתה תוך 15 שניות: '],
  ['L5', 'auth|stale-testdata', 'got', 'נמצאה שורת בדיקה מריצה קודמת — הניקוי הקודם לא הושלם'],
  ['L6', 'auth|delete-failed', 'fix', 'בדוק את handleDeleteTrade ואת ConfirmProvider (src/components/ToastProvider.jsx)'],
  ['L7', 'auth|tab-switch', 'reason', 'טאב לא נטען — חלק מהאפליקציה לא נגיש למשתמש מחובר'],
  ['L8', 'auth|fixture-failed', 'fix', 'בדוק את EditTradeModal (שדה הטיקר :148-152, שמירה :402-405) ואת מסלול הכתיבה ל-trades'],
  ['L9', 'auth|create-failed', 'fix', 'בדוק את טופס היצירה (handleSubmit) ואת כתיבת trades ל-Supabase'],
  ['L10', 'auth|journal-render', 'fix', 'בדוק fmtR (src/utils.js:106) ו-calcTradeMetrics (src/utils.js:38) ואת ה-pageerror ב-Sentry'],
  ['L11', 'auth|sweep-failed', 'reason', 'שורת בדיקה ישנה נשארה ביומן — ה-REST של afterAll עוד ינסה להסיר אותה'],
  ['L12', 'auth|ui-delete-incomplete', 'reason', 'ה-UI מסיר את השורה מה-state אך המחיקה ב-Supabase לא נשמרה'],
  ['L13', 'auth|boundary-check-failed', 'fix', 'ודא ש-data-boundary עדיין נכתב ב-PanelBoundary.jsx'],
];

check('M5', 'הלדג׳ר מונה `13` שורות · ⛔ כפילות מזהה',
  LEDGER.length === 13 && new Set(LEDGER.map((r) => r[1])).size === 13,
  `נמדד ${LEDGER.length} שורות · ${new Set(LEDGER.map((r) => r[1])).size} מזהים ייחודיים`);

console.log('\n── LEDGER — `13` משפטים שמאשימים מודול שאולי ⛔ רץ ──');
let welded = 0;
for (const [id, site, field, sentence] of LEDGER) {
  const src = site.startsWith('auth') ? authSrc : publicSrc;
  const present = src.includes(sentence);
  if (present) welded += 1;
  check(id, `${site} · ${field} — המשפט המרותך הוסר`,
    !present,
    present ? `עדיין בבייטים: «${sentence.slice(0, 60)}…»` : '');
}

// ── DERIVED ──────────────────────────────────────────────────────────────────
// Removing the literal is NOT the same as deriving. `got` is the field Discord
// labels "מה חזר" — it presents itself as a MEASUREMENT, so a literal there is
// ‹R-2› in its purest form. These 5 must reference a measured binding.
console.log('\n── DERIVED — `5` אתרי `got` נגזרים ממדידה ──');
const GOT_SITES = [
  ['D1', 'browser|render_landing'],
  ['D2', 'browser|render_app'],
  ['D3', 'browser-auth|login-failed'],
  ['D4', 'browser-auth|journal-open'],
  ['D5', 'browser-auth|stale-testdata'],
];
for (const [id, fp] of GOT_SITES) {
  const call = all.find((c) => c.text.includes(`'${fp}'`));
  if (!call) {
    check(id, `${fp} — אתר ה-\`add()\` נמצא`, false, 'העוגן נעלם ⇒ אדום קשה, ⛔ דילוג');
    continue;
  }
  // `got` is argument #6. Split on top-level commas.
  const inner = call.text.slice(4, -1);
  const args = [];
  let depth = 0;
  let cur = '';
  let q = '';
  for (let i = 0; i < inner.length; i += 1) {
    const ch = inner[i];
    const prev = inner[i - 1];
    if (q) {
      cur += ch;
      if (ch === q && prev !== '\\') q = '';
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    if (ch === ',' && depth === 0) { args.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  args.push(cur.trim());
  const got = args[5] || '';
  check(id, `${fp} · got מפנה לערך שנמדד (\`\${…}\`)`,
    /\$\{/.test(got),
    `got = ${got.slice(0, 70)}`);
}

// ── BARE CATCH ───────────────────────────────────────────────────────────────
// public:159/:179 used `catch {` — the error object was DESTROYED, so a 504 from
// page.goto is unrecoverable even from the artifact, after the fact.
console.log('\n── BARE CATCH — `2` אתרים ששמרו את אובייקט השגיאה ──');
for (const [id, fp] of [['C1', 'browser|render_landing'], ['C2', 'browser|render_app']]) {
  const call = publicCalls.find((c) => c.text.includes(`'${fp}'`));
  const before = call ? publicSrc.slice(Math.max(0, call.index - 120), call.index) : '';
  check(id, `${fp} — ה-\`catch\` קושר את השגיאה (\`catch (e)\`)`,
    Boolean(call) && /catch\s*\(\s*e\s*\)/.test(before) && !/catch\s*\{[^}]*$/.test(before),
    call ? `לפני האתר: «…${before.slice(-45).replace(/\n/g, '⏎')}»` : 'העוגן נעלם');
}

// ── CONTROL ──────────────────────────────────────────────────────────────────
// The control arm measures the WIDTH of the change. These sentences were already
// correct on 8db32a5 and must stay byte-identical. RED HERE MEANS YOU TOUCHED
// SOMETHING OUTSIDE THE CLASS ⇒ STOP.
//
// ⚠️ :394's reason and :723 are the template Niv named as the control arm. :394's
// `fix` IS in the ledger (L13) — 13→0 is unreachable otherwise — but its reason
// below must never move.
console.log('\n── CONTROL — `8` משפטים שכבר היו נכונים · אדום כאן ⇒ עצור ──');
const CONTROL = [
  ['K1', authSrc, 'הבדיקה עצמה נכשלה — לא ניתן לדעת אם הפאנל קרס', 1, ':394 reason — התקן שאליו השאר זזו'],
  ['K2', authSrc, 'לא ניתן היה לאמת את הבאנר — הבדיקה עצמה נכשלה, לא בהכרח המוצר', 1, ':723 reason — ⛔ נגע'],
  ['K3', authSrc, 'בדוק ש-.se-consent__card ו-data-testid="consent-decline" עדיין קיימים', 1, ':723 fix — ⛔ נגע'],
  ['K4', authSrc, 'ה-spec לא יכול לנקות אחרי עצמו — עסקאות בדיקה יצטברו בפרודקשן כל שעה', 2, ':511/:543 — reason שהוא תוצאה, נכון בכל שורש'],
  ['K5', authSrc, 'הפאנל לא רונדר בכלל ⇒ הבדיקה ⛔ יכולה לירות — ירוק כאן אינו ראיה שהוא חי', 1, ':382 — הצהרת אי-מדידה'],
  ['K6', authSrc, 'כל האפליקציה קרסה, לא פאנל בודד — המשתמש רואה מסך שגיאה במקום המוצר', 1, ':417 — מדידה חיובית'],
  ['K7', publicSrc, 'שגיאת JavaScript לא-תפוסה (uncaught) שוברת את חווית המשתמש בדף', 1, 'record() — got נושא את הטקסט שנלכד'],
  ['K8', authSrc, '401/403 = RLS/מפתח, 429 = rate limit, 5xx = תקלת שירות', 1, ':232 — מונה שורשים מפורשות'],
];
for (const [id, src, sentence, n, why] of CONTROL) {
  const found = src.split(sentence).length - 1;
  check(id, `${why}`,
    found === n,
    `מצופה ${n} מופעים, נמדד ${found}. ⚠️ אדום כאן = נגעת מחוץ למחלקה`);
}

// ── SUMMARY ──────────────────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(72));
console.log(`LEDGER: ${welded}/13 אתרים עדיין נושאים משפט מרותך  (יעד: 0/13)`);
console.log(`סה"כ: ${pass} עברו · ${fail} נכשלו  (מתוך ${pass + fail})`);
console.log('⚠️  צורה ⛔ אמת: ירוק כאן מוכיח שהמשפטים השקריים הוסרו ו-`got` נגזר —');
console.log('    ⛔ שהטקסט החדש הוא אבחון טוב. ⛔ לקרוא ירוק כ«ההתראות אמינות».');
console.log('─'.repeat(72));

if (fail > 0) {
  console.error(`\n🔴 ${fail} אסרציות נכשלו:\n`);
  for (const f of fails) console.error(`  • ${f}`);
  process.exit(1);
}
console.log('\n✅ כל האסרציות עברו.');
