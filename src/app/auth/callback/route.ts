import { NextResponse, type NextRequest } from "next/server";
import { getAuthErrorPath, getEmailOtpType, getSafeAuthNext } from "@/lib/auth-callback";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const otpType = getEmailOtpType(request.nextUrl.searchParams.get("type"));
  const next = getSafeAuthNext({
    next: request.nextUrl.searchParams.get("next"),
    redirectTo: request.nextUrl.searchParams.get("redirect_to"),
    origin: request.nextUrl.origin,
  });

  const supabase = await createClient();

  if (tokenHash && otpType) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType });
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL(getAuthErrorPath(next), request.url));
}
