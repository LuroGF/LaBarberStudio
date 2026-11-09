import { NextRequest, NextResponse } from "next/server";
import { queueAppointmentReminders } from "@/lib/reminders";
import { addDaysStr, daysBoundsUtc, todayMadrid } from "@/lib/schedule";
import { createServiceClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET no configurado." }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }
  try {
    const tomorrow = addDaysStr(todayMadrid(), 1);
    const { start, end } = daysBoundsUtc(tomorrow);
    const count = await queueAppointmentReminders(createServiceClient(), start, end);
    return NextResponse.json({ ok: true, queued: count });
  } catch {
    return NextResponse.json({ error: "No se han podido preparar los recordatorios." }, { status: 500 });
  }
}
