-- THE GR BARBER · Esquema inicial
-- Zona horaria de negocio: Europe/Madrid. Todas las fechas se guardan en timestamptz (UTC).

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ───────────────────────── Tipos ─────────────────────────
create type public.appointment_status as enum
  ('pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'rejected', 'expired');

create type public.exception_kind as enum
  ('closed',      -- vacaciones / festivo / cierre (resta disponibilidad)
   'block',       -- bloqueo puntual de una o varias horas (resta disponibilidad)
   'extra_open'); -- disponibilidad extraordinaria (suma disponibilidad)

create type public.approval_mode as enum ('auto', 'manual');

-- ───────────────────────── Tablas ─────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- Preparado para varios barberos en el futuro; en v1 hay uno solo.
create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 1 and 120),
  phone text not null check (phone ~ '^\+[0-9]{8,15}$'),
  email text check (email is null or char_length(email) <= 254),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_phone_key unique (phone)
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  description text,
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes between 5 and 480),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  deleted_at timestamptz,            -- borrado lógico: protege el histórico
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- weekday: 1 = lunes … 7 = domingo (ISO). Varios tramos por día (mañana / tarde).
create table public.business_hours (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  constraint business_hours_valid check (end_time > start_time)
);
create index business_hours_lookup on public.business_hours (barber_id, weekday);

create table public.schedule_exceptions (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id) on delete cascade,
  kind public.exception_kind not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references auth.users (id),
  created_at timestamptz not null default now(),
  constraint schedule_exceptions_valid check (ends_at > starts_at)
);
create index schedule_exceptions_range on public.schedule_exceptions
  using gist (barber_id, tstzrange(starts_at, ends_at));

-- Una sola fila (id = true).
create table public.business_settings (
  id boolean primary key default true check (id),
  business_name text not null default 'THE GR BARBER',
  barber_display_name text not null default 'Eduardo Grueso',
  address text not null default 'Calle de Gazaperas 18, Fuenlabrada, Madrid',
  phone_whatsapp text not null default '+34664573491',
  instagram_handle text not null default 'eeduu.gr._',
  email text,
  logo_url text,
  timezone text not null default 'Europe/Madrid',
  approval_mode public.approval_mode not null default 'auto',
  pending_hold_minutes integer not null default 60 check (pending_hold_minutes between 5 and 10080),
  min_notice_minutes integer not null default 60 check (min_notice_minutes >= 0),
  max_advance_days integer not null default 30 check (max_advance_days between 1 and 730),
  cancellation_notice_hours integer not null default 2 check (cancellation_notice_hours >= 0),
  buffer_minutes integer not null default 0 check (buffer_minutes between 0 and 120),
  slot_step_minutes integer not null default 15 check (slot_step_minutes in (5, 10, 15, 20, 30, 60)),
  max_active_per_phone integer not null default 3 check (max_active_per_phone between 1 and 20),
  updated_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id),
  customer_id uuid not null references public.customers (id),
  service_id uuid references public.services (id) on delete set null,
  -- Instantánea en el momento de reservar (no cambia si luego se edita el servicio)
  service_name text not null,
  price_cents integer not null check (price_cents >= 0),
  duration_minutes integer not null check (duration_minutes > 0),
  buffer_minutes integer not null default 0 check (buffer_minutes >= 0),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  occupied tstzrange not null,       -- [starts_at, ends_at + buffer); lo rellena un trigger
  status public.appointment_status not null,
  expires_at timestamptz,            -- solo para pendientes
  manage_token_hash text unique,     -- SHA-256 del token; el token en claro nunca se guarda
  customer_notes text check (customer_notes is null or char_length(customer_notes) <= 500),
  private_notes text,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_by uuid references auth.users (id),   -- null = reserva hecha por el cliente
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_valid check (ends_at > starts_at),
  constraint appointments_pending_expiry check (status <> 'pending' or expires_at is not null),
  -- Imposible solapar citas activas del mismo barbero, incluso con peticiones simultáneas.
  constraint appointments_no_overlap exclude using gist
    (barber_id with =, occupied with &&)
    where (status in ('pending', 'confirmed'))
);
create index appointments_starts on public.appointments (starts_at);
create index appointments_customer on public.appointments (customer_id, starts_at desc);
create index appointments_status on public.appointments (status, starts_at);

create table public.appointment_history (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  actor_id uuid references auth.users (id),   -- null = cliente / sistema
  action text not null,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index appointment_history_appt on public.appointment_history (appointment_id, created_at);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments (id) on delete cascade,
  event_type text not null check (event_type in
    ('request_created', 'approved', 'rejected', 'modified', 'cancelled', 'reminder')),
  channel text not null default 'whatsapp_manual'
    check (channel in ('whatsapp_manual', 'whatsapp_api', 'email')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notification_events_pending on public.notification_events (status, created_at);

-- ───────────────────────── Triggers ─────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger customers_touch before update on public.customers
  for each row execute function public.touch_updated_at();
create trigger services_touch before update on public.services
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.business_settings
  for each row execute function public.touch_updated_at();

-- Calcula el intervalo ocupado (cita + tiempo de preparación).
create or replace function public.appointments_before_write() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.occupied := tstzrange(
    new.starts_at,
    new.ends_at + make_interval(mins => new.buffer_minutes),
    '[)');
  if new.status <> 'pending' then
    new.expires_at := null;
  end if;
  return new;
end $$;

create trigger appointments_before_write before insert or update on public.appointments
  for each row execute function public.appointments_before_write();

-- Historial automático de cambios.
create or replace function public.appointments_log() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.appointment_history (appointment_id, actor_id, action, new_data)
    values (new.id, auth.uid(), 'created', to_jsonb(new) - 'manage_token_hash');
  elsif to_jsonb(new) - 'updated_at' is distinct from to_jsonb(old) - 'updated_at' then
    insert into public.appointment_history (appointment_id, actor_id, action, old_data, new_data)
    values (
      new.id, auth.uid(),
      case when new.status is distinct from old.status then 'status:' || new.status::text
           else 'updated' end,
      to_jsonb(old) - 'manage_token_hash',
      to_jsonb(new) - 'manage_token_hash');
  end if;
  return null;
end $$;

create trigger appointments_log after insert or update on public.appointments
  for each row execute function public.appointments_log();

-- ───────────────────────── Datos iniciales ─────────────────────────
-- Un barbero y los ajustes por defecto (todo editable desde /admin).
-- NO se insertan servicios, precios ni horarios: los define Eduardo.
insert into public.barbers (name) values ('Eduardo Grueso');
insert into public.business_settings (id) values (true);
