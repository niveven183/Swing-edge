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
// Trade payload sanitizer
// ─────────────────────────────────────────────────────────────────────────────
// Only these columns actually exist in public.trades. The client carries extra
// fields (tradeImage, _prediction, etc.) for local UX — strip them before any
// INSERT / UPDATE / UPSERT so PostgREST does not reject the whole payload.
// Also normalizes the camelCase `isDemo` flag to the DB's `is_demo` column.
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
]);

export function tradeForSupabase(trade) {
  if (!trade || typeof trade !== "object") return {};
  const out = {};
  for (const [k, v] of Object.entries(trade)) {
    if (k === "isDemo") {
      out.is_demo = Boolean(v);
      continue;
    }
    if (TRADE_COLUMNS.has(k)) out[k] = v;
  }
  return out;
}
