-- Datos del titular utilizados por las páginas legales. Se mantienen en la
-- misma fila pública de configuración del negocio para poder editarlos desde
-- Administración sin volver a desplegar la aplicación.
alter table public.business_settings
  add column if not exists legal_name text,
  add column if not exists tax_id text,
  add column if not exists legal_address text,
  add column if not exists privacy_email text;

update public.business_settings
   set legal_name = coalesce(legal_name, business_name),
       legal_address = coalesce(legal_address, address),
       privacy_email = coalesce(privacy_email, email)
 where id = true;

