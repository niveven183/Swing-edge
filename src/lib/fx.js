// ─── FX — THE ONLY FILE THAT CONVERTS MONEY ─────────────────────────────────
//
// Principle 2 of T10: one conversion function. Not "one per screen", not "the
// dashboard has its own". The equity chart's Y-axis and its tooltip disagreed
// (T10 finding 2) because two places each formatted money their own way; two
// places each *converting* money their own way is the same bug with a bigger
// blast radius, because it produces a wrong number instead of a wrong glyph.
//
// ── Present values vs past values ───────────────────────────────────────────
//
// This is the distinction the whole module exists to enforce:
//
//   PRESENT — capital, current equity, position size, risk, a live price.
//             Converted at the CURRENT rate. These are claims about now.
//
//   PAST    — the P&L of a closed trade, a point on the equity curve.
//             Converted at the rate OF THAT TRADE'S DAY.
//
// Why past values may not use today's rate, stated plainly because it is the
// easiest rule in this file to "simplify" away later: a trade closed on 31.03
// converted at today's rate would show a different shekel profit every single
// morning, with nobody having touched it. A number that moves by itself is a
// lie. The 31.03 fixing, by contrast, is the same number forever — so a P&L
// converted at it is stable for good.
//
// ── Never invent a rate ─────────────────────────────────────────────────────
// Principle 4. When there is no rate, `convert` returns `{ value: null, reason }`
// and the caller shows the ORIGINAL currency with a marker — the same contract
// `calcTradeMetrics` already honours when it reports `rMultiple: null` rather
// than fabricating a risk denominator. There is deliberately no `|| 1` and no
// default rate anywhere below. A wrong rate is worse than a visible gap,
// because a gap prompts a question and a wrong number does not.

const FX_ENDPOINT = "/api/fx";

// Historical (immutable) rates persist across sessions; spot lives in memory
// only. Versioned so the shape can change later without poisoning old clients.
const LS_KEY = "swingEdgeFxRatesV1";

// ─── Pure core ───────────────────────────────────────────────────────────────

/**
 * A rate table as produced by `buildRateTable` / the /api/fx client below.
 *   { base: "USD", spot: { rate, rateDate } | null,
 *     byDay: { "2026-03-31": { rate, rateDate }, … },
 *     quote: "ILS" }
 *
 * @param {number} amount    magnitude in `from` currency
 * @param {string} from      ISO code the amount is denominated in
 * @param {string} to        ISO code to express it in
 * @param {object} rateTable see above; may be null
 * @param {string} [dateKey] local YYYY-MM-DD. Present ⇒ this is a PAST value and
 *                           must use that day's rate. Absent ⇒ PRESENT value,
 *                           uses spot.
 * @returns {{ value: number|null, rate: number|null, rateDate: string|null, reason?: string }}
 */
export const convert = (amount, from, to, rateTable, dateKey) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) {
    return { value: null, rate: null, rateDate: null, reason: "amount_not_a_number" };
  }

  // Identity is not a conversion. Returning the input untouched — rather than
  // multiplying by a rate of 1.0 — is what makes $200 → ₪ → $200 exactly 200
  // and not 199.99999999999997. Round-trip exactness is structural here, not a
  // consequence of where we happened to round.
  if (from === to) return { value: n, rate: 1, rateDate: null };

  if (!rateTable || rateTable.quote !== to || rateTable.base !== from) {
    return { value: null, rate: null, rateDate: null, reason: "no_rate_table" };
  }

  const entry = dateKey ? rateTable.byDay?.[dateKey] : rateTable.spot;
  if (!entry || !Number.isFinite(entry.rate) || entry.rate <= 0) {
    // A missing day is normal, not exceptional: weekends and ECB holidays have
    // no fixing. `resolveDayRate` below is what walks back to the previous
    // business day; if even that found nothing, there is genuinely no rate.
    return {
      value: null,
      rate: null,
      rateDate: null,
      reason: dateKey ? "no_rate_for_day" : "no_spot_rate",
    };
  }

  return { value: n * entry.rate, rate: entry.rate, rateDate: entry.rateDate };
};

/**
 * The rate to use for a calendar day, walking back to the most recent fixing.
 *
 * Markets close; the ECB publishes on business days only. A trade closed on a
 * Sunday has no Sunday rate and never will. Walking back is the same rule the
 * upstream applies for a single-date request — implemented here too because a
 * RANGE response simply omits non-business days rather than back-filling them.
 *
 * `rateDate` carries the day actually used, so the UI can say "at the 27.03
 * rate" instead of implying a Sunday fixing existed.
 *
 * @param {Record<string, number>} byDay  day → rate, as returned by /api/fx range
 * @param {string} dateKey                YYYY-MM-DD
 * @param {number} [maxBack]              business-day gap to tolerate
 */
export const resolveDayRate = (byDay, dateKey, maxBack = 7) => {
  if (!byDay || !dateKey) return null;
  const start = new Date(dateKey + "T00:00:00Z").getTime();
  if (isNaN(start)) return null;

  for (let i = 0; i <= maxBack; i++) {
    const key = new Date(start - i * 86400000).toISOString().slice(0, 10);
    const rate = byDay[key];
    if (Number.isFinite(rate) && rate > 0) return { rate, rateDate: key };
  }
  // Beyond a week of no fixing something is wrong with the data, not with the
  // calendar. Refuse rather than reach further back for a rate that would be
  // stale enough to be misleading.
  return null;
};

/**
 * Assemble the table `convert` consumes from a raw /api/fx range payload plus
 * an optional spot payload. Pure — no I/O — so it is directly testable.
 */
export const buildRateTable = (base, quote, rangeRates, spot, dayKeys = []) => {
  const byDay = {};
  const raw = {};
  for (const [day, obj] of Object.entries(rangeRates || {})) {
    const r = obj?.[quote];
    if (Number.isFinite(r) && r > 0) raw[day] = r;
  }
  // Pre-resolve every day we will actually be asked about, so `convert` stays a
  // pure lookup and the weekend walk-back happens exactly once per day.
  for (const day of dayKeys) {
    const hit = resolveDayRate(raw, day);
    if (hit) byDay[day] = hit;
  }
  return {
    base,
    quote,
    byDay,
    spot: spot && Number.isFinite(spot.rate) && spot.rate > 0
      ? { rate: spot.rate, rateDate: spot.rateDate || null }
      : null,
  };
};

// ─── Client ──────────────────────────────────────────────────────────────────

const readCache = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    // A corrupt or unavailable localStorage must not break conversion — it only
    // costs a network round-trip. This is the one swallow in the file, and it
    // swallows a cache miss, not an error about money.
    return {};
  }
};

const writeCache = (obj) => {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch {
    // Quota exceeded / private mode. Same reasoning as readCache.
  }
};

const cacheKey = (base, quote) => `${base}_${quote}`;

/**
 * Fetch everything needed to convert a journal: one spot rate plus one range
 * covering every day that has a trade on it. Two requests total, regardless of
 * how many trades there are.
 *
 * Historical days are read from localStorage first and never re-fetched — ECB
 * past fixings are immutable, so a cached one cannot go stale (this is the
 * property that made derive-on-read viable without a DB migration).
 *
 * @returns {Promise<object|null>} a rate table for `convert`, or null when no
 *          rate could be obtained. Null means "show the original currency with
 *          a marker" — it never means "assume 1".
 */
export const loadRateTable = async (base, quote, dayKeys = []) => {
  if (base === quote) return { base, quote, byDay: {}, spot: { rate: 1, rateDate: null } };

  const days = [...new Set(dayKeys.filter(Boolean))].sort();
  const cache = readCache();
  const slot = cache[cacheKey(base, quote)] || {};
  const cachedDays = slot.byDay || {};

  const today = new Date().toISOString().slice(0, 10);
  // Only days strictly in the past are cacheable — today's fixing may still be
  // published later, so a "today" entry is refetched rather than trusted.
  const missing = days.filter((d) => d < today && !cachedDays[d]);
  const needsRange = missing.length > 0 || days.some((d) => d >= today);

  let rangeRates = {};
  // Seed from cache first so an upstream failure still converts every day we
  // have already seen, rather than losing the whole journal to one bad request.
  for (const [d, r] of Object.entries(cachedDays)) rangeRates[d] = { [quote]: r };

  const qs = `base=${base}&symbols=${quote}`;

  try {
    const calls = [fetch(`${FX_ENDPOINT}?${qs}`)];
    if (needsRange && days.length) {
      // One call covers the journal's whole span — the reason frankfurter was
      // chosen over a per-date provider.
      calls.push(fetch(`${FX_ENDPOINT}?${qs}&start=${days[0]}&end=${days[days.length - 1]}`));
    }
    const [spotRes, rangeRes] = await Promise.all(calls);

    let spot = null;
    if (spotRes?.ok) {
      const b = await spotRes.json();
      const r = b?.rates?.[quote];
      if (Number.isFinite(r) && r > 0) spot = { rate: r, rateDate: b.date || null };
      else console.warn(`[fx] no spot rate for ${base}/${quote}: ${b?.error || "absent"}`);
    }

    if (rangeRes?.ok) {
      const b = await rangeRes.json();
      if (b?.rates && Object.keys(b.rates).length) {
        rangeRates = { ...rangeRates, ...b.rates };
        // Persist only immutable (strictly past) days.
        const merged = { ...cachedDays };
        for (const [d, obj] of Object.entries(b.rates)) {
          const r = obj?.[quote];
          if (d < today && Number.isFinite(r) && r > 0) merged[d] = r;
        }
        cache[cacheKey(base, quote)] = { byDay: merged };
        writeCache(cache);
      } else {
        console.warn(`[fx] no historical rates for ${base}/${quote}: ${b?.error || "absent"}`);
      }
    }

    const table = buildRateTable(base, quote, rangeRates, spot, days);
    // A table with neither a spot rate nor a single day is not a table.
    if (!table.spot && Object.keys(table.byDay).length === 0) return null;
    return table;
  } catch (err) {
    console.warn(`[fx] rate table unavailable for ${base}/${quote}: ${err?.message || err}`);
    // Fall back to whatever immutable history we already hold. Still no spot, so
    // present values will correctly report "no rate" rather than borrow a past one.
    if (Object.keys(rangeRates).length) {
      return buildRateTable(base, quote, rangeRates, null, days);
    }
    return null;
  }
};
