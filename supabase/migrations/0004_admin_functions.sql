-- THE GR BARBER · Operaciones atómicas del panel (se ejecutan con los permisos de quien llama,
-- así que RLS sigue aplicando: solo un administrador puede usarlas).

-- Los tramos de un mismo día no pueden solaparse (evita horas duplicadas).
alter table public.business_hours
  add constraint business_hours_no_overlap exclude using gist (
    barber_id with =,
    weekday with =,
    int4range((extract(epoch from start_time) / 60)::int, (extract(epoch from end_time) / 60)::int) with &&
  );

-- Sustituye los tramos de un día de la semana en una sola transacción.
-- p_ranges = [{"start":"10:00","end":"14:00"}, …]; vacío = día cerrado.
create or replace function public.set_day_hours(p_barber uuid, p_weekday smallint, p_ranges jsonb)
returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  delete from public.business_hours where barber_id = p_barber and weekday = p_weekday;
  insert into public.business_hours (barber_id, weekday, start_time, end_time)
  select p_barber, p_weekday, (r ->> 'start')::time, (r ->> 'end')::time
    from jsonb_array_elements(p_ranges) r;
end $$;

-- Crea un bloqueo (vacaciones, festivo o unas horas). Si p_cancel es true, cancela en la misma
-- transacción las citas activas afectadas y deja un aviso pendiente para cada una.
-- Con p_cancel = false no toca ninguna cita: nunca se cancela nada en silencio.
create or replace function public.create_block(
  p_barber uuid,
  p_kind public.exception_kind,
  p_starts timestamptz,
  p_ends timestamptz,
  p_reason text,
  p_cancel boolean default false
) returns integer
language plpgsql security invoker set search_path = public as $$
declare
  n integer := 0;
begin
  if not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;
  if p_kind not in ('closed', 'block') then
    raise exception 'INVALID_KIND';
  end if;
  if p_ends <= p_starts then
    raise exception 'INVALID_RANGE';
  end if;

  insert into public.schedule_exceptions (barber_id, kind, starts_at, ends_at, reason, created_by)
  values (p_barber, p_kind, p_starts, p_ends, nullif(btrim(coalesce(p_reason, '')), ''), auth.uid());

  if p_cancel then
    with cancelled as (
      update public.appointments
         set status = 'cancelled'
       where barber_id = p_barber
         and status in ('pending', 'confirmed')
         and starts_at < p_ends
         and ends_at > p_starts
      returning id)
    insert into public.notification_events (appointment_id, event_type, channel, payload)
    select id, 'cancelled', 'whatsapp_manual', jsonb_build_object('reason', 'schedule_block')
      from cancelled;
    get diagnostics n = row_count;
  end if;
  return n;
end $$;

revoke all on function public.set_day_hours(uuid, smallint, jsonb) from public, anon;
revoke all on function public.create_block(uuid, public.exception_kind, timestamptz, timestamptz, text, boolean)
  from public, anon;
grant execute on function public.set_day_hours(uuid, smallint, jsonb) to authenticated;
grant execute on function public.create_block(uuid, public.exception_kind, timestamptz, timestamptz, text, boolean)
  to authenticated;
