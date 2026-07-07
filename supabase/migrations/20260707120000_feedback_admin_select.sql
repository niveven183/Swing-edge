-- fix(admin): feedback was invisible to AdminPanel — RLS enabled but no SELECT
-- policy existed (only "Anyone can insert feedback"). The anon client read 0 rows.
-- Mirror waitlist_admin_select: only the authenticated admin may read rows.
create policy feedback_admin_select on public.feedback
  for select to authenticated
  using ((auth.jwt() ->> 'email') = 'niveven183@gmail.com');
