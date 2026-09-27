#!/usr/bin/env node
/**
 * slot-audit-probe.mjs — B-357 · שער המדד של slot-audit.mjs
 *
 * ⛔ נוגע ב-API החי. חלון סינתטי · שעון קפוא · ריצות מוזרקות.
 * שער-מטא M4 מחליף את `fetch` הגלובלי בפונקציה שזורקת — קריאת רשת אחת
 * מפילה את הריצה. fixture שאינו נטען היה מודד את ה-API, ⛔ את הקוד.
 *
 * ⛔ דילוג. כשל חילוץ/טעינה הוא אדום קשה (B-272).
 *
 * שתי זרועות:
 *   V*  — הטיפול. חייבות להיות **נצפות אדומות** על מוטנט (`--mutants`).
 *   K*  — זרוע הביקורת (analyst.yml, `0 6 * * 0`). חייבת להישאר **ירוקה**
 *          בשני העצים. אדום שם = נגעת מחוץ למחלקה ⇒ עצור.
 *
 * הרצה:  node scripts/slot-audit-probe.mjs
 *        node scripts/slot-audit-probe.mjs --mutants     # אדום מכוון
 */

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SRC = "scripts/slot-audit.mjs";
const WF_DIR = ".github/workflows";

// ── שעון קפוא ─────────────────────────────────────────────────────────────
// now = 07:00Z · רצועת חסד 7h ⇒ סוף חלון 00:00Z · חלון 24h ⇒ התחלה 00:00Z-1d
const NOW = Date.UTC(2026, 8, 27, 7, 0, 0);
const GRACE_H = 7;
const WIN_END = NOW - GRACE_H * 3600000;

let pass = 0, fail = 0;
const failed = [];
function ok(id, cond, msg) {
  if (cond) { pass++; console.log(`  ✓ ${id}  ${msg}`); }
  else { fail++; failed.push(id); console.log(`  ✗ ${id}  ${msg}`); }
}

// ═══════════════════════════════════════════════════════════════════════════
// שערי-מטא — B-272: כשל כאן עוצר, ⛔ מדלג
// ═══════════════════════════════════════════════════════════════════════════

function readWf(name) {
  const p = path.join(WF_DIR, name);
  let t;
  try { t = readFileSync(p, "utf8"); }
  catch (e) { throw new Error(`M-FATAL: ⛔ ניתן לקרוא ${p} — ${e.message}`); }
  if (t.length === 0) throw new Error(`M-FATAL: ${p} ריק`);
  return t;
}

async function loadModule(srcText) {
  if (srcText === null) return import("./slot-audit.mjs");
  const dir = mkdtempSync(path.join(tmpdir(), "slotmut-"));
  const f = path.join(dir, "m.mjs");
  writeFileSync(f, srcText);
  return import(`file://${f}`);
}

// ═══════════════════════════════════════════════════════════════════════════
// בונה ה-fixture
// ═══════════════════════════════════════════════════════════════════════════

/** ריצות מוזרקות על N הסלוטים הראשונים, עם עיכוב ריאלי. */
function runsOnSlots(slotIsos, n, delayMin = 3) {
  return slotIsos.slice(0, n).map((iso) => {
    const t = Date.parse(iso) + delayMin * 60000;
    const at = new Date(t).toISOString();
    return { created_at: at, run_started_at: at, conclusion: "success" };
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// חבילת האסרציות — רצה מול מודול נתון (אמיתי או מוטנט)
// ═══════════════════════════════════════════════════════════════════════════

async function suite(M, srcText) {
  const sentinelYaml = readWf("sentinel.yml");
  const analystYaml = readWf("analyst.yml");

  // ── שערי-מטא ────────────────────────────────────────────────────────────
  console.log("\n── שערי-מטא (B-272) ──");
  const sentinelCrons = M.extractCronLines(sentinelYaml);
  ok("M1", sentinelCrons.length === 2,
    `sentinel.yml נושא 2 קווי cron בדיוק (B-318: ⛔ "20,50") — נמדד ${sentinelCrons.length}: ${JSON.stringify(sentinelCrons)}`);
  const analystCrons = M.extractCronLines(analystYaml);
  ok("M2", analystCrons.length === 1,
    `analyst.yml נושא קו cron אחד בדיוק — נמדד ${analystCrons.length}: ${JSON.stringify(analystCrons)}`);
  ok("M3", /^\s*schedule:/m.test(sentinelYaml) && sentinelYaml.includes("cron:"),
    "on.schedule נמצא ב-sentinel.yml (מכנה ניתן לגזירה)");

  // M4: כל קריאת רשת מפילה את הריצה — הוכחה שה-fixture נטען
  let netCalls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = (...a) => { netCalls++; throw new Error(`M4: קריאת רשת אסורה ב-probe: ${a[0]}`); };

  // ── מדידת המכנה, ⛔ הנחתו ──────────────────────────────────────────────
  const sCrons = sentinelCrons.map(M.parseCron);
  const sPeriod = M.minPeriodMs(sCrons);
  const sSpan = Math.max(24 * 3600000, 2 * sPeriod);
  const sSlots = M.countSlots(sCrons, WIN_END - sSpan, WIN_END);

  console.log("\n── V* · הטיפול: רעב מול יעד ומול בסיס ──");

  ok("V1", sSlots.length === 48,
    `מכנה נגזר מ-on.schedule (⛔ ליטרל): 2 קווי cron חצי-שעתיים × 24h ⇒ נמדד ${sSlots.length}/48 סלוטים`);
  ok("V2", sPeriod === 1800000 && sSpan === 24 * 3600000,
    `window = max(24h, 2×period): period=${sPeriod / 60000}דק׳ ⇒ span=${sSpan / 3600000}h`);

  // ── החלון הסינתטי: 11/48, המשטר הנמדד בפועל ────────────────────────────
  const fx = { yaml: sentinelYaml, commits: [], runs: runsOnSlots(sSlots, 11) };
  const r11 = await M.audit({
    workflow: "sentinel.yml", repo: "x/y", token: "t",
    now: NOW, graceHours: GRACE_H, fixture: fx,
  });

  ok("V3", r11.numerator === 11 && r11.denominator === 48,
    `מונה=ריצות event=schedule בחלון: נמדד ${r11.numerator}/${r11.denominator}`);
  ok("V4", r11.description.includes("11/48") && r11.description.includes("22.9%"),
    `הפלט נושא מונה ומכנה ⛔ אחוז ערום (§2): נמדד "${(r11.description.match(/\d+\/\d+ \([\d.]+%\)/) ?? ["—"])[0]}"`);

  // ציר 1 — מתחת ל-80% התווית היא רעב, ⛔ "GREEN"/"תקין"/"בזמן"
  ok("V5", r11.targetHit === false && r11.description.includes("מורעב מול היעד (B-275)"),
    "ציר 1: 22.9% < 80% ⇒ הטקסט אומר במפורש \"מורעב מול היעד (B-275)\"");
  ok("V6", !r11.description.includes("GREEN") && !r11.description.includes("בזמן"),
    "ציר 1: ⛔ \"GREEN\" · ⛔ \"בזמן\" בפלט מורעב (R-4 — שקר watchdog.yml:119)");
  // ⚠️ ⛔ `!includes("תקין")` — הפלט שלנו נושא "⛔ תקין" בכוונה.
  // האסרציה היא שכל מופע של "תקין" **שלול**, ⛔ שאינו קיים.
  const tokins = [...r11.description.matchAll(/תקין/g)];
  ok("V7", tokins.length > 0 && tokins.every((m) => r11.description.slice(0, m.index).trimEnd().endsWith("⛔")),
    `כל מופע של "תקין" שלול ב-⛔ (${tokins.length} מופעים) — ⛔ הבטחה שלא נמדדה`);

  // ציר 2 — קובע את הצבע, ו⛔ פולט 🟢 לעולם
  ok("V8", r11.axis2.glyph === "⚪" && r11.axis2.label === "ברמת הבסיס",
    `ציר 2: 11/48 מול בסיס ⇒ נמדד "${r11.axis2.glyph} ${r11.axis2.label}"`);
  ok("V9", r11.color === M.COLOR.GREY,
    `צבע ההתראה נגזר מציר 2 בלבד: נמדד ${r11.color} (GREY=${M.COLOR.GREY}, ⛔ GREEN=${M.COLOR.GREEN})`);
  ok("V10", !r11.description.includes("🟢"),
    "⛔ 🟢 בפלט מורעב — 🟢 שמור בלעדית ל-≥80% מול היעד");
  ok("V11", r11.description.includes("⚪ ברמת הבסיס") && r11.description.includes("🔴 מורעב מול היעד"),
    "שני הצירים מופיעים **יחד** בשורה אחת — ⛔ ציר אחד");

  // ── להקות ציר 2: הגבולות נמדדים, ⛔ מונחים ─────────────────────────────
  const band = (n) => M.classify(n, 48).axis2.glyph;
  ok("V12", band(0) === "🔴" && band(7) === "🔴",
    `להקה 🔴 הידרדרות: 0/48=${band(0)} · 7/48=${band(7)}`);
  ok("V13", band(8) === "🟡" && band(9) === "🟡",
    `להקה 🟡 גבולי: 8/48=${band(8)} · 9/48=${band(9)}`);
  ok("V14", band(10) === "⚪" && band(11) === "⚪",
    `להקה ⚪ ברמת הבסיס: 10/48=${band(10)} · 11/48=${band(11)}`);
  ok("V15", [...Array(39).keys()].every((n) => M.classify(n, 48).axis2.glyph !== "🟢"),
    "⛔ 🟢 בציר 2 באף ערך 0..38 — 🟢 אינו להקת-בסיס");

  // ── ציר 1: 🟢 מופיע בדיוק בסף, ⛔ לפניו ────────────────────────────────
  const firstGreen = [...Array(49).keys()].find((n) => M.classify(n, 48).targetHit);
  ok("V16", firstGreen === 39,
    `🟢 מופיע לראשונה ב-39/48 (81.3% ≥ 80%) ו⛔ ב-38/48 (79.2%) — נמדד ${firstGreen}`);
  ok("V17", M.classify(39, 48).color === M.COLOR.GREEN && M.classify(38, 48).color !== M.COLOR.GREEN,
    "GREEN בצבע ההתראה קיים רק כשהיעד הושג");

  // ── הימנעות רועשת: קומיט לקובץ היעד בתוך החלון ─────────────────────────
  const rAbs = await M.audit({
    workflow: "sentinel.yml", repo: "x/y", token: "t", now: NOW, graceHours: GRACE_H,
    fixture: { yaml: sentinelYaml, runs: fx.runs, commits: [{ sha: "deadbee", date: "2026-09-26T12:00:00Z" }] },
  });
  ok("V18", rAbs.abstained === true && rAbs.numerator === null,
    "קומיט לקובץ היעד בתוך החלון ⇒ הימנעות מוצהרת, מונח null (⛔ 0)");
  ok("V19", rAbs.color === M.COLOR.AMBER && !/\d+%/.test(rAbs.description),
    `הימנעות = 🟡 ⛔ ירוק ו⛔ אחוז: צבע ${rAbs.color} (AMBER=${M.COLOR.AMBER})`);
  ok("V20", rAbs.description.includes("deadbee"),
    "ההימנעות מצטטת את ה-hash שחסם את המדידה — ⛔ \"שגיאה\" סתומה");

  // ── מכנה 0: ⛔ חלוקה באפס, ⛔ אחוז ─────────────────────────────────────
  const z = M.classify(0, 0);
  ok("V21", z.color === M.COLOR.GREY && !/%/.test(z.headline) && !z.headline.includes("🟢"),
    `מכנה 0 ⇒ "אין מה למדוד", ⛔ אחוז ו⛔ 🟢: "${z.headline}"`);

  // ── הענף cancelled-while-queued מדפיס את ספירתו (INCIDENTS#13) ──────────
  ok("V22", /ניכוי cancelled-while-queued: 0/.test(r11.description),
    "ענף שהתאים לאפס מקרים **מדפיס 0** ⛔ נקרא כהצלחה (INCIDENTS#13)");
  const rQC = await M.audit({
    workflow: "sentinel.yml", repo: "x/y", token: "t", now: NOW, graceHours: GRACE_H,
    fixture: {
      yaml: sentinelYaml, commits: [],
      runs: [...runsOnSlots(sSlots, 11),
        { created_at: sSlots[11], run_started_at: new Date(Date.parse(sSlots[11]) + 9e5).toISOString(), conclusion: "cancelled" }],
    },
  });
  ok("V23", rQC.numerator === 11 && rQC.queuedCancelled === 1,
    `ריצה שבוטלה-בתור ⛔ נספרת כסלוט שרץ: 12 ריצות − 1 = נמדד ${rQC.numerator}, ניכוי ${rQC.queuedCancelled}`);

  // ── רצועת החסד מוצאת מהמכנה, ⛔ נספרת כהחמצה ───────────────────────────
  ok("V24", r11.description.includes(new Date(WIN_END).toISOString()) &&
            !r11.description.includes(new Date(NOW).toISOString()),
    `החלון מסתיים ב-now−${GRACE_H}h (${new Date(WIN_END).toISOString()}) ⛔ ב-now`);

  // ── הפרסר זורק, ⛔ מנחש (R-2) ──────────────────────────────────────────
  const throws = (fn) => { try { fn(); return false; } catch { return true; } };
  ok("V25", throws(() => M.parseCron("20 * * *")) && throws(() => M.parseCron("bogus * * * *")),
    "cron פגום ⇒ זריקה. ⛔ ברירת מחדל, ⛔ ניחוש מכנה");
  ok("V26", throws(() => M.parseCron("0 6 15 * 0")),
    "DOM+DOW שניהם מוגבלים ⇒ זריקה (סמנטיקת OR ⛔ ממומשת) ⛔ מכנה שגוי בשקט");
  ok("V27", throws(() => M.extractCronLines("on:\n  workflow_dispatch:\n")),
    "קובץ בלי on.schedule ⇒ זריקה. ⛔ מכנה 0 שנקרא כ\"אין רעב\"");
  // ⚠️ V30 נולדה ממוטנט: `if (!m) continue` שרד את V25, כי שדה פגום *כולו*
  // מתרוקן וזורק בשער הבא. הנזק האמיתי הוא רשימה **מעורבת** — "5,bogus"
  // חוזר כ-{5}, כלומר מכנה שגוי **בשקט**. זה המצב שהשער היה מפספס.
  ok("V30", throws(() => M.expandField("5,bogus", 0)) && throws(() => M.parseCron("5,bogus * * * *")),
    "רשימה מעורבת (\"5,bogus\") ⇒ זריקה, ⛔ נפילה שקטה ל-{5} עם מכנה שגוי");

  // ── אין ברירות מחדש מומצאות במסלול המדידה (R-2) ────────────────────────
  const money = srcText ?? readFileSync(SRC, "utf8");
  const body = money.split("\n").filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join("\n");
  ok("V28", !/\|\|\s*0\b/.test(body) && !/\?\?\s*0\b/.test(body),
    "⛔ `|| 0` · ⛔ `?? 0` במסלול המונה/המכנה — מכנה שנופל ל-0 היה מסווג \"תקין\" אוכלוסייה שלא נספרה");

  // ── שער 80% נגזר מהתוכנית, ⛔ ליטרל שהוזז ביד ──────────────────────────
  ok("V29", M.TARGET_SUCCESS_PCT === 80,
    `סף ציר 1 = 80% (מקור: PLAN-2026-09-21 §7, "< 269/336 = 80%") — נמדד ${M.TARGET_SUCCESS_PCT}`);

  // ═══════════════════════════════════════════════════════════════════════
  // K* — זרוע הביקורת: analyst.yml. חייבת להישאר **ירוקה**.
  //
  // ⚠️ ⛔ "ניקיון" ו⛔ כפילות — נמדד: המוטנט «מכנה מקובע (ליטרל 48)» נתפס
  //    ב-K3–K6 **בלבד**, ו⛔ באף אסרציית V. הסיבה מבנית: המכנה האמיתי של
  //    sentinel *הוא* 48, ולכן ליטרל 48 **בלתי-נראה** בזרוע הטיפול.
  //    זרוע עם מכנה **אחר** (2) היא הדבר היחיד שיכול להבדיל בין מכנה נגזר
  //    למכנה מקובע. מי שמוחק אותה מוחק את ההגנה מפני B-324 בקובץ הזה.
  // ═══════════════════════════════════════════════════════════════════════
  console.log("\n── K* · זרוע הביקורת (analyst.yml — חייבת ירוקה) ──");
  const aCrons = analystCrons.map(M.parseCron);
  const aPeriod = M.minPeriodMs(aCrons);
  const aSpan = Math.max(24 * 3600000, 2 * aPeriod);
  const aSlots = M.countSlots(aCrons, WIN_END - aSpan, WIN_END);

  ok("K1", aPeriod === 168 * 3600000 && aSpan === 336 * 3600000,
    `קרון שבועי: period=${aPeriod / 3600000}h ⇒ span=max(24h, 2×168h)=${aSpan / 3600000}h — חלון 24h היה נותן מכנה 0`);
  ok("K2", aSlots.length === 2,
    `מכנה נגזר: ${aSlots.length} סלוטים שבועיים ב-336h`);

  // עיכובי-אמת מדודים: 2/8 ריצות analyst נחתו ב-11:06Z ו-11:16Z מול 06:00 נומינלי
  const aRuns = aSlots.map((iso, i) => {
    const at = new Date(Date.parse(iso) + (i === 0 ? 306 : 316) * 60000).toISOString();
    return { created_at: at, run_started_at: at, conclusion: "success" };
  });
  const rA = await M.audit({
    workflow: "analyst.yml", repo: "x/y", token: "t", now: NOW, graceHours: GRACE_H,
    fixture: { yaml: analystYaml, commits: [], runs: aRuns },
  });
  ok("K3", rA.numerator === 2 && rA.denominator === 2,
    `עיכוב מדוד של 306/316 דק׳ ⛔ מייצר אדום-כזב: נמדד ${rA.numerator}/${rA.denominator}`);
  ok("K4", rA.targetHit === true && rA.color === M.COLOR.GREEN && rA.description.includes("🟢"),
    "2/2 = 100% ≥ 80% ⇒ 🟢 **לגיטימי** — המקום היחיד שבו 🟢 מותר");
  ok("K5", Number.isFinite(Number(rA.pct)) && rA.pct === "100.0",
    `⛔ חלוקה באפס ו⛔ NaN: נמדד ${rA.pct}%`);
  ok("K6", !rA.description.includes("מורעב"),
    "⛔ מסמן רעב על שרשרת שאינה רעבה — אדום כאן = נגעת מחוץ למחלקה");

  globalThis.fetch = realFetch;
  ok("M4", netCalls === 0,
    `אפס קריאות רשת — ה-fixture נטען ו⛔ ה-API (נמדד ${netCalls})`);
}

// ═══════════════════════════════════════════════════════════════════════════
// מוטנטים — "נצפה אדום" הוא מדידה, ⛔ הצהרה
// ═══════════════════════════════════════════════════════════════════════════

const MUTANTS = [
  ["מכנה מקובע (ליטרל 48)", "const slots = countSlots(crons, startMs, endMs);\n  const denominator = slots.length;",
    "const slots = countSlots(crons, startMs, endMs);\n  const denominator = 48;"],
  ["ציר 1 מסומן GREEN מתחת לסף (R-4)", ': { glyph: "🔴", label: "מורעב מול היעד (B-275)" }',
    ': { glyph: "🟢", label: "GREEN — רצו בזמן" }'],
  ["ציר 2 פולט 🟢", ': { glyph: "⚪", label: "ברמת הבסיס", color: COLOR.GREY }',
    ': { glyph: "🟢", label: "ברמת הבסיס", color: COLOR.GREEN }'],
  ["הצבע נגזר מציר 1", "const color = targetHit ? COLOR.GREEN : axis2.color;",
    "const color = COLOR.GREEN;"],
  ["רצועת החסד הוסרה", "const endMs = now - graceHours * 3600000;", "const endMs = now;"],
  ["window = windowHours בלבד", "const spanMs = Math.max(windowHours * 3600000, 2 * periodMs);",
    "const spanMs = windowHours * 3600000;"],
  ["הימנעות הוחלפה בירוק", "if (commits.length > 0) {", "if (false) {"],
  ["מכנה 0 נופל ל-|| 0 (R-2)", "  const denominator = slots.length;", "  const denominator = slots.length || 0;"],
  ["הענף cancelled-while-queued נמחק", "const numerator = inWindow.length - queuedCancelled.length;",
    "const numerator = inWindow.length;"],
  ["הפרסר מנחש במקום לזרוק", 'if (!m) throw new Error(`שדה cron לא מפורש: "${part}" (שדה ${idx})`);',
    "if (!m) continue;"],
];

// ═══════════════════════════════════════════════════════════════════════════

const wantMutants = process.argv.includes("--mutants");
const srcText = readFileSync(SRC, "utf8");

if (!wantMutants) {
  console.log("slot-audit-probe · B-357 · חלון סינתטי, שעון קפוא, ⛔ API חי");
  console.log(`חלון: ${new Date(WIN_END - 24 * 3600000).toISOString()} → ${new Date(WIN_END).toISOString()}  (now=${new Date(NOW).toISOString()}, חסד ${GRACE_H}h)`);
  await suite(await loadModule(null), srcText);
  const total = pass + fail;
  console.log(`\n${"─".repeat(60)}`);
  console.log(`אסרציות: ${pass}/${total} עברו${fail ? ` · ⛔ ${fail} נכשלו: ${failed.join(", ")}` : ""}`);
  console.log(`אוכלוסייה: ${total} אסרציות (4 מטא · ${total - 4 - 6} טיפול V* · 6 ביקורת K*)`);
  console.log("⚠️ ירוק כאן מודד את **הקוד**, ⛔ את הדיסקורד ו⛔ את המשטר האמיתי.");
  console.log("⚠️ הרעב עצמו (22.9%) ⛔ נסגר כאן — B-275 פתוח. השער מודד, ⛔ מתקן.");
  process.exit(fail === 0 ? 0 : 1);
}

// ── מצב מוטנטים ───────────────────────────────────────────────────────────
console.log("slot-audit-probe --mutants · «נצפה אדום» הוא מדידה\n");
const rows = [];
for (const [name, find, repl] of MUTANTS) {
  if (!srcText.includes(find)) {
    console.log(`⛔ M-FATAL: עוגן המוטנט ⛔ נמצא במקור: "${name}"`);
    process.exit(1);
  }
  pass = 0; fail = 0; failed.length = 0;
  const mutated = srcText.replace(find, repl);
  console.log(`\n${"═".repeat(60)}\n🧬 מוטנט: ${name}`);
  try {
    await suite(await loadModule(mutated), mutated);
  } catch (e) {
    console.log(`  ⚠️ המוטנט זרק: ${e.message.slice(0, 120)}`);
    fail++; failed.push("THROW");
  }
  rows.push([name, failed.slice()]);
  console.log(`  ⇒ ${fail} אדומות: ${failed.join(", ") || "⛔ אף אחת"}`);
}

console.log(`\n${"═".repeat(60)}\nסיכום מוטנטים — כל שורה חייבת ≥1 אדומה:\n`);
let clean = 0;
for (const [name, ids] of rows) {
  if (ids.length === 0) clean++;
  console.log(`  ${ids.length ? "✓" : "✗"} ${ids.length.toString().padStart(2)} אדומות · ${name}${ids.length ? `  [${ids.join(", ")}]` : "  ⛔ השער עיוור לזה"}`);
}
console.log(`\n${rows.length - clean}/${rows.length} מוטנטים נתפסו.`);
process.exit(clean === 0 ? 0 : 1);
