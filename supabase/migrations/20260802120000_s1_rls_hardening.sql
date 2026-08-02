-- ============================================================================
-- S1 שלב ג' — סגירת שני חורי WITH CHECK(true) + איחוד is_admin()
-- ============================================================================
-- מקור: בדיקת חדירה חיה (docs/STATE.md, commit a785b5c) — 109 ניסיונות.
-- שני החורים אומתו כאמיתיים: anon מקבל HTTP 201 על INSERT ל-feedback ול-waitlist.
--
-- העובדה המעצבת: **הכתיבה עיוורת.** ל-anon יש INSERT אבל אין שום SELECT policy
-- על שתי הטבלאות (אומת בבדיקת החדירה). לכן הסיכון הוא **הצפה וזיהום**, לא גניבה.
-- המיגרציה הזו מטפלת בהצפה/זיהום ברמת *צורת השורה*; חסם *נפח* מחייב שינוי קוד
-- (ראה §"מה לא נכנס" בתחתית).
--
-- ⚠️ אילוץ בל-יעבור שנשמר: משתמש שנתקע **לפני** התחברות חייב להישאר מסוגל
--    לשלוח פידבק. אומת מול הקוד החי:
--      src/components/FeedbackTab.jsx:160  user_id:    user?.id    || null
--      src/components/FeedbackTab.jsx:161  user_email: user?.email || "anonymous"
--      api/feedback.js:75                  user_id: body.user_id ?? null
--    ⇒ לפני התחברות: user_id = NULL, user_email = המחרוזת 'anonymous' (לא אימייל!).
--    ה-WITH CHECK להלן מתיר את שני המקרים במפורש. אין בדיקת פורמט-אימייל על
--    user_email — היא הייתה שוברת בדיוק את המשתמש החסום.
--
-- ⛔ אל תריץ אוטומטית. ניב מריץ ידנית ב-SQL Editor (CLAUDE.md §12).
--
-- ─── DRY RUN שהורץ לפני הכתיבה (קריאה בלבד, 0 שורות שונו) ────────────────
-- א. האם הפרדיקט החדש מקבל כל שורה שקיימת היום?
--      feedback  8/8   = 100%   (אוכלוסייה: כל שורות feedback)
--      waitlist 57/57  = 100%   (אוכלוסייה: כל שורות waitlist)
-- ב. בקרת-נגד — הפרדיקט אינו true-ריק ("אפס שלא הוכח בבקרת-נגד אינו אפס"):
--      pre-login  (user_id NULL, user_email 'anonymous')  → accepted = true  ✅
--      logged-in  (uuid אמיתי)                            → accepted = true  ✅
--      תקיפה: status='resolved' מזויף                     → accepted = false 🛑
--      תקיפה: type='spam'                                 → accepted = false 🛑
--      תקיפה: message באורך 10,000,000                    → accepted = false 🛑
--      תקיפה: user_id='DROP TABLE trades'                 → accepted = false 🛑
--    4/4 התקיפות נדחו, 2/2 המסלולים הלגיטימיים עברו.
-- ============================================================================

begin;

-- ─── 0. TEST BLOCK — לפני ─────────────────────────────────────────────────
-- ספירות בסיס. חייבות להיות זהות לחלוטין אחרי (המיגרציה אינה נוגעת בנתונים).
create temporary table _s1_before on commit drop as
select 'feedback'::text as tbl, count(*)::bigint as n from public.feedback
union all select 'waitlist', count(*) from public.waitlist
union all select 'admins',   count(*) from public.admins;

select tbl, n as rows_before from _s1_before order by tbl;
-- צפוי:  admins 1 · feedback 8 · waitlist 57


-- ─── 1. feedback — INSERT: WITH CHECK(true) → פרדיקט אמיתי ────────────────
-- לפני:  policy "Anyone can insert feedback"  TO public  WITH CHECK (true)
-- רשימת ה-roles נשמרת זהה (public) בכוונה — שינוי היקף התפקידים אינו חלק
-- מהמשימה הזו, ורק הפרדיקט מתחלף.
drop policy if exists "Anyone can insert feedback" on public.feedback;

create policy feedback_public_insert on public.feedback
  for insert to public
  with check (
    -- סוג מתוך הרשימה הסגורה של הקליינט (VALID_TYPES ב-api/feedback.js:19)
    type in ('bug', 'idea', 'love', 'question')
    -- הודעה קיימת ותחומה — אותו תקרה בדיוק כמו MAX_MESSAGE_LEN (api/feedback.js:20)
    and message is not null
    and length(message) between 1 and 5000
    -- user_email: או NULL, או המחרוזת 'anonymous', או כל טקסט קצר.
    -- ⚠️ במפורש **ללא** בדיקת פורמט אימייל — ראה האילוץ בראש הקובץ.
    and (user_email is null or length(user_email) <= 255)
    -- user_id: NULL (לפני התחברות) או uuid תקין תחבירית. ראה §3 בדוח למה
    -- זו בדיקת *צורה* ולא בדיקת *בעלות*.
    and (
      user_id is null
      or user_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    )
    -- אנונימי לא יכול להזריק שורה שמתחזה למטופלת. coalesce כי status הוא
    -- DEFAULT 'new' — כשהקליינט משמיט אותו, הדיפולט כבר הוחל לפני ה-CHECK.
    and coalesce(status, 'new') = 'new'
  );


-- ─── 2. waitlist — INSERT: WITH CHECK(true) → פרדיקט אמיתי ────────────────
-- לפני:  policy waitlist_anon_insert  TO anon  WITH CHECK (true)
-- רשימת ה-roles נשמרת זהה (anon בלבד) — כפי שהיא היום.
drop policy if exists waitlist_anon_insert on public.waitlist;

create policy waitlist_anon_insert on public.waitlist
  for insert to anon
  with check (
    email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    and length(email) <= 254                       -- RFC 5321
    and (source   is null or length(source)   <= 64)
    and (campaign is null or length(campaign) <= 64)
    -- אנונימי לא יכול להזריק שורה שכבר "מאושרת" ולעקוף את האישור הידני
    -- שמזין את קמפיין ההזמנות (api/send-invites.js).
    and approved_at is null
  );


-- ─── 3. איחוד is_admin() — הסרת האימייל המקודד מ-3 מדיניות ───────────────
-- לפני: שלוש המדיניות האלה הן **המקום היחיד** בסכימה שמקודד
--       'niveven183@gmail.com'. כל 16 ה-RPC של admin_* כבר משתמשים ב-is_admin()
--       (אומת: 16/16 עם is_admin, 0/16 עם אימייל מקודד).
-- ⚠️ בדיקת נעילה-החוצה בוצעה לפני כתיבת הקובץ — ראה הדוח. admins מכיל
--    92a06c0c-c407-42f0-8bf7-476d58f31c9d = auth.users.id של niveven183@gmail.com.

drop policy if exists feedback_admin_select on public.feedback;
create policy feedback_admin_select on public.feedback
  for select to authenticated
  using (public.is_admin());

drop policy if exists feedback_admin_update on public.feedback;
create policy feedback_admin_update on public.feedback
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists waitlist_admin_select on public.waitlist;
create policy waitlist_admin_select on public.waitlist
  for select to authenticated
  using (public.is_admin());


-- ─── 4. CHECK ברמת הטבלה — הגנה שאינה תלויה במדיניות ─────────────────────
-- חלים גם על service_role, ולכן שורדים כל שינוי RLS עתידי.
-- אומת מראש שכל השורות הקיימות עוברות: feedback max(length(message)) = 589,
-- waitlist max(length(email)) = 25 ⇒ הוולידציה מיידית, אין נעילה ארוכה.
-- ⚠️ במכוון **אין** CHECK על feedback.status: admin_set_feedback_status מתיר
--    ('new','reviewed','resolved') ואילו בטבלה קיימים היום רק ('new','resolved').
--    אילוץ כאן היה חוסם ערך חוקי שהפאנל שולח אך טרם נכתב. לא שווה את הסיכון.
alter table public.feedback
  add constraint feedback_message_len_chk
  check (message is null or length(message) <= 5000);

alter table public.waitlist
  add constraint waitlist_email_len_chk
  check (length(email) <= 254);


-- ─── 5. TEST BLOCK — אחרי ────────────────────────────────────────────────
select b.tbl,
       b.n                                                   as rows_before,
       (case b.tbl
          when 'feedback' then (select count(*) from public.feedback)
          when 'waitlist' then (select count(*) from public.waitlist)
          when 'admins'   then (select count(*) from public.admins)
        end)                                                 as rows_after,
       (b.n = (case b.tbl
          when 'feedback' then (select count(*) from public.feedback)
          when 'waitlist' then (select count(*) from public.waitlist)
          when 'admins'   then (select count(*) from public.admins)
        end))                                                as unchanged
from _s1_before b
order by b.tbl;
-- ⚠️ אם unchanged אינו true בכל שלוש השורות — ROLLBACK מיד ואל תעשה COMMIT.

-- אימות שהמדיניות אכן התחלפה ושלא נשאר אימייל מקודד באף מדיניות בסכימה:
select tablename, policyname, cmd, roles,
       coalesce(with_check, '(none)') as with_check,
       coalesce(qual, '(none)')       as qual
from pg_policies
where schemaname = 'public' and tablename in ('feedback', 'waitlist')
order by tablename, policyname;

select count(*) as policies_still_hardcoding_email
from pg_policies
where schemaname = 'public'
  and (coalesce(qual,'') || coalesce(with_check,'')) ilike '%niveven183%';
-- צפוי: 0

commit;


-- ============================================================================
-- ROLLBACK — הדבק as-is כדי לחזור למצב שלפני המיגרציה
-- ============================================================================
-- מחזיר בדיוק את חמש המדיניות המקוריות (הועתקו מ-pg_policies לפני השינוי)
-- ומסיר את שני ה-CHECK. אינו נוגע בנתונים — 0 שורות מושפעות.
--
-- begin;
--
-- drop policy if exists feedback_public_insert on public.feedback;
-- create policy "Anyone can insert feedback" on public.feedback
--   for insert to public with check (true);
--
-- drop policy if exists waitlist_anon_insert on public.waitlist;
-- create policy waitlist_anon_insert on public.waitlist
--   for insert to anon with check (true);
--
-- drop policy if exists feedback_admin_select on public.feedback;
-- create policy feedback_admin_select on public.feedback
--   for select to authenticated
--   using ((auth.jwt() ->> 'email') = 'niveven183@gmail.com');
--
-- drop policy if exists feedback_admin_update on public.feedback;
-- create policy feedback_admin_update on public.feedback
--   for update to authenticated
--   using      ((auth.jwt() ->> 'email') = 'niveven183@gmail.com')
--   with check ((auth.jwt() ->> 'email') = 'niveven183@gmail.com');
--
-- drop policy if exists waitlist_admin_select on public.waitlist;
-- create policy waitlist_admin_select on public.waitlist
--   for select to authenticated
--   using ((auth.jwt() ->> 'email') = 'niveven183@gmail.com');
--
-- alter table public.feedback drop constraint if exists feedback_message_len_chk;
-- alter table public.waitlist drop constraint if exists waitlist_email_len_chk;
--
-- commit;
-- ============================================================================


-- ============================================================================
-- מה **לא** נכנס למיגרציה הזו, ולמה — ראה docs/STATE.md ⏭️/⚠️
-- ============================================================================
-- 1. feedback.user_id → uuid + FK ל-auth.users:
--    FK הופך את השדה ל*תקין*, לא ל*אמיתי*. הערך מגיע מהקליינט
--    (FeedbackTab.jsx:160) ועובר דרך api/feedback.js עם ה-anon key **בלי
--    להעביר את ה-JWT של המשתמש** ⇒ auth.uid() שם הוא תמיד NULL, ולכן אי-אפשר
--    לאכוף `user_id = auth.uid()` בלי לאפס את השיוך של כל 38 המשתמשים.
--    ייחוס לא-מזויף מחייב העברת ה-JWT ל-/api/feedback וגזירת user_id בשרת —
--    שינוי קוד, S2. כאן נסגרה רק *הצורה* (uuid תחבירי או NULL).
--
-- 2. חסם קצב ל-waitlist:
--    ה-DB אינו רואה IP (PostgREST אינו מעביר אותו), ומונה גלובלי היה מאפשר
--    לתוקף אחד לחסום נרשמים אמיתיים. חסם קצב אמיתי = ניתוב ה-insert דרך
--    /api/waitlist עם rateLimit() כמו ב-/api/feedback ⇒ שינוי קוד, S2.
--    כאן נסגרה רק צורת השורה (פורמט אימייל, אורכים, approved_at IS NULL).
--
-- 3. חסם קצב ל-redeem_mentor_invite:
--    ניסיון כושל עושה raise exception ⇒ הטרנזקציה מתגלגלת אחורה ⇒ שום מונה
--    ב-SQL אינו יכול לספור אותו בלי להחליף raise ב-return, מה שמשנה את חוזה
--    השגיאות שהקליינט מציג למשתמש. לכן זה אינו "טבעי למיגרציה". מרחב הקודים
--    30^8 ≈ 6.56×10^11, והמצב בפועל: 1 הזמנה פתוחה, 0 חונכויות פעילות.
-- ============================================================================
