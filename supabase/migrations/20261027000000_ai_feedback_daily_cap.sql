-- Global daily cap on Gemini feedback generations.
--
-- The per-user throttle in the Edge Function limits one account; this is the
-- ceiling across ALL accounts, so the bill has a hard maximum no matter how
-- many sign-ups someone scripts. One row per UTC day holds the count.
--
-- Only the SECURITY DEFINER function below may touch the table: RLS is on
-- with no policies, and the function is executable by authenticated users
-- only (the Edge Function calls it with the caller's own JWT). It never
-- reveals the count - just whether this request may proceed.

create table if not exists public.ai_feedback_usage (
  day date primary key,
  count integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.ai_feedback_usage enable row level security;

-- Atomically claims one unit of today's quota. Returns true when the request
-- may proceed (and the count has been incremented), false when today's cap
-- is already reached. The conditional ON CONFLICT update is the whole trick:
-- when the count is at the limit the UPDATE does nothing, RETURNING yields
-- no row, and the function reports false - no race between check and write.
create or replace function public.consume_ai_feedback_quota(p_limit integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed integer;
begin
  if p_limit is null or p_limit < 1 then
    return false;
  end if;

  insert into public.ai_feedback_usage as u (day, count)
  values ((now() at time zone 'utc')::date, 1)
  on conflict (day) do update
    set count = u.count + 1,
        updated_at = now()
    where u.count < p_limit
  returning u.count into claimed;

  return claimed is not null;
end;
$$;

revoke all on function public.consume_ai_feedback_quota(integer) from public;
revoke all on function public.consume_ai_feedback_quota(integer) from anon;
grant execute on function public.consume_ai_feedback_quota(integer) to authenticated;
grant execute on function public.consume_ai_feedback_quota(integer) to service_role;
