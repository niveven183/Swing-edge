#!/usr/bin/env node
/**
 * sentinel-count-probe — ⑥① תצפית הירי של שערי ה-`count()` בסנטינל (`B-334`).
 *
 * ⛔ **⛔ בשרשרת `verify`** — כמו `probe:boundary` ו-`probe:firing`. הוא דורש
 * Chromium אמיתי, ⛔ סודות, ו⛔ נוגע בפרודקשן.
 *
 * 🔴 **מה הוא נבנה למדוד.** הסנטינל נשא 15 קריאות `count()` חד-פעמיות. ספירה
 * חד-פעמית מעל DOM שטרם נצבע מחזירה `0`, ואפס-מוקדם ⛔ ניתן להבחנה מאפס-אמיתי:
 * אותו מספר, שתי משמעויות הפוכות. ⚠️ **וההחלפה המתבקשת ל-`toHaveCount(0)`
 * ⛔ מתקנת דבר** — נמדד 19.09: `toHaveCount(0, {timeout: 5000})` מעל דף שעומד
 * לצבוע כרטיס קריסה החזיר **PASSED תוך 12ms**, כי `count === 0` כבר נכון בסקר
 * הראשון. ⇒ **הטענה הופכת**: במקום «כרטיס הקריסה ⛔ קיים» שואלים «התוכן הבריא
 * קיים», והיעדר הופך לנוכחות — צורה שנמדדה ממתינה באמת (1801ms).
 *
 * ⛔ **הוא קורא את הבייטים של הספק, ⛔ משכתב אותם.** חמש הצורות נחלצות
 * **לפי עוגן** מ-`tests-sentinel/sentinel-auth.spec.js` ומורצות ב-`new Function`
 * מול Chromium — אותה תבנית של `test:hydration`/`probe:firing`. **כשל חילוץ הוא
 * אדום קשה ⛔ ולעולם לא דילוג** (`B-272`).
 *
 * ⚠️ **ה-`timeout` מוחלף** — כל צורה רצה כאן עם `PROBE_TIMEOUT` במקום הליטרל
 * שבספק, אחרת זרועות הטיפול לבדן היו 65 שניות. זו החלפה **מוצהרת**, ושער-מטא
 * דורש שהליטרל **המקורי** יהיה ≥ `PROBE_TIMEOUT` — ⇒ הפחתה בספק נתפסת כאן.
 * ⛔ הנמדד הוא **משך** אלא **האם הצורה ממתינה ומסוגלת להיכשל**.
 *
 * ⚠️ **שלוש זרועות לכל צורה, ו⛔ שתיים:**
 *   · **טיפול**  — התנאי ⛔ מתקיים לעולם ⇒ חייבת **אדום**, ו-`CA-4` מוודא
 *     ש**האסרציה הנכונה** ירתה לפי **תוכן** הודעת השגיאה, ⛔ «משהו זרק».
 *   · **ביקורת** — התנאי מתקיים באיחור (900ms) ⇒ חייבת להישאר **ירוקה**.
 *     ⛔ ביקורת שיורה פירושה שהצורה מייצרת אדום-שווא — אותו פגם בפנים השני.
 *   · **מתה**    — הצורה ה**ישנה** (ספירה חד-פעמית) מורצת על **אותו דף** של
 *     הביקורת. היא חייבת **לפספס** (לקרוא `0`). ⛔ **זרוע מתה שקוראת נכון
 *     פירושה שהצורה החדשה ⛔ מודדת דבר חדש** והתוצאה כולה חסרת-ערך.
 *
 * ⚠️ **ו⛔ הוא ⛔ מכסה את המוצר**: React · ה-`PanelBoundary` האמיתי · הסנטינל
 * מול פרודקשן — כולם חיים ב-`C-051` ובריצת ה-Actions בלבד.
 */
import { readFileSync } from 'node:fs';
import { expect, chromium } from '@playwright/test';

const SPEC = 'tests-sentinel/sentinel-auth.spec.js';
const PROBE_TIMEOUT = 2500;   // זרועות הטיפול משלמות את זה; הביקורת נצבעת ב-900ms
const MOUNT_MS = 900;

const src = readFileSync(new URL(`../${SPEC}`, import.meta.url), 'utf8');
const LINES = src.split('\n');

let pass = 0;
const fails = [];
const ok = (m) => { pass++; console.log(`   ✅ ${m}`); };
const bad = (m) => { fails.push(m); console.log(`   ❌ ${m}`); };

// ── החילוץ לפי עוגן ─────────────────────────────────────────────────────────
// מהעוגן חוזרים אחורה אל `await expect` ומתקדמים קדימה עד שהסוגריים מאוזנים
// והשורה נגמרת ב-`;`. ⛔ **מספר התאמות ≠ הצפוי הוא אדום קשה** — שינוי-שם או
// ריפורמט **עוצרים את ה-probe**, ⛔ מדללים אותו.
function extract(anchor, expectMatches, label) {
  const hits = [];
  LINES.forEach((l, i) => { if (anchor.test(l)) hits.push(i); });
  if (hits.length !== expectMatches) {
    bad(`מטא · ${label}: העוגן נמצא ${hits.length}× (נדרש ${expectMatches}) — חילוץ נכשל`);
    return null;
  }
  let start = hits[0];
  while (start >= 0 && !/^\s*await expect\b/.test(LINES[start])) start--;
  if (start < 0 || hits[0] - start > 4) {
    bad(`מטא · ${label}: ⛔ נמצאה תחילת משפט \`await expect\` בטווח סביר — חילוץ נכשל`);
    return null;
  }
  const depth = (s) => {
    let d = 0;
    for (const ch of s) { if ('([{'.includes(ch)) d++; else if (')]}'.includes(ch)) d--; }
    return d;
  };
  let stmt = '', d = 0, end = -1;
  for (let i = start; i < Math.min(start + 8, LINES.length); i++) {
    stmt += LINES[i] + '\n';
    d += depth(LINES[i]);
    if (d === 0 && /;\s*$/.test(LINES[i])) { end = i; break; }
  }
  if (end < 0) { bad(`מטא · ${label}: סוגריים ⛔ התאזנו / ⛔ נמצא \`;\` — חילוץ נכשל`); return null; }
  if (d !== 0) { bad(`מטא · ${label}: סוגריים לא מאוזנים (${d}) — חילוץ נכשל`); return null; }

  // החלפת ה-timeout, עם שער על הליטרל המקורי.
  const lits = [...stmt.matchAll(/\{\s*timeout:\s*([\d_]+)\s*\}/g)].map((m) => Number(m[1].replace(/_/g, '')));
  if (lits.length !== 1) { bad(`מטא · ${label}: נמצאו ${lits.length} ליטרלי timeout (נדרש 1) — חילוץ נכשל`); return null; }
  if (lits[0] < PROBE_TIMEOUT) {
    bad(`מטא · ${label}: ה-timeout בספק הוא ${lits[0]}ms < ${PROBE_TIMEOUT}ms — הספק הוחלש`);
    return null;
  }
  const runnable = stmt.replace(/\{\s*timeout:\s*[\d_]+\s*\}/, `{ timeout: ${PROBE_TIMEOUT} }`);
  ok(`מטא · ${label}: חולץ מ-${SPEC}:${start + 1}-${end + 1} · סוגריים מאוזנים · timeout מקורי ${lits[0]}ms`);
  return { stmt: runnable, line: start + 1 };
}

function compile(extracted, params, label) {
  try {
    return new Function(...params, `return (async () => {\n${extracted.stmt}\n})();`);
  } catch (e) {
    bad(`מטא · ${label}: הצורה שחולצה ⛔ מתקמפלת — ${e.message}`);
    return null;
  }
}

// ── דפים סינתטיים ───────────────────────────────────────────────────────────
// `late()` צובע את ה-HTML אחרי `MOUNT_MS` — זה בדיוק אפס-המוקדם שהספק סבל ממנו.
const late = (html) => `<script>setTimeout(()=>{document.body.insertAdjacentHTML('beforeend',${JSON.stringify(html)})},${MOUNT_MS})</script>`;
const now = (html) => html;

async function run(fn, args) {
  try { await fn(...args); return { threw: false, msg: '' }; }
  catch (e) { return { threw: true, msg: e.message }; }
}

// ⚠️ `CA-4` — **אסרציה אחת**, ⛔ שתיים. «זרק» לבדו ⛔ ראיה: הריצה הראשונה של
// ה-probe עצמו הוכיחה זאת — כל חמש זרועות הטיפול זרקו `expect is not defined`
// (גוף `new Function` ⛔ סוגר על מודול-סקופ), וזרוע-טיפול שמסתפקת ב«זרק» הייתה
// מדפיסה `5/5 אדום` על מדידה ש⛔ הריצה אף אסרציה. לכן הוורדיקט **מאוחד**:
// ⛔ ירוק בלי שתוכן ההודעה מאשר שהמאצ'ר הנכון, עם הערך הצפוי, הוא שירה.
function red(res, needles, label, what) {
  if (!res.threw) { bad(`טיפול · ${label}: ${what} והשער **עבר** — ⛔ מסוגל להיכשל. עצור.`); return; }
  const missing = needles.filter((n) => !res.msg.includes(n));
  if (missing.length) { bad(`טיפול · ${label}: זרק, אך ההודעה ⛔ מכילה ${JSON.stringify(missing)} ⇒ ירתה אסרציה **אחרת** — האדום חסר-ערך (CA-4)`); return; }
  ok(`טיפול · ${label}: ${what} ⇒ **אדום**, ו-CA-4 מאשר שהאסרציה הנכונה ירתה — ${one(res.msg)}`);
}

const one = (s) => s.split('\n')[0];

console.log('\n🎯 sentinel count probe — האם שערי ה-count() מסוגלים להיכשל (B-334)\n');
console.log(`   ספק: ${SPEC} · timeout בריצה: ${PROBE_TIMEOUT}ms (מוחלף, מוצהר) · צביעה מאוחרת: ${MOUNT_MS}ms\n`);

const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = async (html) => { const p = await ctx.newPage(); await p.setContent(`<body>${html}</body>`); return p; };

// ═══ צורה 1 — מחסום המעטפת ב-`gotoTab` ══════════════════════════════════════
console.log('▸ צורה 1 — מחסום המעטפת (gotoTab) · הטענה: סרגל הלשוניות נצבע\n');
{
  const ex = extract(/\.poll\(\(\) => page\.locator\('\[data-tour-tab\]'\)\.count\(\)/, 1, 'צורה 1');
  const fn = ex && compile(ex, ['expect', 'page'], 'צורה 1');
  if (fn) {
    const TAB = '<button data-tour-tab="journal">journal</button>';

    const pT = await page(now('<div class="skeleton"></div>'));
    const rT = await run(fn, [expect, pT]);
    red(rT, ['expect(received).toBeGreaterThan(expected)', 'Expected: > 0', 'waiting on the predicate'], 'צורה 1', 'המעטפת ⛔ נצבעת לעולם');

    const pC = await page(late(TAB));
    const rC = await run(fn, [expect, pC]);
    if (!rC.threw) ok(`ביקורת: המעטפת נצבעת ב-${MOUNT_MS}ms ⇒ **ירוקה** — השער ממתין באמת`);
    else bad(`ביקורת: השער ירה על מעטפת איטית — אדום-שווא. ${one(rC.msg)}`);

    const pD = await page(late(TAB));
    const dead = await pD.locator('[data-tour-tab="journal"]').count();
    if (dead === 0) ok(`מתה: הצורה הישנה (ספירה חד-פעמית) קראה ${dead} על אותו דף ⇒ **פספסה** — «absent» שקרי`);
    else bad(`מתה: הצורה הישנה קראה ${dead} ⇒ הייתה תופסת ממילא — הצורה החדשה ⛔ מודדת דבר חדש`);
  }
}

// ═══ צורה 2 — מחסום בריאות הפאנל (`:392`) ═══════════════════════════════════
console.log('\n▸ צורה 2 — מחסום בריאות הפאנל (:392 · analytics) · הטענה ההפוכה\n');
{
  const ex = extract(/\.poll\(\(\) => page\.locator\(`\$\{health\}, \[data-boundary=/, 1, 'צורה 2');
  const fn = ex && compile(ex, ['expect', 'page', 'health', 'name'], 'צורה 2');
  if (fn) {
    const HEALTH = '[data-tour="setup-matrix"]', NAME = 'analytics';
    const HEALTHY = '<div data-tour="setup-matrix">matrix</div>';
    const CRASH = `<div data-boundary="${NAME}">הפאנל קרס</div>`;

    const pT = await page(now('<div class="space-y-8"></div>'));
    const rT = await run(fn, [expect, pT, HEALTH, NAME]);
    red(rT, ['expect(received).toBeGreaterThan(expected)', 'Expected: > 0', 'waiting on the predicate'], 'צורה 2', '⛔ תוכן בריא ו⛔ כרטיס קריסה');

    const pC1 = await page(late(HEALTHY));
    const r1 = await run(fn, [expect, pC1, HEALTH, NAME]);
    if (!r1.threw) ok(`ביקורת א: הפאנל הבריא נצבע ב-${MOUNT_MS}ms ⇒ **ירוקה**`);
    else bad(`ביקורת א: השער ירה על פאנל בריא איטי — אדום-שווא. ${one(r1.msg)}`);

    const pC2 = await page(late(CRASH));
    const r2 = await run(fn, [expect, pC2, HEALTH, NAME]);
    if (!r2.threw) ok(`ביקורת ב: **כרטיס הקריסה** נצבע ב-${MOUNT_MS}ms ⇒ **ירוקה** — המחסום נפתר בשני הכיוונים`);
    else bad(`ביקורת ב: המחסום ⛔ נפתר על קריסה איטית — הכשל עולה timeout מלא. ${one(r2.msg)}`);

    // ⚠️ הזרוע המתה כאן היא הלב: ספירה חד-פעמית על דף שכרטיס הקריסה שלו במרחק
    // 900ms מחזירה 0 ⇒ הסנטינל היה מדווח «הפאנל בריא» על פאנל **שקרס**.
    const pD = await page(late(CRASH));
    const before = await pD.locator(`[data-boundary="${NAME}"]`).count();
    await run(fn, [expect, pD, HEALTH, NAME]);
    const after = await pD.locator(`[data-boundary="${NAME}"]`).count();
    if (before === 0 && after === 1) {
      ok(`מתה: חד-פעמית=${before} ⇒ «בריא» שקרי · אחרי המחסום=${after} ⇒ הקריסה **נתפסת**`);
    } else {
      bad(`מתה: חד-פעמית=${before} · אחרי=${after} (נדרש 0→1) — ⛔ הוכח שהמחסום משנה את התוצאה`);
    }
  }
}

// ═══ צורה 3 — מחסום השורש (`:416`) ══════════════════════════════════════════
console.log('\n▸ צורה 3 — מחסום השורש (:416) · RootFallback מול סרגל הלשוניות\n');
{
  const ex = extract(/\.poll\(\(\) => page\.locator\('\[data-tour-tab\], \[role="alert"\] h1'\)/, 1, 'צורה 3');
  const fn = ex && compile(ex, ['expect', 'page'], 'צורה 3');
  if (fn) {
    const FALLBACK = '<div role="alert"><h1>משהו השתבש</h1></div>';

    const pT = await page(now('<div id="root"></div>'));
    const rT = await run(fn, [expect, pT]);
    red(rT, ['expect(received).toBeGreaterThan(expected)', 'Expected: > 0', 'waiting on the predicate'], 'צורה 3', '⛔ סרגל לשוניות ו⛔ RootFallback');

    const pC = await page(late(FALLBACK));
    const rC = await run(fn, [expect, pC]);
    if (!rC.threw) ok(`ביקורת: ה-fallback נצבע ב-${MOUNT_MS}ms ⇒ **ירוקה** — המחסום נפתר על קריסת שורש`);
    else bad(`ביקורת: המחסום ⛔ נפתר על קריסת שורש איטית. ${one(rC.msg)}`);

    const pD = await page(late(FALLBACK));
    const before = await pD.locator('[role="alert"] h1').count();
    await run(fn, [expect, pD]);
    const after = await pD.locator('[role="alert"] h1').count();
    if (before === 0 && after === 1) ok(`מתה: חד-פעמית=${before} ⇒ קריסת שורש **הוחמצה** · אחרי המחסום=${after}`);
    else bad(`מתה: חד-פעמית=${before} · אחרי=${after} (נדרש 0→1)`);
  }
}

// ═══ צורה 4 — מחסום שורות הג'ורנל (`:683`) ══════════════════════════════════
console.log("\n▸ צורה 4 — מחסום שורות הג'ורנל (:683) · >= FIXED_TRADES.length\n");
{
  const ex = extract(/\.poll\(\(\) => rows\.count\(\), \{ timeout/, 1, 'צורה 4');
  const fn = ex && compile(ex, ['expect', 'rows', 'FIXED_TRADES'], 'צורה 4');
  if (fn) {
    const FIXED = ['AAPL', 'NVDA', 'BTC-USD'];
    const tbl = (syms) => `<table><tbody>${syms.map((s) => `<tr><td>${s}</td></tr>`).join('')}</tbody></table>`;
    const ROWS = 'table tbody tr';

    const pT = await page(now(tbl(['AAPL', 'NVDA'])));
    const rT = await run(fn, [expect, pT.locator(ROWS), FIXED]);
    red(rT, ['expect(received).toBeGreaterThanOrEqual(expected)', 'Expected: >= 3'], 'צורה 4', '2/3 שורות לעולם');

    const pC = await page(late(tbl(FIXED)));
    const rC = await run(fn, [expect, pC.locator(ROWS), FIXED]);
    if (!rC.threw) ok(`ביקורת: 3/3 שורות נצבעות ב-${MOUNT_MS}ms ⇒ **ירוקה**`);
    else bad(`ביקורת: השער ירה על טבלה איטית מלאה — אדום-שווא. ${one(rC.msg)}`);

    const pD = await page(late(tbl(FIXED)));
    const dead = await pD.locator(ROWS).count();
    if (dead === 0) ok(`מתה: הצורה הישנה קראה ${dead} שורות ⇒ 3/3 היו מדווחות **חסרות** — אדום-שווא בסיבה שגויה`);
    else bad(`מתה: הצורה הישנה קראה ${dead} ⇒ ⛔ הוכח אפס-מוקדם`);
  }
}

// ═══ צורה 5 — שער הנוכחות ב-`deleteRow` (`:436`) ════════════════════════════
console.log('\n▸ צורה 5 — שער הנוכחות (deleteRow/renameToRiskTicker) · toHaveCount(1)\n');
{
  // ⚠️ העוגן חייב להימצא **פעמיים** — `deleteRow` ו-`renameToRiskTicker`.
  const ex = extract(/^\s*await expect\(rows\)\.toHaveCount\(1, \{ timeout: 15_000 \}\);$/, 2, 'צורה 5');
  const fn = ex && compile(ex, ['expect', 'rows'], 'צורה 5');
  if (fn) {
    const row = (s) => `<table><tbody><tr data-sym="${s}"><td>${s}</td></tr></tbody></table>`;
    const SEL = 'tr[data-sym="SNTNL"]';

    const pT = await page(now('<table><tbody></tbody></table>'));
    const rT = await run(fn, [expect, pT.locator(SEL)]);
    red(rT, ['expect(locator).toHaveCount(expected) failed', 'Expected: 1', 'Received: 0'], 'צורה 5', 'השורה ⛔ נצבעת לעולם');

    const pC = await page(late(row('SNTNL')));
    const rC = await run(fn, [expect, pC.locator(SEL)]);
    if (!rC.threw) ok(`ביקורת: השורה נצבעת ב-${MOUNT_MS}ms ⇒ **ירוקה** — 1801ms שנמדדו הם המתנה אמיתית`);
    else bad(`ביקורת: השער ירה על שורה איטית — אדום-שווא. ${one(rC.msg)}`);

    // ⚠️ הבחנה: השער נועד **לסרב ללחוץ** כששתי שורות תואמות. אדום כאן הוא
    // נכון, וירוק כאן היה אומר שהוא סופר «יש משהו» ⛔ «יש בדיוק אחת».
    const pA = await page(now('<table><tbody><tr data-sym="SNTNL"></tr><tr data-sym="SNTNL"></tr></tbody></table>'));
    const rA = await run(fn, [expect, pA.locator(SEL)]);
    if (rA.threw && rA.msg.includes('Received: 2')) ok('הבחנה: שתי שורות תואמות ⇒ **אדום** עם `Received: 2` — מסרב ללחוץ על עמימות');
    else bad(`הבחנה: שתי שורות תואמות ⛔ עצרו את השער (threw=${rA.threw}) — הוא סופר «יש משהו»`);

    const pD = await page(late(row('SNTNL')));
    const dead = await pD.locator(SEL).count();
    if (dead === 0) ok(`מתה: הצורה הישנה קראה ${dead} ⇒ אדום-שווא בסיבה שגויה (זה כשל 17.09 20:35)`);
    else bad(`מתה: הצורה הישנה קראה ${dead} ⇒ ⛔ הוכח אפס-מוקדם`);
  }
}

await browser.close();

const total = pass + fails.length;
console.log('');
if (fails.length) {
  console.log(`❌ count probe: ${pass}/${total} עברו · ${fails.length} כשלו\n`);
  fails.forEach((f) => console.log(`   · ${f}`));
  process.exit(1);
}
console.log(`✅ count probe: ${pass}/${total} assertions passed — חמש הצורות ממתינות, מסוגלות להיכשל, והזרועות המתות פספסו.\n`);
