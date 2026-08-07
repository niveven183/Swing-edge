// Verified trade deletion: the DELETE, the row-count check, and the rollback.
//
// Pure and dependency-free ON PURPOSE, for the same reason as replyGate.js:
// SwingEdge_App.jsx is 7,308 lines and pulls recharts/lucide, so it will not
// load in node and nothing inside it can be asserted in the blocking chain.
// Living here, this is covered by scripts/deleteTrade-test.mjs.
//
// WHY IT EXISTS. Sentinel caught (06.08, `browser-auth|ui-delete-incomplete`)
// that a UI delete reported success while the row stayed in the DB. The root
// was not RLS, not the network, and not hydration — it was a race: the INSERT
// in handleSubmit was fired without `await`, so a DELETE could go out for an id
// that had not been written yet, match nothing, and let the INSERT land after
// it.
//
// ⚠️ THE LOAD-BEARING FACT: PostgREST returns `error: null` for a DELETE that
// matches zero rows. That is correct behaviour, not a bug — but it means
// `if (error)` can NEVER detect this case. Only counting the returned rows can.
// Hence `.select("id")` below is not decoration; it is the entire mechanism.
// The admin path already knew this: admin_delete_trade does
// `get diagnostics _n = row_count` (admin_rpcs.sql:402).
//
// `ok` is true for EXACTLY one row. Not `>= 1`: the filters are id + user_id
// and id is the primary key, so two rows would mean the filter is broken and
// another user's row just went with it — a case that must never read as success.

/**
 * Issues the DELETE and verifies it actually removed exactly one row.
 * Never throws: every failure comes back as a value the caller must handle.
 */
export async function deleteTradeRow(client, { id, userId } = {}) {
  if (!client || !id || !userId) {
    return { ok: false, reason: "unconfigured", message: "missing client, id or userId" };
  }

  let res;
  try {
    res = await client
      .from("trades")
      .delete()
      .eq("id", id)
      .eq("user_id", userId)
      .select("id");
  } catch (e) {
    return { ok: false, reason: "threw", message: e?.message || String(e) };
  }

  const { data, error } = res || {};
  if (error) {
    return { ok: false, reason: "error", message: error.message || String(error) };
  }

  const n = Array.isArray(data) ? data.length : 0;
  if (n !== 1) {
    // n === 0 is the silent failure this module exists for. It is a real
    // anomaly even when the trade was simply never persisted: it means the
    // user's data was not where they believe it is.
    return {
      ok: false,
      reason: n === 0 ? "not-found" : "too-many",
      message:
        n === 0
          ? "the row was not in the database — the delete removed nothing"
          : `expected 1 row, the delete returned ${n}`,
      rows: n,
    };
  }

  return { ok: true, reason: "deleted", message: "", rows: 1 };
}

/**
 * Rollback helper: puts `trade` back at the index it was removed from.
 * Appending instead would move the row in the journal table, so a failed
 * delete would look to the user like a second, different bug.
 */
export function restoreAt(list, trade, index) {
  const next = Array.isArray(list) ? list.slice() : [];
  const i = Number.isInteger(index) ? Math.max(0, Math.min(index, next.length)) : next.length;
  next.splice(i, 0, trade);
  return next;
}

/**
 * Registry of in-flight writes, keyed by trade id. Closes the create→delete
 * race: a delete waits for its own row's pending INSERT before going out.
 *
 * ⚠️ Releases on SETTLE, not on resolve. If a failed INSERT never released its
 * waiter, a delete after it would hang forever — trading a silent failure for
 * a silent hang, which is strictly worse because it has no end state.
 */
export function createPendingWrites() {
  const map = new Map();

  return {
    track(id, promise) {
      if (!id || !promise) return promise;
      const settled = Promise.allSettled([promise]);
      map.set(id, settled);
      settled.then(() => {
        // Only clear our own entry: a later write for the same id must not be
        // dropped by an earlier one finishing.
        if (map.get(id) === settled) map.delete(id);
      });
      return settled;
    },

    async wait(id) {
      const p = id ? map.get(id) : null;
      if (p) await p;
    },

    get size() {
      return map.size;
    },
  };
}

/**
 * The call site's entry point: wait out any pending write for this row, then
 * delete it and verify.
 */
export async function deleteTradeVerified(client, { id, userId } = {}, pending = null) {
  if (pending) await pending.wait(id);
  return deleteTradeRow(client, { id, userId });
}
