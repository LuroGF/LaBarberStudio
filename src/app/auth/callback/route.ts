import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const allowedNext = new Set([
    "/admin",
    "/admin/restablecer-password",
    "/mi-cuenta",
    "/mi-cuenta/restablecer-password",
  ]);
  const next = requestedNext && allowedNext.has(requestedNext) ? requestedNext : "/admin";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  const errorPath = next.startsWith("/mi-cuenta")
    ? "/mi-cuenta/acceso?error=recovery"
    : "/admin/login?error=recovery";
  return NextResponse.redirect(new URL(errorPath, request.url));
}
