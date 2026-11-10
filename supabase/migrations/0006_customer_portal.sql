-- LA BARBER STUDIO · Portal privado de clientes
-- El correo se verifica en Supabase Auth. Solo después se vincula auth.users con customers.

alter table public.customers
  add column auth_user_id uuid references auth.users (id) on delete set null;

create unique index customers_auth_user_key on public.customers (auth_user_id)
  where auth_user_id is not null;

create policy customers_self_read on public.customers
  for select to authenticated using (auth_user_id = auth.uid());

create policy customers_self_update on public.customers
  for update to authenticated
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

create policy appointments_customer_read on public.appointments
  for select to authenticated using (
    exists (
      select 1 from public.customers c
       where c.id = appointments.customer_id and c.auth_user_id = auth.uid()
    )
  );

-- Cancela una cita desde una sesión de cliente, comprobando propiedad y plazo en la BD.
create or replace function public.cancel_customer_appointment(p_appointment_id uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  a public.appointments;
  s public.business_settings;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;

  select a0.* into a
    from public.appointments a0
    join public.customers c on c.id = a0.customer_id
   where a0.id = p_appointment_id and c.auth_user_id = auth.uid()
   for update of a0;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into s from public.business_settings where id;
  if a.status not in ('pending', 'confirmed') or a.starts_at <= now() then
    raise exception 'NOT_CANCELLABLE';
  end if;
  if a.status = 'confirmed'
     and a.starts_at - make_interval(hours => s.cancellation_notice_hours) <= now() then
    raise exception 'TOO_LATE';
  end if;

  update public.appointments set status = 'cancelled' where id = a.id;
  insert into public.notification_events (appointment_id, event_type, channel, payload)
  values (a.id, 'cancelled', 'whatsapp_manual', jsonb_build_object('source', 'customer_portal'));
  return true;
end $$;

-- Cambia servicio y hora en una sola transacción y vuelve a validar disponibilidad.
create or replace function public.reschedule_customer_appointment(
  p_appointment_id uuid,
  p_service_id uuid,
  p_starts_at timestamptz
) returns boolean
language plpgsql security definer set search_path = public as $$
declare
  a public.appointments;
  sv public.services;
  s public.business_settings;
  v_ends timestamptz;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;

  select a0.* into a
    from public.appointments a0
    join public.customers c on c.id = a0.customer_id
   where a0.id = p_appointment_id and c.auth_user_id = auth.uid()
   for update of a0;
  if not found then raise exception 'NOT_FOUND'; end if;

  select * into s from public.business_settings where id;
  if a.status not in ('pending', 'confirmed') or a.starts_at <= now() then
    raise exception 'NOT_MODIFIABLE';
  end if;
  if a.status = 'confirmed'
     and a.starts_at - make_interval(hours => s.cancellation_notice_hours) <= now() then
    raise exception 'TOO_LATE';
  end if;

  select * into sv from public.services
   where id = p_service_id and is_active and deleted_at is null;
  if not found then raise exception 'SERVICE_UNAVAILABLE'; end if;

  perform pg_advisory_xact_lock(hashtextextended(a.barber_id::text, 0));
  if not exists (
    select 1
      from public.get_slots(p_service_id, (p_starts_at at time zone s.timezone)::date, a.barber_id) g
     where g.slot_start = p_starts_at
  ) then
    raise exception 'SLOT_UNAVAILABLE';
  end if;

  v_ends := p_starts_at + make_interval(mins => sv.duration_minutes);
  update public.appointments
     set service_id = sv.id,
         service_name = sv.name,
         price_cents = sv.price_cents,
         duration_minutes = sv.duration_minutes,
         starts_at = p_starts_at,
         ends_at = v_ends,
         status = case when s.approval_mode = 'auto' then 'confirmed'::public.appointment_status
                       else 'pending'::public.appointment_status end,
         expires_at = case when s.approval_mode = 'manual'
                           then now() + make_interval(mins => s.pending_hold_minutes) end
   where id = a.id;

  insert into public.notification_events (appointment_id, event_type, channel, payload)
  values (a.id, 'modified', 'whatsapp_manual', jsonb_build_object('source', 'customer_portal'));
  return true;
exception
  when exclusion_violation or deadlock_detected then
    raise exception 'SLOT_UNAVAILABLE';
end $$;

revoke all on function public.cancel_customer_appointment(uuid) from public, anon;
revoke all on function public.reschedule_customer_appointment(uuid, uuid, timestamptz) from public, anon;
grant execute on function public.cancel_customer_appointment(uuid) to authenticated;
grant execute on function public.reschedule_customer_appointment(uuid, uuid, timestamptz) to authenticated;

