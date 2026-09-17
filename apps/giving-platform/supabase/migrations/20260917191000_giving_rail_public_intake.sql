-- Public form intake controls used by the Giving Rail edge function.

create table public.gr_public_rate_limits (
  rate_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.gr_public_rate_limits enable row level security;
-- No anon/authenticated policies. Service-role edge functions only.

create or replace function public.gr_take_rate_limit(
  p_rate_key text,
  p_window_seconds integer default 900,
  p_limit integer default 10
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.gr_public_rate_limits;
begin
  if p_rate_key is null or length(p_rate_key) < 8 then
    return false;
  end if;

  insert into public.gr_public_rate_limits(rate_key, window_started_at, request_count, updated_at)
  values (p_rate_key, now(), 1, now())
  on conflict (rate_key) do update
    set request_count = case
          when public.gr_public_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
            then 1
          else public.gr_public_rate_limits.request_count + 1
        end,
        window_started_at = case
          when public.gr_public_rate_limits.window_started_at < now() - make_interval(secs => p_window_seconds)
            then now()
          else public.gr_public_rate_limits.window_started_at
        end,
        updated_at = now()
  returning * into v_row;

  return v_row.request_count <= p_limit;
end;
$$;

revoke all on function public.gr_take_rate_limit(text,integer,integer) from public;

create or replace function public.gr_prune_rate_limits()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_count integer;
begin
  delete from public.gr_public_rate_limits where updated_at < now() - interval '48 hours';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.gr_prune_rate_limits() from public;
