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
  // T9 — נוסף אחרי שמיגרציית 20260802140000 הורצה ואומת ב-information_schema
  // (text, default 'USD'). לפני ההרצה מפתח כזה היה מפיל כל INSERT.
  "currency",
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
