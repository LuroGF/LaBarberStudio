import { execFileSync } from "node:child_process";
import { chownSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Estas pruebas levantan un PostgreSQL REAL temporal y lanzan muchas reservas a la vez desde
// conexiones distintas. Si PostgreSQL no está instalado en la máquina, se omiten.
const BIN_DIRS = ["/usr/lib/postgresql/17/bin", "/usr/lib/postgresql/16/bin", "/usr/lib/postgresql/15/bin", "/usr/lib/postgresql/14/bin"];
const bin = BIN_DIRS.find((d) => existsSync(join(d, "initdb")));
const MIGRATIONS = ["0001_schema.sql", "0002_functions.sql", "0003_rls.sql", "0004_admin_functions.sql"];
const PORT = 54329;
const HASH = (n: number) => String(n).padStart(64, "0");

let dir = "";
let pool: Pool;
let serviceId = "";
let counter = 0;

const isRoot = typeof process.getuid === "function" && process.getuid() === 0;
function run(cmd: string, args: string[]) {
  // PostgreSQL se niega a arrancar como root: en ese caso se ejecuta como el usuario "postgres".
  return isRoot
    ? execFileSync("runuser", ["-u", "postgres", "--", cmd, ...args], { stdio: "pipe" })
    : execFileSync(cmd, args, { stdio: "pipe" });
}

async function madridDate(daysAhead: number): Promise<string> {
  const r = await pool.query(`select ((now() at time zone 'Europe/Madrid')::date + $1::int)::text as d`, [daysAhead]);
  return r.rows[0].d;
}

async function slotsMadrid(date: string): Promise<string[]> {
  const r = await pool.query(
    `select to_char(slot_start at time zone 'Europe/Madrid', 'HH24:MI') as t
       from public.get_slots($1, $2::date) order by slot_start`,
    [serviceId, date],
  );
  return r.rows.map((x) => x.t);
}

// Cada reserva usa una conexión distinta del pool, como harían clientes distintos.
function book(date: string, time: string, phone: string) {
  const n = ++counter;
  return pool.query(
    `select * from public.create_appointment($1, ($2::date + $3::time) at time zone 'Europe/Madrid',
       'Cliente Concurrente', $4, null, null, $5)`,
    [serviceId, date, time, phone, HASH(n)],
  );
}
const phone = () => `6${String(10_000_000 + ++counter).slice(-8)}`;

describe.skipIf(!bin)("reservas simultáneas (PostgreSQL real, conexiones paralelas)", () => {
  beforeAll(async () => {
    dir = mkdtempSync(join(tmpdir(), "gr-pg-"));
    if (isRoot) {
      const uid = Number(execFileSync("id", ["-u", "postgres"]).toString());
      const gid = Number(execFileSync("id", ["-g", "postgres"]).toString());
      chownSync(dir, uid, gid);
    }
    const data = join(dir, "data");
    run(join(bin!, "initdb"), ["-D", data, "-A", "trust", "-U", "postgres", "--no-sync"]);
    run(join(bin!, "pg_ctl"), [
      "-D", data, "-w", "-l", join(dir, "log"),
      "-o", `-c listen_addresses= -c unix_socket_directories=${dir} -c fsync=off -c max_connections=100 -p ${PORT}`,
      "start",
    ]);
    pool = new Pool({ host: dir, port: PORT, user: "postgres", database: "postgres", max: 40 });

    await pool.query(`
      create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key default gen_random_uuid(), email text);
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema public, auth to anon, authenticated, service_role;
      alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
      alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
    `);
    for (const f of MIGRATIONS) {
      await pool.query(readFileSync(join(process.cwd(), "supabase/migrations", f), "utf8"));
    }
    const barber = (await pool.query(`select id from public.barbers`)).rows[0].id;
    serviceId = (
      await pool.query(
        `insert into public.services (name, price_cents, duration_minutes) values ('Prueba', 1000, 30) returning id`,
      )
    ).rows[0].id;
    for (let d = 1; d <= 7; d++) {
      await pool.query(
        `insert into public.business_hours (barber_id, weekday, start_time, end_time)
         values ($1, $2, '10:00', '14:00'), ($1, $2, '16:00', '20:00')`,
        [barber, d],
      );
    }
    await pool.query(`update public.business_settings set max_advance_days = 400, min_notice_minutes = 0`);
  });

  afterAll(async () => {
    await pool?.end();
    if (dir) {
      try {
        run(join(bin!, "pg_ctl"), ["-D", join(dir, "data"), "-m", "immediate", "stop"]);
      } catch {
        /* ya parado */
      }
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("25 clientes piden la MISMA hora a la vez (10 rondas): en cada ronda solo uno la consigue", async () => {
    for (let round = 0; round < 10; round++) {
      const date = await madridDate(20 + round);
      const results = await Promise.allSettled(Array.from({ length: 25 }, () => book(date, "10:00", phone())));
      const ok = results.filter((r) => r.status === "fulfilled");
      const failed = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
      expect(ok).toHaveLength(1);
      expect(failed).toHaveLength(24);
      for (const f of failed) expect(String(f.reason?.message)).toMatch(/SLOT_UNAVAILABLE/);

      const rows = await pool.query(
        `select count(*)::int as n from public.appointments
          where status = 'confirmed' and starts_at = ($1::date + time '10:00') at time zone 'Europe/Madrid'`,
        [date],
      );
      expect(rows.rows[0].n).toBe(1);
    }
  });

  it("40 clientes piden horas solapadas a la vez: nunca hay dos citas activas que se pisen", async () => {
    const date = await madridDate(11);
    const slots = await slotsMadrid(date); // cada 15 min; la cita dura 30, así que muchas se pisan
    expect(slots.length).toBeGreaterThan(20);
    const attempts = Array.from({ length: 40 }, (_, i) => book(date, slots[i % slots.length], phone()));
    const results = await Promise.allSettled(attempts);
    const ok = results.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBeGreaterThan(0);
    expect(ok).toBeLessThanOrEqual(16); // 2 tramos de 4 h con citas de 30 min

    const overlaps = await pool.query(
      `select a.id from public.appointments a
         join public.appointments b
           on a.id < b.id and a.barber_id = b.barber_id and a.occupied && b.occupied
        where a.status in ('pending','confirmed') and b.status in ('pending','confirmed')`,
    );
    expect(overlaps.rows).toHaveLength(0);

    for (const r of results) {
      if (r.status === "rejected") expect(String(r.reason?.message)).toMatch(/SLOT_UNAVAILABLE/);
    }
  });

  it("el mismo teléfono intenta 10 horas distintas a la vez: el límite de citas activas se respeta", async () => {
    const date = await madridDate(12);
    const same = phone();
    const times = ["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "16:00", "16:30", "17:00"];
    const results = await Promise.allSettled(times.map((t) => book(date, t, same)));
    const ok = results.filter((r) => r.status === "fulfilled").length;
    expect(ok).toBe(3); // max_active_per_phone = 3 por defecto
    for (const r of results) {
      if (r.status === "rejected") expect(String(r.reason?.message)).toMatch(/TOO_MANY_ACTIVE/);
    }
    const customers = await pool.query(`select count(*)::int as n from public.customers where phone = $1`, [`+34${same}`]);
    expect(customers.rows[0].n).toBe(1); // sin clientes duplicados
  });

  it("reservar mientras otro cliente cancela esa misma hora nunca deja dos citas activas", async () => {
    const date = await madridDate(13);
    const first = await book(date, "11:00", phone());
    const id = first.rows[0].out_id;
    const results = await Promise.allSettled([
      pool.query(`update public.appointments set status = 'cancelled' where id = $1`, [id]),
      ...Array.from({ length: 8 }, () => book(date, "11:00", phone())),
    ]);
    expect(results[0].status).toBe("fulfilled");
    const active = await pool.query(
      `select count(*)::int as n from public.appointments
        where status = 'confirmed' and starts_at = ($1::date + time '11:00') at time zone 'Europe/Madrid'`,
      [date],
    );
    expect(active.rows[0].n).toBeLessThanOrEqual(1);
  });
});
