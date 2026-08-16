import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// ─────────────────────────────────────────────────────────────────────────────
// Trade payload mappers — tradeForSupabase (write) / tradeFromSupabase (read)
// ─────────────────────────────────────────────────────────────────────────────
// These two are sisters: every key the write side renames, the read side must
// rename back. An asymmetry here is invisible in code review and silently
// rewrites the database on the next save.
//
// Only these columns exist in public.trades (verified against information_schema
// on 2026-08-03 — 26 columns, exact match; היו 25 עד שמיגרציית T9 הוסיפה
// `currency`). The client carries extra fields
// (tradeImage, _prediction) for local UX; those are stripped before any
// INSERT / UPDATE / UPSERT so PostgREST does not reject the whole payload.
const TRADE_COLUMNS = new Set([
  "id",
  "user_id",
  "ticker",
  "side",
  "date",
  "entry",
  "stop",
  "target",
  "exit",
  "shares",
  "status",
  "setup",
  "marketCondition",
  "emotionAtEntry",
  "entryQuality",
  "followedPlan",
  "exitReason",
  "notes",
  "lessonLearned",
  "maxFavorable",
  "maxAdverse",
  "_capitalAtEntry",
  "createdAt",
  "closedAt",
  "is_demo",
  // T9 — נוסף אחרי שמיגרציית 20260802140000 הורצה ואומת ב-information_schema.
  // ⚠️ **`default 'USD'` כבר אינו קיים**: `20260812120000` הסירה אותו במכוון
  // (`D-026` — הורצה ואומתה 12.08: `is_nullable=YES` · `column_default=null`),
  // מפני שברירת מחדל שאומרת "אם לא ידעת, זה דולר" מחליפה נתון אמיתי. ⇒ מסלול
  // כתיבה שישמיט את השדה יכתוב `null` ⛔ ולא `USD`. `B-152`.
  // לפני ההרצה מפתח כזה היה מפיל כל INSERT.
  "currency",
  // גל אופק העסקה — נוסף יחד עם מיגרציית 20260810143000 (text nullable,
  // check: short|medium|long). ⚠️ הסדר כפוי: עד שהמיגרציה רצה, המפתח נזרק כאן
  // בשקט והאפליקציה מתנהגת כמו היום; אחריה הוא נשמר. ⛔ העמודה מחזיקה את
  // ההצהרה בלבד — הסימן עצמו נגזר ברינדור ולעולם אינו נשמר
  // (src/lib/tradeHorizon.js).
  "horizon",
  // גל תעודת-המקור (`B-129`) — נוספו אחרי שמיגרציית 20260816120000 הורצה
  // ואומתה ב-information_schema (16.08: ארבע עמודות · `is_nullable=YES`
  // בארבעתן · `column_default` ל-`inserted_at` בלבד · ה-CHECK של
  // `currency_source` מונה חמישה ערכים, ושל `source` שניים).
  // ⚠️ הסדר כפוי ⛔ ואינו סגנוני: מפתח שיושב כאן ועמודתו חסרה בשרת גורם
  // ל-PostgREST לדחות את **כל** ה-INSERT — כל כתיבה, לכל המשתמשים.
  "currency_source",
  "source",
  "import_batch_id",
  // ⛔ `inserted_at` ⛔ **אינו** כאן, ובכוונה: הוא נכתב ב**שרת** (`default now()`).
  //    מפתח מהלקוח היה גובר על ה-default ומחזיר בדיוק את מה שהוא בא לתקן —
  //    חותמת שהלקוח סינתז (`B-042`).
]);

// Client-side-only fields. They are dropped on write by design, so dropping
// them must stay silent — anything NOT listed here is a genuine schema drift
// and gets logged loudly.
const LOCAL_ONLY = new Set([
  "tradeImage",         // base64 chart snapshot — deliberately client-side only
  "tradeImagePreview",  // form-only preview, never part of a persisted trade
  "_prediction",        // AI snapshot graded locally by LearningEngine
  "openDate",           // legacy read-only alias for `date`; never had a column
]);

// עמודות שה**שרת** בעליהן. הן חוזרות ב-`select("*")`, נוסעות בתוך אובייקט
// העסקה שב-state, ומגיעות חזרה לכאן בכל `updateTradeRow(... patch:
// tradeForSupabase(trade))`. ⛔ אסור לשלוח אותן — שליחה מהלקוח גוברת על
// ה-`default` של השרת ומחזירה בדיוק את מה שהעמודה באה לתקן.
//
// ⚠️ הן ⛔ אינן `LOCAL_ONLY`: הרשימה ההיא אומרת "שדה שקיים רק בלקוח", וזה
// ההפך. אבל **הזריקה חייבת להיות שקטה** מאותה סיבה בדיוק — בלי הרשימה הזו כל
// סגירה ועריכה של עסקה שנטענה מה-DB הייתה מדפיסה
// `dropped unknown column(s): inserted_at`, ⇒ רעש שמאמן להתעלם מ-console.error
// שנועד לתפוס סחיפת סכימה אמיתית. נמדד 16.08 מיד אחרי שהמיגרציה רצה.
const SERVER_OWNED = new Set([
  "inserted_at",        // timestamptz default now() — B-042
]);

export function tradeForSupabase(trade) {
  if (!trade || typeof trade !== "object") return {};
  const out = {};
  const dropped = [];
  for (const [k, v] of Object.entries(trade)) {
    if (k === "isDemo") {
      // undefined = "not known", not false. Omitting the column preserves
      // whatever the row already holds instead of demoting a demo trade.
      if (v !== undefined) out.is_demo = v === true;
      continue;
    }
    if (SERVER_OWNED.has(k)) continue;
    if (TRADE_COLUMNS.has(k)) { out[k] = v; continue; }
    if (!LOCAL_ONLY.has(k)) dropped.push(k);
  }
  if (dropped.length) {
    console.error(
      `[tradeForSupabase] dropped unknown column(s): ${dropped.join(", ")} — trade ${trade.id ?? "(no id)"}`
    );
  }
  return out;
}

// Sister of tradeForSupabase: undoes the one rename the write side performs.
// A null/absent is_demo stays absent so the client never sees a fabricated
// `isDemo: false` for a row whose flag was simply never set.
export function tradeFromSupabase(row) {
  if (!row || typeof row !== "object") return row;
  const { is_demo, ...rest } = row;
  return is_demo == null ? rest : { ...rest, isDemo: is_demo === true };
}
