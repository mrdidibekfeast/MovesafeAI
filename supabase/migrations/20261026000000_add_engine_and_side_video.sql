-- Pose-based analysis: record which engine produced a report and keep the
-- side-view video's metadata alongside the front view's.
--
-- Existing rows were all produced by the simulated generator; the default
-- labels them honestly so the UI can keep showing "Simulated" on old reports
-- while new ones show "Automated".
--
-- Still metadata only — no video content is stored.

alter table public.reports
  add column if not exists engine text not null default 'simulated',
  add column if not exists side_file_name text,
  add column if not exists side_file_type text,
  add column if not exists side_file_size bigint;

alter table public.reports
  drop constraint if exists reports_engine_check;
alter table public.reports
  add constraint reports_engine_check check (engine in ('simulated', 'pose'));
