-- THE GR BARBER · Row Level Security
-- Principio: los visitantes anónimos solo leen servicios activos, horarios y ajustes del negocio.
-- Todo lo demás (clientes, citas, historial, notificaciones) solo lo ve un administrador.
-- Las reservas de clientes pasan por funciones del servidor (service_role), no por tablas.

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

alter table public.profiles            enable row level security;
alter table public.barbers             enable row level security;
alter table public.customers           enable row level security;
alter table public.services            enable row level security;
alter table public.business_hours      enable row level security;
alter table public.schedule_exceptions enable row level security;
alter table public.business_settings   enable row level security;
alter table public.appointments        enable row level security;
alter table public.appointment_history enable row level security;
alter table public.notification_events enable row level security;

-- profiles: cada usuario solo ve el suyo. Los administradores se crean a mano en SQL.
create policy profiles_self_read on public.profiles
  for select to authenticated using (id = auth.uid());

-- Lectura pública (anon + authenticated)
create policy services_public_read on public.services
  for select to anon, authenticated
  using (is_active and deleted_at is null);

create policy hours_public_read on public.business_hours
  for select to anon, authenticated using (true);

create policy settings_public_read on public.business_settings
  for select to anon, authenticated using (true);

-- Administración completa (solo is_admin())
create policy services_admin_all on public.services
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy hours_admin_all on public.business_hours
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy settings_admin_update on public.business_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

create policy barbers_admin_all on public.barbers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy customers_admin_all on public.customers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy exceptions_admin_all on public.schedule_exceptions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy appointments_admin_all on public.appointments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Historial: solo lectura para administradores (lo escribe un trigger, no los clientes)
create policy history_admin_read on public.appointment_history
  for select to authenticated using (public.is_admin());

create policy notifications_admin_all on public.notification_events
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Defensa en profundidad: sin permisos de escritura para anon en ninguna tabla.
revoke insert, update, delete, truncate on all tables in schema public from anon;
