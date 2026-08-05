-- scripts/retention.sql — קוהורטות שבועיות + התפלגות הזמן לעסקה הראשונה.
--
-- הרצה: SQL Editor ב-Supabase, ידנית. ⛔ לא רץ ב-CI ולא ב-workflow.
-- הריפו **ציבורי** (`docs/STATE.md`), ולכן הפלט חייב להישאר צובר בלבד:
-- ⛔ אפס כתובות · ⛔ אפס UUID · ⛔ אפס שורה שמזהה משתמש בודד.
-- זו הסיבה ש-`.sql` להרצה ידנית ולא `.mjs` ב-Actions: artifact של Actions
-- קריא-לכל, ופלט של סקריפט הוא בדיוק המקום שבו מזהה בודד דולף.
--
-- ─── אזהרת המקור ──────────────────────────────────────────────────────────
-- `trades."createdAt"` **אינו** חותמת יצירת-שורה. אין ב-`public.trades` עמודת
-- `created_at` בצד השרת; הערך מגיע מהלקוח, ובעסקה מיובאת הוא נושא את תאריך
-- העסקה עצמה. נמדד 06.08: **40 מתוך 56 שורות מוקדמות מהרשמת הבעלים**, על פני
-- 3 משתמשים. לכן כל "ימים עד העסקה הראשונה" שנגזר מהעמודה הזו שגוי עבורם.
--
-- ההכרעה: המשתמשים האלה **מוצאים** מהמכנה, והמספר שלהם מדווח בשורה נפרדת.
-- ⛔ לא `greatest(createdAt, signed_up)` — זה היה מייצר 0 ימים יש-מאין והופך
-- נתון חסר לנתון שקרי. חוסר-מדידוּת שמדווח הוא פער; מדידה מפוברקת היא נזק.
--
-- ─── אזהרת המכנה (CLAUDE.md §2) ───────────────────────────────────────────
-- שימור לשבוע N+1 נספר **רק** על משתמשים שעברו כבר 14 יום מההרשמה. משתמש
-- שנרשם אתמול לא "לא-שומר" — פשוט טרם היה לו שבוע 1. בלי הסינון הזה המספר
-- מודד את קצב ההרשמות ומתחזה לשיעור נטישה.

-- ═══ 1. שלד האוכלוסייה — כמה בכלל ניתן למדוד ═══════════════════════════════
with measurable as (
  select u.id, u.created_at as signed_up
  from auth.users u
  where exists (
          select 1 from public.trades t
          where t.user_id = u.id and t.is_demo is not true)
    and not exists (
          select 1 from public.trades b
          where b.user_id = u.id and b.is_demo is not true
            and b."createdAt" < u.created_at)
),
backdated as (
  select count(distinct b.user_id) as n
  from public.trades b join auth.users u on u.id = b.user_id
  where b.is_demo is not true and b."createdAt" < u.created_at
)
select
  'population'                                          as section,
  (select count(*) from auth.users)                     as users_total,
  (select count(distinct user_id) from public.trades
     where is_demo is not true)                         as users_with_trades,
  (select count(*) from measurable)                     as measurable,
  (select n from backdated)                             as excluded_backdated;

-- ═══ 2. התפלגות הזמן לעסקה הראשונה ════════════════════════════════════════
-- התפלגות ולא חציון בלבד: חציון של 9 תצפיות מסתיר את הצורה, וזו בדיוק
-- השאלה — האם האונבורדינג מייצר עסקה מיידית או שיש זנב של נטישה בדרך.
with measurable as (
  select u.id, u.created_at as signed_up
  from auth.users u
  where exists (
          select 1 from public.trades t
          where t.user_id = u.id and t.is_demo is not true)
    and not exists (
          select 1 from public.trades b
          where b.user_id = u.id and b.is_demo is not true
            and b."createdAt" < u.created_at)
),
delay as (
  select extract(epoch from (min(t."createdAt") - m.signed_up)) / 86400.0 as days
  from measurable m
  join public.trades t on t.user_id = m.id and t.is_demo is not true
  group by m.id, m.signed_up
)
select
  'time_to_first_trade' as section,
  case
    when days <  0.042 then 'a. < 1h'
    when days <  1     then 'b. 1h-24h'
    when days <  7     then 'c. 1-7d'
    when days < 30     then 'd. 7-30d'
    else                    'e. 30d+'
  end                                   as bucket,
  count(*)                              as users,
  (select count(*) from delay)          as denominator,
  round(min(days)::numeric, 3)          as min_days,
  round(max(days)::numeric, 3)          as max_days
from delay
group by 2
order by 2;

-- ═══ 3. שימור שבועי — קוהורטה אחת מאוחדת ═════════════════════════════════
-- `eligible` הוא המכנה האמיתי: משתמשים שהשבוע הזה כבר חלף עבורם. שורה שבה
-- eligible = 0 אינה "0% שימור", היא **אין מה למדוד** — ולכן הוא מודפס תמיד.
with measurable as (
  select u.id, u.created_at as signed_up
  from auth.users u
  where exists (
          select 1 from public.trades t
          where t.user_id = u.id and t.is_demo is not true)
    and not exists (
          select 1 from public.trades b
          where b.user_id = u.id and b.is_demo is not true
            and b."createdAt" < u.created_at)
),
weeks as (select generate_series(0, 3) as week),
grid as (
  select w.week, m.id, m.signed_up
  from measurable m cross join weeks w
)
select
  'weekly_retention' as section,
  g.week,
  count(*) filter (
    where now() >= g.signed_up + ((g.week + 1) * interval '7 days')
  ) as eligible,
  count(*) filter (
    where now() >= g.signed_up + ((g.week + 1) * interval '7 days')
      and exists (
        select 1 from public.trades t
        where t.user_id = g.id and t.is_demo is not true
          and t."createdAt" >= g.signed_up + (g.week * interval '7 days')
          and t."createdAt" <  g.signed_up + ((g.week + 1) * interval '7 days'))
  ) as active
from grid g
group by g.week
order by g.week;
