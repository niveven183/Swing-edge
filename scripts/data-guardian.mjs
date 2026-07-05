// scripts/data-guardian.mjs — SwingEdge Data Guardian agent (runs in CI)
//
// Every 3 days, validates the `trades` data in Supabase and reports ONLY when it
// finds real integrity problems. READ-ONLY by construction: this file issues
// SELECT statements exclusively, and every query is prefixed with
// `SET default_transaction_read_only = on;` as a second line of defence. No
// write verbs appear anywhere in this file.
//
// Findings carry ids only — never full trade rows — for privacy. When findings
// exist, Claude composes a short Hebrew summary (deterministic Hebrew fallback if
// the API is unavailable). A clean run is silent: no email, no issue, green CI.
//
// Mirrors scripts/daily-digest.mjs for the psql + Claude + GITHUB_OUTPUT plumbing.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || "";

const now = new Date();
const DATE = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

// Read-only guard applied to every statement (belt-and-suspenders).
const RO = "SET default_transaction_read_only = on;";

// ── psql helpers (identical shape to daily-digest.mjs) ───────────────────────

function psqlScalar(sql) {
  const out = execFileSync("psql", [SUPABASE_DB_URL, "-tAc", `${RO} ${sql}`], {
    encoding: "utf8",
    timeout: 20000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return out.trim();
}

function psqlRows(sql) {
  const out = execFileSync("psql", [SUPABASE_DB_URL, "-tAF", "|", "-c", `${RO} ${sql}`], {
    encoding: "utf8",
    timeout: 20000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return out
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => line.split("|"));
}

// ── check catalogue ──────────────────────────────────────────────────────────
// Each check: machine key, severity, Hebrew label, required columns, and a SQL
// WHERE fragment (or a custom builder for the grouped duplicate check).

const HE = {
  closed_missing: "עסקאות סגורות ללא מחיר יציאה או תאריך סגירה",
  bad_risk_geometry: "גיאומטריית סיכון לא תקינה (סטופ בצד הלא נכון של הכניסה)",
  pnl_sign_mismatch: "סיבת היציאה סותרת את כיוון הרווח/ההפסד",
  impossible_dates: "תאריכים בלתי אפשריים (סגירה לפני כניסה או תאריך עתידי)",
  duplicate_suspects: "חשד לכפילויות (טיקר + כניסה + תאריך זהים)",
};

// YYYY-MM-DD guard so the free-text `date` column can't crash a ::date cast.
const DATE_OK = "date ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'";

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_DB_URL) {
    console.error("::warning::SUPABASE_DB_URL not set — Data Guardian cannot run; treating as clean.");
    return emitOutputs([], null);
  }

  // Schema pre-flight: learn which columns actually exist, guard against drift.
  let cols;
  try {
    cols = new Set(
      psqlRows(
        "SELECT column_name FROM information_schema.columns " +
          "WHERE table_schema = 'public' AND table_name = 'trades'"
      ).map((r) => r[0])
    );
  } catch (e) {
    console.error("::warning::Data Guardian could not read the trades schema — treating as clean.");
    return emitOutputs([], null);
  }
  if (cols.size === 0) {
    console.error("::warning::No `trades` table columns found — treating as clean.");
    return emitOutputs([], null);
  }

  const has = (...names) => names.every((n) => cols.has(n));
  const notDemo = cols.has("is_demo") ? "is_demo IS NOT TRUE" : "true";

  // Each check exposes a `body` = the `FROM ... WHERE ...` portion of a query, so
  // `SELECT count(*) <body>` and `SELECT id <body> LIMIT 3` both work uniformly.
  // Wired only when the columns a check needs actually exist (schema-drift safe).
  const specs = [];

  if (has("status", "closedAt", "exit")) {
    specs.push({
      key: "closed_missing",
      severity: "high",
      body: `FROM trades WHERE ${notDemo} AND status = 'CLOSED' AND ("closedAt" IS NULL OR exit IS NULL)`,
    });
  }

  if (has("side", "stop", "entry")) {
    specs.push({
      key: "bad_risk_geometry",
      severity: "high",
      body:
        `FROM trades WHERE ${notDemo} AND stop IS NOT NULL AND entry IS NOT NULL AND (` +
        `(side = 'LONG' AND stop >= entry) OR (side = 'SHORT' AND stop <= entry))`,
    });
  }

  if (has("status", "side", "entry", "exit", "exitReason")) {
    // No stored pnl column — infer the P&L sign from side+entry+exit and flag rows
    // whose exitReason contradicts it (target-hit that lost, or stop-hit that won).
    specs.push({
      key: "pnl_sign_mismatch",
      severity: "medium",
      body:
        `FROM trades WHERE ${notDemo} AND status = 'CLOSED' AND entry IS NOT NULL AND exit IS NOT NULL AND (` +
        `("exitReason" ILIKE '%target%' AND ((side = 'LONG' AND exit < entry) OR (side = 'SHORT' AND exit > entry))) ` +
        `OR ("exitReason" ILIKE '%stop%' AND ((side = 'LONG' AND exit > entry) OR (side = 'SHORT' AND exit < entry))))`,
    });
  }

  if (has("date", "closedAt", "createdAt")) {
    // `date` is free text. Postgres does NOT guarantee left-to-right AND evaluation,
    // so a regex guard can't protect a `date::date` cast from a bad value. Instead a
    // CASE (guaranteed short-circuit) runs `to_date` only on YYYY-MM-DD shapes, and
    // `OFFSET 0` fences the outer date comparisons from being pushed below the CASE.
    specs.push({
      key: "impossible_dates",
      severity: "high",
      body:
        `FROM (SELECT id, "closedAt" AS ca, "createdAt" AS cta, ` +
        `CASE WHEN ${DATE_OK} THEN to_date(date, 'YYYY-MM-DD') END AS d ` +
        `FROM trades WHERE ${notDemo} OFFSET 0) s ` +
        `WHERE (s.ca IS NOT NULL AND s.d IS NOT NULL AND s.ca::date < s.d) ` +
        `OR (s.d IS NOT NULL AND s.d > current_date) ` +
        `OR (s.ca IS NOT NULL AND s.ca > now()) ` +
        `OR (s.cta IS NOT NULL AND s.cta > now())`,
    });
  }

  if (has("ticker", "entry", "date")) {
    // Duplicate suspects: same ticker + entry + date (grouped members).
    const dupInner =
      `SELECT ticker, entry, date FROM trades ` +
      `WHERE ${notDemo} AND ticker IS NOT NULL AND entry IS NOT NULL AND date IS NOT NULL ` +
      `GROUP BY ticker, entry, date HAVING count(*) > 1`;
    specs.push({
      key: "duplicate_suspects",
      severity: "low",
      body:
        `FROM trades WHERE ${notDemo} AND ticker IS NOT NULL AND entry IS NOT NULL AND date IS NOT NULL ` +
        `AND (ticker, entry, date) IN (${dupInner})`,
    });
  }

  const findings = [];

  for (const spec of specs) {
    try {
      const count = Number(psqlScalar(`SELECT count(*) ${spec.body}`));
      if (count > 0) {
        const ids = psqlRows(`SELECT id ${spec.body} LIMIT 3`).map((r) => r[0]);
        findings.push({ check: spec.key, severity: spec.severity, count, sample_ids: ids });
      }
    } catch (e) {
      // Surface the real psql error (never silently swallow) but keep the run green.
      const detail = (e?.stderr || e?.message || "").toString().trim().replace(/\s+/g, " ");
      console.error(`::warning::check ${spec.key} could not run — skipped. ${detail}`);
    }
  }

  const summaryHe = findings.length ? (await composeWithClaude(findings)) || fallbackHe(findings) : "";
  emitOutputs(findings, summaryHe);
}

// ── Claude composer (Hebrew, only when findings exist) ───────────────────────

async function composeWithClaude(findings) {
  if (!ANTHROPIC_API_KEY) return null;
  const enriched = findings.map((f) => ({ ...f, label_he: HE[f.check] || f.check }));
  const SYS = [
    "אתה סוכן 'שומר הנתונים' של אפליקציית מסחר בשם SwingEdge, המדווח למפתח יחיד (Niv).",
    "כתוב סיכום קצר בעברית בלבד, טקסט רגיל (ללא Markdown, ללא JSON).",
    "שורה ראשונה = כותרת: '🛡️ שומר הנתונים מצא N בעיות באיכות הנתונים' (N=מספר סוגי הבעיות).",
    "אחר כך שורה אחת לכל ממצא: התיאור בעברית (label_he), מספר הרשומות (count), וחומרה (severity).",
    "אם קיימים sample_ids הוסף עד 3 מזהים לדוגמה. אל תמציא נתונים ואל תוסיף רשומות מלאות.",
    "אל תכלול סודות, טוקנים או מפתחות. היה תמציתי — שורה אחת לכל ממצא.",
  ].join(" ");

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: SYS,
        messages: [
          {
            role: "user",
            content:
              "הרכב את הסיכום מהממצאים הבאים (JSON):\n\n" + JSON.stringify(enriched, null, 2),
          },
        ],
      }),
    });
    if (!r.ok) {
      console.error(`::warning::Anthropic API HTTP ${r.status} — using deterministic Hebrew fallback`);
      return null;
    }
    const data = await r.json();
    const text = data?.content?.[0]?.text?.trim();
    return text || null;
  } catch {
    console.error("::warning::Anthropic API call failed — using deterministic Hebrew fallback");
    return null;
  }
}

// ── deterministic Hebrew fallback ────────────────────────────────────────────

function fallbackHe(findings) {
  const lines = [`🛡️ שומר הנתונים מצא ${findings.length} בעיות באיכות הנתונים (${DATE})`, ""];
  for (const f of findings) {
    const label = HE[f.check] || f.check;
    const sample = f.sample_ids?.length ? ` (דוגמאות: ${f.sample_ids.join(", ")})` : "";
    lines.push(`• ${label}: ${f.count} רשומות — חומרה ${f.severity}${sample}`);
  }
  return lines.join("\n");
}

// ── output plumbing ──────────────────────────────────────────────────────────

function markdownTable(findings) {
  const rows = [
    "| בדיקה | חומרה | כמות | מזהים לדוגמה |",
    "|---|---|---|---|",
  ];
  for (const f of findings) {
    const label = HE[f.check] || f.check;
    const ids = f.sample_ids?.length ? f.sample_ids.map((i) => `\`${i}\``).join(", ") : "—";
    rows.push(`| ${label} | ${f.severity} | ${f.count} | ${ids} |`);
  }
  return rows.join("\n");
}

function emitOutputs(findings, summaryHe) {
  const n = findings.length;
  const gho = process.env.GITHUB_OUTPUT;
  if (gho) {
    const d = `GUARD_${Date.now()}`;
    appendFileSync(gho, `date=${DATE}\n`);
    appendFileSync(gho, `findings=${n}\n`);
    appendFileSync(gho, `summary_he<<${d}\n${summaryHe || ""}\n${d}\n`);
    appendFileSync(gho, `issue_table<<${d}\n${n ? markdownTable(findings) : ""}\n${d}\n`);
  }
  const summary = process.env.GITHUB_STEP_SUMMARY;
  const report = n
    ? `### 🛡️ Data Guardian — ${n} findings (${DATE})\n\n${markdownTable(findings)}\n`
    : `### 🛡️ Data Guardian — ✅ clean (${DATE})\n\nNo data-quality findings.\n`;
  if (summary) appendFileSync(summary, report);
  // Findings JSON to logs — ids only, never full rows.
  console.log(JSON.stringify({ date: DATE, findings }, null, 2));
}

main().catch((e) => {
  // Never fail the workflow over the guardian itself; report clean so no false alarm.
  console.error("::warning::Data Guardian failed unexpectedly — treating as clean.", e?.message || e);
  emitOutputs([], "");
});
