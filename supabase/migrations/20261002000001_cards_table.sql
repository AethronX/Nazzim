-- Retrieval-practice cards.
--
-- These are now evidence: a graded card is part of what an exam's readiness rests on, so losing them with a
-- phone would silently drop a student's readiness. The table mirrors the other academic collections exactly
-- — same shape, same row-level security, same column grants — so the sync layer treats it like any other.
--
-- Card text is the student's own writing. It is protected the same way their notes are: readable only by
-- the owning account, enforced by the database rather than by app code.
create table public.cards (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  id text not null check (char_length(id) <= 64),
  data jsonb not null check (octet_length(data::text) <= 20000),
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index cards_user_updated on public.cards (user_id, updated_at);

create trigger cards_touch before insert or update on public.cards
  for each row execute function public.touch_updated_at();

alter table public.cards enable row level security;

create policy "own rows: read" on public.cards
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own rows: insert" on public.cards
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own rows: update" on public.cards
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- No delete policy, matching the other collections: removal is a soft delete through `deleted`, which is what
-- keeps a deletion on one device from being resurrected by another device that synced before it.
