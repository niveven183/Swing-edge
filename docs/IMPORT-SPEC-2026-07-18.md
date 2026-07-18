# Universal Journal Import — Spec for Review (Wave 10)
**Date:** 2026-07-18 · **Status:** pre-implementation gate (docs-only; no code shipped yet)
**Baseline:** `HEAD=6989c42`, tree clean, `test:coach` = 110 assertions pass.
**i18n fact:** `en/he/es/pt/ar` all spread `...en` → new keys added to **en+he only** give
`es/pt/ar` an automatic English fallback (satisfies "es/pt/ar zero keys").

Goal (Niv): *"any user, any journal — the most flexible import there is, high-fidelity, no
mistakes."* A trader arrives with a broker CSV (IBKR / eToro / Meitav / Excellence), a
personal Hebrew Excel, or another journal's export → upload → map columns in clicks → import.
The built-in demo-trades **source** is permanently removed (existing users' demo data stays).

---

## 1. The four locked decisions (+ invariance)

1. **Missing stop → import with `stop=null`** (row stays valid; R-multiple / risk = N/A).
   - Summary screen must **count** these and show *"N trades imported without stop — R
     analytics partial for those"*.
   - Those trades remain **editable later** via the existing `EditTradeModal` to add a stop.
   - **Invariance:** `null` in → `null` out. **No synthetic value ever enters analytics** —
     we never fabricate a stop/risk number to make R compute.
2. **Missing quantity/shares → reject the row** (P&L needs position size). Goes to the
   rejected report with a per-row reason.
3. **Fees/commission column → detect & ignore** (schema has no fees field; P&L stays
   entry/exit/shares-based). Detected only so it isn't mis-mapped to another field.
4. **Persistent "Import" button → both** the Journal-tab header **and** the Settings data
   section, in addition to the new journal empty-state.

**Undo / batchId:** *no new schema field, no `importBatchId`.* Undo is **session-state only** —
the modal keeps `lastImportIds` (the IDs written in the last batch); "Undo import" removes
exactly those from `trades` (+ Supabase `.delete().in("id", ids)` for logged-in users). It is
cleared on the next add/close/edit/delete. Refresh ends the undo window (acceptable:
"one full undo until the next action").

---

## 2. Bilingual synonym dictionary (`src/import/synonyms.js`)

Lowercased, trimmed, diacritic-loose matching. Header match first; ambiguous headers fall
back to **content sniffing** (a column that is all-dates → date; all-numbers in price range →
entry/exit; L/S tokens → side).

| Field | English synonyms | Hebrew synonyms |
|---|---|---|
| `ticker` | ticker, symbol, instrument, asset | סימול, נייר, מניה, שם נייר, שם המניה |
| `side` | side, direction, position, type, action, l/s, long, short, buy, sell | כיוון, סוג, פעולה, קנייה, קניה, מכירה |
| `entry` | entry, entry price, buy price, open price, price in, avg price, cost | מחיר כניסה, כניסה, מחיר קנייה |
| `exit` | exit, exit price, sell price, close price, price out | מחיר יציאה, יציאה, מחיר מכירה |
| `shares` | qty, quantity, shares, size, position size, volume, units, amount | כמות, יחידות, מניות |
| `date` | date, entry date, trade date, open date | תאריך, תאריך כניסה, יום |
| `exitDate` | exit date, close date, closed | תאריך יציאה, תאריך סגירה |
| `stop` | stop, stop loss, sl, stop price | סטופ, סטופ לוס, מחיר סטופ |
| `target` | target, take profit, tp, target price | יעד, מטרה, מחיר יעד |
| `fees` *(detect & ignore)* | fees, fee, commission, commissions | עמלה, עמלות |

**Side value normalization:** `long | buy | קנייה | קניה | l → LONG` · `short | sell | מכירה | s → SHORT`.
**Date parsing:** `DD/MM/YYYY`, `MM/DD/YYYY`, ISO, **Excel serial** (days since 1899-12-30).
DD-vs-MM ambiguity resolved by any day>12 present in the column.

---

## 3. The three-step flow (sketch + full en/he strings)

Modal built on existing patterns: `useModalA11y` (role=dialog, focus-trap, Esc-close),
`getTranslations(lang)`, `isRTLLang`, `useToast`, step state like `ResetAllModal` (`step:1|2|3`).
Mobile 390: `fixed inset-0` overlay; the mapping preview table sits in `overflow-x-auto`
(same pattern as the journal desktop table). New keys prefixed `imp_*` (en+he only).

### Step 1 — Upload
Sketch: title → drag-drop zone with `<input type=file accept=".csv,.xlsx,.xls">` → (if XLSX
has multiple sheets) sheet picker → Continue. FileReader pattern reused from playbook upload.

| key | en | he |
|---|---|---|
| `imp_title` | Import Journal | ייבוא יומן |
| `imp_step1_title` | Upload file | העלאת קובץ |
| `imp_step1_body` | Upload a CSV or Excel file from your broker or another journal. | העלה קובץ CSV או Excel מהברוקר או מיומן אחר. |
| `imp_dropzone` | Drag a file here, or click to choose | גרור קובץ לכאן, או לחץ לבחירה |
| `imp_choose_file` | Choose file | בחר קובץ |
| `imp_sheet_pick` | This file has several sheets — pick one: | בקובץ כמה גיליונות — בחר אחד: |
| `imp_parse_error` | Couldn't read this file. Check it's a valid CSV/Excel. | לא ניתן לקרוא את הקובץ. ודא שזהו CSV/Excel תקין. |
| `imp_empty_file` | This file has no rows. | אין שורות בקובץ. |

### Step 2 — Map columns
Sketch: preview table (first 5 rows) in horizontal scroll; each column header is a `<select>`
of SwingEdge fields, pre-filled by auto-detect. Required fields (`ticker`, `entry`, `shares`)
badged; missing-required → warning banner and Continue disabled.

| key | en | he |
|---|---|---|
| `imp_step2_title` | Map columns | מיפוי עמודות |
| `imp_step2_body` | Match your file's columns to SwingEdge fields. | התאם את עמודות הקובץ לשדות SwingEdge. |
| `imp_col_ignore` | Ignore this column | התעלם מעמודה זו |
| `imp_required` | Required | חובה |
| `imp_missing_required` | Missing required field: {fields} | חסר שדה חובה: {fields} |
| `imp_preview_rows` | Showing first {n} rows | מוצגות {n} שורות ראשונות |
| `imp_back` | Back | חזור |
| `imp_continue` | Continue | המשך |

### Step 3 — Summary & confirm
Sketch: counters (valid · rejected · duplicates) → stop-less notice → rejected list (per-row
reason + download-as-CSV) → duplicates choice (skip / import anyway) → Confirm.

| key | en | he |
|---|---|---|
| `imp_step3_title` | Review & confirm | סיכום ואישור |
| `imp_step3_body` | Check before importing. | בדוק לפני הייבוא. |
| `imp_count_valid` | {n} valid | {n} תקינות |
| `imp_count_rejected` | {n} rejected | {n} דחויות |
| `imp_count_dupes` | {n} duplicates | {n} כפולות |
| `imp_nostop_notice` | {n} trades imported without stop — R analytics partial for those. You can add a stop later by editing the trade. | {n} עסקאות יובאו ללא סטופ — ניתוח R חלקי עבורן. אפשר להוסיף סטופ מאוחר יותר בעריכת העסקה. |
| `imp_rejected_download` | Download rejected rows (CSV) | הורד שורות דחויות (CSV) |
| `imp_reason_no_qty` | Missing quantity | חסרה כמות |
| `imp_reason_no_ticker` | Missing ticker | חסר סימול |
| `imp_reason_no_entry` | Missing/invalid entry price | מחיר כניסה חסר/לא תקין |
| `imp_reason_bad_stop` | Stop on the wrong side of entry | סטופ בצד הלא נכון של הכניסה |
| `imp_dupe_prompt` | These rows match trades you already have: | שורות אלו זהות לעסקאות קיימות: |
| `imp_dupe_skip` | Skip duplicates | דלג על כפולות |
| `imp_dupe_import` | Import anyway | ייבא בכל זאת |
| `imp_confirm` | Import {n} trades | ייבא {n} עסקאות |
| `imp_cancel` | Cancel | ביטול |
| `imp_success` | {n} trades imported | יובאו {n} עסקאות |
| `imp_undo` | Undo import | בטל ייבוא |

### New empty-state (replaces demo copy)
| key | en | he |
|---|---|---|
| `emptyTitle` | Your record starts here | כאן מתחיל התיעוד שלך |
| `emptyBody` | Every trade is a data point. Add your first — or import your journal. | כל עסקה היא נתון. הוסף את הראשונה — או ייבא את היומן שלך. |
| `addFirstTrade` *(exists)* | Add trade | הוסף עסקה |
| `importJournalBtn` | Import journal | ייבא יומן |

---

## 4. Target trade schema (field-by-field) + write/undo

Source of truth = `handleSubmit` (SwingEdge_App.jsx 2178–2194) + close fields (2210–2219).
Imported trades must carry **exactly** these keys so they are indistinguishable from manual.

| Field | Import rule |
|---|---|
| `id` | `crypto.randomUUID()` (fallback `t_${Date.now()}_${rand}`) |
| `ticker` | mapped, `.toUpperCase()` — **required** |
| `date` | parsed → `YYYY-MM-DD`; **default = today** if absent |
| `createdAt` | `new Date(date+"T14:30:00").toISOString()` |
| `side` | mapped/normalized; when absent `inferSide(entry,stop,target)` |
| `entry` | Number — **required** |
| `stop` | Number or **`null`** (decision #1) |
| `target` | Number or `null` |
| `exit` | Number or `null` (absent → OPEN) |
| `shares` | Number — **required** (decision #2) |
| `status` | derived: `exit != null ? "CLOSED" : "OPEN"` |
| `setup` / `notes` / `marketCondition` / `emotionAtEntry` | `""` (SwingEdge behavioral fields legit-empty on import) |
| `entryQuality` | `null` |
| `tradeImage` | `null` |
| `exitReason` / `followedPlan` / `lessonLearned` | `null` |
| `maxFavorable` / `maxAdverse` | mapped if present, else `null` |
| `closedAt` | mapped exit-date if present; else `date` when CLOSED; else `null` |
| `_capitalAtEntry` | current `capital` state (number) |
| `_prediction` | `null` |
| `isDemo` | `false` |

**Validation reuse** (`src/utils.js`, no duplication):
- `stop` present → `validateTradeInputs(entry, stop, target, side)`; reversed geometry → reject
  the row with the util's bilingual reason.
- `stop` absent → skip geometry check, accept `stop=null`.
- Metrics via existing `calcTradeMetrics`.

**One guarded util touch** (needed for decision #1): `calcTradeMetrics` does
`Math.abs(entry - stop)`; with `stop=null` JS coerces to `0` and returns a *wrong* R. Add a
top guard: `if (trade.stop == null) return { pnl: <entry/exit/shares P&L or null>, rMultiple: null }`.
Activates **only** for the new `stop==null` case; every existing/manual/demo trade has a stop,
so outputs are unchanged. Invariant preserved (null→null). Must verify `test:coach` byte-identical.

**Write path (`buildImport` → App):** single batch `setTrades(prev => [...prev, ...valid])`
(auto-persists to `localStorage["swingEdgeTrades"]`). Logged-in (`authUser?.id`): also
`supabase.from("trades").insert(valid.map(t => tradeForSupabase({...t, user_id, is_demo:false})))`.
`tradeForSupabase` strips client-only fields (`_prediction`, `tradeImage`) and maps `isDemo→is_demo`.
**Duplicate rule:** `ticker + date + entry` identical to an existing trade → flagged (skip / import-anyway).

**Module layout:** `src/import/{parseFile,detectColumns,normalizeRow,buildImport,synonyms}.js`
+ `src/components/ImportJournalModal.jsx`. New deps: `papaparse`, `xlsx` (pin current; xlsx ≥0.19.3).

---

## 5. `isDemo` map — remove vs. keep

⚠️ The `isDemo` **field stays in the schema** — live users have demo trades saved. Only the
*source* (constant + loader + buttons) is deleted.

**REMOVE:**
| Item | Location (SwingEdge_App.jsx) |
|---|---|
| `DEMO_TRADES` constant (30 objects) | 183–487 |
| `handleLoadDemoTrades` | 2325–2366 |
| Journal empty-state "Load Demo" button | ~3897–3900 |
| Settings "Demo Trades" card + button | ~5953–5970 |
| `demoTrades` derived memo (declared, unused) | 1783 |
| i18n keys `demoTrades / loadDemoLong / loadDemoBtn / loadDemoNote` (+ HelpModal `demoCount` if demo-only) | src/i18n.js + HelpModal |

**KEEP (reads existing user data — untouched):**
- `isDemo` normalization on load (line 155); DEMO badge in journal table (line 3988).
- `realTrades = trades.filter(t => !t.isDemo)` (1782) and **all** consumers (equityCurve,
  closedTrades, stats, DNA/Edges/Regime/Growth, tilt, coach, TradeCalendar, analytics, PDF).
- `menteeRealTrades` (1803), `filteredRealTrades` (1882).
- `is_demo` Supabase column + `tradeForSupabase` normalization (supabaseClient.js 57–58).

---

## 6. Fixtures & `test:import`

`scripts/import-fixtures/` (6 files) + `scripts/import-test.mjs` runs the pipeline
(parse → detect → normalize → build) asserting exact counts. Wire
`"test:import": "node scripts/import-test.mjs"` in package.json.

| Fixture | What it exercises | Expected |
|---|---|---|
| `en-standard.csv` | English headers, comma delimiter | all valid |
| `he-semicolon.csv` | Hebrew headers, `;` delimiter, UTF-8-BOM | all valid; side/date normalized |
| `xlsx-serial.xlsx` | Excel serial dates | dates → correct `YYYY-MM-DD` |
| `bad-rows.csv` | 3 invalid (missing qty / reversed stop / non-numeric entry) | 3 rejected w/ reasons |
| `duplicates.csv` | rows matching seeded existing trades | flagged as duplicates |
| `perf-200.csv` | 200 rows | completes; count = 200 |

---

## Files to modify / create (at implementation time)
- **Create:** `src/import/{parseFile,detectColumns,normalizeRow,buildImport,synonyms}.js`,
  `src/components/ImportJournalModal.jsx`, `scripts/import-fixtures/*` (6), `scripts/import-test.mjs`.
- **Edit:** `SwingEdge_App.jsx` (remove demo; add import state/undo/handlers; wire empty-state +
  journal-header + settings buttons + modal), `src/i18n.js` (en+he keys; drop demo keys),
  `src/utils.js` (guarded `calcTradeMetrics`), `package.json` (deps + `test:import`),
  HelpModal (drop `demoCount` if demo-only).
- **Untouched:** all `src/intelligence/*` engines, manual trade flow, es/pt/ar strings,
  `isDemo` field + read-consumers, supabaseClient column set.

## Verification (post-approval)
1. `test:import` green on all 6 fixtures (exact counts).
2. `test:coach` byte-identical to baseline (110 assertions).
3. `npm run build` clean.
4. Preview: import `perf-200.csv` → DNA / Analytics / Coach live & correct; imported trade
   identical to manual across tabs; stop-less notice shown; those trades editable to add a
   stop; `Undo import` restores exactly; new empty-state (Add + Import); zero demo source
   (`grep DEMO_TRADES` empty).
5. Desktop + 390px, he + en (RTL mapping table scrolls; required-field warnings correct).
