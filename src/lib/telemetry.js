// src/lib/telemetry.js — the one door through which a failed write reaches Sentry (B-459, wave 1 F4).
//
// 🔴 MEASURED 28.10 (WAVE1-DIAGNOSIS §F4): 0/7 trade-write failure paths reached Sentry. The user
// was told (7/7 toast.error), Niv was not — no count, no alert, no way to know a write path broke.
//
// ⛔ TAGS ONLY, and every tag is a closed value (Niv 28.10):
//   · op      — the caller's fixed name from WRITE_OPS
//   · table   — "trades" | "user_settings"
//   · status  — an HTTP status integer 100-599, else null
//   · code    — a PostgREST/Postgres code (≤ 10 chars of A-Z 0-9), else "other"
//   · reason  — WRITE_REASONS from src/lib/tradeWrite.js, else "other" (fix ③)
// ⛔ err.message / details / hint are NEVER sent: Postgres CHECK violations read
//    "Failing row contains (…)" — the row's own values (ticker, prices).
// The event's breadcrumbs are dropped in sentryBeforeSend (kind ∈ BARE_KINDS) for the same reason.
// The console.error at each call site stays, so the browser console keeps the detail.

import * as Sentry from "@sentry/react";
import { WRITE_REASONS } from "./tradeWrite.js";

export const WRITE_OPS = Object.freeze(["insert", "close", "delete", "bulk_delete", "update", "import_insert", "import_undo"]);
const REASONS = new Set(WRITE_REASONS);
const OPS = new Set(WRITE_OPS);
const CODE_RE = /^[A-Z0-9]{1,10}$/;

export const closedStatus = (s) => (Number.isInteger(s) && s >= 100 && s <= 599 ? s : null);
export const closedCode = (c) => (c == null ? null : typeof c === "string" && CODE_RE.test(c) ? c : "other");
export const closedReason = (r) => (REASONS.has(r) ? r : "other");
export const closedOp = (o) => (OPS.has(o) ? o : "other");

/** The exact tag set a write failure carries. Pure — tested by test:write. */
export function writeFailureTags(op, res, table = "trades") {
  return {
    kind: "write_failure",
    op: closedOp(op),
    table: table === "user_settings" ? "user_settings" : "trades",
    status: closedStatus(res?.status),
    code: closedCode(res?.code),
    reason: closedReason(res?.reason),
  };
}

export function settingsReadFailureTags(err) {
  return {
    kind: "settings_read_failure",
    table: "user_settings",
    status: closedStatus(err?.status),
    code: closedCode(err?.code),
  };
}

/** `capture` is injectable for tests; production passes nothing and gets Sentry. */
export function reportWriteFailure(op, res, capture = Sentry.captureException) {
  const tags = writeFailureTags(op, res);
  try {
    capture(new Error("trade_write_failed"), { tags, fingerprint: ["trade_write_failed", tags.op, String(tags.code)] });
  } catch (e) {
    // The report must never become a second failure on top of the write that failed.
    console.error("telemetry: reportWriteFailure could not capture", e?.name);
  }
  return tags;
}

export function reportSettingsReadFailure(err, capture = Sentry.captureMessage) {
  const tags = settingsReadFailureTags(err);
  try {
    capture("settings_read_failed", { level: "error", tags, fingerprint: ["settings_read_failed", String(tags.code)] });
  } catch (e) {
    console.error("telemetry: reportSettingsReadFailure could not capture", e?.name);
  }
  return tags;
}
