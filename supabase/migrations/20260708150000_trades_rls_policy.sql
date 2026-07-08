alter table public.trades enable row level security;

drop policy if exists "users own trades" on public.trades;

create policy "users own trades" on public.trades
  for all to public
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
