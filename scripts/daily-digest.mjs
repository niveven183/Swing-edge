// scripts/daily-digest.mjs — SwingEdge daily digest agent (runs in CI)
//
// Gathers system + product health from read-only sources, asks Claude to compose
// ONE short Hebrew morning digest, and emits it for the workflow to email. Every
// gather step degrades gracefully: any failure resolves to null/"לא ידוע" and is
// noted, never thrown — so the email always sends. On Sundays a weekly section is
// added. Secrets (tokens, DB URL) are never printed.

import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { parseCampaign } from "../api/_lib/replyLedger.js";

// Validates the id before it is interpolated into the snippet query. This is a
// shape check on a feedback id, not a second copy of the campaign parse — that
// one lives in replyLedger.js and is imported above.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

// ── (d) Feedback: awaiting a reply vs already answered ───────────────────────

// Splits the not-resolved population in two. `awaitingReply` is the only one
// that lights the morning alert: a feedback that was already answered is not
// something Niv has to act on today, and counting it kept the alert permanently
// on — which is how an alert stops being read.
//
// `resolved` sits in neither bucket, answered or not. Two ledger shapes reach
// here (`reply:<id>` from before 2026-08-08 and `reply:<id>:<n>:<h8>` after);
// both collapse through the imported parseCampaign, which is the point of it.
export function classifyFeedback(rows, ledgerRows) {
  const answered = new Set();
  for (const r of ledgerRows || []) {
    const p = parseCampaign(r?.campaign);
    if (p) answered.add(p.id);
  }

  let awaitingReply = 0;
  let repliedPending = 0;
  const awaitingIds = [];
  const themes = { awaiting: {}, replied: {} };
  let snippetId = null;
  let snippetAt = "";

  for (const f of rows || []) {
    if (f?.status === "resolved") continue;
    const bucket = answered.has(f?.id) ? "replied" : "awaiting";
    if (bucket === "replied") {
      repliedPending++;
    } else {
      awaitingReply++;
      awaitingIds.push(f?.id);
      const at = String(f?.created_at || "");
      if (!snippetId || at > snippetAt) {
        snippetId = f?.id;
        snippetAt = at;
      }
    }
    const t = f?.type || "לא צוין";
    themes[bucket][t] = (themes[bucket][t] || 0) + 1;
  }

  const rank = (o) =>
    Object.entries(o)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

  return {
    awaitingReply,
    repliedPending,
    awaitingIds,
    snippetId,
    themes: { awaiting: rank(themes.awaiting), replied: rank(themes.replied) },
  };
}

function gatherFeedback() {
  const fb = {
    awaitingReply: null,
    repliedPending: null,
    notResolved: null,
    themes: null,
    snippet: null,
    error: null,
  };
  if (!SUPABASE_DB_URL) {
    fb.error = "no-db-url";
    return fb;
  }
  try {
    // ⛔ No `message` here. facts is sent whole to the Anthropic API (:322);
    // pulling every message to classify would be exactly the drift
    // docs/DECISIONS.md 2026-08-06 names as the agent risk. The snippet below
    // is one targeted read, same exposure as before, field for field.
    const rows = psqlRows("SELECT id, status, type, created_at FROM feedback").map(
      ([id, status, type, created_at]) => ({ id, status, type, created_at })
    );
    const ledger = psqlRows(
      "SELECT campaign FROM email_campaign_log WHERE campaign LIKE 'reply:%'"
    ).map(([campaign]) => ({ campaign }));

    const c = classifyFeedback(rows, ledger);
    fb.awaitingReply = c.awaitingReply;
    fb.repliedPending = c.repliedPending;
    fb.notResolved = c.awaitingReply + c.repliedPending;

    if (c.snippetId && UUID_RE.test(c.snippetId)) {
      const msg = psqlScalar(`SELECT message FROM feedback WHERE id = '${c.snippetId}'`);
      // Sanitized here in JS (not in bash) before it ever reaches a workflow env/run block.
      fb.snippet = msg ? msg.replace(/\r?\n/g, " ").slice(0, 100) : null;
    }
    if (IS_SUNDAY) fb.themes = c.themes;
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
  for (const w of facts.ci) if (w.conclusion === "failure") n++;
  if (facts.live.pipelineOk === false) n++;
  if (facts.live.health && facts.live.health.status === "degraded") n++;
  n += facts.open.issueCount + facts.open.prCount;
  if (facts.feedback.awaitingReply && facts.feedback.awaitingReply > 0) n++;
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

  const badCi = facts.ci.filter((w) => w.conclusion === "failure");
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

  if (facts.feedback.awaitingReply > 0 || facts.feedback.repliedPending > 0) {
    lines.push("");
    lines.push(
      `📝 ${facts.feedback.awaitingReply} פידבקים ממתינים למענה · ` +
        `${facts.feedback.repliedPending} נענו וטרם יושמו ` +
        `(מתוך ${facts.feedback.notResolved} לא-סגורים)`
    );
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
    const byType = (list) => list.map((t) => `${t.type}: ${t.count}`).join(", ");
    if (facts.feedback.themes?.awaiting?.length) {
      lines.push(`• ממתינים למענה לפי סוג: ${byType(facts.feedback.themes.awaiting)}`);
    }
    if (facts.feedback.themes?.replied?.length) {
      lines.push(`• נענו וטרם יושמו לפי סוג: ${byType(facts.feedback.themes.replied)}`);
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
    "ב-ci, conclusion: null פירושו שהתהליך עדיין רץ או טרם רץ — זה לא כשל ואסור לרשום אותו כבעיה; רק conclusion: \"failure\" הוא בעיה אמיתית.",
    "אחרי הכותרת פרט אך ורק את הפריטים שבאמת דורשים תשומת לב — בלי מילוי, בלי לחזור על מה שתקין.",
    "אם הכל ירוק — סה\"כ 2-3 שורות ותו לא.",
    "כלול קישורים ישירים לכל PR/Issue שדורש פעולה.",
    "ב-feedback יש שני דליים נפרדים מאותה אוכלוסייה (לא-סגורים): awaitingReply = ממתינים למענה, repliedPending = נענו וטרם יושמו. רק awaitingReply דורש פעולה.",
    "בכל אזכור של פידבק כתוב את שני המספרים ואת המכנה, למשל '3 ממתינים למענה · 2 נענו וטרם יושמו (מתוך 5 לא-סגורים)'. אל תכתוב 'N פידבקים ממתינים' בלי הפירוק.",
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

function emitOutputs(digest, attention, feedback) {
  const gho = process.env.GITHUB_OUTPUT;
  if (gho) {
    const digestDelim = `DIGEST_${Date.now()}`;
    const fbDelim = `FBSNIP_${Date.now()}`;
    // ⚠️ The output name is consumed by daily-digest.yml:67 and stays as it is,
    // but it now carries the awaiting-reply count — the one that needs action.
    const fbUnresolved = feedback && Number.isFinite(feedback.awaitingReply) ? feedback.awaitingReply : 0;
    const fbSnippet = feedback && feedback.snippet ? feedback.snippet : "";
    appendFileSync(gho, `date=${DATE}\n`);
    appendFileSync(gho, `attention=${attention}\n`);
    appendFileSync(gho, `feedback_unresolved=${fbUnresolved}\n`);
    appendFileSync(gho, `feedback_snippet<<${fbDelim}\n${fbSnippet}\n${fbDelim}\n`);
    appendFileSync(gho, `digest<<${digestDelim}\n${digest}\n${digestDelim}\n`);
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
  emitOutputs(digest, facts.attentionCount, feedback);
}

// Only when run as a script. Importing this file (scripts/digest-feedback-test.mjs)
// must not spawn psql or call the Anthropic API.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(() => {
    // Absolute last resort: never fail the workflow over the digest itself.
    console.error("::warning::daily-digest failed unexpectedly — emitting minimal notice");
    const notice = "🟡 סוכן הסיכום היומי נתקל בשגיאה בהרכבת הדיווח. בדוק את לוג ה-Action.";
    emitOutputs(notice, 1, null);
  });
}
