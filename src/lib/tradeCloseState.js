// ─────────────────────────────────────────────────────────────────────────────
// Close-state derivation — the single place that decides `status` + `closedAt`
// from the presence of an exit price.
//
// `status` is DERIVED, never carried over from the previous value: that is what
// makes `status:"CLOSED"` with `exit:null` unrepresentable rather than merely
// undesirable.
// ─────────────────────────────────────────────────────────────────────────────

// `exitDay` is a "YYYY-MM-DD" day key from the Exit Date input. 20:00 local
// matches the convention in src/import/normalizeRow.js — one close-time rule.
export function deriveCloseState({ exit, exitDay, prev }) {
  if (exit == null) return { status: "OPEN", closedAt: null };
  const closedAt = exitDay
    ? new Date(`${exitDay}T20:00:00`).toISOString()
    : (prev?.closedAt ?? new Date().toISOString());
  return { status: "CLOSED", closedAt };
}
