-- גל א' — פתיחת `trades.currency` למטבעות שהגזירה כבר יודעת לזהות.
--
-- ⚠️ הקובץ הזה ⛔ אינו נדרש לשום דבר שרץ היום. הוא מוסר את החסם ל**גל ב'**
-- (תיקון 13 שורות TASE) ול**מסלול הכתיבה** (`SwingEdge_App.jsx:2493`), ולכן
-- הוא נכתב עכשיו — בזמן שהמדידה טרייה — ולא ברגע שיצטרכו אותו.
--
-- ── מה נמדד (2026-08-11, `docs/audits/AUDIT-2026-08-11-currency-mixing.md`) ──
--
--   • 61 שורות עסקה. **0/61** נשאו אי-פעם `ILS` — הערך היחיד ב-DB הוא `USD`.
--   • `20260802140000` נעל `check (currency in ('USD','ILS'))`, ולכן שורת TASE
--     ⛔ אינה יכולה להיכתב באגורות (`ILA`) גם כשהספק מחזיר בדיוק את הקוד הזה.
--   • `normalizeProviderCurrency` (`src/lib/instrumentCurrency.js`) מכיר
--     `ILA` · `ILS` · `USD` — והרשימה **סגורה**. `EUR`/`GBP` נפתחים כאן כדי
--     ש-DB לא יהיה החסם כשהרשימה תיפתח, ⛔ לא כדי שמישהו יכתוב אותם היום.
--
-- ── שני שינויים, וכל אחד הוא **הסרת שקר** ─────────────────────────────────
--
--   1. **`drop not null` + `drop default`.** `default 'USD'` אומר "אם לא ידעת,
--      זה דולר" — וזו בדיוק ברירת המחדל שמחליפה נתון אמיתי (`CLAUDE.md` §2).
--      `NULL` הוא "⛔ לא נמדד", וזו התשובה הכנה. ⚠️ הקריאה **בטוחה כבר היום**:
--      `utils.js:164` — `CURRENCY_SYMBOL[trade?.currency] ? … : "USD"` ⇒
--      `NULL` נופל לסמל הדולר בתצוגה, ⛔ בלי לזרוק ובלי לשנות שורה קיימת.
--      ⚠️ אף שורה ⛔ אינה נעשית `NULL` כאן — 61/61 נשארות `'USD'`. השינוי הוא
--      במה ש**אפשר** לכתוב מחר, ⛔ לא במה שכתוב היום.
--
--   2. **הרחבת ה-`check`.** ⛔ לא הסרתו: רשימה סגורה היא מה שמונע
--      `"usd"`/`"Dollar"`/`""` בשקט. `ILA` נכנס מפני שהוא **קוד ספק אמיתי**
--      (אגורות, `minorUnit: 100`) ⛔ ולא כינוי ל-`ILS`.
--
-- ⛔ **Claude Code אינו מריץ מיגרציות** (`CLAUDE.md` §12). ניב מריץ ידנית
--    ב-SQL Editor. עד שירוץ — שום דבר לא נשבר: כל 61 השורות `'USD'` חוקיות
--    תחת ה-`check` הישן וגם תחת החדש.

alter table public.trades
  alter column currency drop default;

alter table public.trades
  alter column currency drop not null;

alter table public.trades
  drop constraint if exists trades_currency_check;

alter table public.trades
  add constraint trades_currency_check
  check (currency is null or currency in ('USD', 'ILS', 'ILA', 'EUR', 'GBP'));

-- ── verification ────────────────────────────────────────────────────────────
-- ⚠️ כל שאילתה כאן מחזירה **מונה ומכנה**, ⛔ לא אחוז (`CLAUDE.md` §2).
--
-- Expect: currency | text | YES | (null)   ← `is_nullable` עבר ל-YES, אין default
--
--   select column_name, data_type, is_nullable, column_default
--   from information_schema.columns
--   where table_schema = 'public' and table_name = 'trades'
--     and column_name = 'currency';
--
-- Expect: USD | 61  — שורה **אחת** בלבד. כל ערך אחר, וכל `NULL`, פירושו
-- שהמיגרציה הזו ⛔ לא הייתה הדבר היחיד שרץ.
--
--   select coalesce(currency, '(null)') as currency, count(*)
--   from public.trades group by 1 order by 2 desc;
--
-- Expect: 0 rows — אין שורה שהחוזה החדש פוסל.
--
--   select id, currency from public.trades
--   where currency is not null
--     and currency not in ('USD', 'ILS', 'ILA', 'EUR', 'GBP');

-- ── rollback ────────────────────────────────────────────────────────────────
-- ⚠️ הסדר הפוך, ו-`set not null` יצליח **רק** אם אין שורות `NULL`. אם נכשל —
-- זה ⛔ אינו כשל של ה-rollback: משמעותו ששורות אמיתיות אומרות "לא נמדד",
-- ומחיקת המידע הזה היא החלטה, ⛔ לא ניקוי.
--
--   alter table public.trades drop constraint if exists trades_currency_check;
--   update public.trades set currency = 'USD' where currency is null;  -- ⚠️ מוחק מדידה
--   alter table public.trades alter column currency set default 'USD';
--   alter table public.trades alter column currency set not null;
--   alter table public.trades
--     add constraint trades_currency_check check (currency in ('USD', 'ILS'));
