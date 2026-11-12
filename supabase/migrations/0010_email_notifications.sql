-- Crea un evento de correo independiente por cada aviso operativo. Así cada
-- canal conserva su propio estado, reintentos y diagnóstico.
create or replace function public.queue_email_notification_copy()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.channel <> 'email' and exists (
    select 1
      from public.appointments a
      join public.customers c on c.id = a.customer_id
     where a.id = new.appointment_id
       and nullif(trim(c.email), '') is not null
  ) then
    insert into public.notification_events (appointment_id, event_type, channel, payload, created_at)
    values (new.appointment_id, new.event_type, 'email', jsonb_build_object('source_event_id', new.id), new.created_at);
  end if;
  return new;
end $$;

drop trigger if exists notification_events_queue_email on public.notification_events;
create trigger notification_events_queue_email
after insert on public.notification_events
for each row when (new.channel <> 'email')
execute function public.queue_email_notification_copy();

create or replace function public.claim_email_notification_events(
  p_after timestamptz,
  p_limit integer default 25
) returns table (id uuid)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with selected as (
    select ne.id
      from public.notification_events ne
     where ne.created_at >= p_after
       and ne.channel = 'email'
       and (
         ne.status = 'pending'
         or (ne.status = 'processing' and ne.processing_started_at < now() - interval '15 minutes')
       )
     order by ne.created_at
     limit greatest(1, least(p_limit, 100))
     for update skip locked
  )
  update public.notification_events ne
     set status = 'processing', processing_started_at = now()
    from selected s
   where ne.id = s.id
  returning ne.id;
end $$;

revoke all on function public.claim_email_notification_events(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.claim_email_notification_events(timestamptz, integer)
  to service_role;

