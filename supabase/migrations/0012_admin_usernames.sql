-- Nombres de usuario para el acceso al panel de administración.
-- Supabase Auth sigue gestionando las contraseñas; el correo no se expone en el formulario de acceso.

alter table public.profiles
  add column if not exists login_username text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'profiles_login_username_format'
       and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_login_username_format check (
        login_username is null
        or login_username ~ '^[a-z0-9][a-z0-9._-]{2,31}$'
      );
  end if;
end $$;

create unique index if not exists profiles_login_username_key
  on public.profiles (login_username)
  where login_username is not null;

comment on column public.profiles.login_username is
  'Nombre de acceso al panel. Se guarda en minúsculas; Supabase Auth conserva el correo y la contraseña.';
