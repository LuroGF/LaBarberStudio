import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isDate } from "@/lib/schedule";
import { createServiceClient } from "@/lib/supabase/admin";

const serviceSchema = z.string().uuid();

export async function GET(request: NextRequest) {
  const service = request.nextUrl.searchParams.get("service") ?? "";
  const date = request.nextUrl.searchParams.get("date") ?? "";

  if (!serviceSchema.safeParse(service).success || !isDate(date)) {
    return NextResponse.json({ error: "Servicio o fecha no válidos." }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();
    const { data, error } = await supabase.rpc("get_slots", {
      p_service_id: service,
      p_date: date,
      p_barber_id: null,
    });
    if (error) throw error;

    const slots = (data ?? []).map((row: { slot_start: string }) => row.slot_start);
    return NextResponse.json(
      { slots },
      { headers: { "Cache-Control": "private, no-store, max-age=0" } },
    );
  } catch {
    return NextResponse.json({ error: "No se han podido consultar las horas." }, { status: 500 });
  }
}

