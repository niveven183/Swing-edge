-- גל אופק העסקה — עמודת `horizon` + תיקון ברירת המחדל של `status`.
--
-- ── חלק 1: horizon ──────────────────────────────────────────────────────────
--
-- Why: 33/59 העסקאות פתוחות, וערך היומן נולד רק בסגירה. תזכורת עדינה נגזרת
-- מ-`strategy` המוצהר באונבורדינג, עם דריסה אופציונלית פר-עסקה.
--
-- ⛔ למה לא `openedAt`: `date` כבר הוא תאריך הכניסה בשני מסלולי הכתיבה —
-- הידני (SwingEdge_App.jsx:2447 `date: todayKey()`) והייבוא
-- (import/normalizeRow.js:165). נמדד ב-2026-08-10: 59/59 השורות מקיימות
-- `"createdAt"::date = date`, כלומר `createdAt` נגזר מ-`date` ולא ההפך
-- (normalizeRow.js:179 מחתים `${date}T14:30:00`). עמודה שמשכפלת עמודה קיימת
-- היא סחיפה — ראה docs/DECISIONS.md 2026-08-10.
--
-- nullable ללא default: `null` פירושו "גזור מהפרופיל", והוא המצב של 59/59
-- השורות הקיימות. ⛔ אפס backfill · ⛔ אפס UPDATE · אפס שינוי בשורה קיימת.
--
-- RLS: אין צורך ב-policy חדשה. שתי ה-policies על `trades` הן פרדיקטים ברמת
-- שורה (`auth.uid() = user_id`, `is_active_mentor(user_id)`) ואינן מזכירות
-- עמודה; ה-GRANTs הם ברמת טבלה (נמדד: 26/26 עמודות לכל grantee). עמודה חדשה
-- מכוסה מיד.
-- ⚠️ נגזרת מודעת: `mentors read active mentee trades` הוא SELECT על השורה
-- כולה, ולכן `horizon` ייחשף למנטור פעיל ברגע שהעמודה נוצרת.
--
-- ⚠️ סדר כפוי, שני צעדים: המיגרציה הזו רצה קודם, ורק אחריה נוסף `horizon`
-- ל-TRADE_COLUMNS ב-src/supabaseClient.js. עד שהיא רצה, המפתח נזרק בשקט
-- בכתיבה (supabaseClient.js:82-83) והאפליקציה מתנהגת בדיוק כמו היום.

alter table public.trades
  add column if not exists horizon text;

alter table public.trades
  drop constraint if exists trades_horizon_check;

-- `long` הוא שסתום הבריחה: עסקה שסומנה כך לעולם לא תקבל סימן, בכל גיל.
alter table public.trades
  add constraint trades_horizon_check
  check (horizon is null or horizon in ('short', 'medium', 'long'));

comment on column public.trades.horizon is
  'אופק מוצהר פר-עסקה: short(3d) | medium(21d) | long(לעולם לא מסומן). null = גזור מ-strategy של המשתמש. נגזר בזמן רינדור ב-src/lib/tradeHorizon.js; הסימן עצמו לעולם לא נשמר.';

-- ── חלק 2: ברירת המחדל המתה של status ───────────────────────────────────────
--
-- הסכימה קבעה `DEFAULT 'open'` באותיות קטנות, אך כל הקוד משווה גדולות:
-- statisticalModels.js:37 (`getClosed`), SwingEdge_App.jsx:4643,
-- tradeCloseState.js:13,17. שורה שתיכנס בלי `status` מפורש הייתה מקבלת
-- `'open'` ונעשית בלתי-נראית לכל השוואה בקוד — לא פתוחה ולא סגורה.
--
-- אומת ב-2026-08-10 לפני השינוי: `OPEN` 33 · `CLOSED` 26 · `'open'` קטנה 0 ·
-- null 0, סה"כ 59. ⛔ אפס שורה קיימת מושפעת → ⛔ אפס UPDATE. זהו תיקון של
-- פצצה מתקתקת בלבד, לא תיקון נתונים.

alter table public.trades
  alter column status set default 'OPEN';
