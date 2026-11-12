# LA BARBER STUDIO

Reservas online y panel de administración para LA BARBER STUDIO (Fuenlabrada, Madrid).
Next.js 16 (App Router, TypeScript) · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, RLS).

Producción: [https://labarber-studio.vercel.app](https://labarber-studio.vercel.app)

## Estado del proyecto

| Fase | Contenido | Estado |
| --- | --- | --- |
| 1 | Proyecto, identidad visual base, migraciones, RLS, login de administrador | Hecha |
| 2 | Panel: servicios, horario semanal, bloqueos y vacaciones con aviso de conflictos | Hecha (ver "Sin probar") |
| 3 | Web pública y asistente de reserva del cliente, enlace de gestión `/cita/[token]` | Hecha (pendiente de probar una cita real) |
| 4 | Panel: resumen, calendario día/semana/mes, gestión de citas | Hecha (pendiente de probar con citas reales) |
| 5 | Clientes, ajustes, notificaciones manuales y automatización opcional con WhatsApp Cloud API, PWA | Hecha |
| 6 | Portal de clientes (correo + contraseña), perfil, citas y calendario | Hecha |
| 7 | Textos legales, copias de seguridad, despliegue | Pendiente |

El botón de la portada abre `/reservar`: permite elegir un servicio activo, consultar huecos reales,
crear la cita desde el servidor y obtener un enlace privado para consultarla o cancelarla.

## Puesta en marcha

1. Crea un proyecto en [supabase.com](https://supabase.com) (región UE).
2. En *SQL Editor* ejecuta, en este orden, los archivos de `supabase/migrations/`: `0001_schema.sql`, `0002_functions.sql`, `0003_rls.sql`, `0004_admin_functions.sql`, `0005_rebrand_la_barber_studio.sql`, `0006_customer_portal.sql`, `0007_waitlist.sql`, `0008_whatsapp_consent.sql` (o `supabase db push` con la CLI).
3. En *Authentication → Users* crea el usuario administrador. Para el portal de clientes, deja permitido el registro por correo y mantén activada la confirmación de email. Configura las URL de redirección `http://localhost:3000/**` y `https://labarber-studio.vercel.app/**`. El teléfono sigue siendo obligatorio como dato de contacto, pero no se usa para autenticar.
4. Dale permisos de administrador (SQL Editor):
   ```sql
   insert into public.profiles (id, full_name, role)
   select id, 'Eduardo Grueso', 'admin' from auth.users where email = 'TU_CORREO';
   ```
5. Copia `.env.example` a `.env.local` y rellena las claves (*Project Settings → API*). `SUPABASE_SERVICE_ROLE_KEY` es privada: solo servidor, nunca con prefijo `NEXT_PUBLIC_`.
   Para probar la recuperación de contraseña en local, añade `http://localhost:3000/**` a las Redirect URLs permitidas de Supabase Auth.
6. `npm install` y `npm run dev` → http://localhost:3000 y http://localhost:3000/admin
7. En el panel, define primero **Servicios** y **Horarios**: no hay servicios, precios ni horarios de ejemplo en la base de datos.

## Cómo está organizado

```
src/app/admin/login            Acceso de administrador
src/app/admin/restablecer-password  Nueva contraseña desde el enlace de recuperación
src/app/auth/callback          Intercambio seguro del código de recuperación
src/app/admin/(panel)          Panel protegido (layout con navegación)
  servicios/                   Alta, edición, ocultar y borrado lógico
  horarios/                    Tramos por día, bloqueos y vacaciones
  citas/                       Agenda por día/semana/mes y cambios de estado
src/lib/schedule.ts            Zona horaria de Madrid, euros, tramos (funciones puras, con tests)
src/app/reservar               Flujo público de reserva
src/app/cita/[token]           Consulta y cancelación con enlace privado
src/app/mi-cuenta              Portal: acceso, perfil, historial, cancelación y cambio de cita
src/app/api/disponibilidad     Horas disponibles (la service_role permanece en el servidor)
src/app/api/**/calendar        Archivos .ics para Apple Calendar y Outlook
src/app/api/cron/recordatorios Prepara y procesa notificaciones cada 10 min (protegido por CRON_SECRET)
src/lib/auth.ts                requireAdmin(): sesión + rol, se repite en cada página y acción
src/lib/supabase/              Cliente de usuario (RLS) y cliente de servidor (service_role)
src/proxy.ts                   Refresca la sesión y protege /admin y /mi-cuenta
supabase/migrations/           Esquema, funciones de reserva, RLS y operaciones del panel
tests/                         Pruebas (ver abajo)
```

Decisiones de diseño que conviene mantener:

- **Los solapes los impide PostgreSQL**, no el navegador: restricción `EXCLUDE` sobre el intervalo ocupado de cada cita, más un bloqueo por barbero en `create_appointment()` para que dos reservas simultáneas no acaben en un deadlock.
- **Disponibilidad** (`get_slots`): rejilla de `slot_step_minutes` más horas "pegadas" al final de cada cita o bloqueo y justo antes de la siguiente, para no perder minutos entre citas de duración irregular.
- **Cada cita guarda precio, duración y nombre del servicio** en el momento de reservar.
- **Nada se cancela en silencio**: si un bloqueo o un cambio de horario afecta a citas, el panel lo avisa y exige una decisión explícita.
- Las funciones de reserva solo las puede ejecutar `service_role` (servidor). El público anónimo solo lee servicios activos, horarios y ajustes.
- Una cuenta de cliente solo se vincula a `customers` después de que Supabase confirme la propiedad del teléfono. Las cancelaciones y cambios vuelven a comprobar la propiedad y el plazo dentro de PostgreSQL.
- Todo se guarda en `timestamptz` y se muestra en Europe/Madrid (con pruebas de los cambios de hora de marzo y octubre).
- WhatsApp automático es opt-in y tolerante a fallos: sin credenciales sigue el flujo manual; si Meta rechaza un envío, queda visible en el panel para enviarlo a mano.
- Next.js 16 con `cacheComponents`: todo `/admin` depende de cookies y va bajo `<Suspense>`. Antes de tocar rutas, lee `node_modules/next/dist/docs/` (esta versión tiene cambios respecto a lo habitual; ver `AGENTS.md`).

## WhatsApp Cloud API (opcional)

La integración usa el endpoint oficial `/{Phone-Number-ID}/messages` de Meta y plantillas aprobadas. Las claves son privadas y solo se leen en el servidor.

1. Crea en WhatsApp Manager una plantilla de utilidad para clientes con seis variables en este orden:
   `nombre`, `acción`, `servicio`, `fecha`, `hora`, `negocio`.
   Texto orientativo: `Hola {{1}}. {{2}} tu cita de {{3}} para el {{4}} a las {{5}}. — {{6}}`.
2. Opcionalmente, crea otra plantilla interna para el barbero con: `acción`, `cliente`, `teléfono`, `servicio`, `fecha`, `hora`.
3. Añade en Vercel las variables `WHATSAPP_GRAPH_API_VERSION`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_APPOINTMENT` y `WHATSAPP_AUTOMATION_START_AT` (fecha ISO del momento de activación). Si procede, añade `WHATSAPP_TEMPLATE_BARBER` y `WHATSAPP_BARBER_PHONE`.
4. Cuando las plantillas estén aprobadas, activa `WHATSAPP_CLOUD_ENABLED=true` y vuelve a desplegar.

El cliente debe marcar el consentimiento de WhatsApp al reservar. Los clientes sin consentimiento permanecen en la cola manual.

## Pruebas

```bash
npm test          # todo
npm run typecheck
npm run lint
```

- `tests/unit`: euros, hora de Madrid, tramos.
- `tests/db/schema.test.ts`: ejecuta las migraciones reales sobre PostgreSQL (PGlite): solapes, cambios de hora, bloqueos, caducidad de solicitudes pendientes, cancelaciones, historial, RLS y permisos.
- `tests/db/concurrency.test.ts`: levanta un PostgreSQL real temporal y lanza reservas simultáneas desde conexiones distintas. Necesita PostgreSQL instalado en tu máquina (si no lo encuentra, se omite). Si alguna vez falla, no lo ignores: ya detectó un deadlock real durante el desarrollo.

## Sin probar contra Supabase real

Las pantallas y acciones del panel (Fase 2) compilan, pasan el typecheck y el lint, y las funciones SQL que usan están probadas, pero **no se han ejecutado nunca contra un proyecto Supabase real ni se han visto en un navegador**. Pruébalas y espera algún ajuste. En concreto, vigila:

- Que `supabase.rpc("set_day_hours")` y `rpc("create_block")` reciban bien los parámetros (los tramos van como JSON).
- El aviso de conflictos al cambiar un horario o bloquear horas con citas ya reservadas.
- Los formularios de `/admin/servicios` y `/admin/horarios` en el móvil.
- Una reserva completa en `/reservar`, porque la base real todavía no tiene servicios activos.
- El enlace privado de gestión y la cancelación de una cita real.
- El resumen y la agenda `/admin/citas` con citas reales.

## Pendiente de aportar

- Logotipo definitivo en SVG con fondo transparente. Mientras tanto se usa el logotipo tipográfico de LA BARBER STUDIO y el monograma `LB`.
- La identidad actual usa Montserrat, negro `#111111` y grises `#3E3E3E`, `#9A9A9A` y `#D9D9D9`.
- Servicios, precios, horarios y fotos reales: se configuran desde el panel.

## Siguiente paso recomendado

Configura las credenciales de Meta y las plantillas de utilidad, activa `WHATSAPP_CLOUD_ENABLED` y realiza
una prueba con el número de prueba de WhatsApp antes de asociar el número definitivo. Después completa
las páginas legales y una prueba integral desde móvil.
