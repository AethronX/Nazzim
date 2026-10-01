-- Two devices can log focus for the same day; minutes only ever grow, so keep the larger value.
create or replace function public.focus_keep_max() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.minutes := greatest(old.minutes, new.minutes);
  return new;
end $$;
revoke execute on function public.focus_keep_max() from public, anon, authenticated;
create trigger focus_days_keep_max before update on public.focus_days
  for each row execute function public.focus_keep_max();
