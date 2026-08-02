// ─── ANTI-EDGE LOCK ───────────────────────────────────────────────────────────
// Automatically blocks setups whose expectancy has been negative for
// LOCK_WEEKS consecutive calendar weeks.
//
// Logic:
//   For each setup with enough history:
//     1. Bucket closed trades into ISO calendar weeks.
//     2. Find the N most-recent consecutive weeks that have ≥ MIN_WEEK_TRADES.
//     3. If all N weeks show negative expectancy → LOCKED.
//     4. If N-1 weeks show negative expectancy → WARNING.
//
// A locked setup blocks new trade entry. It is released either manually, or
// automatically once its evidence goes stale — see LOCK_STALE_WEEKS below.

import { getClosed, rStats, winRate, expectedValueR } from "../utils/statisticalModels.js";

const LOCK_WEEKS     = 4;   // consecutive losing weeks before hard lock
const WARN_WEEKS     = 3;   // weeks before soft warning
const MIN_WEEK_TRADES = 2;  // trades needed in a week for it to "count"
const MIN_TOTAL_N    = 8;   // minimum total trades before we evaluate a setup

// How long a lock's evidence still describes today (FIN-038).
//
// The lock is derived from the most recent weeks that CONTAIN TRADES, and it
// blocks entry on that setup. So once it fires, no new trade can be recorded,
// no new week can qualify, the evidence freezes, and the setup stays locked
// forever: the release condition required the very action the lock forbids.
// Past this window the losing streak is history, not a description of the
// present, so the lock steps down to a warning — the setup is still flagged,
// but the trader is allowed to gather the evidence that settles it either way.
const LOCK_STALE_WEEKS = 6;
const WEEK_MS = 7 * 86_400_000;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const setupOf  = (t) => t.setup || null;

const stampOf = (trade) => {
  const raw = trade.closedAt || trade.createdAt || trade.date;
  if (!raw) return null;
  const ms = new Date(raw).getTime();
  return isNaN(ms) ? null : ms;
};

const isoWeekKey = (trade) => {
  const raw = trade.closedAt || trade.createdAt || trade.date;
  if (!raw) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  // ISO-8601 week: buckets run Monday..Sunday and belong to the year owning
  // their Thursday. Anchoring on that Thursday is what keeps a bucket from
  // straddling two real trading weeks, and makes the turn of the year behave.
  const thu = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  thu.setDate(thu.getDate() + 3 - ((thu.getDay() + 6) % 7));
  const week1 = new Date(thu.getFullYear(), 0, 4);
  week1.setDate(week1.getDate() + 3 - ((week1.getDay() + 6) % 7));
  const weekOfYear = 1 + Math.round((thu - week1) / (7 * 86_400_000));
  return `${thu.getFullYear()}-W${String(weekOfYear).padStart(2, "0")}`;
};

// Returns sorted array of the most-recent contiguous week keys that each
// have at least MIN_WEEK_TRADES trades.
const recentContiguousWeeks = (weekMap, n) => {
  const qualifiedWeeks = [...weekMap.entries()]
    .filter(([, trades]) => trades.length >= MIN_WEEK_TRADES)
    .map(([key]) => key)
    .sort()       // lexicographic sort works for YYYY-Wnn
    .reverse();   // most recent first

  if (!qualifiedWeeks.length) return [];

  // Walk back from the most recent week, keeping only consecutive ones.
  const contiguous = [qualifiedWeeks[0]];
  for (let i = 1; i < qualifiedWeeks.length; i++) {
    const prev = qualifiedWeeks[i - 1];
    const curr = qualifiedWeeks[i];
    // Weeks are consecutive if their numbers differ by 1 (handles year
    // boundaries crudely — good enough for this use case).
    const prevNum = parseInt(prev.split("-W")[1], 10);
    const currNum = parseInt(curr.split("-W")[1], 10);
    const prevYear = parseInt(prev.split("-W")[0], 10);
    const currYear = parseInt(curr.split("-W")[0], 10);
    const isConsec =
      (prevYear === currYear && prevNum - currNum === 1) ||
      (prevYear - currYear === 1 && prevNum === 1 && currNum >= 51);
    if (!isConsec) break;
    contiguous.push(curr);
    if (contiguous.length >= n) break;
  }
  return contiguous; // most-recent first
};

// number | null. null means the week held no trade whose R could be measured —
// which is not the same as a week that broke even, and must never lock a setup.
const weekExpectancy = (trades) => {
  if (!trades.length) return null;
  return expectedValueR(trades);
};

// ─── LOCK STATE PERSISTENCE ──────────────────────────────────────────────────
// We keep manual overrides in localStorage so the user can un-lock a setup
// after reviewing and committing to a fix.
const LS_KEY = "swingEdgeAntiEdgeLocks";

const readLockState = () => {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LS_KEY) : null;
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
};

const writeLockState = (state) => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    }
  } catch { /* ignore */ }
};

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
/**
 * checkAntiEdgeLocks(trades, nowMs?)
 *
 * Returns:
 * {
 *   locked:   [ SetupStatus, ... ],   // hard-locked setups
 *   warnings: [ SetupStatus, ... ],   // near-lock warnings
 *   clean:    [ SetupStatus, ... ],   // healthy setups (for debugging)
 *   scanned: number,
 * }
 *
 * SetupStatus = {
 *   setup, negativeWeeks, weeksData, overallAvgR, overallWR,
 *   manuallyUnlocked, message: { en, he }
 * }
 */
export const checkAntiEdgeLocks = (trades = [], nowMs = Date.now()) => {
  const closed = getClosed(trades);
  const lockState = readLockState();

  // Group by setup → week
  const setupWeeks = new Map();
  for (const t of closed) {
    const s = setupOf(t);
    const w = isoWeekKey(t);
    if (!s || !w) continue;
    if (!setupWeeks.has(s)) setupWeeks.set(s, new Map());
    const wm = setupWeeks.get(s);
    if (!wm.has(w)) wm.set(w, []);
    wm.get(w).push(t);
  }

  const locked   = [];
  const warnings = [];
  const clean    = [];

  for (const [setup, weekMap] of setupWeeks.entries()) {
    const allTrades = [...weekMap.values()].flat();
    if (allTrades.length < MIN_TOTAL_N) continue;
    const overallR = rStats(allTrades);

    const recentWeeks = recentContiguousWeeks(weekMap, LOCK_WEEKS);
    if (recentWeeks.length < WARN_WEEKS) continue;

    const weeksData = recentWeeks.map((wk) => {
      const wTrades = weekMap.get(wk) || [];
      const ev      = weekExpectancy(wTrades);
      const { avg: wAvgR, n: wRn } = rStats(wTrades);
      return {
        week: wk,
        n:    wTrades.length,
        expectancy: ev == null ? null : Number(ev.toFixed(2)),
        avgR: wAvgR == null ? null : Number(wAvgR.toFixed(2)),
        rSampleSize: wRn,
        winRate: Math.round(winRate(wTrades) * 100),
        // An unmeasurable week is not a negative week. Locking a setup blocks
        // real entries, so absence of evidence never counts as evidence.
        negative: ev != null && ev < 0,
      };
    });

    const negativeWeeks = weeksData.filter((w) => w.negative).length;
    const manuallyUnlocked = lockState[setup]?.unlocked === true;

    // The lock's evidence is only as current as its newest trade. From that
    // point the clock runs, and the trader can see exactly when it stops.
    const evidenceMs = Math.max(
      ...recentWeeks
        .flatMap((wk) => weekMap.get(wk) || [])
        .map(stampOf)
        .filter((ms) => ms != null)
    );
    const hasEvidenceDate = Number.isFinite(evidenceMs);
    const unlocksAtMs = hasEvidenceDate ? evidenceMs + LOCK_STALE_WEEKS * WEEK_MS : null;
    const unlocksAt   = unlocksAtMs == null ? null : new Date(unlocksAtMs).toISOString();
    const unlockDay   = unlocksAt == null ? null : unlocksAt.slice(0, 10);
    const stale       = unlocksAtMs != null && nowMs > unlocksAtMs;

    const status = {
      setup,
      negativeWeeks,
      weeksData,
      unlocksAt,
      stale,
      overallAvgR: overallR.avg == null ? null : Number(overallR.avg.toFixed(2)),
      overallRSampleSize: overallR.n,
      overallWR:   Math.round(winRate(allTrades) * 100),
      totalTrades: allTrades.length,
      manuallyUnlocked,
    };

    if (negativeWeeks >= LOCK_WEEKS && stale) {
      // The streak is real but it is history. Keep it visible, stop blocking.
      status.message = {
        he: `"${setup}" — ${negativeWeeks} שבועות שליליים, אך הנתונים התיישנו (מאז ${unlockDay}). החסימה הוסרה; סחור בזהירות ובגודל מוקטן.`,
        en: `"${setup}" — ${negativeWeeks} negative weeks, but the evidence is stale (since ${unlockDay}). Lock released; trade cautiously and small.`,
      };
      warnings.push(status);
    } else if (negativeWeeks >= LOCK_WEEKS) {
      status.message = {
        he: `"${setup}" חסום — ${negativeWeeks} שבועות רצופים עם expectancy שלילי. לא מומלץ לסחור עד לבדיקה. החסימה תוסר אוטומטית ב-${unlockDay}.`,
        en: `"${setup}" is locked — ${negativeWeeks} consecutive weeks of negative expectancy. Review before trading. Lock lifts automatically on ${unlockDay}.`,
      };
      if (!manuallyUnlocked) {
        locked.push(status);
      } else {
        // Still surface as warning even if unlocked
        status.message = {
          he: `"${setup}" — פתוח ידנית למרות ${negativeWeeks} שבועות שליליים. שים לב.`,
          en: `"${setup}" — manually unlocked despite ${negativeWeeks} negative weeks. Proceed with caution.`,
        };
        warnings.push(status);
      }
    } else if (negativeWeeks >= WARN_WEEKS) {
      status.message = {
        he: `"${setup}" בדרך לחסימה — ${negativeWeeks}/${LOCK_WEEKS} שבועות עם expectancy שלילי.`,
        en: `"${setup}" approaching lock — ${negativeWeeks}/${LOCK_WEEKS} weeks of negative expectancy.`,
      };
      warnings.push(status);
    } else {
      clean.push(status);
    }
  }

  locked.sort((a, b) => b.negativeWeeks - a.negativeWeeks);
  warnings.sort((a, b) => b.negativeWeeks - a.negativeWeeks);

  return { locked, warnings, clean, scanned: setupWeeks.size };
};

/**
 * isSetupLocked(setup, antiEdgeLockReport)
 * Quick helper for trade-entry forms — returns true if the given setup is
 * hard-locked (and NOT manually overridden).
 */
export const isSetupLocked = (setup, report) => {
  if (!report || !setup) return false;
  return report.locked.some((s) => s.setup === setup && !s.manuallyUnlocked);
};

/**
 * manualUnlock(setup)
 * Saves a manual override to localStorage — the setup will be treated as
 * a warning rather than a hard lock until the next winning week.
 */
export const manualUnlock = (setup) => {
  const state = readLockState();
  state[setup] = { unlocked: true, unlockedAt: Date.now() };
  writeLockState(state);
};

/**
 * manualRelock(setup)
 * Removes the manual override.
 */
export const manualRelock = (setup) => {
  const state = readLockState();
  delete state[setup];
  writeLockState(state);
};
