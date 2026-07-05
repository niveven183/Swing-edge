// scripts/arch-auditor.mjs — SwingEdge Architecture Auditor (runs in CI, weekly)
//
// The "is it built right" agent. Where smoke/health/data-guardian check whether
// the app RUNS, this agent examines HOW the app is BUILT and never touches a line
// of it. It maps six dimensions of the checked-out repo + build output —
// ARCHITECTURE, PERFORMANCE, SECURITY, DATA, ACCESSIBILITY, CONNECTIONS — ranks
// findings by impact ÷ effort, and reports them. Niv decides what enters the queue.
//
// READ-ONLY by construction: this file only READS files and runs read-only shell
// probes (`npm audit --json`). It NEVER writes to the repo, NEVER edits app code,
// NEVER opens a PR, NEVER runs a write DB verb. The only bytes it appends are to
// GITHUB_OUTPUT / GITHUB_STEP_SUMMARY — CI plumbing files, not the working tree.
//
// Every finding carries evidence as a LOCATION ONLY (`file:line`) — never a value,
// never a secret. Claude only NARRATES the deterministic findings in Hebrew; it
// never invents a number, a file, or a fix. Deterministic Hebrew fallback if the
// API is unavailable. Mirrors analyst.mjs / data-guardian.mjs for the plumbing.

import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, extname } from "node:path";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

const now = new Date();
const DATE = now.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Directories the auditor must NEVER descend into. `.claude/worktrees` holds stale
// copies of the whole app that would double-count every finding; dist is build
// output (read separately for sizes only); the rest are deps/artefacts/vcs.
const SKIP_DIRS = new Set([
  "node_modules", "dist", ".git", ".claude", "playwright-report",
  "test-results", "coverage", "public", ".vercel",
]);
const CODE_EXT = new Set([".js", ".jsx", ".ts", ".tsx"]);

// ── file walking (read-only) ─────────────────────────────────────────────────

function walk(dir, out = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".env.example") {
      if (e.isDirectory()) continue; // skip dot-dirs (.git, .claude, .vercel…)
    }
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, out);
    } else if (CODE_EXT.has(extname(e.name))) {
      out.push(full);
    }
  }
  return out;
}

const rel = (p) => relative(ROOT, p);
function readSafe(p) {
  try { return readFileSync(p, "utf8"); } catch { return ""; }
}

// Collect the source corpus once: [{ path, rel, lines: [..], text }].
function loadCorpus() {
  const files = walk(ROOT);
  return files.map((p) => {
    const text = readSafe(p);
    return { path: p, rel: rel(p), text, lines: text.split("\n") };
  });
}

// grep a single file's lines → [{ line, text }] (1-indexed).
function grepFile(file, re) {
  const hits = [];
  for (let i = 0; i < file.lines.length; i++) {
    if (re.test(file.lines[i])) hits.push({ line: i + 1, text: file.lines[i] });
    re.lastIndex = 0;
  }
  return hits;
}

// ── finding factory ──────────────────────────────────────────────────────────
// impact & effort are 1..5. ratio = impact / effort (higher = do first).
const findings = [];
function add(category, title, impact, effort, evidence, recommendation) {
  findings.push({
    category, title,
    impact: Math.max(1, Math.min(5, impact)),
    effort: Math.max(1, Math.min(5, effort)),
    evidence, recommendation,
  });
}
const HE_CAT = {
  ARCHITECTURE: "ארכיטקטורה",
  PERFORMANCE: "ביצועים",
  SECURITY: "אבטחה",
  DATA: "נתונים",
  ACCESSIBILITY: "נגישות",
  CONNECTIONS: "חיבורים",
};

// ── a. ARCHITECTURE ──────────────────────────────────────────────────────────
function auditArchitecture(corpus) {
  // God-components: flag oversized source files (report the biggest offenders).
  const big = corpus
    .map((f) => ({ f, n: f.lines.length }))
    .filter((x) => x.n >= 1500)
    .sort((a, b) => b.n - a.n);
  for (const { f, n } of big.slice(0, 5)) {
    const impact = n >= 4000 ? 5 : n >= 2500 ? 4 : 3;
    add("ARCHITECTURE", `קובץ ענק (${n} שורות): ${f.rel}`, impact, 5,
      `${f.rel}:1`,
      "פצל את הקובץ למודולים/רכיבים קטנים לפי תחום אחריות כדי לצמצם עומס קוגניטיבי וסיכון רגרסיה.");
  }

  // TODO/FIXME/HACK density across the corpus.
  const marker = /\b(TODO|FIXME|HACK|XXX)\b/;
  let markers = 0; let firstEvidence = null;
  for (const f of corpus) {
    for (const h of grepFile(f, marker)) {
      markers++;
      if (!firstEvidence) firstEvidence = `${f.rel}:${h.line}`;
    }
  }
  if (markers >= 15) {
    add("ARCHITECTURE", `צפיפות TODO/FIXME גבוהה (${markers} סימונים)`,
      markers >= 40 ? 3 : 2, 2, firstEvidence || "—",
      "רכז את החובות הטכניים לרשימה מתועדפת; סגור או המר ל-issues פתוחים.");
  }

  // Dead-export heuristic: an exported name never referenced in ANY other file.
  const exportRe = /export\s+(?:const|function|class|let|var)\s+([A-Za-z0-9_$]+)/;
  const dead = [];
  for (const f of corpus) {
    for (let i = 0; i < f.lines.length; i++) {
      const m = f.lines[i].match(exportRe);
      if (!m) continue;
      const name = m[1];
      const word = new RegExp(`\\b${name}\\b`);
      const usedElsewhere = corpus.some(
        (g) => g.path !== f.path && word.test(g.text)
      );
      if (!usedElsewhere) dead.push(`${f.rel}:${i + 1}`);
    }
  }
  if (dead.length >= 3) {
    add("ARCHITECTURE", `יצוא (export) שאינו בשימוש — ${dead.length} מועמדים`,
      2, 1, dead[0],
      "אמת ומחק יצואים מתים כדי לצמצם משטח תחזוקה (מועמדים — לאמת ידנית).");
  }
}

// ── b. PERFORMANCE ───────────────────────────────────────────────────────────
function auditPerformance(corpus) {
  // Bundle chunks > 500 KB from the build output.
  const distAssets = join(ROOT, "dist", "assets");
  let assets = [];
  try { assets = readdirSync(distAssets); } catch { assets = []; }
  for (const name of assets) {
    if (!name.endsWith(".js")) continue;
    let size = 0;
    try { size = statSync(join(distAssets, name)).size; } catch { continue; }
    if (size > 500 * 1024) {
      const kb = Math.round(size / 1024);
      add("PERFORMANCE", `חבילת JS גדולה (${kb}KB): dist/assets/${name}`,
        kb > 1500 ? 5 : 4, 3, `vite.config.js:1`,
        "הפעל code-splitting (React.lazy / manualChunks) כדי לקצר זמן טעינה ראשוני.");
    }
  }

  // Heavy dependency count (informational, low effort to review).
  try {
    const pkg = JSON.parse(readSafe(join(ROOT, "package.json")) || "{}");
    const deps = Object.keys(pkg.dependencies || {});
    const HEAVY = ["recharts", "html2canvas", "@sentry/react", "date-fns"];
    const present = HEAVY.filter((d) => deps.includes(d));
    if (present.length >= 3) {
      add("PERFORMANCE", `תלויות כבדות בזמן ריצה (${present.join(", ")})`,
        3, 2, "package.json:1",
        "שקול ייבוא נקודתי / lazy-load לרכיבים כבדים (למשל גרפים) במקום ייבוא מלא.");
    }
  } catch { /* package.json unreadable — skip */ }

  // Re-render candidates: inline object/function literals in JSX props (grep
  // heuristic — reported as candidates to inspect, never as verdicts).
  const inline = /(?:style|onClick|onChange|value)=\{\{|=\{\(\)\s*=>/;
  let inlineHits = 0; let firstInline = null;
  for (const f of corpus) {
    if (!f.rel.endsWith(".jsx") && !f.rel.endsWith(".tsx")) continue;
    for (const h of grepFile(f, inline)) {
      inlineHits++;
      if (!firstInline) firstInline = `${f.rel}:${h.line}`;
    }
  }
  if (inlineHits >= 50) {
    add("PERFORMANCE", `מועמדים ל-re-render (${inlineHits} אובייקטים/פונקציות inline ב-JSX)`,
      2, 3, firstInline || "—",
      "ברשימות חמות: חלץ handlers/אובייקטים קבועים או עטוף ב-useMemo/useCallback (מועמדים בלבד).");
  }
}

// ── c. SECURITY ──────────────────────────────────────────────────────────────
function auditSecurity(corpus) {
  // Hardcoded-secret patterns. We report the LOCATION only and never echo the
  // matched text. Assignments that reference env vars are explicitly excluded.
  const secretRe =
    /(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{12,}|eyJ[A-Za-z0-9_-]{20,}|(?:api[_-]?key|secret|password|token)\s*[:=]\s*["'][^"'\s]{12,}["'])/i;
  const envRef = /process\.env|import\.meta\.env|VITE_|getenv/i;
  const secretHits = [];
  for (const f of corpus) {
    for (const h of grepFile(f, secretRe)) {
      if (envRef.test(h.text)) continue;           // env-backed → not hardcoded
      if (/\.example$/.test(f.rel)) continue;
      secretHits.push(`${f.rel}:${h.line}`);        // location ONLY
    }
  }
  if (secretHits.length > 0) {
    add("SECURITY", `חשד לסוד מוטמע בקוד — ${secretHits.length} מיקומים`,
      5, 2, secretHits[0],
      "העבר את הערך ל-secret/env, החלף (rotate) אותו, ואמת שאינו נכנס ל-git history.");
  }

  // dangerouslySetInnerHTML without visible sanitization.
  const dsi = [];
  for (const f of corpus) {
    for (const h of grepFile(f, /dangerouslySetInnerHTML/)) dsi.push(`${f.rel}:${h.line}`);
  }
  if (dsi.length > 0) {
    add("SECURITY", `dangerouslySetInnerHTML — ${dsi.length} שימושים`,
      4, 3, dsi[0],
      "ודא סניטציה (DOMPurify) לכל קלט שאינו סטטי כדי למנוע XSS.");
  }

  // Rate-limiting on api/* endpoints (grep heuristic across the api directory).
  const apiFiles = corpus.filter((f) => f.rel.startsWith("api/"));
  const rlRe = /rate[-_ ]?limit|ratelimit|@upstash\/ratelimit|too many requests|429/i;
  const noRL = apiFiles.filter((f) => !rlRe.test(f.text));
  if (apiFiles.length && noRL.length === apiFiles.length) {
    add("SECURITY", `אין הגבלת קצב (rate-limit) באף endpoint (api/* — ${apiFiles.length} קבצים)`,
      4, 3, `${apiFiles[0].rel}:1`,
      "הוסף rate-limiting (למשל לפי IP) על נקודות הקצה הציבוריות למניעת ניצול/עלות.");
  }

  // npm audit — summarise counts by severity (degrade gracefully if unavailable).
  try {
    const raw = execFileSync("npm", ["audit", "--json"], {
      cwd: ROOT, encoding: "utf8", timeout: 60000, stdio: ["ignore", "pipe", "pipe"],
    });
    const j = JSON.parse(raw);
    const v = j?.metadata?.vulnerabilities || {};
    const crit = v.critical || 0, high = v.high || 0, mod = v.moderate || 0, low = v.low || 0;
    if (crit + high > 0) {
      add("SECURITY",
        `תלויות פגיעות: ${crit} critical, ${high} high, ${mod} moderate, ${low} low`,
        crit > 0 ? 5 : 4, 2, "package-lock.json:1",
        "הרץ `npm audit fix` / עדכן את החבילות המושפעות; טפל תחילה ב-critical/high.");
    } else if (mod > 0) {
      add("SECURITY", `תלויות פגיעות ברמה בינונית: ${mod} moderate, ${low} low`,
        2, 2, "package-lock.json:1",
        "תזמן עדכון תלויות; אין critical/high כרגע.");
    }
  } catch (e) {
    // `npm audit` exits non-zero when vulns exist — its stdout still holds JSON.
    try {
      const j = JSON.parse((e.stdout || "").toString());
      const v = j?.metadata?.vulnerabilities || {};
      const crit = v.critical || 0, high = v.high || 0, mod = v.moderate || 0, low = v.low || 0;
      if (crit + high > 0) {
        add("SECURITY",
          `תלויות פגיעות: ${crit} critical, ${high} high, ${mod} moderate, ${low} low`,
          crit > 0 ? 5 : 4, 2, "package-lock.json:1",
          "הרץ `npm audit fix` / עדכן את החבילות המושפעות; טפל תחילה ב-critical/high.");
      } else if (mod > 0) {
        add("SECURITY", `תלויות פגיעות ברמה בינונית: ${mod} moderate, ${low} low`,
          2, 2, "package-lock.json:1",
          "תזמן עדכון תלויות; אין critical/high כרגע.");
      }
    } catch {
      console.error("::warning::npm audit unavailable — dependency-advisory check skipped.");
    }
  }
}

// ── d. DATA ──────────────────────────────────────────────────────────────────
function auditData(corpus) {
  const src = corpus.filter((f) => f.rel.startsWith("src/") || f.rel === "SwingEdge_App.jsx");

  // RLS-mention heuristic: Supabase is used but no "RLS"/"policy" mention anywhere
  // in source → surface it as a review item (low confidence, review-only).
  const usesSupabase = src.some((f) => /supabase/i.test(f.text));
  const mentionsRls = corpus.some((f) => /\bRLS\b|row level security|createPolicy|\bpolicy\b/i.test(f.text));
  if (usesSupabase && !mentionsRls) {
    const anchor = src.find((f) => /supabase/i.test(f.text));
    add("DATA", "אין אזכור ל-RLS/policies בקוד (Supabase בשימוש)",
      4, 3, anchor ? `${anchor.rel}:1` : "src/supabaseClient.js:1",
      "ודא ש-Row Level Security מופעל בכל טבלה ציבורית ותעד זאת (בדיקה ידנית ב-Supabase).");
  }

  // Queries without an explicit .limit() — candidates for unbounded reads.
  let selects = 0, limits = 0, firstSelect = null;
  for (const f of src) {
    for (const h of grepFile(f, /\.select\s*\(/)) {
      selects++;
      if (!firstSelect) firstSelect = `${f.rel}:${h.line}`;
    }
    limits += grepFile(f, /\.limit\s*\(/).length;
  }
  if (selects >= 5 && limits === 0) {
    add("DATA", `שאילתות ללא .limit() — ${selects} קריאות select ללא תקרה`,
      3, 2, firstSelect || "—",
      "הוסף .limit()/pagination לשאילתות שעלולות לגדול כדי למנוע קריאות בלתי חסומות (מועמדים).");
  }

  // Filtered-column / index heuristic: distinct columns hit by .eq()/.order()
  // that may benefit from an index (reported as candidates to review).
  const cols = new Set();
  const colRe = /\.(?:eq|order|gt|lt|gte|lte)\(\s*["'`]([A-Za-z0-9_]+)["'`]/g;
  for (const f of src) {
    let m;
    while ((m = colRe.exec(f.text)) !== null) cols.add(m[1]);
  }
  if (cols.size >= 4) {
    const anchor = src.find((f) => /\.(?:eq|order)\(/.test(f.text));
    add("DATA", `עמודות מסוננות ללא אינדקס ודאי — ${cols.size} מועמדות`,
      2, 2, anchor ? `${anchor.rel}:1` : "—",
      "בדוק אינדקסים על עמודות המסוננות/ממויינות בתדירות גבוהה (מועמדים — לאמת מול הסכימה).");
  }
}

// ── e. ACCESSIBILITY ─────────────────────────────────────────────────────────
function auditAccessibility(corpus) {
  const jsx = corpus.filter((f) => f.rel.endsWith(".jsx") || f.rel.endsWith(".tsx"));

  // <img> without alt.
  const imgNoAlt = [];
  for (const f of jsx) {
    for (const h of grepFile(f, /<img\b/)) {
      if (!/\balt\s*=/.test(h.text)) imgNoAlt.push(`${f.rel}:${h.line}`);
    }
  }
  if (imgNoAlt.length > 0) {
    add("ACCESSIBILITY", `תמונות ללא alt — ${imgNoAlt.length} מועמדים`,
      3, 1, imgNoAlt[0],
      "הוסף alt תיאורי (או alt=\"\" לתמונות דקורטיביות) לכל <img>.");
  }

  // Icon-only <button> with no aria-label (lucide icon on the same line, no text).
  const iconBtn = [];
  for (const f of jsx) {
    for (const h of grepFile(f, /<button\b/)) {
      if (!/aria-label/.test(h.text)) iconBtn.push(`${f.rel}:${h.line}`);
    }
  }
  if (iconBtn.length >= 20) {
    add("ACCESSIBILITY", `כפתורים ללא aria-label — ${iconBtn.length} מועמדים`,
      2, 2, iconBtn[0],
      "לכפתורי-אייקון ללא טקסט נראה הוסף aria-label (מועמדים — כפתורים עם טקסט תקינים).");
  }

  // RTL pitfalls: hardcoded left/right directional CSS in an RTL-first app.
  const rtl = [];
  const rtlRe = /(margin|padding)(Left|Right)\b|textAlign:\s*["'](left|right)["']|left:\s*\d|right:\s*\d/;
  for (const f of jsx) {
    for (const h of grepFile(f, rtlRe)) rtl.push(`${f.rel}:${h.line}`);
  }
  if (rtl.length >= 15) {
    add("ACCESSIBILITY", `מלכודות RTL — ${rtl.length} מיקומים עם כיווניות קשיחה (left/right)`,
      2, 3, rtl[0],
      "העדף marginInlineStart/End ו-textAlign: start/end לתמיכה נכונה ב-RTL (מועמדים).");
  }

  // Color-only signaling: literal red/green as the only status cue (candidate).
  const colorOnly = [];
  for (const f of jsx) {
    for (const h of grepFile(f, /color:\s*["'`]?(red|green|#ff0000|#00ff00)/i)) {
      colorOnly.push(`${f.rel}:${h.line}`);
    }
  }
  if (colorOnly.length >= 10) {
    add("ACCESSIBILITY", `סימון באמצעות צבע בלבד — ${colorOnly.length} מועמדים (אדום/ירוק)`,
      2, 2, colorOnly[0],
      "הוסף חיווי לא-צבעוני (אייקון/טקסט) לצד הצבע לטובת עיוורי-צבעים (מועמדים).");
  }
}

// ── f. CONNECTIONS ───────────────────────────────────────────────────────────
function auditConnections(corpus) {
  const apiFiles = corpus.filter((f) => f.rel.startsWith("api/"));
  for (const f of apiFiles) {
    const hasTry = /\btry\s*\{/.test(f.text) && /\bcatch\b/.test(f.text);
    const hasTimeout = /AbortController|AbortSignal\.timeout|setTimeout\s*\(|timeout\s*:/.test(f.text);
    const hasAuth = /authorization|api[_-]?key|bearer|\btoken\b|x-api-key/i.test(f.text);
    const extCalls = (f.text.match(/fetch\s*\(|https?:\/\//g) || []).length;

    if (!hasTry) {
      add("CONNECTIONS", `endpoint ללא טיפול בשגיאות: ${f.rel}`,
        4, 2, `${f.rel}:1`,
        "עטוף את הלוגיקה ב-try/catch והחזר תשובת שגיאה מבוקרת במקום קריסה.");
    }
    if (extCalls > 0 && !hasTimeout) {
      add("CONNECTIONS", `קריאות רשת ללא timeout: ${f.rel} (${extCalls} קריאות חיצוניות)`,
        4, 2, `${f.rel}:1`,
        "הוסף AbortController/timeout לכל fetch חיצוני כדי למנוע תקיעת בקשות ועלות.");
    }
    if (!hasAuth && extCalls > 0) {
      add("CONNECTIONS", `endpoint ציבורי ללא אימות/הגבלה נראית: ${f.rel}`,
        3, 3, `${f.rel}:1`,
        "שקול אימות/הגבלת-קצב לחשיפת עלות מבוקרת בקריאות חיצוניות (בדיקה ידנית).");
    }
  }
}

// ── ranking ──────────────────────────────────────────────────────────────────
const ratio = (f) => f.impact / f.effort;
function rankTop(list, k = 3) {
  return [...list]
    .sort((a, b) => ratio(b) - ratio(a) || b.impact - a.impact || a.effort - b.effort)
    .slice(0, k);
}

// ── Claude composer (Hebrew narration of the deterministic findings) ─────────
async function composeWithClaude(facts) {
  if (!ANTHROPIC_API_KEY) return null;
  const SYS = [
    "אתה 'מבקר הארכיטקטורה' של אפליקציית מסחר בשם SwingEdge, המדווח למפתח יחיד (Niv).",
    "אתה בוחן כיצד האפליקציה בנויה (ארכיטקטורה, ביצועים, אבטחה, נתונים, נגישות, חיבורים) — לא אם היא רצה.",
    "כתוב דוח שבועי בעברית בלבד, טקסט רגיל (ללא Markdown, ללא JSON, ללא כוכביות).",
    "השתמש אך ורק בממצאים שסופקו ב-JSON. אסור בהחלט להמציא ממצאים, קבצים, מספרים או ערכים.",
    "מבנה: (1) שורת כותרת: כמה ממצאים נמצאו וה-3 המובילים לפי יחס impact/effort.",
    "(2) פירוט מקובץ לפי קטגוריה — לכל ממצא: הכותרת, impact, effort, המיקום (evidence), ושורת תיקון אחת.",
    "ה-evidence הוא מיקום קובץ:שורה בלבד — לעולם אל תצטט ערך, סוד, מפתח או תוכן קוד.",
    "אם אין ממצאים — אמור זאת בכנות. היה תמציתי ומקצועי, ללא סיסמאות.",
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
        max_tokens: 1800,
        system: SYS,
        messages: [
          { role: "user", content: "הרכב את דוח הביקורת מהממצאים המחושבים (JSON):\n\n" + JSON.stringify(facts, null, 2) },
        ],
      }),
    });
    if (!r.ok) {
      console.error(`::warning::Anthropic API HTTP ${r.status} — using deterministic Hebrew fallback`);
      return null;
    }
    const data = await r.json();
    return data?.content?.[0]?.text?.trim() || null;
  } catch {
    console.error("::warning::Anthropic API call failed — using deterministic Hebrew fallback");
    return null;
  }
}

// ── deterministic Hebrew fallback ────────────────────────────────────────────
function fallbackHe(facts) {
  const L = [];
  L.push(`🏗️ SwingEdge — ביקורת ארכיטקטורה (${DATE})`);
  L.push("");
  if (facts.total === 0) {
    L.push("לא נמצאו ממצאי ארכיטקטורה החודש. הבנייה נראית תקינה מבחינת המדדים שנבדקו.");
    return L.join("\n");
  }
  L.push(`נמצאו ${facts.total} ממצאים. 3 המובילים לפי יחס impact/effort:`);
  for (const f of facts.top3) {
    L.push(`• [${HE_CAT[f.category]}] ${f.title} — impact ${f.impact}, effort ${f.effort} (${f.evidence})`);
  }
  L.push("");
  const byCat = {};
  for (const f of facts.findings) (byCat[f.category] ||= []).push(f);
  for (const cat of Object.keys(HE_CAT)) {
    const list = byCat[cat];
    if (!list || !list.length) continue;
    L.push(`${HE_CAT[cat]} (${list.length}):`);
    for (const f of list) {
      L.push(`• ${f.title} [impact ${f.impact} / effort ${f.effort}] — ${f.evidence}`);
      L.push(`  תיקון: ${f.recommendation}`);
    }
    L.push("");
  }
  return L.join("\n").trimEnd();
}

// ── issue table (Markdown, ranked) ───────────────────────────────────────────
function issueTable(list) {
  const rows = [
    "| # | קטגוריה | ממצא | Impact | Effort | יחס | מיקום | תיקון מוצע |",
    "|---|---|---|---|---|---|---|---|",
  ];
  const ranked = [...list].sort((a, b) => ratio(b) - ratio(a) || b.impact - a.impact);
  ranked.forEach((f, i) => {
    rows.push(
      `| ${i + 1} | ${HE_CAT[f.category]} | ${f.title.replace(/\|/g, "\\|")} | ${f.impact} | ${f.effort} | ` +
      `${ratio(f).toFixed(2)} | \`${f.evidence}\` | ${f.recommendation.replace(/\|/g, "\\|")} |`
    );
  });
  return rows.join("\n");
}

// ── output plumbing (writes ONLY to CI files, never the repo) ─────────────────
function emit(fields) {
  const gho = process.env.GITHUB_OUTPUT;
  if (gho) {
    const d = `ARCH_${Date.now()}`;
    for (const [k, v] of Object.entries(fields)) {
      if (typeof v === "string" && v.includes("\n")) {
        appendFileSync(gho, `${k}<<${d}\n${v}\n${d}\n`);
      } else {
        appendFileSync(gho, `${k}=${v}\n`);
      }
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  const corpus = loadCorpus();

  auditArchitecture(corpus);
  auditPerformance(corpus);
  auditSecurity(corpus);
  auditData(corpus);
  auditAccessibility(corpus);
  auditConnections(corpus);

  const facts = {
    date: DATE,
    total: findings.length,
    top3: rankTop(findings, 3),
    findings,
  };

  const email_he = (await composeWithClaude(facts)) || fallbackHe(facts);
  const table = findings.length ? issueTable(findings) : "";

  emit({ date: DATE, findings: findings.length, email_he, issue_table: table });

  const gss = process.env.GITHUB_STEP_SUMMARY;
  if (gss) {
    const report = findings.length
      ? `### 🏗️ Architecture Auditor — ${findings.length} findings (${DATE})\n\n${table}\n`
      : `### 🏗️ Architecture Auditor — ✅ clean (${DATE})\n\nNo architecture findings.\n`;
    appendFileSync(gss, report);
  }
  console.log(JSON.stringify(facts, null, 2));
}

main().catch((e) => {
  // Never fail the workflow over the auditor itself.
  console.error("::warning::Architecture Auditor failed unexpectedly.", e?.message || e);
  emit({ date: DATE, findings: 0, email_he: "", issue_table: "" });
});
