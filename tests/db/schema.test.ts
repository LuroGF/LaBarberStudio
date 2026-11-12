import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { beforeAll, describe, expect, it } from "vitest";

// Estas pruebas ejecutan las migraciones reales sobre PostgreSQL (PGlite) con un
// "auth" y unos roles equivalentes a los de Supabase.
const MIGRATIONS = [
  "0001_schema.sql",
  "0002_functions.sql",
  "0003_rls.sql",
  "0004_admin_functions.sql",
  "0006_customer_portal.sql",
  "0007_waitlist.sql",
  "0008_whatsapp_consent.sql",
  "0009_legal_settings.sql",
  "0010_email_notifications.sql",
];
const HASH = (n: number) => String(n).padStart(64, "0");

let db: PGlite;
let serviceId: string;
let barberId: string;
let adminId: string;
let otherUserId: string;
let customerUserId: string;

async function asRole<T>(role: string, uid: string | null, fn: () => Promise<T>): Promise<T> {
  await db.exec(`select set_config('request.jwt.claim.sub', '${uid ?? ""}', false)`);
  await db.exec(`set role ${role}`);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
  }
}

// Fecha (YYYY-MM-DD, hora de Madrid) a N días vista
async function madridDate(daysAhead: number): Promise<string> {
  const r = await db.query<{ d: string }>(
    `select ((now() at time zone 'Europe/Madrid')::date + ${daysAhead})::text as d`,
  );
  return r.rows[0].d;
}

async function slots(date: string, service = serviceId): Promise<string[]> {
  const r = await db.query<{ s: string }>(
    `select to_char(slot_start at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI') as s
       from public.get_slots($1, $2::date)`,
    [service, date],
  );
  return r.rows.map((x) => x.s);
}

async function book(startsAtUtc: string, phone = "664573491", n = 1, name = "Cliente Prueba") {
  return db.query<{ out_id: string; out_status: string }>(
    `select * from public.create_appointment($1, $2::timestamptz, $3, $4, null, null, $5)`,
    [serviceId, startsAtUtc, name, phone, HASH(n)],
  );
}

beforeAll(async () => {
  db = new PGlite({ extensions: { btree_gist, pgcrypto } });

  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
    create schema auth;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `);

  for (const file of MIGRATIONS) {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations", file), "utf8");
    await db.exec(sql);
  }

  const admin = await db.query<{ id: string }>(
    `insert into auth.users (email) values ('eduardo@example.com') returning id`,
  );
  const other = await db.query<{ id: string }>(
    `insert into auth.users (email) values ('otro@example.com') returning id`,
  );
  const customerUser = await db.query<{ id: string }>(
    `insert into auth.users (email) values ('cliente@example.com') returning id`,
  );
  adminId = admin.rows[0].id;
  otherUserId = other.rows[0].id;
  customerUserId = customerUser.rows[0].id;
  await db.query(`insert into public.profiles (id, role) values ($1, 'admin')`, [adminId]);

  barberId = (await db.query<{ id: string }>(`select id from public.barbers`)).rows[0].id;
  serviceId = (
    await db.query<{ id: string }>(
      `insert into public.services (name, price_cents, duration_minutes)
       values ('Servicio de prueba', 1000, 30) returning id`,
    )
  ).rows[0].id;

  // Horario de prueba (NO real): todos los días 10-14 y 16-20, hora de Madrid.
  for (let d = 1; d <= 7; d++) {
    await db.query(
      `insert into public.business_hours (barber_id, weekday, start_time, end_time)
       values ($1, $2, '10:00', '14:00'), ($1, $2, '16:00', '20:00')`,
      [barberId, d],
    );
  }
  await db.exec(`update public.business_settings set max_advance_days = 400, min_notice_minutes = 0`);
});

describe("disponibilidad (get_slots)", () => {
  it("genera huecos dentro de los tramos de mañana y tarde", async () => {
    const date = await madridDate(5);
    const s = await slots(date);
    // 2 tramos de 4 h, paso de 15 min, servicio de 30 min => 15 huecos por tramo
    expect(s.length).toBe(30);
  });

  it("no ofrece huecos que no caben antes del fin del tramo", async () => {
    const date = await madridDate(5);
    const s = await slots(date);
    // El último hueco de cada tramo empieza 30 min antes del cierre del tramo
    const madrid = await db.query<{ t: string }>(
      `select to_char(max(slot_start) at time zone 'Europe/Madrid', 'HH24:MI') as t
         from public.get_slots($1, $2::date)`,
      [serviceId, date],
    );
    expect(madrid.rows[0].t).toBe("19:30");
    expect(s).not.toContain(undefined);
  });

  it("respeta el cambio de hora de primavera (28 mar 2027): 10:00 Madrid = 08:00 UTC", async () => {
    const before = await slots("2027-03-27");
    const after = await slots("2027-03-28");
    expect(before[0]).toBe("2027-03-27T09:00"); // CET (UTC+1)
    expect(after[0]).toBe("2027-03-28T08:00"); // CEST (UTC+2)
  });

  it("respeta el cambio de hora de otoño (31 oct 2027): 10:00 Madrid = 09:00 UTC", async () => {
    const day = await slots("2027-10-30");
    const next = await slots("2027-10-31");
    expect(day[0]).toBe("2027-10-30T08:00"); // CEST (UTC+2)
    expect(next[0]).toBe("2027-10-31T09:00"); // CET (UTC+1)
  });

  it("un día con vacaciones (closed) no tiene huecos", async () => {
    const date = await madridDate(6);
    await db.query(
      `insert into public.schedule_exceptions (barber_id, kind, starts_at, ends_at, reason)
       values ($1, 'closed', ($2::date)::timestamp at time zone 'Europe/Madrid',
               (($2::date) + 1)::timestamp at time zone 'Europe/Madrid', 'Vacaciones')`,
      [barberId, date],
    );
    expect(await slots(date)).toEqual([]);
  });

  it("un bloqueo puntual elimina solo las horas bloqueadas", async () => {
    const date = await madridDate(7);
    const all = await slots(date);
    await db.query(
      `insert into public.schedule_exceptions (barber_id, kind, starts_at, ends_at)
       values ($1, 'block', ($2::date + time '11:00') at time zone 'Europe/Madrid',
                            ($2::date + time '12:00') at time zone 'Europe/Madrid')`,
      [barberId, date],
    );
    const after = await slots(date);
    expect(after.length).toBeLessThan(all.length);
    expect(after.length).toBeGreaterThan(0);
  });

  it("la disponibilidad extraordinaria (extra_open) añade huecos en un día cerrado", async () => {
    const date = await madridDate(8);
    await db.query(`delete from public.business_hours where weekday = extract(isodow from $1::date)`, [
      date,
    ]);
    expect(await slots(date)).toEqual([]);
    await db.query(
      `insert into public.schedule_exceptions (barber_id, kind, starts_at, ends_at)
       values ($1, 'extra_open', ($2::date + time '09:00') at time zone 'Europe/Madrid',
                                 ($2::date + time '10:00') at time zone 'Europe/Madrid')`,
      [barberId, date],
    );
    expect((await slots(date)).length).toBeGreaterThan(0);
    // Restaura el horario normal de ese día de la semana para el resto de pruebas
    await db.query(
      `insert into public.business_hours (barber_id, weekday, start_time, end_time)
       values ($1, extract(isodow from $2::date), '10:00', '14:00'),
              ($1, extract(isodow from $2::date), '16:00', '20:00')`,
      [barberId, date],
    );
    await db.query(`delete from public.schedule_exceptions where kind = 'extra_open'`);
  });

  it("no ofrece fechas pasadas ni más allá del plazo máximo", async () => {
    expect(await slots(await madridDate(-1))).toEqual([]);
    expect(await slots(await madridDate(500))).toEqual([]);
  });
});

describe("huecos pegados a las citas", () => {
  async function madridSlots(svc: string, date: string): Promise<string[]> {
    const r = await db.query<{ t: string }>(
      `select to_char(slot_start at time zone 'Europe/Madrid', 'HH24:MI') as t
         from public.get_slots($1, $2::date) order by 1`,
      [svc, date],
    );
    return r.rows.map((x) => x.t);
  }
  async function bookAt(svc: string, date: string, time: string, phone: string, n: number) {
    return db.query(
      `select * from public.create_appointment($1, ($2::date + $3::time) at time zone 'Europe/Madrid',
         'Cliente Pegado', $4, null, null, $5)`,
      [svc, date, time, phone, HASH(n)],
    );
  }

  it("tras una cita de 20 min a las 10:00 se ofrece 10:20, no solo la rejilla de 15 min", async () => {
    const svc = (
      await db.query<{ id: string }>(
        `insert into public.services (name, price_cents, duration_minutes)
         values ('Rapido', 800, 20) returning id`,
      )
    ).rows[0].id;
    const date = await madridDate(52);
    const before = await madridSlots(svc, date);
    expect(before).toContain("10:00");
    expect(before).not.toContain("10:20");
    await bookAt(svc, date, "10:00", "655000111", 300);
    const after = await madridSlots(svc, date);
    expect(after).toContain("10:20"); // justo al terminar la cita anterior
    expect(after).not.toContain("10:15"); // solapa con la cita
    expect(after).toContain("10:30"); // la rejilla normal sigue ahí
  });

  it("ofrece la hora que termina justo cuando empieza la siguiente cita", async () => {
    const svc = (await db.query<{ id: string }>(`select id from public.services where name = 'Rapido'`))
      .rows[0].id;
    const date = await madridDate(53);
    await bookAt(svc, date, "12:00", "655000112", 301);
    const after = await madridSlots(svc, date);
    expect(after).toContain("11:40"); // 11:40 a 12:00, sin hueco muerto
    expect(after).not.toContain("11:45"); // acabaría a las 12:05 y chocaría
  });

  it("también se pega al final de un bloqueo puntual", async () => {
    const svc = (await db.query<{ id: string }>(`select id from public.services where name = 'Rapido'`))
      .rows[0].id;
    const date = await madridDate(54);
    await db.query(
      `insert into public.schedule_exceptions (barber_id, kind, starts_at, ends_at)
       values ($1, 'block', ($2::date + time '11:10') at time zone 'Europe/Madrid',
                            ($2::date + time '11:50') at time zone 'Europe/Madrid')`,
      [barberId, date],
    );
    const slotsNow = await madridSlots(svc, date);
    expect(slotsNow).toContain("11:50");
    expect(slotsNow).toContain("10:50"); // termina a las 11:10, justo al empezar el bloqueo
  });
});

describe("reservas y solapes", () => {
  it("la restricción EXCLUDE impide dos citas activas solapadas", async () => {
    const [c] = (
      await db.query<{ id: string }>(
        `insert into public.customers (full_name, phone) values ('A', '+34600000001') returning id`,
      )
    ).rows;
    const insert = (start: string, end: string) =>
      db.query(
        `insert into public.appointments (barber_id, customer_id, service_name, price_cents,
           duration_minutes, starts_at, ends_at, status)
         values ($1, $2, 'x', 0, 30, $3::timestamptz, $4::timestamptz, 'confirmed')`,
        [barberId, c.id, start, end],
      );
    await insert("2030-01-10T10:00:00Z", "2030-01-10T10:30:00Z");
    await expect(insert("2030-01-10T10:15:00Z", "2030-01-10T10:45:00Z")).rejects.toThrow(
      /appointments_no_overlap|exclusion/,
    );
    // Contiguas (sin solape) sí se permiten
    await insert("2030-01-10T10:30:00Z", "2030-01-10T11:00:00Z");
  });

  it("create_appointment confirma al instante en modo automático y bloquea el hueco", async () => {
    const date = await madridDate(10);
    const [first, second, third] = await slots(date);
    const r = await book(`${first}:00Z`, "611111111", 11);
    expect(r.rows[0]).toMatchObject({ out_status: "confirmed" });
    const after = await slots(date);
    expect(after).not.toContain(first);
    expect(after).not.toContain(second); // la cita de 30 min también ocupa las 09:15
    expect(after).toContain(third); // y el resto sigue libre
  });

  it("el segundo cliente que pide el mismo hueco recibe SLOT_UNAVAILABLE", async () => {
    const date = await madridDate(11);
    const [first] = await slots(date);
    await book(`${first}:00Z`, "622222222", 21);
    await expect(book(`${first}:00Z`, "633333333", 22)).rejects.toThrow(/SLOT_UNAVAILABLE/);
  });

  it("no permite reservar una hora que no está en la lista de huecos", async () => {
    const date = await madridDate(12);
    await expect(book(`${date}T03:00:00Z`, "644444444", 31)).rejects.toThrow(/SLOT_UNAVAILABLE/);
  });

  it("valida teléfono y nombre en el servidor", async () => {
    const date = await madridDate(13);
    const [first] = await slots(date);
    await expect(book(`${first}:00Z`, "123", 41)).rejects.toThrow(/INVALID_PHONE/);
    await expect(book(`${first}:00Z`, "655555555", 42, "A")).rejects.toThrow(/INVALID_NAME/);
  });

  it("conserva precio y duración aunque el servicio cambie después", async () => {
    const date = await madridDate(14);
    const [first] = await slots(date);
    const r = await book(`${first}:00Z`, "666000111", 51);
    const id = r.rows[0].out_id;
    await db.query(`update public.services set price_cents = 9999, name = 'Otro' where id = $1`, [
      serviceId,
    ]);
    const a = await db.query<{ price_cents: number; service_name: string }>(
      `select price_cents, service_name from public.appointments where id = $1`,
      [id],
    );
    expect(a.rows[0]).toEqual({ price_cents: 1000, service_name: "Servicio de prueba" });
    await db.query(`update public.services set price_cents = 1000, name = 'Servicio de prueba'`);
  });

  it("limita las reservas activas por teléfono (anti-abuso)", async () => {
    const phone = "677000000";
    for (let i = 0; i < 3; i++) {
      const [s] = await slots(await madridDate(20 + i));
      await book(`${s}:00Z`, phone, 60 + i);
    }
    const [s] = await slots(await madridDate(24));
    await expect(book(`${s}:00Z`, phone, 70)).rejects.toThrow(/TOO_MANY_ACTIVE/);
  });

  it("modo manual: queda pendiente, bloquea el hueco y lo libera al caducar", async () => {
    await db.exec(`update public.business_settings set approval_mode = 'manual', pending_hold_minutes = 30`);
    const date = await madridDate(30);
    const [first] = await slots(date);
    const r = await book(`${first}:00Z`, "688000001", 80);
    expect(r.rows[0]).toMatchObject({ out_status: "pending" });
    expect(await slots(date)).not.toContain(first);

    // Simula que el plazo ha vencido
    await db.query(`update public.appointments set expires_at = now() - interval '1 minute' where id = $1`, [
      r.rows[0].out_id,
    ]);
    expect(await slots(date)).toContain(first); // ya aparece libre
    // Y otro cliente puede reservarlo
    await db.exec(`update public.business_settings set approval_mode = 'auto'`);
    const r2 = await book(`${first}:00Z`, "688000002", 81);
    expect(r2.rows[0]).toMatchObject({ out_status: "confirmed" });
    const old = await db.query<{ status: string }>(`select status from public.appointments where id = $1`, [
      r.rows[0].out_id,
    ]);
    expect(old.rows[0].status).toBe("expired");
  });

  it("registra el historial de cambios automáticamente", async () => {
    const date = await madridDate(40);
    const [first] = await slots(date);
    const r = await book(`${first}:00Z`, "699000001", 90);
    const id = r.rows[0].out_id;
    await db.query(`update public.appointments set status = 'completed' where id = $1`, [id]);
    const h = await db.query<{ action: string }>(
      `select action from public.appointment_history where appointment_id = $1 order by id`,
      [id],
    );
    expect(h.rows.map((x) => x.action)).toEqual(["created", "status:completed"]);
  });
});

describe("cancelaciones por enlace seguro", () => {
  it("el cliente consulta y cancela solo su cita con su token", async () => {
    const date = await madridDate(45);
    const [first] = await slots(date);
    await book(`${first}:00Z`, "611000010", 100);
    const got = await db.query(`select * from public.get_appointment_by_token($1)`, [HASH(100)]);
    expect(got.rows).toHaveLength(1);
    expect(got.rows[0]).toMatchObject({ out_status: "confirmed", out_can_cancel: true });

    const none = await db.query(`select * from public.get_appointment_by_token($1)`, [HASH(999)]);
    expect(none.rows).toHaveLength(0);

    await db.query(`select public.cancel_appointment_by_token($1)`, [HASH(100)]);
    const after = await db.query(`select out_status from public.get_appointment_by_token($1)`, [
      HASH(100),
    ]);
    expect(after.rows[0]).toMatchObject({ out_status: "cancelled" });
    expect(await slots(date)).toContain(first); // el hueco se libera
  });

  it("rechaza cancelar fuera de plazo (TOO_LATE) según la política", async () => {
    await db.exec(`update public.business_settings set cancellation_notice_hours = 100000`);
    const date = await madridDate(46);
    const [first] = await slots(date);
    await book(`${first}:00Z`, "611000011", 101);
    await expect(
      db.query(`select public.cancel_appointment_by_token($1)`, [HASH(101)]),
    ).rejects.toThrow(/TOO_LATE/);
    await db.exec(`update public.business_settings set cancellation_notice_hours = 2`);
  });

  it("no se puede cancelar dos veces", async () => {
    const date = await madridDate(47);
    const [first] = await slots(date);
    await book(`${first}:00Z`, "611000012", 102);
    await db.query(`select public.cancel_appointment_by_token($1)`, [HASH(102)]);
    await expect(
      db.query(`select public.cancel_appointment_by_token($1)`, [HASH(102)]),
    ).rejects.toThrow(/NOT_CANCELLABLE/);
  });
});

describe("portal de clientes", () => {
  const customerPhone = "+34612000123";

  it("solo muestra al cliente sus propios datos y citas", async () => {
    await db.query(
      `insert into public.customers (full_name, phone, auth_user_id)
       values ('Cliente Portal', $1, $2)`,
      [customerPhone, customerUserId],
    );
    const date = await madridDate(70);
    const [first] = await slots(date);
    await book(`${first}:00Z`, customerPhone, 700, "Cliente Portal");

    await asRole("authenticated", customerUserId, async () => {
      const customers = await db.query<{ phone: string }>(`select phone from public.customers`);
      expect(customers.rows).toEqual([{ phone: customerPhone }]);
      expect((await db.query(`select id from public.appointments`)).rows).toHaveLength(1);
    });
    await asRole("authenticated", otherUserId, async () => {
      expect((await db.query(`select id from public.appointments`)).rows).toHaveLength(0);
    });
  });

  it("cancela su propia cita, pero no una cita ajena", async () => {
    const own = (await db.query<{ id: string }>(
      `select a.id from public.appointments a join public.customers c on c.id = a.customer_id
        where c.auth_user_id = $1 and a.status = 'confirmed' limit 1`,
      [customerUserId],
    )).rows[0];
    await asRole("authenticated", otherUserId, async () => {
      await expect(db.query(`select public.cancel_customer_appointment($1)`, [own.id])).rejects.toThrow(/NOT_FOUND/);
    });
    await asRole("authenticated", customerUserId, async () => {
      await db.query(`select public.cancel_customer_appointment($1)`, [own.id]);
    });
    const status = await db.query<{ status: string }>(`select status from public.appointments where id = $1`, [own.id]);
    expect(status.rows[0].status).toBe("cancelled");
  });

  it("cambia una cita a un hueco disponible de forma atómica", async () => {
    const sourceDate = await madridDate(71);
    const targetDate = await madridDate(72);
    const [source] = await slots(sourceDate);
    const [target] = await slots(targetDate);
    const made = await book(`${source}:00Z`, customerPhone, 701, "Cliente Portal");
    const appointmentId = made.rows[0].out_id;
    await asRole("authenticated", customerUserId, async () => {
      await db.query(`select public.reschedule_customer_appointment($1, $2, $3::timestamptz)`, [
        appointmentId,
        serviceId,
        `${target}:00Z`,
      ]);
    });
    const changed = await db.query<{ starts: string }>(
      `select to_char(starts_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI') as starts
         from public.appointments where id = $1`,
      [appointmentId],
    );
    expect(changed.rows[0].starts).toBe(target);
  });
});

describe("lista de espera", () => {
  it("crea una coincidencia al cancelarse un hueco anterior del mismo servicio", async () => {
    const openingDate = await madridDate(80);
    const targetDate = await madridDate(81);
    const [openingSlot] = await slots(openingDate);
    const [targetSlot] = await slots(targetDate);
    const target = await book(`${targetSlot}:00Z`, "612000200", 820, "Cliente Espera");
    const targetId = target.rows[0].out_id;
    const customer = await db.query<{ id: string }>(
      `select customer_id as id from public.appointments where id = $1`,
      [targetId],
    );
    await db.query(
      `insert into public.waitlist_requests (appointment_id, customer_id)
       values ($1, $2)`,
      [targetId, customer.rows[0].id],
    );
    const opening = await book(`${openingSlot}:00Z`, "612000201", 821, "Cliente Cancela");
    const openingId = opening.rows[0].out_id;
    await db.query(`update public.appointments set status = 'cancelled' where id = $1`, [openingId]);

    const matches = await db.query<{ opening_appointment_id: string }>(
      `select opening_appointment_id from public.waitlist_matches`,
    );
    expect(matches.rows).toContainEqual({ opening_appointment_id: openingId });
  });

  it("desactiva la solicitud cuando la cita objetivo deja de estar activa", async () => {
    const request = await db.query<{ id: string; appointment_id: string }>(
      `select id, appointment_id from public.waitlist_requests where is_active limit 1`,
    );
    await db.query(`update public.appointments set status = 'cancelled' where id = $1`, [request.rows[0].appointment_id]);
    const active = await db.query<{ is_active: boolean }>(
      `select is_active from public.waitlist_requests where id = $1`,
      [request.rows[0].id],
    );
    expect(active.rows[0].is_active).toBe(false);
  });
});

describe("cola automática de WhatsApp", () => {
  it("reclama cada evento una sola vez aunque coincidan dos procesos", async () => {
    const appointment = await db.query<{ id: string }>(`select id from public.appointments limit 1`);
    const inserted = await db.query<{ id: string }>(
      `insert into public.notification_events (appointment_id, event_type, created_at)
       values ($1, 'reminder', now() + interval '1 hour') returning id`,
      [appointment.rows[0].id],
    );
    const first = await db.query<{ id: string }>(
      `select * from public.claim_whatsapp_notification_events(now() + interval '30 minutes', 10)`,
    );
    const second = await db.query<{ id: string }>(
      `select * from public.claim_whatsapp_notification_events(now() + interval '30 minutes', 10)`,
    );
    expect(first.rows).toContainEqual({ id: inserted.rows[0].id });
    expect(second.rows).toEqual([]);
    const status = await db.query<{ status: string }>(
      `select status from public.notification_events where id = $1`,
      [inserted.rows[0].id],
    );
    expect(status.rows[0].status).toBe("processing");
  });
});

describe("cola automática de correo", () => {
  it("crea y reclama un evento de correo independiente", async () => {
    const appointment = await db.query<{ id: string }>(`select id from public.appointments limit 1`);
    await db.query(
      `update public.customers set email = 'avisos@example.com'
        where id = (select customer_id from public.appointments where id = $1)`,
      [appointment.rows[0].id],
    );
    const source = await db.query<{ id: string }>(
      `insert into public.notification_events (appointment_id, event_type, channel, created_at)
       values ($1, 'reminder', 'whatsapp_manual', now() + interval '2 hours') returning id`,
      [appointment.rows[0].id],
    );
    const email = await db.query<{ id: string }>(
      `select id from public.notification_events where channel = 'email' and payload ->> 'source_event_id' = $1`,
      [source.rows[0].id],
    );
    expect(email.rows).toHaveLength(1);
    const first = await db.query<{ id: string }>(
      `select * from public.claim_email_notification_events(now() + interval '90 minutes', 10)`,
    );
    const second = await db.query<{ id: string }>(
      `select * from public.claim_email_notification_events(now() + interval '90 minutes', 10)`,
    );
    expect(first.rows).toContainEqual({ id: email.rows[0].id });
    expect(second.rows).toEqual([]);
  });
});

describe("control de acceso (RLS y permisos)", () => {
  it("anon puede leer servicios activos y horarios, pero no citas ni clientes", async () => {
    await asRole("anon", null, async () => {
      expect((await db.query(`select * from public.services`)).rows.length).toBeGreaterThan(0);
      expect((await db.query(`select * from public.business_hours`)).rows.length).toBeGreaterThan(0);
      expect((await db.query(`select * from public.appointments`)).rows).toHaveLength(0);
      expect((await db.query(`select * from public.customers`)).rows).toHaveLength(0);
      expect((await db.query(`select * from public.appointment_history`)).rows).toHaveLength(0);
    });
  });

  it("anon no ve servicios desactivados ni borrados", async () => {
    await db.exec(
      `insert into public.services (name, price_cents, duration_minutes, is_active)
       values ('Oculto', 100, 10, false)`,
    );
    await asRole("anon", null, async () => {
      const r = await db.query<{ name: string }>(`select name from public.services`);
      expect(r.rows.map((x) => x.name)).not.toContain("Oculto");
    });
  });

  it("anon no puede escribir en ninguna tabla", async () => {
    await asRole("anon", null, async () => {
      await expect(
        db.query(`insert into public.services (name, price_cents, duration_minutes) values ('x', 1, 10)`),
      ).rejects.toThrow(/permission denied|row-level security/);
      await expect(db.query(`update public.business_settings set approval_mode = 'manual'`)).rejects.toThrow(
        /permission denied|row-level security/,
      );
    });
  });

  it("anon no puede ejecutar las funciones de reserva directamente", async () => {
    await asRole("anon", null, async () => {
      await expect(db.query(`select * from public.get_slots($1, current_date)`, [serviceId])).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        db.query(`select * from public.create_appointment($1, now(), 'x', '600000000', null, null, $2)`, [
          serviceId,
          HASH(1),
        ]),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("un usuario autenticado que NO es admin no ve citas ni clientes", async () => {
    await asRole("authenticated", otherUserId, async () => {
      expect((await db.query(`select * from public.appointments`)).rows).toHaveLength(0);
      expect((await db.query(`select * from public.customers`)).rows).toHaveLength(0);
      await expect(db.query(`update public.business_settings set approval_mode = 'manual'`)).resolves.toMatchObject({
        affectedRows: 0,
      });
    });
  });

  it("el administrador ve y gestiona citas, clientes e historial", async () => {
    await asRole("authenticated", adminId, async () => {
      expect((await db.query(`select * from public.appointments`)).rows.length).toBeGreaterThan(0);
      expect((await db.query(`select * from public.customers`)).rows.length).toBeGreaterThan(0);
      expect((await db.query(`select * from public.appointment_history`)).rows.length).toBeGreaterThan(0);
      const upd = await db.query(`update public.business_settings set buffer_minutes = 5`);
      expect(upd.affectedRows).toBe(1);
    });
    await db.exec(`update public.business_settings set buffer_minutes = 0`);
  });

  it("el administrador no puede crear una cita solapada ni desde el panel", async () => {
    const [a] = (await db.query<{ id: string; starts_at: string; ends_at: string; customer_id: string }>(
      `select id, starts_at, ends_at, customer_id from public.appointments
        where status = 'confirmed' limit 1`,
    )).rows;
    await asRole("authenticated", adminId, async () => {
      await expect(
        db.query(
          `insert into public.appointments (barber_id, customer_id, service_name, price_cents,
             duration_minutes, starts_at, ends_at, status)
           values ($1, $2, 'manual', 0, 30, $3, $4, 'confirmed')`,
          [barberId, a.customer_id, a.starts_at, a.ends_at],
        ),
      ).rejects.toThrow(/appointments_no_overlap|exclusion/);
    });
  });

  it("un usuario no puede hacerse administrador insertando su perfil", async () => {
    await asRole("authenticated", otherUserId, async () => {
      await expect(
        db.query(`insert into public.profiles (id, role) values ($1, 'admin')`, [otherUserId]),
      ).rejects.toThrow(/row-level security|permission denied/);
    });
  });
});

describe("operaciones del panel (set_day_hours y create_block)", () => {
  async function plantAppointment(phone: string, n: number, daysAhead: number, time: string) {
    const date = await madridDate(daysAhead);
    const r = await db.query<{ out_id: string }>(
      `select * from public.create_appointment($1, ($2::date + $3::time) at time zone 'Europe/Madrid',
         'Cliente Bloqueo', $4, null, null, $5)`,
      [serviceId, date, time, phone, HASH(n)],
    );
    return { id: r.rows[0].out_id, date };
  }
  const blockSql = `select public.create_block($1, $2::public.exception_kind,
      ($3::date + $4::time) at time zone 'Europe/Madrid', ($3::date + $5::time) at time zone 'Europe/Madrid', $6, $7) as n`;

  it("un usuario que no es administrador no puede usar las funciones", async () => {
    await asRole("authenticated", otherUserId, async () => {
      await expect(
        db.query(`select public.set_day_hours($1, 1::smallint, '[]'::jsonb)`, [barberId]),
      ).rejects.toThrow(/FORBIDDEN/);
      await expect(
        db.query(blockSql, [barberId, "block", "2030-01-01", "10:00", "11:00", null, false]),
      ).rejects.toThrow(/FORBIDDEN/);
    });
    await asRole("anon", null, async () => {
      await expect(
        db.query(`select public.set_day_hours($1, 1::smallint, '[]'::jsonb)`, [barberId]),
      ).rejects.toThrow(/permission denied/);
    });
  });

  it("bloquear sin cancelar deja las citas intactas y quita los huecos", async () => {
    const { id, date } = await plantAppointment("690000001", 400, 60, "11:00");
    await asRole("authenticated", adminId, async () => {
      const r = await db.query<{ n: number }>(blockSql, [barberId, "block", date, "10:00", "13:00", "Médico", false]);
      expect(r.rows[0].n).toBe(0);
    });
    const a = await db.query<{ status: string }>(`select status from public.appointments where id = $1`, [id]);
    expect(a.rows[0].status).toBe("confirmed"); // nada se cancela en silencio
    const hours = (
      await db.query<{ t: string }>(
        `select to_char(slot_start at time zone 'Europe/Madrid', 'HH24:MI') as t
           from public.get_slots($1, $2::date)`,
        [serviceId, date],
      )
    ).rows.map((x) => x.t);
    expect(hours.filter((t) => t >= "10:00" && t < "13:00")).toEqual([]);
  });

  it("bloquear cancelando cancela solo las citas afectadas y deja un aviso por cada una", async () => {
    const hit = await plantAppointment("690000002", 401, 61, "11:00");
    const safe = await plantAppointment("690000003", 402, 61, "17:00");
    await asRole("authenticated", adminId, async () => {
      const r = await db.query<{ n: number }>(blockSql, [barberId, "block", hit.date, "10:00", "13:00", null, true]);
      expect(r.rows[0].n).toBe(1);
    });
    const st = await db.query<{ id: string; status: string }>(
      `select id, status from public.appointments where id = any($1::uuid[])`,
      [[hit.id, safe.id]],
    );
    const by = Object.fromEntries(st.rows.map((x) => [x.id, x.status]));
    expect(by[hit.id]).toBe("cancelled");
    expect(by[safe.id]).toBe("confirmed");
    const n = await db.query(
      `select * from public.notification_events where appointment_id = $1 and event_type = 'cancelled'`,
      [hit.id],
    );
    expect(n.rows).toHaveLength(1);
  });

  it("rechaza rangos inválidos y tipos de excepción no permitidos", async () => {
    await asRole("authenticated", adminId, async () => {
      await expect(
        db.query(blockSql, [barberId, "block", "2031-01-01", "12:00", "10:00", null, false]),
      ).rejects.toThrow(/INVALID_RANGE/);
      await expect(
        db.query(blockSql, [barberId, "extra_open", "2031-01-01", "10:00", "12:00", null, false]),
      ).rejects.toThrow(/INVALID_KIND/);
    });
  });

  it("set_day_hours reemplaza los tramos del día de forma atómica", async () => {
    await asRole("authenticated", adminId, async () => {
      await db.query(
        `select public.set_day_hours($1, 3::smallint, '[{"start":"09:00","end":"13:00"}]'::jsonb)`,
        [barberId],
      );
    });
    const r = await db.query<{ s: string; e: string }>(
      `select start_time::text as s, end_time::text as e from public.business_hours
        where barber_id = $1 and weekday = 3`,
      [barberId],
    );
    expect(r.rows).toEqual([{ s: "09:00:00", e: "13:00:00" }]);
    await asRole("authenticated", adminId, async () => {
      await db.query(
        `select public.set_day_hours($1, 3::smallint,
           '[{"start":"10:00","end":"14:00"},{"start":"16:00","end":"20:00"}]'::jsonb)`,
        [barberId],
      );
    });
  });

  it("no admite tramos solapados el mismo día y no deja a medias el cambio", async () => {
    await asRole("authenticated", adminId, async () => {
      await expect(
        db.query(
          `select public.set_day_hours($1, 3::smallint,
             '[{"start":"10:00","end":"14:00"},{"start":"13:00","end":"18:00"}]'::jsonb)`,
          [barberId],
        ),
      ).rejects.toThrow(/business_hours_no_overlap|exclusion/);
    });
    const r = await db.query(`select * from public.business_hours where barber_id = $1 and weekday = 3`, [barberId]);
    expect(r.rows).toHaveLength(2); // sigue el horario anterior
  });
});
