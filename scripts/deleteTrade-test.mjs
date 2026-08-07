// scripts/deleteTrade-test.mjs — מחיקת עסקה שמדווחת הצלחה ולא מוחקת.
//
// WHY THIS EXISTS. Sentinel תפס ב-06.08 (`browser-auth|ui-delete-incomplete`)
// שהמחיקה ב-UI דיווחה הצלחה בעוד שורות SNTNL נשארו ב-DB. שלוש ההשערות
// המתבקשות — כשל RLS, שגיאת רשת, מרוץ עם hydration — נשללו כולן:
// `restCleanup` בספק של Sentinel מוחק את אותן שורות עם *אותו* משתמש, *אותו*
// anon key ו*אותה* מדיניות `users own trades` ומצליח, ולכן RLS תקין; שגיאת
// רשת הייתה מגיעה ל-`catch`; ו-hydration מחליפה state בלבד ואינה יכולה
// להחזיר שורה ל-DB.
//
// השורש הוא רביעי, והוא מרוץ: `handleSubmit` יורה את ה-INSERT בלי `await`
// (SwingEdge_App.jsx:2416), ולכן ה-DELETE יכול לצאת על `id` שטרם נכתב.
//
// ⚠️ ומה שהופך אותו לשקט: **DELETE שמתאים אפס שורות מחזיר `error: null`.**
// זו התנהגות PostgREST, לא באג. המסקנה המעשית — ואת זה הקובץ הזה נועל —
// היא ש*שום* בדיקת שגיאה לא יכולה לתפוס את המקרה. רק בדיקת מונה שורות.
// התקדים כבר בריפו: `admin_delete_trade` עושה `get diagnostics row_count`
// (admin_rpcs.sql:402). מסלול האדמין מאמת מונה; מסלול המשתמש לא אימת.
//
// 1,2   — אפס שורות = כשל (זה הבאג), והסינון על id+user_id עם select כדי לספור.
// 3,4   — שגיאה עוברת כלשונה (§2 — אפס כשל שקט); שורה אחת = הצלחה.
// 5     — `restoreAt`: rollback לאינדקס המקורי. החזרה ל*סוף* המערך הייתה
//         מקפיצה את השורה בטבלה — rollback שנראה כמו באג שני.
// 6,7   — `createPendingWrites`: סוגר את המרוץ. 7 הוא התנאי שניב הוסיף —
//         שחרור על **settle ולא resolve**, אחרת מחיקה אחרי INSERT שנכשל
//         ממתינה לנצח וה"תיקון" הוא תלייה במקום כשל שקט.
//
// המודול טהור בכוונה: SwingEdge_App.jsx בן 7,308 שורות ואינו ניתן לייבוא
// ב-node (recharts, lucide). אותו נימוק בדיוק כמו src/lib/replyGate.js.
//
//   node scripts/deleteTrade-test.mjs

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
  const chain = {
    delete() { calls.deletes++; return chain; },
    eq(col, val) { calls.filters.push([col, val]); return chain; },
    select(cols) { calls.selected = cols; return chain; },
    then(res, rej) { return Promise.resolve(result()).then(res, rej); },
  };
  return { from(table) { calls.table = table; return chain; }, __calls: calls };
}

let mod;
try {
  mod = await import("../src/lib/tradeDelete.js");
} catch (e) {
  console.error(`\n❌ src/lib/tradeDelete.js לא ניתן לייבוא: ${e.message}`);
  console.error("   כל 7 האסרציות נכשלות — אין מודול לאמת מולו.\n");
  console.log("0/7 passed");
  process.exit(1);
}

const { deleteTradeRow, restoreAt, createPendingWrites, deleteTradeVerified } = mod;

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

// ─── 4. שורה אחת בדיוק = הצלחה. ──────────────────────────────────────────
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

// ─── 7. שחרור על settle, לא על resolve. ─────────────────────────────────
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

console.log(`\n${ran - failures.length}/${ran} passed`);
if (failures.length) {
  console.error(`FAILED: ${failures.join(", ")}`);
  process.exit(1);
}
