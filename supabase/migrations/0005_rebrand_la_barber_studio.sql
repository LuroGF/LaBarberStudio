-- Actualiza la identidad del negocio sin tocar citas, clientes ni configuración operativa.
alter table public.business_settings
  alter column business_name set default 'LA BARBER STUDIO';

update public.business_settings
   set business_name = 'LA BARBER STUDIO',
       instagram_handle = 'labarber.studio'
 where id = true;
