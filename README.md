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
| 5 | Clientes, ajustes, notificaciones y recordatorios por WhatsApp manual, PWA | Hecha |
| 6 | Textos legales, copias de seguridad, despliegue | Pendiente |

El botón de la portada abre `/reservar`: permite elegir un servicio activo, consultar huecos reales,
crear la cita desde el servidor y obtener un enlace privado para consultarla o cancelarla.

## Puesta en marcha

1. Crea un proyecto en [supabase.com](https://supabase.com) (región UE).
2. En *SQL Editor* ejecuta, en este orden, los archivos de `supabase/migrations/`: `0001_schema.sql`, `0002_functions.sql`, `0003_rls.sql`, `0004_admin_functions.sql`, `0005_rebrand_la_barber_studio.sql` (o `supabase db push` con la CLI).
3. En *Authentication → Users* crea el usuario de Eduardo. Desactiva el registro público (*Sign In / Providers → Allow new users to sign up = off*).
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
src/app/api/disponibilidad     Horas disponibles (la service_role permanece en el servidor)
src/app/api/cron/recordatorios Prepara los recordatorios de 24 h (protegido por CRON_SECRET)
src/lib/auth.ts                requireAdmin(): sesión + rol, se repite en cada página y acción
src/lib/supabase/              Cliente de usuario (RLS) y cliente de servidor (service_role)
src/proxy.ts                   Refresca la sesión y protege /admin
supabase/migrations/           Esquema, funciones de reserva, RLS y operaciones del panel
tests/                         Pruebas (ver abajo)
```

Decisiones de diseño que conviene mantener:

- **Los solapes los impide PostgreSQL**, no el navegador: restricción `EXCLUDE` sobre el intervalo ocupado de cada cita, más un bloqueo por barbero en `create_appointment()` para que dos reservas simultáneas no acaben en un deadlock.
- **Disponibilidad** (`get_slots`): rejilla de `slot_step_minutes` más horas "pegadas" al final de cada cita o bloqueo y justo antes de la siguiente, para no perder minutos entre citas de duración irregular.
- **Cada cita guarda precio, duración y nombre del servicio** en el momento de reservar.
- **Nada se cancela en silencio**: si un bloqueo o un cambio de horario afecta a citas, el panel lo avisa y exige una decisión explícita.
- Las funciones de reserva solo las puede ejecutar `service_role` (servidor). El público anónimo solo lee servicios activos, horarios y ajustes.
- Todo se guarda en `timestamptz` y se muestra en Europe/Madrid (con pruebas de los cambios de hora de marzo y octubre).
- Next.js 16 con `cacheComponents`: todo `/admin` depende de cookies y va bajo `<Suspense>`. Antes de tocar rutas, lee `node_modules/next/dist/docs/` (esta versión tiene cambios respecto a lo habitual; ver `AGENTS.md`).

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

Despliega el proyecto, configura `NEXT_PUBLIC_SITE_URL` y `CRON_SECRET` en el proveedor y programa una
petición diaria a `/api/cron/recordatorios` con `Authorization: Bearer <CRON_SECRET>`. Después realiza
una prueba completa desde móvil e instala la PWA desde el navegador.
