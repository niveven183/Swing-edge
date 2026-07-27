// scripts/user-analytics.mjs — SwingEdge user-behaviour analytics agent (runs in CI)
//
// Phase A: reads ONLY what already exists in Supabase. Zero instrumentation, zero
// writes, zero LLM. Produces one long report (emailed privately) and one short
// summary (Discord). See docs/plans/PLAN-2026-07-27-user-analytics.md.
//
// ── Hard constraints, enforced in code below, not by convention ──────────────
// 1. READ-ONLY. Every psql call is prefixed with `SET default_transaction_read_only`.
// 2. NO JOURNAL CONTENT. `notes`/`lessonLearned`/`content`/`message` may appear only
//    inside count()/length(). Enforced by assertNoContentColumns() on every query.
// 3. NO FULL IDENTIFIERS. The finished report is scanned for UUIDs and e-mail
//    addresses by assertNoIdentifiers(); a hit throws rather than sends.
// 4. THE REPO IS PUBLIC. Actions logs and artifacts are world-readable, so stdout
//    carries aggregate numbers only — never a per-user line — and nothing is
//    uploaded as an artifact. Per-user detail exists only in the e-mail.
// 5. NO INVENTED DELTAS. A missing or corrupt state file yields "אין בסיס
//    להשוואה", never a fabricated change.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || "";
const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "true";
const STATE_DIR = ".analytics-state";
const STATE_FILE = `${STATE_DIR}/prev.json`;
const STAMP = new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";

const warnings = []; // non-fatal degradations, surfaced in the report
const warn = (m) => {
  warnings.push(m);
  console.error(`::warning::${m}`);
};

// ── privacy guards ───────────────────────────────────────────────────────────

const CONTENT_COLS = ["notes", "lessonLearned", "content", "message", "user_email"];

// Strips the ONLY permitted wrappers, then fails if a bare content column remains.
// count(x) / count(NULLIF(x,'')) / length(x) are aggregate-safe; anything else is not.
function assertNoContentColumns(sql) {
  const wrapped = new RegExp(
    `(count|length)\\(\\s*(NULLIF\\(\\s*)?"?(${CONTENT_COLS.join("|")})"?\\s*(,\\s*''\\s*\\))?\\s*\\)`,
    "gi"
  );
  const stripped = sql.replace(wrapped, "AGG");
  for (const col of CONTENT_COLS) {
    if (new RegExp(`\\b${col}\\b`, "i").test(stripped)) {
      throw new Error(`privacy guard: bare reference to "${col}" in SQL — refusing to run`);
    }
  }
}

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const EMAIL_RE = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;

// Last line of defence: the composed report must contain no full UUID and no
// e-mail address, whatever the queries did.
function assertNoIdentifiers(text, where) {
  if (UUID_RE.test(text)) throw new Error(`privacy guard: full UUID found in ${where}`);
  if (EMAIL_RE.test(text)) throw new Error(`privacy guard: e-mail address found in ${where}`);
}

// ── psql plumbing ────────────────────────────────────────────────────────────

const RO = "SET default_transaction_read_only = on;";

// Returns array-of-arrays, or null on failure (never throws to the caller, so one
// broken metric degrades to "לא זמין" instead of killing the whole report).
function q(sql, label) {
  assertNoContentColumns(sql);
  if (!SUPABASE_DB_URL) {
    warn(`${label}: SUPABASE_DB_URL not set`);
    return null;
  }
  try {
    // -q is load-bearing, not cosmetic. Without it psql prints the command tag
    // "SET" for the read-only preamble on stdout, so rows[0] becomes ["SET"] and
    // every metric silently reads one row off. Caught in dispatch run #1
    // (trades=NaN, warnings=0). fleet-daily.yml uses -tAq for the same reason.
    const out = execFileSync(
      "psql",
      [SUPABASE_DB_URL, "-v", "ON_ERROR_STOP=1", "-tAqF", "|", "-c", `${RO} ${sql}`],
      { encoding: "utf8", timeout: 30000, stdio: ["ignore", "pipe", "pipe"] },
    );
    if (out.trim() === "") return [];
    const rows = out.trim().split("\n").map((l) => l.split("|"));
    // Belt and braces: if a bare command tag ever reappears, say so instead of
    // letting it masquerade as data.
    if (rows.length && rows[0].length === 1 && /^(SET|BEGIN|COMMIT)$/.test(rows[0][0])) {
      warn(`${label}: psql emitted a command tag ("${rows[0][0]}") as a data row — dropped`);
      rows.shift();
    }
    return rows;
  } catch (e) {
    // Surface psql's first line only — never the connection string.
    const first = String(e.stderr || e.message || "").split("\n").find(Boolean) || "unknown psql error";
    warn(`${label}: psql failed — ${first.slice(0, 160)}`);
    return null;
  }
}

const one = (rows) => (rows && rows[0] ? rows[0] : null);
const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
const show = (v) => (v === null || v === undefined || Number.isNaN(v) ? "לא זמין" : String(v));

// k-anonymity: any segment count of 1 or 2 is reported as a range, so a single
// user cannot be isolated by cross-referencing segments.
const kAnon = (n) => (n === null ? "לא זמין" : n === 0 ? "0" : n >= 3 ? String(n) : "1-2");

// ── import detection ─────────────────────────────────────────────────────────
//
// A trade is "import residue" if ANY of three independent signals fires:
//   (a) createdAt precedes the account itself — structurally impossible by hand,
//       so zero false positives.
//   (b) time-of-day is exactly 11:30:00.000000 UTC — the observed signature of the
//       CSV importer, which stamps a fixed session time.
//   (c) >=20 trades in one 10-minute window with no stop and no notes — catches an
//       importer that stamps now() instead of the CSV date.
// They agree exactly on today's data (25/25); assertImportSignalAgreement() shouts
// if they ever diverge, which would mean the import path changed.
//
// REJECTED — "whole second, no sub-second component": it fires on 24 of the 40
// trades of the single healthiest manual user (100% stop, 95% notes). A rule that
// labels the best data in the system as imported makes the report harmful.
const CTE = `
WITH acct AS (SELECT id, created_at FROM auth.users),
real_t AS (
  SELECT t.*, u.created_at AS acct_created
  FROM public.trades t JOIN acct u ON u.id = t.user_id
  WHERE t.is_demo IS NOT TRUE AND t.user_id IS NOT NULL
),
imp_bucket AS (
  SELECT user_id, floor(extract(epoch FROM "createdAt")/600) AS b
  FROM real_t
  GROUP BY user_id, floor(extract(epoch FROM "createdAt")/600)
  HAVING count(*) >= 20 AND count(stop) = 0 AND count(NULLIF(notes,'')) = 0
),
tagged AS (
  SELECT r.*,
    (r."createdAt" < r.acct_created) AS sig_predates,
    (to_char(r."createdAt" AT TIME ZONE 'UTC','HH24:MI:SS.US') = '11:30:00.000000') AS sig_1130,
    EXISTS (SELECT 1 FROM imp_bucket ib
            WHERE ib.user_id = r.user_id
              AND ib.b = floor(extract(epoch FROM r."createdAt")/600)) AS sig_batch
  FROM real_t r
),
marked AS (SELECT *, (sig_predates OR sig_1130 OR sig_batch) AS is_import FROM tagged),
clean AS (SELECT * FROM marked WHERE NOT is_import)
`;

// Optional fields whose fill-rate we track. Text fields are '' -> NULL normalised.
// notes/lessonLearned appear ONLY inside count(NULLIF(...)) — we count whether, never what.
const FIELDS = [
  ["stop", "stop"],
  ["target", "target"],
  ["setup", "NULLIF(setup,'')"],
  ["emotionAtEntry", `NULLIF("emotionAtEntry",'')`],
  ["followedPlan", `NULLIF("followedPlan",'')`],
  ["marketCondition", `NULLIF("marketCondition",'')`],
  ["entryQuality", `NULLIF("entryQuality",'')`],
  ["maxFavorable", `"maxFavorable"`],
  ["maxAdverse", `"maxAdverse"`],
  ["notes (אם, לא מה)", "NULLIF(notes,'')"],
  ["lessonLearned (אם, לא מה)", `NULLIF("lessonLearned",'')`],
];

// ── gatherers ────────────────────────────────────────────────────────────────

// Determinism probe: three consecutive exact counts through psql. Aggregate-only,
// so it is safe to print in a public log. Existing to settle "is our measurement
// path stable?" — a report built on a shifting count is noise that looks like signal.
function determinismProbe() {
  const runs = [];
  for (let i = 1; i <= 3; i++) {
    const r = one(q(`SELECT count(*), count(DISTINCT user_id) FROM public.trades;`, `determinism run${i}`));
    if (!r) { runs.push(null); continue; }
    const n = num(r[0]), users = num(r[1]);
    // A count that does not parse as a finite number means the row we read was
    // not the row we asked for. That must be an alarm, not a NaN printed calmly.
    if (!Number.isFinite(n) || !Number.isFinite(users)) {
      warn(`determinism run${i}: count did not parse as a number — psql output shape is wrong`);
      runs.push(null);
      continue;
    }
    runs.push({ n, users });
  }
  const ok = runs.every((r) => r && runs[0] && r.n === runs[0].n && r.users === runs[0].users);
  return { runs, ok };
}

// status is a load-bearing string: the real values are UPPERCASE 'OPEN'/'CLOSED'.
// A query written against 'open' returns 0 forever and looks perfectly healthy.
function assertStatusDomain() {
  const rows = q(`SELECT DISTINCT status FROM public.trades;`, "status domain");
  if (!rows) return null;
  const seen = rows.map((r) => r[0]).filter(Boolean);
  const unexpected = seen.filter((s) => s !== "OPEN" && s !== "CLOSED");
  return { seen, unexpected };
}

function assertImportSignalAgreement() {
  const r = one(
    q(
      `${CTE}
       SELECT count(*) FILTER (WHERE sig_predates),
              count(*) FILTER (WHERE sig_1130),
              count(*) FILTER (WHERE sig_batch),
              count(*) FILTER (WHERE is_import),
              count(*)
       FROM marked;`,
      "import signals"
    )
  );
  if (!r) return null;
  return {
    predates: num(r[0]),
    at1130: num(r[1]),
    batch: num(r[2]),
    any: num(r[3]),
    total: num(r[4]),
  };
}

function gatherFunnel() {
  const r = one(
    q(
      `${CTE}
       SELECT
         (SELECT count(*) FROM auth.users),
         (SELECT count(DISTINCT user_id) FROM clean),
         (SELECT count(*) FROM (SELECT user_id FROM clean GROUP BY user_id HAVING count(*) >= 5) x),
         (SELECT count(DISTINCT user_id) FROM clean WHERE "createdAt" >= now() - interval '7 days'),
         (SELECT round(percentile_cont(0.5) WITHIN GROUP (
             ORDER BY extract(epoch FROM (first_at - acct_created))/86400)::numeric, 1)
          FROM (SELECT user_id, acct_created,
                       min(GREATEST("createdAt", acct_created)) AS first_at
                FROM clean GROUP BY user_id, acct_created) f);`,
      "funnel"
    )
  );
  if (!r) return null;
  return {
    signedUp: num(r[0]),
    firstTrade: num(r[1]),
    fiveTrades: num(r[2]),
    active7d: num(r[3]),
    medianDaysToFirst: num(r[4]),
  };
}

function gatherStuck() {
  const r = one(
    q(
      `${CTE}
       SELECT
         (SELECT count(*) FROM auth.users u
            WHERE NOT EXISTS (SELECT 1 FROM clean c WHERE c.user_id = u.id)),
         (SELECT count(*) FROM auth.users u
            WHERE NOT EXISTS (SELECT 1 FROM clean c WHERE c.user_id = u.id)
              AND u.created_at < now() - interval '7 days'),
         (SELECT count(*) FROM (
            SELECT user_id FROM clean GROUP BY user_id
            HAVING count(*) BETWEEN 1 AND 2 AND max("createdAt") < now() - interval '7 days') x),
         (SELECT count(DISTINCT user_id) FROM clean
            WHERE status = 'OPEN' AND "createdAt" < now() - interval '30 days'),
         (SELECT count(*) FROM clean
            WHERE status = 'OPEN' AND "createdAt" < now() - interval '30 days'),
         (SELECT count(*) FROM (
            SELECT user_id FROM clean GROUP BY user_id
            HAVING max("createdAt") < now() - interval '7 days'
               AND max("createdAt") >= now() - interval '30 days'
               AND count(*) >= 3) x);`,
      "stuck"
    )
  );
  if (!r) return null;
  return {
    noTrades: num(r[0]),
    noTradesOver7d: num(r[1]),
    oneOrTwoThenGone: num(r[2]),
    openOver30dUsers: num(r[3]),
    openOver30dTrades: num(r[4]),
    wentQuiet: num(r[5]),
  };
}

// Primary metric is the MEDIAN OF PER-USER fill rates (user = unit of analysis).
// The pooled percentage is reported beside it, explicitly flagged, because a single
// heavy user drags it: at one point one account held 69% of all trades and pulled
// pooled `stop` fill to 22% while the per-user median was 100%.
function gatherFillRates() {
  const perField = [];
  for (const [label, expr] of FIELDS) {
    const r = one(
      q(
        `${CTE}
         SELECT
           (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY pct)::numeric, 0)
              FROM (SELECT count(${expr})*100.0/count(*) AS pct
                      FROM clean GROUP BY user_id HAVING count(*) >= 3) a),
           (SELECT round(percentile_cont(0.5) WITHIN GROUP (ORDER BY pct)::numeric, 0)
              FROM (SELECT count(${expr})*100.0/count(*) AS pct
                      FROM clean WHERE "createdAt" >= now() - interval '7 days'
                     GROUP BY user_id HAVING count(*) >= 3) b),
           (SELECT round(count(${expr})*100.0/NULLIF(count(*),0), 0) FROM clean);`,
        `fill:${label}`
      )
    );
    perField.push({
      label,
      median: r ? num(r[0]) : null,
      median7d: r ? num(r[1]) : null,
      pooled: r ? num(r[2]) : null,
    });
  }
  const cohort = one(
    q(`${CTE} SELECT count(*) FROM (SELECT user_id FROM clean GROUP BY user_id HAVING count(*) >= 3) x;`, "fill cohort")
  );
  return { perField, cohortUsers: cohort ? num(cohort[0]) : null };
}

// Per-user anomaly lines. Short IDs only, and these go to the e-mail exclusively —
// never to Discord, never to stdout.
function gatherAnomalies() {
  const rows = q(
    `${CTE}
     SELECT left(user_id::text,8), kind, n FROM (
       SELECT user_id, 'ייבוא — עסקאות שאינן התנהגות מסחר' AS kind, count(*) AS n
         FROM marked WHERE is_import GROUP BY user_id
       UNION ALL
       SELECT user_id, '>20 עסקאות ביום אחד' AS kind, count(*) AS n
         FROM clean GROUP BY user_id, "createdAt"::date HAVING count(*) > 20
       UNION ALL
       SELECT user_id, 'כל העסקאות בלי stop' AS kind, count(*) AS n
         FROM clean GROUP BY user_id HAVING count(stop) = 0 AND count(*) >= 3
       UNION ALL
       SELECT user_id, 'כל העסקאות באותו טיקר' AS kind, count(*) AS n
         FROM clean GROUP BY user_id HAVING count(DISTINCT ticker) = 1 AND count(*) >= 3
       UNION ALL
       SELECT user_id, 'CLOSED בלי closedAt' AS kind, count(*) AS n
         FROM clean WHERE status = 'CLOSED' AND "closedAt" IS NULL GROUP BY user_id
     ) a ORDER BY kind, n DESC;`,
    "anomalies"
  );
  if (!rows) return null;
  return rows.map(([uid, kind, n]) => ({ uid, kind, n: num(n) }));
}

function gatherFeedbackMentoring() {
  const r = one(
    q(
      `SELECT
         (SELECT count(*) FROM public.feedback WHERE created_at >= now() - interval '24 hours'),
         (SELECT count(*) FROM public.feedback WHERE status IS DISTINCT FROM 'resolved'),
         (SELECT count(*) FROM public.mentor_invites),
         (SELECT count(*) FROM public.mentor_invites WHERE used_at IS NOT NULL),
         (SELECT count(*) FROM public.mentorships WHERE status = 'active'),
         (SELECT count(*) FROM public.weekly_reviews WHERE last_reviewed_at >= now() - interval '7 days');`,
      "feedback/mentoring"
    )
  );
  const types = q(
    `SELECT type, count(*) FROM public.feedback GROUP BY type ORDER BY 2 DESC LIMIT 5;`,
    "feedback types"
  );
  if (!r) return null;
  return {
    new24h: num(r[0]),
    unresolved: num(r[1]),
    invites: num(r[2]),
    invitesUsed: num(r[3]),
    activeMentorships: num(r[4]),
    reviews7d: num(r[5]),
    types: types ? types.map(([t, n]) => ({ type: t || "(ללא)", n: num(n) })) : null,
  };
}

// Aggregate integer snapshot. This is the ONLY persisted state, and it is the only
// way to see a DELETION: a time-window query sees additions only, because a deleted
// row leaves no timestamp to query. 173 trades — 60% of the dataset — were removed
// on 2026-07-27 with no trace anywhere.
function gatherSnapshot() {
  const r = one(
    q(
      `${CTE}
       SELECT (SELECT count(*) FROM public.trades),
              (SELECT count(*) FROM real_t),
              (SELECT count(*) FROM clean),
              (SELECT count(DISTINCT user_id) FROM clean),
              (SELECT count(*) FROM auth.users),
              (SELECT count(*) FROM clean WHERE status = 'OPEN'),
              (SELECT count(*) FROM clean WHERE status = 'CLOSED'),
              (SELECT count(*) FROM public.feedback),
              (SELECT count(*) FROM public.waitlist);`,
      "snapshot"
    )
  );
  if (!r) return null;
  return {
    trades: num(r[0]),
    real: num(r[1]),
    clean: num(r[2]),
    usersWithTrades: num(r[3]),
    users: num(r[4]),
    open: num(r[5]),
    closed: num(r[6]),
    feedback: num(r[7]),
    waitlist: num(r[8]),
  };
}

const SNAPSHOT_LABELS = {
  trades: "סה\"כ עסקאות",
  real: "עסקאות אמיתיות",
  clean: "עסקאות אחרי סינון ייבוא",
  usersWithTrades: "משתמשים עם עסקאות",
  users: "משתמשים",
  open: "פתוחות",
  closed: "סגורות",
  feedback: "פידבק",
  waitlist: "רשימת המתנה",
};

function readPrevState() {
  try {
    if (!existsSync(STATE_FILE)) return { prev: null, reason: "אין קובץ מצב קודם" };
    const parsed = JSON.parse(readFileSync(STATE_FILE, "utf8"));
    if (!parsed || typeof parsed !== "object" || !parsed.snapshot) {
      return { prev: null, reason: "קובץ המצב פגום" };
    }
    // Integers only — refuse anything else, so the file can never carry identifiers.
    for (const v of Object.values(parsed.snapshot)) {
      if (v !== null && !Number.isInteger(v)) return { prev: null, reason: "קובץ המצב מכיל ערך לא-שלם" };
    }
    return { prev: parsed, reason: null };
  } catch (e) {
    return { prev: null, reason: `קריאת קובץ המצב נכשלה (${String(e.message).slice(0, 80)})` };
  }
}

function writeState(snapshot) {
  try {
    mkdirSync(STATE_DIR, { recursive: true });
    const payload = { date: new Date().toISOString().slice(0, 10), snapshot };
    const text = JSON.stringify(payload);
    // The state file is committed to nothing and uploaded nowhere, but it rides the
    // Actions cache — so it gets the same identifier scan as the report.
    assertNoIdentifiers(text, "state file");
    writeFileSync(STATE_FILE, text);
  } catch (e) {
    warn(`state write failed: ${String(e.message).slice(0, 120)}`);
  }
}

// ── report composition ───────────────────────────────────────────────────────

function buildReport(d) {
  const L = [];
  const p = (s = "") => L.push(s);

  p(`📊 User Analytics — ${STAMP}`);
  if (DRY_RUN) p(`⚠️ DRY RUN — אימות בלבד, לא נשלח דיווח אוטומטי.`);
  p("");

  // -- measurement integrity ------------------------------------------------
  p("── תקינות המדידה ──");
  if (d.probe) {
    const r = d.probe.runs.map((x) => (x ? x.n : "כשל")).join(" · ");
    p(`• שלוש ספירות count(*) רצופות דרך psql: ${r}`);
    p(`• דטרמיניסטי: ${d.probe.ok ? "✅ כן" : "🔴 לא — המדידה אינה יציבה"}`);
  } else p("• 🔴 בדיקת הדטרמיניסטיות לא רצה");
  if (d.status) {
    p(
      d.status.unexpected.length
        ? `• 🟠 ערכי status לא צפויים: ${d.status.unexpected.join(", ")} (מצופה OPEN/CLOSED)`
        : `• ערכי status: ${d.status.seen.join(", ")} ✅`
    );
  }
  if (d.signals) {
    p(
      `• אותות ייבוא — קודם-להרשמה ${d.signals.predates} · 11:30 ${d.signals.at1130} · אצווה ${d.signals.batch} → סה"כ ${d.signals.any} מתוך ${d.signals.total}`
    );
    if (d.signals.predates !== d.signals.at1130) {
      p(`  🟠 שני האותות המבניים חלוקים — ייתכן שנתיב הייבוא השתנה. בדוק.`);
    }
  }
  p("");

  // -- day over day ---------------------------------------------------------
  p("── שינוי מאתמול ──");
  if (!d.prev) {
    p(`• אין בסיס להשוואה (${d.prevReason}). הדוח הבא כבר ישווה.`);
  } else if (!d.snapshot) {
    p("• לא זמין — שאילתת התמונה נכשלה.");
  } else {
    let moved = 0;
    for (const [k, label] of Object.entries(SNAPSHOT_LABELS)) {
      const cur = d.snapshot[k];
      const was = d.prev.snapshot ? d.prev.snapshot[k] : null;
      if (cur === null || was === null || was === undefined) continue;
      if (cur === was) continue;
      moved++;
      const diff = cur - was;
      const mark = diff < 0 ? "🔴 ירידה" : "▲";
      p(`• ${label}: ${was} → ${cur} (${mark} ${diff > 0 ? "+" : ""}${diff})`);
    }
    if (!moved) p("• ללא שינוי בכל המדדים המצטברים.");
    p(`• (בסיס ההשוואה: ${d.prev.date || "לא ידוע"})`);
  }
  p("");

  // -- funnel ---------------------------------------------------------------
  p("── משפך ──");
  if (!d.funnel) p("• לא זמין");
  else {
    const f = d.funnel;
    const pct = (a, b) => (a !== null && b ? ` (${Math.round((a * 100) / b)}%)` : "");
    p(`• נרשמו: ${show(f.signedUp)}`);
    p(`• עסקה ראשונה: ${show(f.firstTrade)}${pct(f.firstTrade, f.signedUp)}`);
    p(`• 5+ עסקאות: ${show(f.fiveTrades)}${pct(f.fiveTrades, f.signedUp)}`);
    p(`• פעילים ב-7 הימים האחרונים: ${show(f.active7d)}`);
    p(`• חציון ימים מהרשמה לעסקה ראשונה: ${show(f.medianDaysToFirst)}`);
    p(`  (ספירות המשפך אינן מוסתרות — הן סך-הכול, לא חתך שמזהה יחיד.)`);
  }
  p("");

  // -- stuck ----------------------------------------------------------------
  p("── תקיעות ──");
  if (!d.stuck) p("• לא זמין");
  else {
    const s = d.stuck;
    p(`• נרשמו ואפס עסקאות: ${kAnon(s.noTrades)} · מתוכם מעל 7 ימים: ${kAnon(s.noTradesOver7d)}`);
    p(`• 1–2 עסקאות ואז >7 ימים שקט: ${kAnon(s.oneOrTwoThenGone)}`);
    p(`• עסקאות פתוחות מעל 30 יום: ${show(s.openOver30dTrades)} אצל ${kAnon(s.openOver30dUsers)} משתמשים`);
    p(`• היו פעילים ונעלמו השבוע: ${kAnon(s.wentQuiet)}`);
  }
  p("");

  // -- fill rates -----------------------------------------------------------
  p("── איכות מילוי ──");
  if (!d.fill) p("• לא זמין");
  else {
    p(`• מדד ראשי: חציון בין משתמשים עם ≥3 עסקאות (קוהורט: ${kAnon(d.fill.cohortUsers)} משתמשים).`);
    p(`• "מצטבר" הוא מספר משני ו**מוטה-ריכוזיות** — משתמש כבד אחד מזיז אותו. אל תסיק ממנו.`);
    for (const f of d.fill.perField) {
      const flag = f.median !== null && f.median < 40 ? "🟠 " : "";
      p(
        `  ${flag}${f.label}: חציון ${show(f.median)}% · 7 ימים ${show(f.median7d)}% · מצטבר ${show(f.pooled)}%`
      );
    }
    p(`• תמונת גרף — לא נמדד: אין עמודה כזו ואין Storage bucket (ראה PLAN §0.4).`);
  }
  p("");

  // -- anomalies (e-mail only) ----------------------------------------------
  p("── אנומליות ──");
  if (!d.anomalies) p("• לא זמין");
  else if (!d.anomalies.length) p("• אין.");
  else for (const a of d.anomalies) p(`• user_${a.uid} — ${a.kind}: ${a.n}`);
  p("");

  // -- feedback / mentoring -------------------------------------------------
  p("── פידבק ומנטורינג ──");
  if (!d.fb) p("• לא זמין");
  else {
    p(`• פידבק חדש (24ש'): ${show(d.fb.new24h)} · ממתין לטיפול: ${show(d.fb.unresolved)}`);
    if (d.fb.types && d.fb.types.length) {
      p(`• לפי סוג: ${d.fb.types.map((t) => `${t.type} ${t.n}`).join(" · ")} (סוג בלבד — לא תוכן)`);
    }
    p(`• הזמנות מנטור: ${show(d.fb.invites)} נשלחו · ${show(d.fb.invitesUsed)} מומשו · ${show(d.fb.activeMentorships)} קשרים פעילים`);
    p(`• weekly_reviews שזזו ב-7 ימים: ${show(d.fb.reviews7d)}`);
  }
  p("");

  if (warnings.length) {
    p("── אזהרות ריצה ──");
    for (const w of warnings) p(`• ${w}`);
    p("");
  }
  p("— דוח מלא. מזהים מקוצרים בלבד; תוכן יומן לא נקרא ולא נשלח.");
  return L.join("\n");
}

// Discord: title + at most ~12 lines, counts only, ZERO short IDs. A channel that
// gets flooded stops being read, which destroys the whole point of the agent.
function buildSummary(d) {
  const L = [];
  L.push(`📊 User Analytics — ${STAMP}`);
  const f = d.funnel;
  if (f) {
    L.push(`• משפך: ${show(f.signedUp)} נרשמו → ${show(f.firstTrade)} עסקה ראשונה → ${show(f.fiveTrades)} הגיעו ל-5`);
    L.push(`• פעילים השבוע: ${show(f.active7d)} · חציון ימים לעסקה ראשונה: ${show(f.medianDaysToFirst)}`);
  }
  if (d.stuck) {
    L.push(`• תקועים: ${kAnon(d.stuck.noTrades)} בלי אף עסקה · ${kAnon(d.stuck.oneOrTwoThenGone)} נטשו אחרי 1–2`);
    L.push(`• פתוחות מעל 30 יום: ${show(d.stuck.openOver30dTrades)}`);
  }
  if (d.fill) {
    // A field whose median is null was NOT measured. Counting only the non-null
    // ones and then declaring "all fields above 40%" would turn a total measurement
    // failure into a green line — the exact silent failure CLAUDE.md §2 forbids.
    const measured = d.fill.perField.filter((x) => x.median !== null);
    const low = measured.filter((x) => x.median < 40);
    if (!measured.length) L.push(`• 🔴 איכות מילוי: לא נמדדה אף שדה`);
    else if (low.length) L.push(`• 🟠 שדות מתחת ל-40% חציוני: ${low.length} מתוך ${measured.length}`);
    else L.push(`• איכות מילוי: כל ${measured.length} השדות שנמדדו מעל 40% חציוני`);
  }
  if (d.anomalies) L.push(`• אנומליות: ${d.anomalies.length} (מזהים במייל בלבד)`);
  if (d.fb) L.push(`• פידבק חדש: ${show(d.fb.new24h)} · ממתין: ${show(d.fb.unresolved)}`);

  // Deletions are the one thing worth shouting about in the channel.
  if (d.prev && d.snapshot) {
    const drops = Object.entries(SNAPSHOT_LABELS)
      .filter(([k]) => {
        const c = d.snapshot[k], w = d.prev.snapshot?.[k];
        return Number.isInteger(c) && Number.isInteger(w) && c < w;
      })
      .map(([k]) => SNAPSHOT_LABELS[k]);
    if (drops.length) L.push(`• 🔴 ירידה במדדים: ${drops.join(", ")} — ייתכן שנמחקו נתונים`);
  } else {
    L.push(`• שינוי מאתמול: אין בסיס להשוואה`);
  }
  if (d.probe && !d.probe.ok) {
    // Distinguish "the DB gave different answers" (a real integrity alarm) from
    // "the DB was unreachable" (an ops failure). Reporting the second as the first
    // sends the reader hunting a data bug that does not exist.
    const anyRan = d.probe.runs.some((r) => r !== null);
    L.push(
      anyRan
        ? `• 🔴 המדידה אינה דטרמיניסטית — אל תסמוך על המספרים`
        : `• 🔴 לא הצלחנו לקרוא מה-DB כלל — הדוח ריק, לא תקין`,
    );
  }
  if (warnings.length) L.push(`• ⚠️ ${warnings.length} אזהרות ריצה — ראה מייל`);
  L.push(`פירוט מלא נשלח במייל.`);
  return L.slice(0, 13).join("\n");
}

// ── output ───────────────────────────────────────────────────────────────────

function emit(report, summary, color) {
  // GITHUB_OUTPUT is consumed by the workflow's mail/Discord steps. It is NOT the
  // job summary and NOT an artifact — neither of which may carry per-user lines on
  // a public repo.
  const gho = process.env.GITHUB_OUTPUT;
  if (gho) {
    const d1 = `REPORT_${Date.now()}`;
    const d2 = `SUMMARY_${Date.now()}`;
    appendFileSync(gho, `date=${new Date().toISOString().slice(0, 10)}\n`);
    appendFileSync(gho, `color=${color}\n`);
    appendFileSync(gho, `report<<${d1}\n${report}\n${d1}\n`);
    appendFileSync(gho, `summary<<${d2}\n${summary}\n${d2}\n`);
  }
}

async function main() {
  if (!SUPABASE_DB_URL) warn("SUPABASE_DB_URL not set — every metric will read לא זמין");

  const probe = determinismProbe();
  const status = assertStatusDomain();
  const signals = assertImportSignalAgreement();
  const { prev, reason: prevReason } = readPrevState();
  const snapshot = gatherSnapshot();

  const d = {
    probe,
    status,
    signals,
    prev,
    prevReason,
    snapshot,
    funnel: gatherFunnel(),
    stuck: gatherStuck(),
    fill: gatherFillRates(),
    anomalies: gatherAnomalies(),
    fb: gatherFeedbackMentoring(),
  };

  const report = buildReport(d);
  const summary = buildSummary(d);

  // Refuse to emit anything that carries a full UUID or an e-mail address.
  assertNoIdentifiers(report, "report");
  assertNoIdentifiers(summary, "summary");

  const RED = 15158332, AMBER = 15844367, GREEN = 3066993;
  let color = GREEN;
  if (warnings.length || (d.fill && d.fill.perField.some((f) => f.median !== null && f.median < 40))) color = AMBER;
  if (!probe.ok || (status && status.unexpected.length)) color = RED;

  emit(report, summary, color);
  if (snapshot) writeState(snapshot);

  // stdout is a PUBLIC log: aggregate integers and the determinism probe only.
  console.log("user-analytics: ok");
  // Three identical count(*) runs. Printed one per line because run #1 of this
  // workflow exists specifically so a human can read them (PLAN-2026-07-27).
  probe.runs.forEach((r, i) => {
    console.log(
      r === null
        ? `count-run-${i + 1}: FAILED`
        : `count-run-${i + 1}: trades=${r.n} distinct_users=${r.users}`,
    );
  });
  console.log(`determinism stable: ${probe.ok}`);
  console.log(`warnings: ${warnings.length}`);
  console.log(`dry_run: ${DRY_RUN}`);
}

main().catch((e) => {
  // A privacy-guard throw must fail loudly and send nothing. Everything else has
  // already degraded to "לא זמין" upstream, so reaching here is a real defect.
  console.error(`::error::user-analytics failed: ${String(e.message).slice(0, 200)}`);
  process.exit(1);
});
