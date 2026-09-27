#!/usr/bin/env node
/**
 * slot-audit.mjs — B-357 · שער ספירת סלוטים
 *
 * השאלה: "האם השרשרת המתוזמנת רעבה?" — ⛔ "האם היא מתה?".
 * watchdog.yml:68 מודד את *גיל* הריצה המוצלחת האחרונה, ו-fleet-daily.yml:344
 * סופר ריצות שנ*כשלו*. שניהם עיוורים מבנית לריצה ש⛔ נוצרה מעולם.
 *
 * ⛔ מתארח ב-sentinel.yml — סלוט שנפל אינו יכול לדווח על היעדרו.
 *    הוא מתארח ב-fleet-daily.yml (וההגבלה שגם *הוא* אינו נמדד היא B-370).
 *
 * שני צירים, ⛔ אחד (הכרעת ניב 27.09):
 *   ציר 1 — מול היעד (48/48). סף הצלחה 80% (מקור: PLAN-2026-09-21 §7, 269/336).
 *            מתחת ל-80% הטקסט אומר "מורעב — בסיס ידוע B-275". ⛔ "GREEN"/"תקין".
 *   ציר 2 — מול הבסיס הנמדד. ⛔ זה, וזה בלבד, קובע את צבע ההתראה, כדי ש⛔ תהיה
 *            אזעקה אדומה קבועה (עייפות-התראות היא איך ששער נהפך לרעש).
 *            תוויות: 🔴 הידרדרות מהבסיס · 🟡 גבולי · ⚪ ברמת הבסיס. ⛔ 🟢.
 *   🟢 שמור בלעדית ל-≥80% מול היעד — מספר ש⛔ נמדד אף פעם בריפו הזה.
 *
 * ⛔ || 0 · ⛔ ?? 0 בכל המסלול: מכנה שנעדר ונופל ל-0 היה מסווג "תקין" אוכלוסייה
 *    שלא נספרה (R-2). מונה שאינו ניתן למדידה מדווח כהימנעות רועשת, ⛔ כאפס.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";

// ── צבעי דיסקורד, זהים ל-fleet-daily.yml ──────────────────────────────────
const COLOR = { RED: 15158332, AMBER: 15844367, GREEN: 3066993, GREY: 9807270 };

// ── ציר 1: סף ההצלחה מול היעד ────────────────────────────────────────────
// מקור מדוד: docs/plans/PLAN-2026-09-21-sentinel-external-trigger.md:393
// "< 269/336 = 80%" הוא כישלון לערוץ החיצוני. ⛔ מספר מומצא.
const TARGET_SUCCESS_PCT = 80;

// ── ציר 2: להקות הבסיס, נגזרות מ-3 משטרים אמיתיים (27.09) ────────────────
// נוכחי 14–26.09 min 10/48 · משטר 14.9% max 9/48 · משטר 10.1% max 7/48
// ⇒ 9→10 הוא פער ריק מדוד. אפס אדום-כזב (0/577) · אפס ירוק-כזב (0/289 ×2).
// 🔴 חובה אחרי ⓕ (Cloudflare): הלהקות נגזרות מחדש מהמשטר החדש — §4.1 בתוכנית.
// ספים ממשטר ישן על משטר חדש = שער מת.
const BASELINE = {
  regressPctMax: 7 / 48,   // ≤ 7/48 ⇒ 🔴 הידרדרות מהבסיס
  borderPctMax: 9 / 48,    // 8–9/48 ⇒ 🟡 גבולי
  label: "149/624 = 23.9% (14–26.09, 13 ימים שלמים)",
};

// ── רצועת החסד: max=407 דק׳ מדוד (n=79 קרונים יומיים/שבועיים) מעוגל ל-7h ──
// סלוט שנומינלית "עבר" לפני שעה אינו ראיה לכלום. הרצועה מוצאת מהמכנה
// ⛔ נספרת כהחמצה: ⛔ סופרים החמצה שאי-אפשר עוד לראות.
const DEFAULT_GRACE_HOURS = 7;
const DEFAULT_WINDOW_HOURS = 24;

// ═══════════════════════════════════════════════════════════════════════════
// פרסינג cron — ⛔ ספרייה (נמדד: אפס חבילות cron/yaml בכל עומק node_modules)
// ═══════════════════════════════════════════════════════════════════════════

const FIELD_RANGE = [
  [0, 59],  // minute
  [0, 23],  // hour
  [1, 31],  // day-of-month
  [1, 12],  // month
  [0, 6],   // day-of-week (0 = Sunday)
];

/** מרחיב שדה cron אחד לקבוצת ערכים. זורק — ⛔ מנחש. */
export function expandField(raw, idx) {
  const [lo, hi] = FIELD_RANGE[idx];
  const out = new Set();
  for (const part of String(raw).split(",")) {
    const m = /^(\*|\d+(?:-\d+)?)(?:\/(\d+))?$/.exec(part.trim());
    if (!m) throw new Error(`שדה cron לא מפורש: "${part}" (שדה ${idx})`);
    const [, spec, stepRaw] = m;
    const step = stepRaw === undefined ? 1 : Number(stepRaw);
    if (!Number.isInteger(step) || step < 1) throw new Error(`step לא תקין: "${part}"`);
    let from, to;
    if (spec === "*") { from = lo; to = hi; }
    else if (spec.includes("-")) {
      const [a, b] = spec.split("-").map(Number);
      from = a; to = b;
    } else { from = Number(spec); to = Number(spec); }
    if (from < lo || to > hi || from > to) throw new Error(`טווח מחוץ לתחום: "${part}" (שדה ${idx}, ${lo}-${hi})`);
    for (let v = from; v <= to; v += step) out.add(v);
  }
  if (out.size === 0) throw new Error(`שדה cron התרוקן: "${raw}"`);
  return out;
}

/** מפרסר ביטוי cron בן 5 שדות. */
export function parseCron(expr) {
  const fields = String(expr).trim().split(/\s+/);
  if (fields.length !== 5) throw new Error(`ביטוי cron חייב 5 שדות, נמצאו ${fields.length}: "${expr}"`);
  const sets = fields.map((f, i) => expandField(f, i));
  const domRestricted = fields[2] !== "*";
  const dowRestricted = fields[4] !== "*";
  // סמנטיקת ה-OR של cron: כששני השדות מוגבלים, cron מפעיל OR ולא AND.
  // ⛔ מנחשים — נמדד 27.09 שאף workflow בריפו אינו מגביל את שניהם.
  if (domRestricted && dowRestricted) {
    throw new Error(`DOM ו-DOW שניהם מוגבלים ב-"${expr}" — סמנטיקת ה-OR של cron ⛔ ממומשת. ⛔ ניתן למדוד.`);
  }
  return { expr, sets, domRestricted, dowRestricted };
}

/** האם רגע נתון הוא סלוט נומינלי של הביטוי. */
function matches(cron, d) {
  const [min, hr, dom, mon, dow] = cron.sets;
  if (!min.has(d.getUTCMinutes()) || !hr.has(d.getUTCHours())) return false;
  if (!mon.has(d.getUTCMonth() + 1)) return false;
  if (cron.dowRestricted) return dow.has(d.getUTCDay());
  return dom.has(d.getUTCDate());
}

/**
 * מונה סלוטים נומינליים בחלון (start, end]. סריקת דקות — ⛔ "חלון ÷ תקופה",
 * שהיא נוסחה שקרית לצעד (סלאש-n) ולליטרל-יום-בחודש.
 * ⛔ לכתוב כאן כוכבית-סלאש בתוך הערת-בלוק: היא סוגרת את ההערה. נמדד 27.09.
 */
export function countSlots(crons, startMs, endMs) {
  const slots = [];
  const first = new Date(Math.floor(startMs / 60000) * 60000 + 60000);
  for (let t = first.getTime(); t <= endMs; t += 60000) {
    const d = new Date(t);
    if (crons.some((c) => matches(c, d))) slots.push(d.toISOString());
  }
  return slots;
}

/** התקופה הקטנה ביותר בין שני סלוטים עוקבים, במילישניות. */
export function minPeriodMs(crons) {
  // סריקת 60 יום מרגע עוגן קבוע — מכסה שבועי, ‎*/3, וליטרל-יום-בחודש.
  const anchor = Date.UTC(2026, 0, 1, 0, 0, 0);
  const hits = [];
  for (let t = anchor; t < anchor + 60 * 86400000; t += 60000) {
    if (crons.some((c) => matches(c, new Date(t)))) hits.push(t);
    if (hits.length > 4000) break;
  }
  if (hits.length < 2) throw new Error("⛔ נמצאו שני סלוטים ב-60 יום — ⛔ ניתן לגזור תקופה");
  let m = Infinity;
  for (let i = 1; i < hits.length; i++) m = Math.min(m, hits[i] - hits[i - 1]);
  return m;
}

// ═══════════════════════════════════════════════════════════════════════════
// חילוץ on.schedule מקובץ workflow
// ═══════════════════════════════════════════════════════════════════════════

export function extractCronLines(yamlText) {
  const lines = [];
  for (const raw of yamlText.split("\n")) {
    const m = /^\s*-\s*cron:\s*['"]?([^'"#]+?)['"]?\s*(?:#.*)?$/.exec(raw);
    if (m) lines.push(m[1].trim());
  }
  if (lines.length === 0) throw new Error("⛔ נמצאה שורת `- cron:` בקובץ — ⛔ ניתן למדוד מכנה");
  return lines;
}

// ═══════════════════════════════════════════════════════════════════════════
// GitHub API
// ═══════════════════════════════════════════════════════════════════════════

async function gh(pathname, token) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`GitHub API ${res.status} על ${pathname}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function fetchScheduledRuns(repo, wf, token) {
  const out = [];
  for (let p = 1; p <= 10; p++) {
    const j = await gh(`/repos/${repo}/actions/workflows/${wf}/runs?event=schedule&per_page=100&page=${p}`, token);
    out.push(...j.workflow_runs);
    if (j.workflow_runs.length < 100) break;
  }
  return out.map((r) => ({
    created_at: r.created_at,
    run_started_at: r.run_started_at,
    conclusion: r.conclusion,
  }));
}

async function fetchCommitsSince(repo, filePath, sinceIso, token) {
  // ⛔ git log — כל checkout בריפו הוא fetch-depth: 1 ⇒ ההיסטוריה אינה על הדיסק.
  const j = await gh(`/repos/${repo}/commits?path=${encodeURIComponent(filePath)}&since=${sinceIso}`, token);
  return j.map((c) => ({ sha: c.sha.slice(0, 7), date: c.commit.committer.date }));
}

// ═══════════════════════════════════════════════════════════════════════════
// הליבה
// ═══════════════════════════════════════════════════════════════════════════

export function classify(numerator, denominator) {
  if (denominator === 0) {
    return {
      color: COLOR.GREY,
      axis1: null,
      axis2: null,
      headline: "0 סלוטים חלפו בחלון — אין מה למדוד (⛔ אחוז)",
    };
  }
  const ratio = numerator / denominator;
  const pct = (ratio * 100).toFixed(1);
  const targetHit = ratio * 100 >= TARGET_SUCCESS_PCT;

  // ציר 1 — מול היעד. ⛔ "GREEN" · ⛔ "תקין" · ⛔ "בזמן" מתחת לסף.
  const axis1 = targetHit
    ? { glyph: "🟢", label: `היעד הושג (≥${TARGET_SUCCESS_PCT}%)` }
    : { glyph: "🔴", label: "מורעב מול היעד (B-275)" };

  // ציר 2 — מול הבסיס. ⛔ 🟢 כאן, לעולם.
  const axis2 = ratio <= BASELINE.regressPctMax
    ? { glyph: "🔴", label: "הידרדרות מהבסיס", color: COLOR.RED }
    : ratio <= BASELINE.borderPctMax
      ? { glyph: "🟡", label: "גבולי", color: COLOR.AMBER }
      : { glyph: "⚪", label: "ברמת הבסיס", color: COLOR.GREY };

  // הצבע נגזר מציר 2 בלבד — אלא אם היעד הושג, ואז ורק אז 🟢.
  const color = targetHit ? COLOR.GREEN : axis2.color;

  const headline = targetHit
    ? `${numerator}/${denominator} (${pct}%) · ${axis1.glyph} ${axis1.label}`
    : `${numerator}/${denominator} (${pct}%) · ${axis2.glyph} ${axis2.label} · ${axis1.glyph} ${axis1.label} — ⛔ תקין`;

  return { color, axis1, axis2, headline, pct, targetHit };
}

export async function audit(opts) {
  const {
    workflow, repo, token, windowHours = DEFAULT_WINDOW_HOURS,
    graceHours = DEFAULT_GRACE_HOURS, now = Date.now(),
    fixture = null, workflowDir = ".github/workflows",
  } = opts;

  const wfPath = path.join(workflowDir, workflow);
  const lines = [];

  // ── מכנה ──────────────────────────────────────────────────────────────
  const yamlText = fixture?.yaml ?? (() => {
    if (!existsSync(wfPath)) throw new Error(`⛔ נמצא קובץ workflow: ${wfPath}`);
    return readFileSync(wfPath, "utf8");
  })();
  const cronLines = extractCronLines(yamlText);
  const crons = cronLines.map(parseCron);
  const periodMs = minPeriodMs(crons);

  // window = max(windowHours, 2 × period) — חלון קצר מהתקופה ⛔ יכול למדוד
  // את הקרון כלל, וחלון *שווה* לתקופה רגיש-לעיכוב בקצה (נמדד: 2/8 ריצות
  // analyst נחתו אחרי סוף חלון של 24h ⇒ אדום כזב).
  const spanMs = Math.max(windowHours * 3600000, 2 * periodMs);
  const endMs = now - graceHours * 3600000;
  const startMs = endMs - spanMs;

  const slots = countSlots(crons, startMs, endMs);
  const denominator = slots.length;

  // ── הימנעות רועשת ─────────────────────────────────────────────────────
  const commits = fixture?.commits ?? await fetchCommitsSince(
    repo, `${workflowDir}/${workflow}`, new Date(startMs).toISOString(), token,
  );
  if (commits.length > 0) {
    const c = commits[0];
    return {
      abstained: true,
      color: COLOR.AMBER,
      description: [
        `🕐 **Slot starvation — ${workflow}**`,
        "⛔ ניתן למדוד — לקובץ היעד יש קומיט בתוך החלון",
        `קומיט: \`${c.sha}\` · ${c.date}  ⇒ המכנה עשוי לתאר לוח זמנים אחר`,
        `חלון: ${new Date(startMs).toISOString()} → ${new Date(endMs).toISOString()}`,
        "🟡 ⛔ ירוק, ⛔ אחוז, ⛔ קביעה על רעב.",
      ].join("\n"),
      denominator, numerator: null, commits,
    };
  }

  // ── מונה ──────────────────────────────────────────────────────────────
  const runs = fixture?.runs ?? await fetchScheduledRuns(repo, workflow, token);
  const inWindow = runs.filter((r) => {
    const t = Date.parse(r.created_at);
    return t > startMs && t <= endMs;
  });
  // חתימת cancelled-while-queued. נמדד 27.09: 0/1082 — created_at ==
  // run_started_at בכל הריצות. הענף נשאר ו*מדפיס את ספירתו*, כדי שענף
  // שמתאים לאפס מקרים לא ייקרא כהצלחה (INCIDENTS#13).
  const queuedCancelled = inWindow.filter(
    (r) => r.run_started_at && r.created_at !== r.run_started_at && r.conclusion === "cancelled",
  );
  const numerator = inWindow.length - queuedCancelled.length;

  const v = classify(numerator, denominator);
  lines.push(`🕐 **Slot starvation — ${workflow}**`);
  lines.push(v.headline);
  lines.push(`חלון: ${new Date(startMs).toISOString()} → ${new Date(endMs).toISOString()} (${(spanMs / 3600000)}h, רצועת חסד ${graceHours}h)`);
  lines.push(`מכנה: ${cronLines.length} קווי cron (${cronLines.join(" · ")}) ⇒ ${denominator} סלוטים נומינליים`);
  if (denominator > 0) {
    lines.push(`מונה: ${inWindow.length} ריצות event=schedule · ניכוי cancelled-while-queued: ${queuedCancelled.length}`);
    lines.push(`ציר 1 — מול היעד: ${numerator}/${denominator} = ${v.pct}% · סף הצלחה ${TARGET_SUCCESS_PCT}% (${Math.ceil(denominator * TARGET_SUCCESS_PCT / 100)}/${denominator}) ⇒ ${v.targetHit ? "הושג" : "מורעב"}`);
    lines.push(`ציר 2 — מול הבסיס ${BASELINE.label}: ${v.axis2.glyph} ${v.axis2.label}`);
    lines.push("צבע ההתראה נגזר מציר 2 בלבד — כדי ש⛔ תהיה אזעקה קבועה. הרעב ⛔ נעלם.");
  }

  return {
    abstained: false, color: v.color, description: lines.join("\n"),
    numerator, denominator, pct: v.pct, targetHit: v.targetHit,
    axis2: v.axis2, queuedCancelled: queuedCancelled.length, slots,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════

function arg(name, dflt) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? dflt : process.argv[i + 1];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const workflow = arg("workflow", "sentinel.yml");
  const out = arg("out", null);
  const repo = process.env.GITHUB_REPOSITORY ?? "niveven183/Swing-edge";
  const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!token) {
    console.error("⛔ GH_TOKEN/GITHUB_TOKEN — ⛔ ניתן למדוד מונה. ⛔ מדווחים אפס.");
    process.exit(1);
  }
  try {
    const r = await audit({
      workflow, repo, token,
      windowHours: Number(arg("window-hours", DEFAULT_WINDOW_HOURS)),
      graceHours: Number(arg("grace-hours", DEFAULT_GRACE_HOURS)),
    });
    console.log(r.description);
    if (out) writeFileSync(out, JSON.stringify({ color: r.color, description: r.description }, null, 2));
  } catch (e) {
    const description = [
      `🕐 **Slot starvation — ${workflow}**`,
      "⛔ ניתן למדוד — המדידה עצמה נכשלה",
      `\`${e.message}\``,
      "🟡 ⛔ ירוק, ⛔ אחוז. כשל מדידה ⛔ הוא «אין רעב».",
    ].join("\n");
    console.error(description);
    if (out) writeFileSync(out, JSON.stringify({ color: COLOR.AMBER, description }, null, 2));
    process.exit(1);
  }
}

export { COLOR, TARGET_SUCCESS_PCT, BASELINE, DEFAULT_GRACE_HOURS };
