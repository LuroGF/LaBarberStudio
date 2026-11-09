-- THE GR BARBER · Lógica de reservas en el servidor (PostgreSQL)
-- Estas funciones solo las puede ejecutar el rol service_role (servidor Next.js).
-- El navegador nunca habla directamente con ellas.

-- Normaliza teléfonos a formato internacional. España por defecto (+34).
create or replace function public.normalize_phone(p text) returns text
language plpgsql immutable as $$
declare
  d text := regexp_replace(coalesce(p, ''), '[^0-9+]', '', 'g');
begin
  if d like '00%' then
    d := '+' || substr(d, 3);
  end if;
  if d !~ '^\+' then
    if d ~ '^[6789][0-9]{8}$' then
      d := '+34' || d;
    else
      return null;
    end if;
  end if;
  if d ~ '^\+[0-9]{8,15}$' then
    return d;
  end if;
  return null;
end $$;

-- Marca como caducadas las solicitudes pendientes cuyo plazo ha vencido (libera el hueco).
create or replace function public.expire_pending_appointments() returns integer
language plpgsql security definer set search_path = public as $$
declare
  n integer;
begin
  update public.appointments
     set status = 'expired'
   where status = 'pending' and expires_at <= now();
  get diagnostics n = row_count;
  return n;
end $$;

-- Horas realmente disponibles para un servicio en un día (hora de Madrid).
create or replace function public.get_slots(
  p_service_id uuid,
  p_date date,
  p_barber_id uuid default null
) returns table (slot_start timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  s public.business_settings;
  v_duration integer;
  v_barber uuid;
  v_earliest timestamptz;
  v_day_start timestamptz;
  v_day_end timestamptz;
begin
  select * into s from public.business_settings where id;

  select sv.duration_minutes into v_duration
    from public.services sv
   where sv.id = p_service_id and sv.is_active and sv.deleted_at is null;
  if v_duration is null then
    return;
  end if;

  v_barber := coalesce(
    p_barber_id,
    (select b.id from public.barbers b where b.is_active order by b.created_at limit 1));
  if v_barber is null then
    return;
  end if;

  -- Fuera de la ventana de reserva permitida
  if p_date > ((now() at time zone s.timezone)::date + s.max_advance_days) then
    return;
  end if;

  v_earliest  := now() + make_interval(mins => s.min_notice_minutes);
  v_day_start := p_date::timestamp at time zone s.timezone;
  v_day_end   := (p_date + 1)::timestamp at time zone s.timezone;

  return query
  with windows as (
    select (p_date + bh.start_time) at time zone s.timezone as w_start,
           (p_date + bh.end_time)   at time zone s.timezone as w_end
      from public.business_hours bh
     where bh.barber_id = v_barber
       and bh.weekday = extract(isodow from p_date)::int
    union all
    select greatest(se.starts_at, v_day_start), least(se.ends_at, v_day_end)
      from public.schedule_exceptions se
     where se.barber_id = v_barber
       and se.kind = 'extra_open'
       and se.starts_at < v_day_end
       and se.ends_at > v_day_start
  ),
  -- Puntos "pegados" a la agenda: justo cuando termina una cita (o un bloqueo) y justo
  -- antes de que empiece la siguiente, para no perder minutos entre citas de duración irregular.
  anchors as (
    select upper(a.occupied) as t
      from public.appointments a
     where a.barber_id = v_barber
       and (a.status = 'confirmed' or (a.status = 'pending' and a.expires_at > now()))
       and a.starts_at < v_day_end and a.ends_at > v_day_start
    union
    select lower(a.occupied) - make_interval(mins => v_duration + s.buffer_minutes)
      from public.appointments a
     where a.barber_id = v_barber
       and (a.status = 'confirmed' or (a.status = 'pending' and a.expires_at > now()))
       and a.starts_at < v_day_end and a.ends_at > v_day_start
    union
    select se.ends_at
      from public.schedule_exceptions se
     where se.barber_id = v_barber and se.kind in ('closed', 'block')
       and se.starts_at < v_day_end and se.ends_at > v_day_start
    union
    select se.starts_at - make_interval(mins => v_duration)
      from public.schedule_exceptions se
     where se.barber_id = v_barber and se.kind in ('closed', 'block')
       and se.starts_at < v_day_end and se.ends_at > v_day_start
  ),
  candidates as (
    select g as c_start, g + make_interval(mins => v_duration) as c_end
      from windows w,
           lateral generate_series(
             w.w_start,
             w.w_end - make_interval(mins => v_duration),
             make_interval(mins => s.slot_step_minutes)) g
    union
    select an.t, an.t + make_interval(mins => v_duration)
      from windows w
      join anchors an
        on an.t >= w.w_start
       and an.t + make_interval(mins => v_duration) <= w.w_end
  )
  select distinct c.c_start
    from candidates c
   where c.c_start >= v_earliest
     and not exists (
       select 1 from public.schedule_exceptions se
        where se.barber_id = v_barber
          and se.kind in ('closed', 'block')
          and tstzrange(se.starts_at, se.ends_at) && tstzrange(c.c_start, c.c_end))
     and not exists (
       select 1 from public.appointments a
        where a.barber_id = v_barber
          and (a.status = 'confirmed' or (a.status = 'pending' and a.expires_at > now()))
          and a.occupied && tstzrange(c.c_start, c.c_end + make_interval(mins => s.buffer_minutes)))
   order by 1;
end $$;

-- Crea una reserva de cliente. Valida todo en el servidor y delega el anti-solape
-- en la restricción EXCLUDE de PostgreSQL (segura ante peticiones simultáneas).
create or replace function public.create_appointment(
  p_service_id uuid,
  p_starts_at timestamptz,
  p_full_name text,
  p_phone text,
  p_email text,
  p_notes text,
  p_token_hash text
) returns table (
  out_id uuid,
  out_status public.appointment_status,
  out_starts_at timestamptz,
  out_ends_at timestamptz
)
language plpgsql security definer set search_path = public as $$
declare
  s public.business_settings;
  v_service public.services;
  v_barber uuid;
  v_phone text;
  v_customer uuid;
  v_status public.appointment_status;
  v_ends timestamptz;
  v_id uuid;
  v_active integer;
begin
  select * into s from public.business_settings where id;

  v_phone := public.normalize_phone(p_phone);
  if v_phone is null then
    raise exception 'INVALID_PHONE';
  end if;
  if p_full_name is null or char_length(btrim(p_full_name)) not between 2 and 120 then
    raise exception 'INVALID_NAME';
  end if;
  if p_token_hash is null or char_length(p_token_hash) <> 64 then
    raise exception 'INVALID_TOKEN';
  end if;

  select * into v_service from public.services
   where id = p_service_id and is_active and deleted_at is null;
  if not found then
    raise exception 'SERVICE_UNAVAILABLE';
  end if;

  select b.id into v_barber from public.barbers b where b.is_active order by b.created_at limit 1;
  if v_barber is null then
    raise exception 'NO_BARBER';
  end if;

  -- Pone en fila las reservas de un mismo barbero. Sin esto, dos peticiones simultáneas con horas
  -- que se pisan podían acabar en un "deadlock" en vez de un aviso claro de hora ocupada.
  -- La restricción EXCLUDE sigue siendo la red de seguridad final.
  perform pg_advisory_xact_lock(hashtextextended(v_barber::text, 0));

  -- Libera huecos de solicitudes caducadas antes de comprobar nada.
  perform public.expire_pending_appointments();

  -- La hora pedida debe ser exactamente una de las horas realmente disponibles.
  if not exists (
    select 1
      from public.get_slots(p_service_id, (p_starts_at at time zone s.timezone)::date, v_barber) g
     where g.slot_start = p_starts_at
  ) then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  -- Cliente: se identifica por teléfono. No se sobrescribe el nombre de un cliente existente.
  insert into public.customers as c (full_name, phone, email)
  values (btrim(p_full_name), v_phone, nullif(btrim(coalesce(p_email, '')), ''))
  on conflict (phone) do update
    set email = coalesce(c.email, excluded.email)
  returning c.id into v_customer;

  select count(*) into v_active
    from public.appointments a
   where a.customer_id = v_customer
     and a.status in ('pending', 'confirmed')
     and a.starts_at > now();
  if v_active >= s.max_active_per_phone then
    raise exception 'TOO_MANY_ACTIVE';
  end if;

  v_status := case when s.approval_mode = 'auto' then 'confirmed' else 'pending' end;
  v_ends := p_starts_at + make_interval(mins => v_service.duration_minutes);

  insert into public.appointments (
    barber_id, customer_id, service_id, service_name, price_cents, duration_minutes,
    buffer_minutes, starts_at, ends_at, status, expires_at, manage_token_hash, customer_notes)
  values (
    v_barber, v_customer, v_service.id, v_service.name, v_service.price_cents,
    v_service.duration_minutes, s.buffer_minutes, p_starts_at, v_ends, v_status,
    case when v_status = 'pending'
         then now() + make_interval(mins => s.pending_hold_minutes) end,
    p_token_hash, nullif(btrim(coalesce(p_notes, '')), ''))
  returning id into v_id;

  insert into public.notification_events (appointment_id, event_type, channel, payload)
  values (v_id, 'request_created', 'whatsapp_manual',
          jsonb_build_object('status', v_status));

  return query select v_id, v_status, p_starts_at, v_ends;
exception
  when exclusion_violation or deadlock_detected then
    raise exception 'SLOT_UNAVAILABLE';
end $$;

-- Consulta de una cita mediante su enlace seguro (recibe el hash, nunca otra cita).
create or replace function public.get_appointment_by_token(p_token_hash text)
returns table (
  out_id uuid,
  out_status public.appointment_status,
  out_service_name text,
  out_price_cents integer,
  out_duration_minutes integer,
  out_starts_at timestamptz,
  out_ends_at timestamptz,
  out_expires_at timestamptz,
  out_customer_name text,
  out_can_cancel boolean
)
language sql stable security definer set search_path = public as $$
  select a.id, a.status, a.service_name, a.price_cents, a.duration_minutes,
         a.starts_at, a.ends_at, a.expires_at, c.full_name,
         (a.status in ('pending', 'confirmed') and a.starts_at > now()
          and (a.status = 'pending'
               or a.starts_at - make_interval(hours => s.cancellation_notice_hours) > now()))
    from public.appointments a
    join public.customers c on c.id = a.customer_id
    cross join public.business_settings s
   where a.manage_token_hash = p_token_hash
$$;

-- Cancelación por el cliente según la política configurada.
create or replace function public.cancel_appointment_by_token(p_token_hash text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  a public.appointments;
  s public.business_settings;
begin
  select * into s from public.business_settings where id;
  select * into a from public.appointments
   where manage_token_hash = p_token_hash for update;
  if not found then
    raise exception 'NOT_FOUND';
  end if;
  if a.status not in ('pending', 'confirmed') or a.starts_at <= now() then
    raise exception 'NOT_CANCELLABLE';
  end if;
  if a.status = 'confirmed'
     and a.starts_at - make_interval(hours => s.cancellation_notice_hours) <= now() then
    raise exception 'TOO_LATE';
  end if;

  update public.appointments set status = 'cancelled' where id = a.id;
  insert into public.notification_events (appointment_id, event_type, channel)
  values (a.id, 'cancelled', 'whatsapp_manual');
  return true;
end $$;

-- Solo el servidor (service_role) puede ejecutar estas funciones.
revoke all on function public.get_slots(uuid, date, uuid) from public, anon, authenticated;
revoke all on function public.create_appointment(uuid, timestamptz, text, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.get_appointment_by_token(text) from public, anon, authenticated;
revoke all on function public.cancel_appointment_by_token(text) from public, anon, authenticated;
revoke all on function public.expire_pending_appointments() from public, anon, authenticated;

grant execute on function public.get_slots(uuid, date, uuid) to service_role;
grant execute on function public.create_appointment(uuid, timestamptz, text, text, text, text, text)
  to service_role;
grant execute on function public.get_appointment_by_token(text) to service_role;
grant execute on function public.cancel_appointment_by_token(text) to service_role;
grant execute on function public.expire_pending_appointments() to service_role;
