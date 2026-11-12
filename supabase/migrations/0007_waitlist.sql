-- LA BARBER STUDIO · Lista de espera para adelantar citas

create table public.waitlist_requests (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  is_active boolean not null default true,
  weekdays smallint[] not null default array[1,2,3,4,5,6,7]::smallint[],
  start_time time not null default '09:00',
  end_time time not null default '21:00',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint waitlist_time_valid check (end_time > start_time),
  constraint waitlist_weekdays_valid check (
    cardinality(weekdays) between 1 and 7
    and weekdays <@ array[1,2,3,4,5,6,7]::smallint[]
  )
);
create index waitlist_requests_active on public.waitlist_requests (is_active, appointment_id)
  where is_active;

create table public.waitlist_matches (
  id uuid primary key default gen_random_uuid(),
  waitlist_request_id uuid not null references public.waitlist_requests (id) on delete cascade,
  opening_appointment_id uuid not null references public.appointments (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'sent', 'skipped')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  constraint waitlist_matches_unique unique (waitlist_request_id, opening_appointment_id)
);
create index waitlist_matches_pending on public.waitlist_matches (status, created_at);

create trigger waitlist_requests_touch before update on public.waitlist_requests
  for each row execute function public.touch_updated_at();

alter table public.waitlist_requests enable row level security;
alter table public.waitlist_matches enable row level security;

create policy waitlist_requests_admin_all on public.waitlist_requests
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy waitlist_matches_admin_all on public.waitlist_matches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Una cancelación genera coincidencias solo para clientes con una cita confirmada
-- posterior, del mismo servicio y dentro de los días/horas que han elegido.
create or replace function public.match_cancelled_appointment_to_waitlist()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  s public.business_settings;
begin
  if old.status in ('pending', 'confirmed') and new.status not in ('pending', 'confirmed') then
    update public.waitlist_requests
       set is_active = false
     where appointment_id = new.id and is_active;
  end if;

  if old.status is distinct from new.status and new.status = 'cancelled'
     and new.starts_at > now() and new.service_id is not null then
    select * into s from public.business_settings where id;

    insert into public.waitlist_matches (waitlist_request_id, opening_appointment_id)
    select wr.id, new.id
      from public.waitlist_requests wr
      join public.appointments target on target.id = wr.appointment_id
     where wr.is_active
       and target.customer_id = wr.customer_id
       and target.status = 'confirmed'
       and target.service_id = new.service_id
       and target.starts_at > new.starts_at
       and extract(isodow from new.starts_at at time zone s.timezone)::smallint = any(wr.weekdays)
       and (new.starts_at at time zone s.timezone)::time >= wr.start_time
       and (new.starts_at at time zone s.timezone)::time < wr.end_time
       and target.customer_id <> new.customer_id
    on conflict (waitlist_request_id, opening_appointment_id) do nothing;
  end if;
  return new;
end $$;

create trigger appointments_waitlist_match
after update of status on public.appointments
for each row execute function public.match_cancelled_appointment_to_waitlist();

revoke all on public.waitlist_requests, public.waitlist_matches from anon;

