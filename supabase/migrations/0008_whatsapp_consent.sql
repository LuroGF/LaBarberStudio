-- LA BARBER STUDIO · Consentimiento para notificaciones operativas por WhatsApp

alter table public.customers
  add column whatsapp_opt_in_at timestamptz,
  add column whatsapp_opt_in_source text
    check (whatsapp_opt_in_source is null or whatsapp_opt_in_source in ('booking', 'customer_portal', 'admin'));

comment on column public.customers.whatsapp_opt_in_at is
  'Consentimiento para recibir por WhatsApp mensajes operativos sobre citas y huecos solicitados.';

alter table public.notification_events
  add column processing_started_at timestamptz;

alter table public.notification_events
  drop constraint notification_events_status_check,
  add constraint notification_events_status_check
    check (status in ('pending', 'processing', 'sent', 'failed', 'skipped'));

-- Reclama eventos de forma atómica. SKIP LOCKED evita duplicados si coinciden dos ejecuciones.
create or replace function public.claim_whatsapp_notification_events(
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
       and ne.channel in ('whatsapp_manual', 'whatsapp_api')
       and coalesce(ne.payload ->> 'auto_skipped_no_consent', 'false') <> 'true'
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

revoke all on function public.claim_whatsapp_notification_events(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.claim_whatsapp_notification_events(timestamptz, integer)
  to service_role;

