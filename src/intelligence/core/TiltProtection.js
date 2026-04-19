// ─── TILT PROTECTION ─────────────────────────────────────────────────────────
// Detects emotional / behavioural risk states and returns a graduated response.
//
// Levels:
//   0 - Clear    → no action
//   1 - Warn     → show caution banner
//   2 - Gate     → force a short self-check before submit
//   3 - Block    → impose a 30-minute cooldown with timer

import {
  trailingLossRun, isRevengeWindow, tradesToday, isOffHours,
  planDeviationsInLastDays, minutesSinceLastClose,
} from "../utils/psychologyPatterns.js";

const LOCAL_KEY = "swingEdgeTiltState";

// ─── LOCAL STATE HELPERS ─────────────────────────────────────────────────────
// Cooldown timestamp persisted in localStorage so a block survives a reload.
const readState = () => {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(LOCAL_KEY) : null;
    return raw ? JSON.parse(raw) : { cooldownUntil: 0, acknowledgements: [] };
  } catch { return { cooldownUntil: 0, acknowledgements: [] }; }
};

const writeState = (state) => {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(state));
    }
  } catch { /* ignore */ }
};

export const engageCooldown = (minutes = 30) => {
  const state = readState();
  state.cooldownUntil = Date.now() + minutes * 60000;
  writeState(state);
  return state.cooldownUntil;
};

export const clearCooldown = () => {
  const state = readState();
  state.cooldownUntil = 0;
  writeState(state);
};

export const acknowledgeWarning = (key) => {
  const state = readState();
  state.acknowledgements = [
    ...(state.acknowledgements || []),
    { key, at: Date.now() },
  ].slice(-20);
  writeState(state);
};

// ─── INDICATOR RULES ─────────────────────────────────────────────────────────
const rules = (trades, nowTs = Date.now()) => {
  const indicators = [];
  const lossRun = trailingLossRun(trades);
  if (lossRun >= 3) indicators.push({
    key: "lossRun",
    severity: lossRun >= 5 ? 3 : 2,
    en: `${lossRun} losses in a row — step away and review before the next trade.`,
    he: `${lossRun} הפסדים ברצף — קח אוויר ונתח לפני העסקה הבאה.`,
  });

  if (isRevengeWindow(trades, nowTs)) {
    const mins = Math.round(minutesSinceLastClose(trades, nowTs));
    indicators.push({
      key: "revenge",
      severity: 2,
      en: `Only ${mins} min since your last loss — revenge-trade risk is high.`,
      he: `עברו רק ${mins} דקות מההפסד האחרון — סיכון גבוה ל-revenge trading.`,
    });
  }

  const today = tradesToday(trades);
  if (today >= 4) indicators.push({
    key: "overtrade",
    severity: today >= 6 ? 3 : 2,
    en: `${today} trades today — overtrading reduces edge.`,
    he: `${today} עסקאות היום — סחר יתר פוגע ב-Edge.`,
  });

  const hour = new Date(nowTs).getHours();
  if (isOffHours(hour)) indicators.push({
    key: "offhours",
    severity: 1,
    en: "Trading outside your usual hours — fatigue and illiquidity are working against you.",
    he: "אתה סוחר מחוץ לשעות הרגילות — עייפות ונזילות נמוכה פועלות נגדך.",
  });

  const planDev = planDeviationsInLastDays(trades, 7);
  if (planDev >= 2) indicators.push({
    key: "planDev",
    severity: 1,
    en: `${planDev} plan deviations in the last 7 days — re-read your plan before entering.`,
    he: `${planDev} חריגות מהתוכנית ב-7 הימים האחרונים — חזור לתוכנית לפני שאתה נכנס.`,
  });

  return indicators;
};

// Level is the max severity across active indicators.
const levelFrom = (indicators) =>
  indicators.reduce((lvl, i) => Math.max(lvl, i.severity), 0);

// ─── PUBLIC API ──────────────────────────────────────────────────────────────
export const checkTilt = (trades = [], nowTs = Date.now()) => {
  const state = readState();
  const cooldownRemainingMs = Math.max(0, (state.cooldownUntil || 0) - nowTs);
  const indicators = rules(trades, nowTs);
  let level = levelFrom(indicators);

  // If an active cooldown exists, force level 3 regardless of current signals.
  if (cooldownRemainingMs > 0) level = 3;

  const labels = {
    0: { en: "Clear",   he: "פנוי",   action: "none" },
    1: { en: "Warning", he: "אזהרה",  action: "warn" },
    2: { en: "Gate",    he: "חסימה רכה", action: "gate" },
    3: { en: "Block",   he: "חסימה מלאה", action: "block" },
  };

  return {
    level,
    label: labels[level],
    indicators,
    cooldownRemainingMs,
    cooldownUntil: state.cooldownUntil || 0,
    suggestion: suggestionFor(level, indicators),
  };
};

const suggestionFor = (level, indicators) => {
  if (level === 0) {
    return { en: "You are in a good headspace — trade your plan.",
             he: "אתה במקום טוב — סחור לפי התוכנית." };
  }
  if (level === 1) {
    return { en: "Pause for 2 minutes. Re-read your plan before you click.",
             he: "עצור ל-2 דקות. קרא שוב את התוכנית לפני שתלחץ." };
  }
  if (level === 2) {
    return { en: "Stop. Confirm: is this a setup from your plan or an emotional reaction?",
             he: "עצור. אשר: האם זה סטאפ מהתוכנית או תגובה רגשית?" };
  }
  return {
    en: "Take a 30-minute break. No new trades until the timer ends.",
    he: "קח הפסקה של 30 דקות. אין עסקאות חדשות עד שהטיימר יסתיים.",
    indicators,
  };
};
