-- Movement reports for signed-in users.
--
-- Guest reports are NOT stored here: Row Level Security blocks anonymous
-- writes by design, so guests continue to keep reports in their own browser
-- (see src/services/reportStorage.ts).
--
-- Uploaded videos are never stored anywhere. Only file metadata (name, MIME
-- type, size) is kept, exactly as before.

create table if not exists public.reports (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  created_at           timestamptz not null default now(),

  movement_type        text not null,
  custom_movement_name text,

  -- File metadata only. Never file contents.
  file_name            text not null,
  file_type            text not null,
  file_size            bigint,

  status               text not null,
  overall_score        integer not null check (overall_score between 0 and 100),
  summary              text not null default '',

  -- Nested report structures kept as JSON; they are always read whole.
  metrics              jsonb not null default '[]'::jsonb,
  observations         jsonb not null default '[]'::jsonb,
  recommendations      jsonb not null default '[]'::jsonb,

  -- The user's own optional note (<= 500 chars in the UI).
  notes                text
);

-- The one query the app makes: this user's reports, newest first.
create index if not exists reports_user_id_created_at_idx
  on public.reports (user_id, created_at desc);

alter table public.reports enable row level security;

-- Four policies, all scoped to the authenticated owner.
--
-- `with check` appears on INSERT *and* UPDATE so a user can neither create a
-- row owned by someone else nor reassign one of their rows away.
-- `(select auth.uid())` lets Postgres evaluate the call once per statement
-- rather than once per row.

drop policy if exists "select own reports" on public.reports;
create policy "select own reports" on public.reports
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "insert own reports" on public.reports;
create policy "insert own reports" on public.reports
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "update own reports" on public.reports;
create policy "update own reports" on public.reports
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "delete own reports" on public.reports;
create policy "delete own reports" on public.reports
  for delete to authenticated
  using ((select auth.uid()) = user_id);
