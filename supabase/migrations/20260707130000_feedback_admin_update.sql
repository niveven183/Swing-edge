create policy feedback_admin_update on public.feedback
  for update to authenticated
  using ((auth.jwt() ->> 'email') = 'niveven183@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'niveven183@gmail.com');
