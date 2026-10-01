-- NAZZIM core schema: profiles, synced academic entities, focus log, remote config, product events.
-- Applied to project vntbusmfohmrarvfkttp on 2026-10-01.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '' check (char_length(name) <= 80),
  university text not null default '' check (char_length(university) <= 120),
  major text not null default '' check (char_length(major) <= 120),
  year text not null default '' check (char_length(year) <= 40),
  lang text not null default 'en' check (lang in ('en', 'ar')),
  daily_minutes int not null default 120 check (daily_minutes between 15 and 600),
  tier text not null default 'free' check (tier in ('free', 'plus', 'pro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
create policy "own profile: read" on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy "own profile: update" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke update on public.profiles from authenticated, anon;
grant update (name, university, major, year, lang, daily_minutes) on public.profiles to authenticated;

do $$
declare t text;
begin
  foreach t in array array['subjects', 'tasks', 'exams', 'study_sessions'] loop
    execute format($f$
      create table public.%1$I (
        user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
        id text not null check (char_length(id) <= 64),
        data jsonb not null check (octet_length(data::text) <= 20000),
        deleted boolean not null default false,
        updated_at timestamptz not null default now(),
        primary key (user_id, id)
      );
      create index %1$s_user_updated on public.%1$I (user_id, updated_at);
      create trigger %1$s_touch before insert or update on public.%1$I
        for each row execute function public.touch_updated_at();
      alter table public.%1$I enable row level security;
      create policy "own rows: read" on public.%1$I for select to authenticated using (user_id = (select auth.uid()));
      create policy "own rows: insert" on public.%1$I for insert to authenticated with check (user_id = (select auth.uid()));
      create policy "own rows: update" on public.%1$I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
    $f$, t);
  end loop;
end $$;

create table public.focus_days (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day date not null,
  minutes int not null check (minutes between 0 and 1440),
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);
create index focus_days_user_updated on public.focus_days (user_id, updated_at);
create trigger focus_days_touch before insert or update on public.focus_days
  for each row execute function public.touch_updated_at();
alter table public.focus_days enable row level security;
create policy "own focus: read" on public.focus_days for select to authenticated using (user_id = (select auth.uid()));
create policy "own focus: insert" on public.focus_days for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own focus: update" on public.focus_days for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.app_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
create trigger app_config_touch before update on public.app_config
  for each row execute function public.touch_updated_at();
alter table public.app_config enable row level security;
create policy "config: read" on public.app_config for select to anon, authenticated using (true);

insert into public.app_config (key, value) values ('plans', '{
  "trialDays": 7,
  "prices": { "plus": { "month": 4.99, "year": 29.99 }, "pro": { "month": 9.99, "year": 59.99 } },
  "limits": {
    "free": { "activeExams": 2, "insights": 1 },
    "plus": { "activeExams": null, "insights": 3 },
    "pro": { "activeExams": null, "insights": 3 }
  }
}'::jsonb);

create table public.events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null check (name ~ '^[a-z_]{2,48}$'),
  props jsonb not null default '{}' check (octet_length(props::text) <= 2000),
  created_at timestamptz not null default now()
);
create index events_name_created on public.events (name, created_at);
create index events_user on public.events (user_id);
alter table public.events enable row level security;
create policy "events: insert own" on public.events for insert to authenticated with check (user_id = (select auth.uid()));
