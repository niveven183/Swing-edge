// scripts/fixtures/tradeWrite-legacy.mjs — הלוגיקה **הישנה**, לקו הבסיס האדום.
//
// ⚠️ זהו לא קוד חי ואינו מיובא מהאפליקציה. הוא קיים כדי שקו הבסיס האדום יהיה
// **בר-שחזור בכל רגע**, ולא מדידה חד-פעמית שמישהו רשם ביומן:
//
//   TRADEWRITE_IMPL=../scripts/fixtures/tradeWrite-legacy.mjs node scripts/tradeWrite-test.mjs
//
// כל פונקציה כאן משחזרת את מה ש-`SwingEdge_App.jsx` עשה בפועל לפני הגל:
//   · INSERT — fire-and-forget, שגיאה ל-console, המשתמש תמיד רואה הצלחה.
//   · UPDATE / bulk DELETE — `if (error)` בלבד. אפס שורות מחזיר `error:null`,
//     ולכן הענף לא נכנס וה-toast מדווח את המספר שהתבקש, לא את שקרה.
//   · deleteTradeRow — הצורה שקדמה ל-#14, לצורך 1–7.
//
// ⛔ אין לייבא מכאן לקוד מוצר. הקובץ נועד להיכשל.

export async function deleteTradeRow(client, { id, userId } = {}) {
  try {
    const { error } = await client.from("trades").delete().eq("id", id).eq("user_id", userId);
    if (error) return { ok: false, reason: "error", message: error.message };
  } catch (e) {
    return { ok: false, reason: "threw", message: e?.message || String(e) };
  }
  return { ok: true, reason: "deleted", message: "", rows: 1 };
}

export async function insertTradeRow(client, { row } = {}) {
  // fire-and-forget: הקורא לא המתין, ולכן התשובה תמיד "הצלחה".
  try {
    Promise.resolve(client.from("trades").insert(row)).then(({ error }) => {
      if (error) console.error("Supabase insert failed:", error);
    });
  } catch (e) {
    console.error("Supabase insert threw:", e);
  }
  return { ok: true, reason: "inserted", message: "", rows: 1 };
}

export async function updateTradeRow(client, { id, userId, patch } = {}) {
  try {
    const { error } = await client.from("trades").update(patch).eq("id", id).eq("user_id", userId);
    if (error) return { ok: false, reason: "error", message: error.message };
  } catch (e) {
    return { ok: false, reason: "threw", message: e?.message || String(e) };
  }
  return { ok: true, reason: "updated", message: "", rows: 1 };
}

export async function insertTradeRows(client, { rows } = {}) {
  const asked = Array.isArray(rows) ? rows.map((r) => r && r.id).filter(Boolean) : [];
  try {
    Promise.resolve(client.from("trades").insert(rows)).then(({ error }) => {
      if (error) console.warn("[import] supabase insert:", error.message);
    });
  } catch { /* נבלע */ }
  return { ok: true, reason: "inserted", message: "", rows: asked.length, returnedIds: asked, missingIds: [] };
}

export async function deleteTradeRows(client, { ids, userId } = {}) {
  const asked = Array.isArray(ids) ? ids.filter(Boolean) : [];
  try {
    const { error } = await client.from("trades").delete().in("id", asked).eq("user_id", userId);
    if (error) return { ok: false, reason: "error", message: error.message, rows: 0, returnedIds: [], missingIds: asked };
  } catch (e) {
    return { ok: false, reason: "threw", message: e?.message || String(e), rows: 0, returnedIds: [], missingIds: asked };
  }
  // ⚠️ הכשל: המונה הוא מה שהתבקש, לא מה שחזר.
  return { ok: true, reason: "deleted", message: "", rows: asked.length, returnedIds: asked, missingIds: [] };
}

// אלה כבר היו נכונים בגל המחיקה — מועתקים כדי ש-5,6,7 ימדדו את מה שהן מודדות.
export function restoreAt(list, trade, index) {
  const next = Array.isArray(list) ? list.slice() : [];
  const i = Number.isInteger(index) ? Math.max(0, Math.min(index, next.length)) : next.length;
  next.splice(i, 0, trade);
  return next;
}

// ⚠️ הצורה הישנה: אין רישום כתיבות בכלל. זה המרוץ עצמו.
export function createPendingWrites() {
  return { track(id, promise) { return promise; }, async wait() {}, get size() { return 0; } };
}

export async function deleteTradeVerified(client, args, pending) {
  if (pending) await pending.wait(args && args.id);
  return deleteTradeRow(client, args);
}

export function classifyRows() {
  throw new Error("classifyRows did not exist before the write wave");
}
