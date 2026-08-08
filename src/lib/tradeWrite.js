// Verified trade writes: the query, the row-count check, and the rollback.
//
// Named for WRITES, not deletes: of the 7 call sites this governs only 2 are
// deletes. A file called tradeDelete.js that verifies INSERTs is exactly how a
// second module with duplicated logic gets born.
//
// Pure and dependency-free ON PURPOSE, for the same reason as replyGate.js:
// SwingEdge_App.jsx is 7,340 lines and pulls recharts/lucide, so it will not
// load in node and nothing inside it can be asserted in the blocking chain.
// Living here, this is covered by scripts/tradeWrite-test.mjs.
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
// `ok` is true for EXACTLY the number of rows asked for. Not `>= 1`: on a
// single-row write the filters are id + user_id and id is the primary key, so
// two rows would mean the filter is broken and another user's row just went
// with it — a case that must never read as success.

/**
 * The one classifier. Every verified write in this file is a call to it, so
 * there is exactly one place where "did this write happen" is decided.
 *
 * Pure: takes the settled `{data, error}` and the count that was asked for.
 */
export function classifyRows(res, opts = {}) {
  const { expected = 1, okReason = "written", noneReason = "none", noneMessage = "", noun = "write" } = opts;
  const { data, error } = res || {};

  if (error) {
    return { ok: false, reason: "error", message: error.message || String(error), rows: 0 };
  }

  const rows = Array.isArray(data) ? data.length : 0;
  if (rows === expected) return { ok: true, reason: okReason, message: "", rows };

  if (rows > expected) {
    return {
      ok: false,
      reason: "too-many",
      message: `expected ${expected} row${expected === 1 ? "" : "s"}, the ${noun} returned ${rows}`,
      rows,
    };
  }

  // rows < expected. Zero and partial are different failures for the caller:
  // zero rolls the whole optimistic change back, partial rolls back only the
  // rows that did not land.
  if (rows === 0) {
    return {
      ok: false,
      reason: noneReason,
      message: noneMessage || `the ${noun} affected no rows — the data is not where it appears to be`,
      rows: 0,
    };
  }
  return {
    ok: false,
    reason: "partial",
    message: `only ${rows} of ${expected} rows were written`,
    rows,
  };
}

// Runs the built query and never throws: a transport failure comes back as a
// value, like every other failure, so no caller can forget to handle it.
async function settle(build, opts) {
  let res;
  try {
    res = await build();
  } catch (e) {
    return { ok: false, reason: "threw", message: e?.message || String(e), rows: 0 };
  }
  return classifyRows(res, opts);
}

// Ids that came back from the write, for the bulk paths. Without knowing WHICH
// rows landed, a partial failure could only be rolled back wholesale — which
// would undo the rows that did succeed.
function withIds(result, data, asked) {
  const returnedIds = Array.isArray(data) ? data.map((r) => r && r.id).filter(Boolean) : [];
  const got = new Set(returnedIds);
  return { ...result, returnedIds, missingIds: asked.filter((id) => !got.has(id)) };
}

/**
 * Issues the DELETE and verifies it actually removed exactly one row.
 * Never throws: every failure comes back as a value the caller must handle.
 */
export async function deleteTradeRow(client, { id, userId } = {}) {
  if (!client || !id || !userId) {
    return { ok: false, reason: "unconfigured", message: "missing client, id or userId" };
  }
  return settle(
    () => client.from("trades").delete().eq("id", id).eq("user_id", userId).select("id"),
    {
      expected: 1,
      okReason: "deleted",
      noneReason: "not-found",
      noneMessage: "the row was not in the database — the delete removed nothing",
      noun: "delete",
    }
  );
}

/**
 * INSERT of a single trade, verified. THIS IS THE ROOT SITE: the fire-and-
 * forget insert it replaces is what created the create→delete race in #14.
 *
 * ⚠️ A failed insert means the trade is NOT saved, so the caller must remove it
 * from state — the opposite of the delete rollback, which puts a row back.
 */
export async function insertTradeRow(client, { row } = {}) {
  if (!client || !row || !row.id) {
    return { ok: false, reason: "unconfigured", message: "missing client or row" };
  }
  return settle(() => client.from("trades").insert(row).select("id"), {
    expected: 1,
    okReason: "inserted",
    noneReason: "not-written",
    noneMessage: "the database accepted no row — the trade was not saved",
    noun: "insert",
  });
}

/**
 * UPDATE of a single trade, verified. Covers both the edit and the close.
 * The id + user_id filter stays: an update that matched two rows touched
 * somebody else's trade and must never read as success.
 */
export async function updateTradeRow(client, { id, userId, patch } = {}) {
  if (!client || !id || !userId || !patch) {
    return { ok: false, reason: "unconfigured", message: "missing client, id, userId or patch" };
  }
  return settle(
    () => client.from("trades").update(patch).eq("id", id).eq("user_id", userId).select("id"),
    {
      expected: 1,
      okReason: "updated",
      noneReason: "not-found",
      noneMessage: "the row was not in the database — the update changed nothing",
      noun: "update",
    }
  );
}

/** Bulk INSERT (import), verified per row. Reports which ids did not land. */
export async function insertTradeRows(client, { rows } = {}) {
  const asked = Array.isArray(rows) ? rows.map((r) => r && r.id).filter(Boolean) : [];
  if (!client || !asked.length) {
    return { ok: false, reason: "unconfigured", message: "missing client or rows", rows: 0, returnedIds: [], missingIds: asked };
  }
  let res;
  try {
    res = await client.from("trades").insert(rows).select("id");
  } catch (e) {
    return { ok: false, reason: "threw", message: e?.message || String(e), rows: 0, returnedIds: [], missingIds: asked };
  }
  const verdict = classifyRows(res, {
    expected: asked.length,
    okReason: "inserted",
    noneReason: "not-written",
    noneMessage: `none of the ${asked.length} rows were saved`,
    noun: "insert",
  });
  return withIds(verdict, res && res.data, asked);
}

/** Bulk DELETE (bulk delete, undo-import), verified. Reports what survived. */
export async function deleteTradeRows(client, { ids, userId } = {}) {
  const asked = Array.isArray(ids) ? ids.filter(Boolean) : [];
  if (!client || !userId || !asked.length) {
    return { ok: false, reason: "unconfigured", message: "missing client, ids or userId", rows: 0, returnedIds: [], missingIds: asked };
  }
  let res;
  try {
    res = await client.from("trades").delete().in("id", asked).eq("user_id", userId).select("id");
  } catch (e) {
    return { ok: false, reason: "threw", message: e?.message || String(e), rows: 0, returnedIds: [], missingIds: asked };
  }
  const verdict = classifyRows(res, {
    expected: asked.length,
    okReason: "deleted",
    noneReason: "not-found",
    noneMessage: `none of the ${asked.length} rows were in the database`,
    noun: "delete",
  });
  return withIds(verdict, res && res.data, asked);
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
