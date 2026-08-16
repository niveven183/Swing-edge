-- B-129 — תעודת מקור לתווית המטבע · ‏+ B-071 (מקור העסקה) · ‏+ B-042 (זמן כתיבה).
-- תוכנית: `docs/plans/PLAN-B129.md` (`3914633`) · אבחון: `docs/audits/AUDIT-B129.md`.
--
-- ── מה נמדד (2026-08-16, שלב 1) ──────────────────────────────────────────────
--
--   • ‏67/67 שורות נושאות תווית מטבע · ‏0 `null` · ‏0 ריקות · **ערך מובחן אחד:
--     `USD`**. ‏`ILS` ⛔ מעולם לא נכתב (0/67). ⇒ הפגם הוא `USD` **ללא תנאי**,
--     ⛔ ולא תווית חסרה.
--   • ‏44/67 נושאות את חתימת הייבוא (`createdAt` מסונתז ל-`14:30:00`), ובתוכן
--     **13/13** שורות ת"א. ⇒ ‏13 השורות השגויות נכתבו ב**מסלול הייבוא עצמו**.
--   • סולם ארבע-הדרגות (`src/import/normalizeRow.js:114-138`) מכריע נכון —
--     ⛔ אך כותב למחרוזת שטוחה אחת (`:181`). דרגות 1–2 הן **ראיה**, ‏3–4 הן
--     **הנחה**, ואחרי הכתיבה ⛔ **אין דרך להבדיל**: `USD` שנקנה בראיה ו-`USD`
--     שנוחש זהים בכל בית. **אפס שדות תעודת-מקור** קיימים בקוד כולו.
--
-- ── שלוש בדיקות שרצו לפני כתיבת הקובץ, וכל אחת שוללת מצב-כשל אמיתי ──────────
--
--   1. **⛔ אין הרשאות ברמת-עמודה על `public.trades`** — כל ה-`grant` בריפו הם
--      `grant execute on function`. ⇒ עמודה חדשה יורשת את הרשאות הטבלה,
--      ⛔ ואינה דורשת `grant` נוסף. (‏`grant insert (col…)` היה מפיל כל כתיבה
--      של העמודות החדשות ב-`permission denied`.)
--   2. **⛔ אף RPC ⛔ אינו עושה `select *` מ-`trades`** — ‏20 אתרי הקריאה
--      ב-`admin_rpcs*.sql` מונים עמודות במפורש או מצטברים. ⇒ עמודה חדשה
--      ⛔ אינה שוברת `returns table` של שום `security definer`.
--   3. **⛔ אף `check` קיים ⛔ אינו נוגע בעמודות האלה** — ‏`trades_currency_check`
--      (‏`D-026`) נשאר כפי שהוא ⛔ ואינו נגזר מכאן.
--
-- ⛔ **Claude Code אינו מריץ מיגרציות** (`CLAUDE.md` §12). ניב מריץ ידנית
--    ב-SQL Editor. **הסדר כפוי ⛔ ואין עליו ויתור:** הקובץ הזה רץ ומאומת
--    ב-`information_schema` **לפני** שמפתח כלשהו נוסף ל-`TRADE_COLUMNS`
--    (`src/supabaseClient.js`). מפתח שקיים בלקוח ועמודתו חסרה בשרת גורם
--    ל-PostgREST לדחות את **כל** ה-`INSERT` ⇒ ⛔ כל כתיבה נופלת, ידנית וייבוא,
--    לכל המשתמשים. עד שהקובץ ירוץ — ⛔ שום דבר לא נשבר: הלקוח ⛔ אינו שולח את
--    השדות האלה, וכל 67 השורות חוקיות תחת כל אילוץ כאן.


-- ── 1 · `currency_source` — **איך** התווית נקבעה ────────────────────────────
-- ⚠️ הרשימה **סגורה בכוונה**, וחמשת הערכים הם חמש הדרגות שקיימות בקוד היום:
--
--   `broker_arithmetic` · דרגה 1 — **ראיה**. `unitResolver` גזר מהאריתמטיקה של
--                          השורה עצמה (`value`/`qty`/`rate`).
--   `file_cell`         · דרגה 2 — **ראיה**. הקובץ הצהיר בתא ממופה.
--   `account_default`   · דרגה 3 — הנחה. `opts.defaultCurrency` (מטבע ההון).
--   `literal_fallback`  · דרגה 4 — הנחה. הליטרל `'USD'` ב-`normalizeRow.js:137`.
--   `manual_capital`    ·        — הנחה. המסלול הידני (`SwingEdge_App.jsx:2737`);
--                          לטופס ⛔ אין שדה מטבע כלל.
--
-- ⛔ **`unknown` ⛔ אינו ערך.** "לא ידוע" הוא בדיוק המצב שהגל הזה מתקן, וערך
--    כזה היה מאפשר למסלול חדש להצהיר כלום ולעבור. `null` שמור **אך ורק**
--    לשורות שנכתבו לפני המיגרציה הזו — ‏67 שורות, ⛔ ואף אחת מהן לא נגעה כאן.
alter table public.trades
  add column if not exists currency_source text;

alter table public.trades
  drop constraint if exists trades_currency_source_check;

alter table public.trades
  add constraint trades_currency_source_check
  check (currency_source is null or currency_source in (
    'broker_arithmetic',
    'file_cell',
    'account_default',
    'literal_fallback',
    'manual_capital'
  ));


-- ── 2 · `source` — מסלול הכתיבה (`B-071`) ───────────────────────────────────
-- ⚠️ **שני ערכים בלבד, ⛔ ולא שלושה.** ‏`api/ocr.js` ⛔ אינו מסלול כתיבה — נמדד
--    16.08: שלושת צרכניו קוראים `setForm` בלבד, והשורה יוצאת אחר-כך במסלול
--    הידני. ⇒ `'ocr'` ⛔ אינו ברשימה **מפני שאין מי שיכתוב אותו**: הבחנה בין
--    טופס שהוקלד לטופס שקדם-מולא דורשת דגל ברמת הטופס, שאינו בגל הזה.
--    ה-`check` יורחב באותו גל שיוסיף את הדגל. ⛔ ערך שאין לו כותב הוא ערך שנסחף.
alter table public.trades
  add column if not exists source text;

alter table public.trades
  drop constraint if exists trades_source_check;

alter table public.trades
  add constraint trades_source_check
  check (source is null or source in ('manual', 'import'));


-- ── 3 · `import_batch_id` — בידוד והתאוששות (`B-071`) ───────────────────────
-- `uuid` אחד לכל הרצת ייבוא. הנימוק המקורי של `B-071` במילותיו: "אם FIFO
-- ישדך שגוי, אין דרך לבודד את העסקאות שהוא יצר ולהתאושש".
-- ⚠️ **⛔ אין אינדקס כאן בכוונה** — ‏67 שורות, ו-seq scan הוא התוכנית הנכונה
--    בגודל הזה. אינדקס נוסף כשהטבלה תצדיק אותו, ⛔ לא "ליתר ביטחון".
alter table public.trades
  add column if not exists import_batch_id uuid;


-- ── 4 · `inserted_at` — זמן כתיבה אמיתי (`B-042`) ───────────────────────────
-- `trades."createdAt"` **מסונתז בלקוח** מתאריך העסקה (`normalizeRow.js:179`,
-- `T14:30:00`) ⇒ ⛔ אינו חותמת יצירת-שורה. השדה הזה נכתב ב**שרת** ⇒ חסין
-- לסינתוז בלקוח, ⛔ ואינו דורש שורת קוד.
--
-- 🔴 **⚠️ שני צעדים, ⛔ ולא `add column … default now()` אחד — וההבדל מהותי.**
--    `add column … default now()` היה ממלא את **כל 67 השורות הקיימות** בזמן
--    הרצת המיגרציה ⇒ ‏67 חותמות **מפוברקות** שנראות כמו מדידה. זו בדיוק
--    "ברירת מחדל שמחליפה נתון אמיתי" (`CLAUDE.md` §2), והיא גרועה מ-`null`.
--    בשני צעדים: העמודה נוספת **בלי** default ⇒ ‏67 השורות הקיימות מקבלות
--    `null` = "⛔ לא נמדד", וה-default חל על שורות **עתידיות** בלבד.
--
-- ⚠️ ומכאן ש-`not null` ⛔ אינו אפשרי כאן, ⛔ ואינו רצוי: `inserted_at is null`
--    פירושו "נכתב לפני הגל" — בדיוק כמו `currency_source is null`. שתי
--    העמודות מספרות את אותו סיפור על אותן 67 שורות.
--
-- ⚠️ **`B-042` ⛔ אינו נסגר כאן.** העמודה קיימת ⛔ ואין לה צרכן; הוא ייסגר
--    כשמישהו יקרא ממנה במקום מ-`createdAt`. ⛔ ו-`createdAt` ⛔ אינו נוגע בגל
--    הזה — לא בסכימה ולא בקוד.
alter table public.trades
  add column if not exists inserted_at timestamptz;

alter table public.trades
  alter column inserted_at set default now();


-- ── verification ────────────────────────────────────────────────────────────
-- ⚠️ כל שאילתה מחזירה **מונה ומכנה**, ⛔ לא אחוז (`CLAUDE.md` §2).
--
-- ‏(א) Expect: **4 שורות בדיוק**, בשמות האלה ובטיפוסים האלה —
--        currency_source  | text                        | YES | (null)
--        import_batch_id  | uuid                        | YES | (null)
--        inserted_at      | timestamp with time zone    | YES | now()
--        source           | text                        | YES | (null)
--      ⚠️ `inserted_at` הוא היחיד עם `column_default`. ‏`is_nullable = YES`
--      בארבעתן — כל `NO` פירושו ששורות קיימות קיבלו ערך, ⇒ **עצור**.
--
--   select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'trades'
--     and column_name in ('currency_source', 'source', 'import_batch_id', 'inserted_at')
--   order by column_name;
--
-- ‏(ב) Expect: ה-`check` של `currency_source` מונה **בדיוק חמישה** ערכים.
--      ⚠️ קרא את הטקסט המוחזר וספור — ‏4 או ‏6 פירושם שהקובץ נערך.
--
--   select conname, pg_get_constraintdef(oid)
--   from pg_constraint
--   where conrelid = 'public.trades'::regclass
--     and conname in ('trades_currency_source_check', 'trades_source_check');
--
-- ‏(ג) Expect: ‏67 | 67 | 67 | 67 | 67 — **אף שורה קיימת ⛔ לא נגעה.**
--      כל מספר שאינו 67 בעמודות ה-`null` פירושו שמשהו מילא ערך.
--
--   select count(*)                                        as rows_total,
--          count(*) filter (where currency_source is null) as ccy_src_null,
--          count(*) filter (where source is null)          as source_null,
--          count(*) filter (where import_batch_id is null) as batch_null,
--          count(*) filter (where inserted_at is null)     as inserted_null
--   from public.trades;
--
-- ‏(ד) Expect: `USD | 67` — שורה **אחת**. ‏13 שורות ת"א עדיין נושאות `USD`
--      שגוי, וזה **מכוון**: הגל מונע הבאות ⛔ ואינו מתקן קיימות (`B-005`/`B-121`,
--      חסום על הודעה מוקדמת למשתמש). ⛔ אין כאן `UPDATE` ואין `DELETE`.
--
--   select coalesce(currency, '(null)') as currency, count(*)
--   from public.trades group by 1 order by 2 desc;


-- ── rollback ────────────────────────────────────────────────────────────────
-- ⚠️ בטוח **רק** כל עוד `TRADE_COLUMNS` ⛔ אינו מונה את השדות (כלומר: לפני
--    שלב 4 בתוכנית). אחריו — הסרת עמודה מפילה כל `INSERT`, וה-rollback הנכון
--    הוא להחזיר קודם את הקוד. ⚠️ `drop column` מוחק כל תעודת-מקור שנכתבה מאז,
--    ⛔ וזו מחיקת מדידה — החלטה, ⛔ לא ניקוי.
--
--   alter table public.trades drop constraint if exists trades_currency_source_check;
--   alter table public.trades drop constraint if exists trades_source_check;
--   alter table public.trades drop column if exists currency_source;   -- ⚠️ מוחק מדידה
--   alter table public.trades drop column if exists source;            -- ⚠️ מוחק מדידה
--   alter table public.trades drop column if exists import_batch_id;   -- ⚠️ מוחק מדידה
--   alter table public.trades drop column if exists inserted_at;       -- ⚠️ מוחק מדידה
