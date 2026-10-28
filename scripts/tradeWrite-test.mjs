// scripts/tradeWrite-test.mjs — כתיבה שמדווחת הצלחה ולא כותבת.
//
// WHY THIS EXISTS. Sentinel תפס ב-06.08 (`browser-auth|ui-delete-incomplete`)
// שהמחיקה ב-UI דיווחה הצלחה בעוד שורות SNTNL נשארו ב-DB. שלוש ההשערות
// המתבקשות — כשל RLS, שגיאת רשת, מרוץ עם hydration — נשללו כולן:
// `restCleanup` בספק של Sentinel מוחק את אותן שורות עם *אותו* משתמש, *אותו*
// anon key ו*אותה* מדיניות `users own trades` ומצליח, ולכן RLS תקין; שגיאת
// רשת הייתה מגיעה ל-`catch`; ו-hydration מחליפה state בלבד ואינה יכולה
// להחזיר שורה ל-DB.
//
// השורש הוא רביעי, והוא מרוץ: `handleSubmit` ירה את ה-INSERT בלי `await`,
// ולכן ה-DELETE יכול היה לצאת על `id` שטרם נכתב.
//
// ⚠️ ומה שהופך אותו לשקט: **DELETE שמתאים אפס שורות מחזיר `error: null`.**
// זו התנהגות PostgREST, לא באג. המסקנה המעשית — ואת זה הקובץ הזה נועל —
// היא ש*שום* בדיקת שגיאה לא יכולה לתפוס את המקרה. רק בדיקת מונה שורות.
// התקדים כבר בריפו: `admin_delete_trade` עושה `get diagnostics row_count`
// (admin_rpcs.sql:402). מסלול האדמין מאמת מונה; מסלול המשתמש לא אימת.
//
// 1–7   — גל המחיקה (07.08). 8–20 — גל הכתיבה (08.08), 6 האתרים הנותרים.
// 21–25 — אתרי ה-RPC בפאנל האדמין (08.08), אותה מחלקה בקובץ אחר.
//
// **קו הבסיס האדום, נמדד מול `fixtures/tradeWrite-legacy.mjs`: 9/25.**
// נכשלו: 1, 2, 6, 8, 9, 10, 12, 13, 14, 15, 16, 18, 20, 21, 22, 24.
//
// ⚠️ אסרציות שעוברות **ריקנית** על הישן — מגן נסיגה, לא ראיה: **3, 4, 5, 7,
// 11, 17, 19, 23, 25.** "המספר המלא = הצלחה" אינו יכול להיכשל בקוד שתמיד מדווח
// הצלחה; 11 עוברת כי ל-shim אין רישום כתיבות כלל ולכן `wait` חוזר מיד; ו-23
// עוברת כי הפאנל הישן **כן** טיפל בשגיאות — הוא זרק ל-catch והציג toast.
// זה בדיוק העניין: מה שנשבר שם אינו טיפול בשגיאה אלא ספירה.
//
// ⚠️ **שלוש תחזיות שלי הופרכו במדידה, ומתועדות כאן כדי שלא יחזרו כהנחה:**
// (א) חזיתי ש-9 ריקנית — היא **מפרידה**, כי היא תובעת גם `.select()`, שהישן
// לא קרא לו כלל. (ב) חזיתי ש-11 מפרידה — היא **ריקנית**, מהסיבה שלמעלה.
// (ג) חזיתי ש-22 ריקנית ("1 שורה = הצלחה") — היא **מפרידה**, כי היא תובעת
// `rows === 1`, והצורה הישנה אינה מחזירה מונה **כלל**.
//
// ⚠️ ה-shim הוא **שחזור** של הלוגיקה הישנה, לא הקוד ההיסטורי עצמו: הוא מעתיק
// את `restoreAt` כלשונו ויש לו ענף שגיאה תקין, ולכן 1–7 נותנות בו 4/7 ולא את
// ה-**2/7 הקפוא** שנמדד בגל המחיקה מול הקוד החי. אלה שני מדדים שונים; הקפוא
// נשאר כפי שנרשם, וההפרש אינו "אסרציה שהתרככה" — 1–7 חייבות 7/7 על המודול.
//
// המודול טהור בכוונה: SwingEdge_App.jsx בן 7,340 שורות ואינו ניתן לייבוא
// ב-node (recharts, lucide). אותו נימוק בדיוק כמו src/lib/replyGate.js.
//
//   node scripts/tradeWrite-test.mjs
//
// קו הבסיס האדום הוא בר-שחזור, לא מדידה חד-פעמית:
//   TRADEWRITE_IMPL=../scripts/fixtures/tradeWrite-legacy.mjs node scripts/tradeWrite-test.mjs

let ran = 0;
const failures = [];

function check(id, desc, cond, detail) {
  ran++;
  if (cond) {
    console.log(`  ✅ ${id}. ${desc}`);
  } else {
    failures.push(id);
    console.error(`  ❌ ${id}. ${desc}\n     → ${detail}`);
  }
}

const ID = "11111111-1111-4111-8111-111111111111";
const USER = "22222222-2222-4222-8222-222222222222";

// A minimal stand-in for the supabase query builder: every filter returns
// `this`, and awaiting the chain yields whatever the scenario declared.
// `calls` records that the filters were actually applied — a DELETE that
// forgets `.eq("user_id", …)` would delete another user's row.
function stubClient(result, calls = {}) {
  calls.filters = [];
  calls.selected = false;
  calls.deletes = 0;
  calls.inserts = 0;
  calls.updates = 0;
  calls.payload = null;
  calls.rpcs = 0;
  calls.rpcName = null;
  calls.rpcArgs = undefined;
  const chain = {
    delete() { calls.deletes++; return chain; },
    insert(rows) { calls.inserts++; calls.payload = rows; return chain; },
    update(patch) { calls.updates++; calls.payload = patch; return chain; },
    eq(col, val) { calls.filters.push([col, val]); return chain; },
    in(col, vals) { calls.filters.push([col, vals]); return chain; },
    select(cols) { calls.selected = cols; return chain; },
    then(res, rej) { return Promise.resolve(result()).then(res, rej); },
  };
  return {
    from(table) { calls.table = table; return chain; },
    // ⚠️ ה-RPC מחזיר סקלר, לא מערך שורות: `returns int` מעל
    // `get diagnostics _n = row_count`. ה-stub מחזיר את אותה שרשרת thenable,
    // ותרחישי ה-RPC מצהירים `data` כמספר.
    rpc(name, args) { calls.rpcs++; calls.rpcName = name; calls.rpcArgs = args; return chain; },
    __calls: calls,
  };
}

const IMPL = process.env.TRADEWRITE_IMPL || "../src/lib/tradeWrite.js";

let mod;
try {
  mod = await import(IMPL);
} catch (e) {
  console.error(`\n❌ ${IMPL} לא ניתן לייבוא: ${e.message}`);
  console.error("   כל האסרציות נכשלות — אין מודול לאמת מולו.\n");
  console.log("0/25 passed");
  process.exit(1);
}

const {
  deleteTradeRow, restoreAt, createPendingWrites, deleteTradeVerified,
  insertTradeRow, updateTradeRow, insertTradeRows, deleteTradeRows,
  rpcCountVerified,
} = mod;

const rowsOf = (n) => Array.from({ length: n }, (_, i) => ({ id: `id-${i}` }));

// ─── 1. אפס שורות = כשל. זה הבאג עצמו. ───────────────────────────────────
{
  const calls = {};
  const client = stubClient(() => ({ data: [], error: null }), calls);
  const r = await deleteTradeRow(client, { id: ID, userId: USER });
  check(
    "1",
    "DELETE שהתאים אפס שורות מדווח כשל — לא הצלחה",
    r && r.ok === false && r.reason === "not-found",
    `החזיר ${JSON.stringify(r)} — PostgREST מחזיר error:null על אפס שורות, ולכן ` +
      `"ok" כאן פירושו שהמשתמש מקבל "העסקה נמחקה" על שורה שעדיין ב-DB`
  );
  check(
    "2",
    "המחיקה מסוננת גם על user_id וגם על id, ומבקשת select כדי לספור",
    calls.deletes === 1 &&
      calls.filters.some(([c, v]) => c === "id" && v === ID) &&
      calls.filters.some(([c, v]) => c === "user_id" && v === USER) &&
      calls.selected !== false,
    `deletes=${calls.deletes} filters=${JSON.stringify(calls.filters)} select=${calls.selected} — ` +
      `בלי select אין גוף תשובה, ובלי גוף תשובה אי אפשר לספור שורות`
  );
}

// ─── 3. שגיאה עוברת כלשונה. ───────────────────────────────────────────────
{
  const client = stubClient(() => ({ data: null, error: { message: "permission denied for table trades" } }));
  const r = await deleteTradeRow(client, { id: ID, userId: USER });
  check(
    "3",
    "שגיאת Supabase מוחזרת כלשונה, לא נבלעת",
    r && r.ok === false && r.reason === "error" && /permission denied/.test(r.message || ""),
    `החזיר ${JSON.stringify(r)} — §2: כל כשל צועק, וההודעה מוצגת כלשונה`
  );
}

// ─── 4. שורה אחת בדיוק = הצלחה. ⚠️ עוברת ריקנית על הישן. ─────────────────
{
  const client = stubClient(() => ({ data: [{ id: ID }], error: null }));
  const r = await deleteTradeRow(client, { id: ID, userId: USER });
  check(
    "4",
    "שורה אחת שחזרה = הצלחה",
    r && r.ok === true,
    `החזיר ${JSON.stringify(r)}`
  );
}

// ─── 5. rollback לאינדקס המקורי. ─────────────────────────────────────────
{
  const gone = { id: "b" };
  const after = [{ id: "a" }, { id: "c" }];
  const back = restoreAt(after, gone, 1);
  check(
    "5",
    "rollback מחזיר את העסקה לאינדקס המקורי, לא לסוף המערך",
    Array.isArray(back) && back.length === 3 && back[1] && back[1].id === "b",
    `החזיר ${JSON.stringify(back && back.map((t) => t.id))} — צפוי ["a","b","c"]; ` +
      `החזרה לסוף מקפיצה את השורה בטבלה ונראית למשתמש כבאג שני`
  );
}

// ─── 6. המרוץ: ה-INSERT התלוי נגמר לפני שה-DELETE יוצא. ─────────────────
{
  const pending = createPendingWrites();
  const order = [];
  let releaseInsert;
  const insert = new Promise((res) => { releaseInsert = () => { order.push("insert"); res(); }; });
  pending.track(ID, insert);

  const client = stubClient(() => { order.push("delete"); return { data: [{ id: ID }], error: null }; });
  const running = deleteTradeVerified(client, { id: ID, userId: USER }, pending);

  // נותנים ל-microtasks להתנקז. אם ה-DELETE לא ממתין — הוא כבר רץ כאן.
  await new Promise((r) => setTimeout(r, 10));
  const firedEarly = order.includes("delete");
  releaseInsert();
  await running;

  check(
    "6",
    "DELETE ממתין ל-INSERT התלוי של אותה עסקה",
    !firedEarly && order[0] === "insert" && order[1] === "delete",
    `סדר בפועל ${JSON.stringify(order)} — DELETE שיוצא לפני שה-INSERT נחת מתאים ` +
      `אפס שורות, וה-INSERT נוחת אחריו: השורה נשארת ב-DB בדיוק כפי ש-Sentinel תפס`
  );
}

// ─── 7. שחרור על settle, לא על resolve. ⚠️ עוברת ריקנית על הישן. ────────
{
  const pending = createPendingWrites();
  const failed = Promise.reject(new Error("insert failed"));
  pending.track(ID, failed);

  const client = stubClient(() => ({ data: [{ id: ID }], error: null }));
  const timeout = new Promise((r) => setTimeout(() => r("TIMED-OUT"), 300));
  const r = await Promise.race([deleteTradeVerified(client, { id: ID, userId: USER }, pending), timeout]);

  check(
    "7",
    "INSERT שנכשל משחרר את הממתין — מחיקה אחריו אינה נתלית",
    r !== "TIMED-OUT",
    `הקריאה לא חזרה תוך 300ms — שחרור על resolve בלבד הופך כשל שקט לתלייה שקטה`
  );
}

// ═══ אתר 5 — handleSubmit. השורש. ════════════════════════════════════════

// ─── 8. INSERT שהחזיר אפס שורות (RLS דוחה) = כשל. תרחיש השורש. ──────────
{
  const client = stubClient(() => ({ data: [], error: null }));
  const r = await insertTradeRow(client, { row: { id: ID, user_id: USER } });
  check(
    "8",
    "INSERT שהחזיר אפס שורות מדווח כשל — העסקה לא נשמרה",
    r && r.ok === false && r.rows === 0,
    `החזיר ${JSON.stringify(r)} — זה המסלול שבו RLS דוחה בשקט: המשתמש רואה ` +
      `"נוספה ליומן", סוגר את הדפדפן, והעסקה איננה. ⚠️ כאן ה-rollback *מסיר* מה-state`
  );
}

// ─── 9. INSERT שהחזיר שורה = הצלחה. ⚠️ עוברת ריקנית על הישן. ────────────
{
  const calls = {};
  const client = stubClient(() => ({ data: [{ id: ID }], error: null }), calls);
  const r = await insertTradeRow(client, { row: { id: ID, user_id: USER } });
  check(
    "9",
    "INSERT שהחזיר שורה אחת = הצלחה, ו-select נתבע כדי לספור",
    r && r.ok === true && calls.inserts === 1 && calls.selected !== false,
    `החזיר ${JSON.stringify(r)} inserts=${calls.inserts} select=${calls.selected}`
  );
}

// ─── 10. INSERT שזרק (רשת) חוזר כערך, לא כחריגה. ────────────────────────
{
  const client = { from() { throw new Error("Failed to fetch"); } };
  const r = await insertTradeRow(client, { row: { id: ID } });
  check(
    "10",
    "INSERT שזרק מוחזר כ-threw עם ההודעה כלשונה, ואינו מפיל את הקורא",
    r && r.ok === false && r.reason === "threw" && /Failed to fetch/.test(r.message || ""),
    `החזיר ${JSON.stringify(r)} — קורא ש"נופל" באמצע משאיר את ה-state אופטימי לנצח`
  );
}

// ─── 11. INSERT שנכשל משחרר את pendingWrites — אין תלייה. ───────────────
{
  const pending = createPendingWrites();
  const client = stubClient(() => ({ data: [], error: null }));
  const p = insertTradeRow(client, { row: { id: ID, user_id: USER } });
  pending.track(ID, p);
  await p;

  const timeout = new Promise((r) => setTimeout(() => r("TIMED-OUT"), 300));
  const waited = await Promise.race([pending.wait(ID).then(() => "RELEASED"), timeout]);
  check(
    "11",
    "INSERT שנכשל משחרר את הרישום — מחיקה אחריו אינה נתלית",
    waited === "RELEASED",
    `pending.wait לא חזר תוך 300ms — כשל שמירה שהופך לתלייה הוא החמרה, לא תיקון`
  );
}

// ═══ אתרים 2·3 — סגירה ועריכה (UPDATE). ══════════════════════════════════

// ─── 12. UPDATE על אפס שורות עם error:null = כשל. ───────────────────────
{
  const client = stubClient(() => ({ data: [], error: null }));
  const r = await updateTradeRow(client, { id: ID, userId: USER, patch: { status: "CLOSED" } });
  check(
    "12",
    "UPDATE שהתאים אפס שורות מדווח כשל — לא 'העסקה עודכנה'",
    r && r.ok === false && r.reason === "not-found",
    `החזיר ${JSON.stringify(r)} — אותה התנהגות PostgREST של #14, באתר אחר: ` +
      `סגירת עסקה שלא נשמרה מדווחת רווח שאינו קיים ב-DB`
  );
}

// ─── 13. UPDATE מסונן על id וגם על user_id. ─────────────────────────────
{
  const calls = {};
  const client = stubClient(() => ({ data: [{ id: ID }], error: null }), calls);
  await updateTradeRow(client, { id: ID, userId: USER, patch: { exit: 10 } });
  check(
    "13",
    "UPDATE מסונן על id וגם על user_id, ומבקש select",
    calls.updates === 1 &&
      calls.filters.some(([c, v]) => c === "id" && v === ID) &&
      calls.filters.some(([c, v]) => c === "user_id" && v === USER) &&
      calls.selected !== false,
    `updates=${calls.updates} filters=${JSON.stringify(calls.filters)} select=${calls.selected}`
  );
}

// ─── 14. UPDATE שהחזיר 2 שורות = כשל, לא הצלחה. ─────────────────────────
{
  const client = stubClient(() => ({ data: [{ id: "a" }, { id: "b" }], error: null }));
  const r = await updateTradeRow(client, { id: ID, userId: USER, patch: { exit: 10 } });
  check(
    "14",
    "UPDATE שנגע ביותר משורה אחת מדווח too-many",
    r && r.ok === false && r.reason === "too-many",
    `החזיר ${JSON.stringify(r)} — id הוא מפתח ראשי, ולכן 2 שורות = הסינון שבור ` +
      `ועסקה של משתמש אחר בדיוק נדרסה. זה חייב לצעוק`
  );
}

// ═══ אתר 4 — מחיקה מרובה. ════════════════════════════════════════════════

// ─── 15. bulk: 3 מתוך 5 = partial, עם ה-ids שלא נמחקו. ──────────────────
{
  const ids = ["a", "b", "c", "d", "e"];
  const client = stubClient(() => ({ data: [{ id: "a" }, { id: "b" }, { id: "c" }], error: null }));
  const r = await deleteTradeRows(client, { ids, userId: USER });
  check(
    "15",
    "מחיקה מרובה חלקית מדווחת 3/5 ומחזירה את שני ה-ids שנשארו",
    r && r.ok === false && r.reason === "partial" && r.rows === 3 &&
      Array.isArray(r.missingIds) && r.missingIds.length === 2 &&
      r.missingIds.includes("d") && r.missingIds.includes("e"),
    `החזיר ${JSON.stringify(r)} — היום ה-toast אומר "5 עסקאות נמחקו" ללא תנאי. ` +
      `בלי missingIds אי אפשר להחזיר ל-state רק את השתיים ששרדו`
  );
}

// ─── 16. bulk: אפס מתוך 5 = כשל מלא, כל ה-ids חוזרים. ───────────────────
{
  const ids = ["a", "b", "c", "d", "e"];
  const client = stubClient(() => ({ data: [], error: null }));
  const r = await deleteTradeRows(client, { ids, userId: USER });
  check(
    "16",
    "מחיקה מרובה שלא מחקה דבר מדווחת כשל, וכל 5 חוזרים",
    r && r.ok === false && r.rows === 0 && r.missingIds && r.missingIds.length === 5,
    `החזיר ${JSON.stringify(r)}`
  );
}

// ─── 17. bulk: 5 מתוך 5 = הצלחה. ⚠️ עוברת ריקנית על הישן. ───────────────
{
  const ids = ["a", "b", "c", "d", "e"];
  const client = stubClient(() => ({ data: ids.map((id) => ({ id })), error: null }));
  const r = await deleteTradeRows(client, { ids, userId: USER });
  check(
    "17",
    "מחיקה מרובה מלאה = הצלחה, בלי ids חסרים",
    r && r.ok === true && r.rows === 5 && r.missingIds.length === 0,
    `החזיר ${JSON.stringify(r)}`
  );
}

// ═══ אתרים 6·7 — ייבוא ו-undo. ═══════════════════════════════════════════

// ─── 18. ייבוא 44 מתוך 47 = partial עם המונים. ──────────────────────────
{
  const rows = rowsOf(47);
  const client = stubClient(() => ({ data: rowsOf(44), error: null }));
  const r = await insertTradeRows(client, { rows });
  check(
    "18",
    "ייבוא חלקי מדווח 44 מתוך 47 — לא 'יובאו 47'",
    r && r.ok === false && r.reason === "partial" && r.rows === 44 && r.missingIds.length === 3,
    `החזיר rows=${r && r.rows} missing=${r && r.missingIds && r.missingIds.length} — ` +
      `§2 (אפס מנה בלי מכנה): הדיווח חייב לשאת את המונה ואת המכנה`
  );
}

// ─── 19. ייבוא 47/47 = הצלחה. ⚠️ עוברת ריקנית על הישן. ──────────────────
{
  const rows = rowsOf(47);
  const client = stubClient(() => ({ data: rowsOf(47), error: null }));
  const r = await insertTradeRows(client, { rows });
  check(
    "19",
    "ייבוא מלא = הצלחה על 47/47",
    r && r.ok === true && r.rows === 47,
    `החזיר ${JSON.stringify(r && { ok: r.ok, rows: r.rows })}`
  );
}

// ─── 20. undo חלקי מדווח מה שרד. ────────────────────────────────────────
{
  const ids = ["x", "y", "z"];
  const client = stubClient(() => ({ data: [{ id: "x" }], error: null }));
  const r = await deleteTradeRows(client, { ids, userId: USER });
  check(
    "20",
    "undo-import חלקי מדווח 1/3 ומחזיר את y ו-z",
    r && r.ok === false && r.rows === 1 &&
      r.missingIds.includes("y") && r.missingIds.includes("z"),
    `החזיר ${JSON.stringify(r)} — undo שמדווח הצלחה ומשאיר שורות ב-DB הוא ` +
      `אותו כשל שקט, רק בכיוון ההפוך`
  );
}

// ═══ אתרי ה-RPC בפאנל האדמין — AdminPanel :960 :1261 :1525. ══════════════
//
// ⚠️ אותה מחלקה בדיוק, בקובץ אחר, ועם הבדל אחד מחמיר: כאן המונה **כבר היה על
// החוט**. שלוש הפונקציות הן `returns int` מעל `get diagnostics _n = row_count`
// (admin_rpcs.sql:404, :424, :444) — הפאנל פירק `{ error }` בלבד וזרק אותו.
// ⛔ `admin_set_feedback_status` (AdminPanel:1236) *אינו* במחלקה: הוא כבר עושה
// `if (!data) throw` וקורא את הערך המוחזר. לא נגענו בו.

// ─── 21. RPC שהחזיר 0 = כשל. המפרידה. ───────────────────────────────────
{
  const calls = {};
  const client = stubClient(() => ({ data: 0, error: null }), calls);
  const r = await rpcCountVerified(client, "admin_delete_trade", { _id: ID });
  check(
    "21",
    "RPC שהחזיר מונה 0 מדווח כשל — לא 'Trade deleted'",
    r && r.ok === false && r.rows === 0,
    `החזיר ${JSON.stringify(r)} — ה-RPC מחזיר את row_count שלו, אבל הפאנל פירק ` +
      `{ error } בלבד. אפס שורות מגיע עם error:null, ולכן האדמין רואה "נמחק" ` +
      `על שורה שנשארה ב-DB. ⚠️ data כאן הוא **מספר**, לא מערך`
  );
}

// ─── 22. RPC שהחזיר 1 = הצלחה. ⚠️ עוברת ריקנית על הישן. ─────────────────
{
  const calls = {};
  const client = stubClient(() => ({ data: 1, error: null }), calls);
  const r = await rpcCountVerified(client, "admin_delete_feedback", { _id: ID });
  check(
    "22",
    "RPC שהחזיר מונה 1 = הצלחה, והשם והארגומנטים הועברו כלשונם",
    r && r.ok === true && r.rows === 1 &&
      calls.rpcs === 1 && calls.rpcName === "admin_delete_feedback" &&
      calls.rpcArgs && calls.rpcArgs._id === ID,
    `החזיר ${JSON.stringify(r)} rpcs=${calls.rpcs} name=${calls.rpcName} args=${JSON.stringify(calls.rpcArgs)}`
  );
}

// ─── 23. שגיאת RPC כלשונה. ⚠️ עוברת ריקנית — הישן כבר זרק וטוסט. ────────
{
  const client = stubClient(() => ({ data: null, error: { message: "not authorized" } }));
  const r = await rpcCountVerified(client, "admin_delete_trade", { _id: ID });
  check(
    "23",
    "שגיאת RPC מוחזרת כלשונה",
    r && r.ok === false && r.reason === "error" && /not authorized/.test(r.message || ""),
    `החזיר ${JSON.stringify(r)}`
  );
}

// ─── 24. מונה לא-ידוע-מראש: מדווחים את המספר, לא כופים שוויון. מפרידה. ──
{
  const client = stubClient(() => ({ data: 12, error: null }));
  const r = await rpcCountVerified(client, "admin_delete_demo_trades", undefined, { expected: null });
  check(
    "24",
    "admin_delete_demo_trades מחזיר את המספר בפועל (12) ואינו נשפט מול צפי",
    r && r.ok === true && r.rows === 12,
    `החזיר ${JSON.stringify(r)} — מוחק לפי פרדיקט ("כל שורות הדמו"), ולכן אין ` +
      `מספר ידוע מראש. ⚠️ אסרציית שוויון מול demoCount שעל המסך הייתה ממציאה ` +
      `כשל מקריאה ישנה. בלי rows אי אפשר לדווח "נמחקו N" בכלל`
  );
}

// ─── 25. מונה לא-ידוע-מראש עדיין נכשל על שגיאה. ──────────────────────────
{
  const client = stubClient(() => ({ data: null, error: { message: "not authorized" } }));
  const r = await rpcCountVerified(client, "admin_delete_demo_trades", undefined, { expected: null });
  check(
    "25",
    "expected:null אינו בולע שגיאות — 'כל מונה תקף' חל רק על ספירה שהצליחה",
    r && r.ok === false && r.reason === "error",
    `החזיר ${JSON.stringify(r)} — מצב "כל מספר מתקבל" הוא בדיוק המצב שבו קל ` +
      `להחזיר ok:true לפני בדיקת השגיאה. זו האסרציה ששומרת על הסדר הזה`
  );
}

// ─── 26–29 · B-129 · תעודת המקור שורדת את מסלול הכתיבה ──────────────────────
//
// ⚠️ ‏25 האסרציות שמעל שואלות "האם הכתיבה קרתה". אלה שואלות שאלה אחרת:
//    **מה בדיוק יוצא מהלקוח אל השרת.** מפתח נכון שנזרק ב-`tradeForSupabase`
//    הוא כשל שקט מושלם — ה-INSERT מצליח, ⛔ והתעודה אינה שם.
{
  const { tradeForSupabase } = await import("../src/supabaseClient.js");
  const { CURRENCY_SOURCE } = await import("../src/lib/instrumentCurrency.js");

  const out = tradeForSupabase({
    id: ID, ticker: "AAPL", currency: "USD",
    currency_source: CURRENCY_SOURCE.MANUAL_CAPITAL,
    source: "manual",
    import_batch_id: "33333333-3333-4333-8333-333333333333",
  });
  check(26, "שלושת שדות התעודה שורדים את tradeForSupabase",
    out.currency_source === "manual_capital" && out.source === "manual" &&
      out.import_batch_id === "33333333-3333-4333-8333-333333333333",
    `יצא ${JSON.stringify(out)} — מפתח שאינו ב-TRADE_COLUMNS נזרק, וה-INSERT ` +
      `היה מצליח בלי התעודה. זו הדרך שבה שדה מקור נעלם בלי שאיש ישים לב`);

  // `inserted_at` חוזר מ-`select("*")`, נוסע ב-state, ומגיע לכאן בכל עריכה.
  // ⛔ אסור שיישלח — הוא ייגבר על ה-`default now()` של השרת.
  const errs = [];
  const realError = console.error;
  console.error = (...a) => errs.push(a.join(" "));
  const round = tradeForSupabase({
    id: ID, ticker: "AAPL", currency: "USD", inserted_at: "2026-08-16T10:00:00Z",
  });
  console.error = realError;
  check(27, "inserted_at ⛔ אינו נשלח — השרת בעליו",
    !("inserted_at" in round),
    `יצא ${JSON.stringify(round)} — ערך מהלקוח גובר על default now(), כלומר ` +
      `העמודה שנועדה לתקן חותמת מסונתזת הייתה מקבלת חותמת מסונתזת`);
  check(28, "⛔ והזריקה שקטה — ⛔ לא רעש בכל עריכה",
    errs.length === 0,
    `הודפסו ${errs.length} שגיאות: ${errs.join(" | ")} — console.error שיורה ` +
      `בכל סגירת עסקה מאמן להתעלם ממנו, וזו בדיוק ההודעה שנועדה לתפוס סחיפת סכימה`);

  // ⚠️ המסלול הידני חי ב-JSX ו-⛔ אינו ניתן לייבוא (7,340 שורות · recharts).
  //    לכן זו בדיקת טקסט — ⛔ ופחות טובה מהרצה. היא נועלת את מה שאפשר לנעול:
  //    שהאובייקט הידני מצהיר, ושהוא מצהיר **הנחה** ⛔ ולא ראיה.
  const { readFileSync } = await import("node:fs");
  const app = readFileSync(new URL("../SwingEdge_App.jsx", import.meta.url), "utf8");
  check(29, "המסלול הידני מצהיר manual_capital ומקור manual",
    // 🆕 09.10 (B-300): התווית והתעודה מגיעות יחד מ-`manualTradeCurrency` (`stamp`); שהתעודה היא
    // MANUAL_CAPITAL נבדק ב-`test:instrument` בלוק 23 (V2).
    /currency:\s*stamp\.currency,\s*\n\s*currency_source:\s*stamp\.currency_source,\s*\n\s*source:\s*"manual",/.test(app),
    `⛔ לא נמצא ליד currency: stamp.currency — עסקה ידנית בלי תעודה נכתבת ` +
      `כ-null, ו-null אומר "נכתב לפני הגל". זו תווית שקר על שורה חדשה`);
}

// ── 30-37 · B-459 (wave 1 F4) — כשל כתיבה מגיע ל-Sentry, tags בלבד ─────────────
//
// 🔴 נמדד 28.10: `0/7` אתרי כשל-כתיבה הגיעו ל-Sentry. ⛔ `err.message`/`details`/`hint` לעולם
// לא נשלחים — הודעת PG על הפרת CHECK היא «Failing row contains (…)», כלומר ערכי השורה.
{
  const tw = await import("../src/lib/tradeWrite.js");
  const tel = await import("../src/lib/telemetry.js");
  const { readFileSync } = await import("node:fs");
  const app = readFileSync(new URL("../SwingEdge_App.jsx", import.meta.url), "utf8");
  const PG = { code: "23514", message: "new row violates check constraint — Failing row contains (AAPL, 187.45, 192.10)", details: "Failing row contains (AAPL, 187.45)", hint: "AAPL 187.45" };
  const r = tw.classifyRows({ data: null, error: PG, status: 400 });
  check(30, "classifyRows נושא status + code (additive) — ⛔ שינוי ב-ok/reason/message/rows",
    r.status === 400 && r.code === "23514" && r.ok === false && r.reason === "error" && r.message === PG.message && r.rows === 0,
    `החזיר ${JSON.stringify(r)}`);
  const none = tw.classifyRows({ data: [], error: null, status: 201 }, { noneReason: "not-written" });
  check(31, "ענף אפס-שורות: status מהתשובה · code null",
    none.status === 201 && none.code === null && none.reason === "not-written", `החזיר ${JSON.stringify(none)}`);

  const tags = tel.writeFailureTags("insert", r);
  check(32, "tags = בדיוק {kind, op, table, status, code, reason}",
    JSON.stringify(Object.keys(tags).sort()) === JSON.stringify(["code", "kind", "op", "reason", "status", "table"])
      && tags.kind === "write_failure" && tags.op === "insert" && tags.table === "trades" && tags.status === 400 && tags.code === "23514" && tags.reason === "error",
    `tags=${JSON.stringify(tags)}`);

  const calls = [];
  tel.reportWriteFailure("insert", r, (...a) => calls.push(a));
  const wire = JSON.stringify(calls, (k, v) => (v instanceof Error ? { name: v.name, message: v.message, stack: v.stack } : v));
  check(33, "reportWriteFailure: נקרא פעם אחת · ⛔ מחיר · ⛔ טיקר · ⛔ «Failing row» בשום שדה (כולל ה-Error)",
    calls.length === 1 && !/187\.45|192\.10|AAPL|Failing row|violates/.test(wire) && calls[0][1].tags.code === "23514",
    `wire=${wire.slice(0, 220)}`);

  const free = tel.writeFailureTags("insert; AAPL", { reason: "AAPL 187.45 rejected", code: "Failing row AAPL", status: "500" });
  check(34, "③ reason/code/op בטקסט חופשי שמכיל AAPL ⇒ \"other\" · status שאינו מספר ⇒ null",
    free.reason === "other" && free.code === "other" && free.op === "other" && free.status === null, `tags=${JSON.stringify(free)}`);

  const src = readFileSync(new URL("../src/lib/tradeWrite.js", import.meta.url), "utf8");
  const literal = new Set([...src.matchAll(/\b(?:reason|noneReason):\s*"([a-z-]+)"/g)].map((m) => m[1]));
  const okReasons = new Set([...src.matchAll(/\bokReason(?:\s*=|:)\s*"([a-z-]+)"/g)].map((m) => m[1]));
  const failureLiterals = [...literal].filter((x) => !okReasons.has(x));
  const missing = failureLiterals.filter((x) => !tw.WRITE_REASONS.includes(x));
  check(35, `WRITE_REASONS מכסה כל reason-כשל ליטרלי ב-tradeWrite.js (${failureLiterals.length})`,
    failureLiterals.length >= 7 && missing.length === 0, `חסרים: ${missing.join(",")} · נמצאו: ${failureLiterals.join(",")}`);

  // צורה: כל אחד מ-7 אתרי ה-console.error של כשל-כתיבה מלווה בקריאה ל-reportWriteFailure עם op סגור.
  const sites = [...app.matchAll(/console\.error\("(?:\[import\] )?[Ss]upabase [a-z -]+ failed:", res\.reason, res\.message\);\s*\n\s*reportWriteFailure\("([a-z_]+)", res\);/g)].map((m) => m[1]);
  const bareSites = (app.match(/console\.error\("(?:\[import\] )?[Ss]upabase [a-z -]+ failed:", res\.reason, res\.message\);/g) || []).length;
  check(36, "7/7 אתרי כשל-כתיבה ב-SwingEdge_App.jsx קוראים ל-reportWriteFailure עם op מתוך WRITE_OPS",
    bareSites === 7 && sites.length === 7 && new Set(sites).size === 7 && sites.every((o) => tel.WRITE_OPS.includes(o)),
    `console.error=${bareSites} · מדווחים=${sites.length} [${sites.join(",")}]`);

  const sCalls = [];
  tel.reportSettingsReadFailure({ message: "permission denied for user 22222222 capital 49000", code: "42501", status: 403 }, (...a) => sCalls.push(a));
  const sWire = JSON.stringify(sCalls);
  check(37, "B-455: settings_read_failed — tags {kind,table,status,code} בלבד · ⛔ message",
    sCalls.length === 1 && sCalls[0][0] === "settings_read_failed" && !/49000|permission denied|22222222/.test(sWire)
      && JSON.stringify(Object.keys(sCalls[0][1].tags).sort()) === JSON.stringify(["code", "kind", "status", "table"]),
    `wire=${sWire.slice(0, 200)}`);
}

console.log(`\n${ran - failures.length}/${ran} passed`);
if (failures.length) {
  console.error(`FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
