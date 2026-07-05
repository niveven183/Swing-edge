// scripts/daily-digest.mjs — SwingEdge daily digest agent (runs in CI)
//
// Gathers system + product health from read-only sources, asks Claude to compose
// ONE short Hebrew morning digest, and emits it for the workflow to email. Every
// gather step degrades gracefully: any failure resolves to null/"לא ידוע" and is
// noted, never thrown — so the email always sends. On Sundays a weekly section is
// added. Secrets (tokens, DB URL) are never printed.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";

const PROD_URL = process.env.PROD_URL || "https://swing-edge.vercel.app";
const REPO = process.env.GITHUB_REPOSITORY || "";
const GH_TOKEN = process.env.GITHUB_TOKEN || "";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || "";
const SELF_WORKFLOW = process.env.GITHUB_WORKFLOW || "Daily Digest";

const now = new Date();
const DATE = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
const IS_SUNDAY = now.getUTCDay() === 0;

// ── small helpers ────────────────────────────────────────────────────────────

async function ghApi(path) {
  const r = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "swingedge-daily-digest",
    },
  });
  if (!r.ok) throw new Error(`GitHub ${path} → HTTP ${r.status}`);
  return r.json();
}

async function getJson(url, { timeoutMs = 15000 } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
    const body = await r.json().catch(() => null);
    return { status: r.status, ok: r.ok, body };
  } finally {
    clearTimeout(t);
  }
}

function psqlScalar(sql) {
  // -tA = tuples-only, unaligned; connection string as positional arg.
  const out = execFileSync("psql", [SUPABASE_DB_URL, "-tAc", sql], {
    encoding: "utf8",
    timeout: 20000,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return out.trim();
}

function psqlRows(sql) {
  const out = execFileSync("psql", [SUPABASE_DB_URL, "-tAF", "|", "-c", sql], {
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

// ── (a) CI health: latest run conclusion per active workflow ─────────────────

async function gatherCi() {
  const { workflows = [] } = await ghApi(`/repos/${REPO}/actions/workflows`);
  const active = workflows.filter((w) => w.state === "active" && w.name !== SELF_WORKFLOW);
  const results = [];
  for (const w of active) {
    try {
      const data = await ghApi(
        `/repos/${REPO}/actions/workflows/${w.id}/runs?per_page=1&branch=main`
      );
      const run = data.workflow_runs?.[0];
      results.push({
        name: w.name,
        conclusion: run?.conclusion ?? null, // null → never ran / in progress
        url: run?.html_url ?? null,
      });
    } catch {
      results.push({ name: w.name, conclusion: "לא ידוע", url: null });
    }
  }
  return results;
}

// ── (b) Live health: real product pipeline + authoritative per-service status ─

async function gatherLive() {
  const live = {
    pipelineOk: null,
    quoteDegraded: [], // he labels inferred from null symbols
    health: null, // { status, failing:[], warnings:[] }
    error: null,
  };

  // Real product path: does the quote pipeline resolve SPY (equities) + BTC-USD (crypto)?
  try {
    const q = await getJson(`${PROD_URL}/api/quote?history=1&symbols=SPY,BTC-USD`);
    const hasClose = (s) => Array.isArray(q.body?.[s]?.indicators?.quote?.[0]?.close)
      && q.body[s].indicators.quote[0].close.length >= 1;
    const spy = hasClose("SPY");
    const btc = hasClose("BTC-USD");
    live.pipelineOk = q.ok && spy && btc;
    if (!spy) live.quoteDegraded.push("מניות (SPY לא נטען)");
    if (!btc) live.quoteDegraded.push("קריפטו (BTC-USD לא נטען)");
  } catch (e) {
    live.error = "quote";
    live.pipelineOk = false;
  }

  // Authoritative per-service status (returns 200 or 503 with a JSON body either way).
  try {
    const h = await getJson(`${PROD_URL}/api/health`);
    if (h.body && typeof h.body.status === "string") {
      live.health = {
        status: h.body.status,
        failing: Array.isArray(h.body.failing) ? h.body.failing : [],
        warnings: Array.isArray(h.body.warnings) ? h.body.warnings : [],
      };
    }
  } catch {
    /* health unreachable — leave null, pipeline probe already carries a signal */
  }

  return live;
}

// ── (c) Open items: issues needing action + PRs awaiting merge ───────────────

async function gatherOpen() {
  const open = { actionItems: [], issueCount: 0, prCount: 0, error: null };
  const q = (s) => encodeURIComponent(s);
  try {
    const issues = await ghApi(
      `/search/issues?q=${q(`repo:${REPO} is:issue is:open label:data-quality,agent-fix`)}&per_page=20`
    );
    open.issueCount = issues.total_count ?? 0;
    for (const it of issues.items ?? []) {
      open.actionItems.push({ kind: "issue", number: it.number, title: it.title, url: it.html_url });
    }
    const prs = await ghApi(
      `/search/issues?q=${q(`repo:${REPO} is:pr is:open`)}&per_page=20`
    );
    open.prCount = prs.total_count ?? 0;
    for (const pr of prs.items ?? []) {
      open.actionItems.push({ kind: "pr", number: pr.number, title: pr.title, url: pr.html_url });
    }
  } catch {
    open.error = "github-search";
  }
  return open;
}

// ── (d) Feedback: unresolved count (Sunday: + theme breakdown) ───────────────

function gatherFeedback() {
  const fb = { unresolved: null, themes: null, error: null };
  if (!SUPABASE_DB_URL) {
    fb.error = "no-db-url";
    return fb;
  }
  try {
    const n = parseInt(psqlScalar("SELECT count(*) FROM feedback WHERE resolved = false"), 10);
    fb.unresolved = Number.isFinite(n) ? n : null;
    if (IS_SUNDAY) {
      const rows = psqlRows(
        "SELECT type, count(*) FROM feedback WHERE resolved = false GROUP BY type ORDER BY 2 DESC"
      );
      fb.themes = rows.map(([type, count]) => ({ type, count: parseInt(count, 10) }));
    }
  } catch {
    fb.error = "psql";
  }
  return fb;
}

// ── Sunday weekly rollup: deploys + recurring failures this week ──────────────

async function gatherWeekly() {
  const weekly = { deploys: null, recurringFailures: [], error: null };
  const since = new Date(now.getTime() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  try {
    const data = await ghApi(
      `/repos/${REPO}/actions/runs?per_page=100&branch=main&created=${encodeURIComponent(">=" + since)}`
    );
    const runs = data.workflow_runs ?? [];
    weekly.deploys = runs.filter((r) => r.name === "Build" && r.conclusion === "success").length;
    const failCounts = {};
    for (const r of runs) {
      if (r.conclusion === "failure") failCounts[r.name] = (failCounts[r.name] || 0) + 1;
    }
    weekly.recurringFailures = Object.entries(failCounts)
      .filter(([, c]) => c >= 2)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  } catch {
    weekly.error = "github-actions";
  }
  return weekly;
}

// ── attention count: how many non-green signals ──────────────────────────────

function countAttention(facts) {
  let n = 0;
  for (const w of facts.ci) if (w.conclusion !== "success" && w.conclusion !== null) n++;
  if (facts.live.pipelineOk === false) n++;
  if (facts.live.health && facts.live.health.status === "degraded") n++;
  n += facts.open.issueCount + facts.open.prCount;
  if (facts.feedback.unresolved && facts.feedback.unresolved > 0) n++;
  return n;
}

// ── deterministic Hebrew fallback (used if Claude API is unavailable) ─────────

function fallbackDigest(facts) {
  const lines = [];
  lines.push(
    facts.attentionCount === 0
      ? "🟢 הכל תקין"
      : `🟡 ${facts.attentionCount} דברים דורשים תשומת לב`
  );

  const badCi = facts.ci.filter((w) => w.conclusion !== "success" && w.conclusion !== null);
  if (badCi.length) {
    lines.push("");
    lines.push("תהליכי CI עם בעיה:");
    for (const w of badCi) lines.push(`• ${w.name}: ${w.conclusion}${w.url ? ` — ${w.url}` : ""}`);
  }

  if (facts.live.pipelineOk === false || (facts.live.health && facts.live.health.status === "degraded")) {
    lines.push("");
    lines.push("בריאות המערכת החיה:");
    if (facts.live.pipelineOk === false) {
      lines.push(`• צינור הנתונים לא הגיב תקין${facts.live.quoteDegraded.length ? ` (${facts.live.quoteDegraded.join(", ")})` : ""}`);
    }
    if (facts.live.health?.failing?.length) lines.push(`• שירותים מושבתים: ${facts.live.health.failing.join(", ")}`);
    if (facts.live.health?.warnings?.length) lines.push(`• אזהרות: ${facts.live.health.warnings.join(", ")}`);
  }

  if (facts.open.actionItems.length) {
    lines.push("");
    lines.push("ממתין לך:");
    for (const it of facts.open.actionItems) {
      const tag = it.kind === "pr" ? "PR" : "Issue";
      lines.push(`• ${tag} #${it.number}: ${it.title} — ${it.url}`);
    }
  }

  if (facts.feedback.unresolved && facts.feedback.unresolved > 0) {
    lines.push("");
    lines.push(`📝 ${facts.feedback.unresolved} פידבקים ממתינים לטיפול`);
  }

  if (facts.weekly) {
    lines.push("");
    lines.push("## סיכום שבועי");
    if (facts.weekly.deploys != null) lines.push(`• דיפלויים השבוע: ${facts.weekly.deploys}`);
    if (facts.weekly.recurringFailures.length) {
      lines.push(`• כשלים חוזרים: ${facts.weekly.recurringFailures.map((f) => `${f.name} (×${f.count})`).join(", ")}`);
    } else {
      lines.push("• אין כשלים חוזרים");
    }
    if (facts.feedback.themes?.length) {
      lines.push(`• פידבק פתוח לפי סוג: ${facts.feedback.themes.map((t) => `${t.type}: ${t.count}`).join(", ")}`);
    }
  }

  return lines.join("\n");
}

// ── Claude composer ──────────────────────────────────────────────────────────

async function composeWithClaude(facts) {
  if (!ANTHROPIC_API_KEY) return null;
  const SYS = [
    "אתה עורך דיווח בוקר יומי למפתח יחיד (Niv) של אפליקציית מסחר בשם SwingEdge.",
    "כתוב סיכום קצר בעברית בלבד, בטקסט רגיל (ללא Markdown fences, ללא JSON).",
    "שורה ראשונה = כותרת: אם attentionCount=0 כתוב בדיוק '🟢 הכל תקין', אחרת '🟡 N דברים דורשים תשומת לב' (N=attentionCount).",
    "אחרי הכותרת פרט אך ורק את הפריטים שבאמת דורשים תשומת לב — בלי מילוי, בלי לחזור על מה שתקין.",
    "אם הכל ירוק — סה\"כ 2-3 שורות ותו לא.",
    "כלול קישורים ישירים לכל PR/Issue שדורש פעולה.",
    "אם קיים בעובדות שדה weekly — הוסף בסוף סעיף שכותרתו 'סיכום שבועי' עם מספר הדיפלויים, כשלים חוזרים, ותמות פידבק אם יש.",
    "אל תכלול סודות, טוקנים או מפתחות. היה תמציתי.",
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
              "הרכב את הסיכום היומי מהעובדות הבאות (JSON):\n\n" + JSON.stringify(facts, null, 2),
          },
        ],
      }),
    });
    if (!r.ok) {
      console.error(`::warning::Anthropic API HTTP ${r.status} — using deterministic fallback`);
      return null;
    }
    const data = await r.json();
    const text = data?.content?.[0]?.text?.trim();
    return text || null;
  } catch {
    console.error("::warning::Anthropic API call failed — using deterministic fallback");
    return null;
  }
}

// ── output plumbing ──────────────────────────────────────────────────────────

function emitOutputs(digest, attention) {
  const gho = process.env.GITHUB_OUTPUT;
  if (gho) {
    const delim = `DIGEST_${Date.now()}`;
    appendFileSync(gho, `date=${DATE}\n`);
    appendFileSync(gho, `attention=${attention}\n`);
    appendFileSync(gho, `digest<<${delim}\n${digest}\n${delim}\n`);
  }
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, `### ☀️ סיכום יומי (${DATE})\n\n${digest}\n`);
  console.log(digest);
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [ci, live, open, feedback, weekly] = await Promise.all([
    gatherCi().catch(() => []),
    gatherLive().catch(() => ({ pipelineOk: null, quoteDegraded: [], health: null, error: "live" })),
    gatherOpen().catch(() => ({ actionItems: [], issueCount: 0, prCount: 0, error: "open" })),
    Promise.resolve().then(gatherFeedback),
    IS_SUNDAY ? gatherWeekly().catch(() => null) : Promise.resolve(null),
  ]);

  const facts = { date: DATE, isSunday: IS_SUNDAY, ci, live, open, feedback, weekly };
  facts.attentionCount = countAttention(facts);

  const digest = (await composeWithClaude(facts)) || fallbackDigest(facts);
  emitOutputs(digest, facts.attentionCount);
}

main().catch((e) => {
  // Absolute last resort: never fail the workflow over the digest itself.
  console.error("::warning::daily-digest failed unexpectedly — emitting minimal notice");
  const notice = "🟡 סוכן הסיכום היומי נתקל בשגיאה בהרכבת הדיווח. בדוק את לוג ה-Action.";
  emitOutputs(notice, 1);
});
