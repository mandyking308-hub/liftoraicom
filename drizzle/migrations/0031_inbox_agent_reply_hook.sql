create or replace function public.notify_reply_agent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform net.http_post(
    url := 'https://oiwbletmjhrhqksosphi.supabase.co/functions/v1/inbox-agent-reply-handover',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-liftor-cron-token', (select token from public.internal_cron_token where id = 1)
    ),
    body := jsonb_build_object('dry_run', false, 'max_items', 25, 'trigger', 'reply_row_inserted')
  );
  return new;
end;
$$;

comment on function public.notify_reply_agent() is
  'Wakes the inbox agent reply handover when a reply row is written. Internal task creation only; sends nothing.';

drop trigger if exists inbox_reply_agent_wake on public.smartlead_activity_events;
create trigger inbox_reply_agent_wake
  after insert on public.smartlead_activity_events
  for each row
  when (new.event_type = 'reply_received')
  execute function public.notify_reply_agent();

drop trigger if exists inbox_reply_agent_wake on public.outbound_provider_events;
create trigger inbox_reply_agent_wake
  after insert on public.outbound_provider_events
  for each row
  when (new.provider_event_type = 'reply_received')
  execute function public.notify_reply_agent();