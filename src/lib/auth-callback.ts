import type { EmailOtpType } from "@supabase/supabase-js";

const allowedNext = new Set([
  "/admin",
  "/admin/restablecer-password",
  "/mi-cuenta",
  "/mi-cuenta/restablecer-password",
]);

export function getEmailOtpType(value: string | null): EmailOtpType | null {
  return value === "signup" || value === "recovery" ? value : null;
}

function getAllowedPath(value: string | null, origin: string) {
  if (!value) return null;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return null;
    return allowedNext.has(url.pathname) ? url.pathname : null;
  } catch {
    return null;
  }
}

export function getSafeAuthNext({
  next,
  redirectTo,
  origin,
}: {
  next: string | null;
  redirectTo: string | null;
  origin: string;
}) {
  const directNext = getAllowedPath(next, origin);
  if (directNext) return directNext;

  if (redirectTo) {
    try {
      const redirectUrl = new URL(redirectTo);
      if (redirectUrl.origin === origin && redirectUrl.pathname === "/auth/callback") {
        const nestedNext = getAllowedPath(redirectUrl.searchParams.get("next"), origin);
        if (nestedNext) return nestedNext;
      }
    } catch {
      // Una URL mal formada no puede decidir el destino del callback.
    }
  }

  return "/admin";
}

export function getAuthErrorPath(next: string) {
  return next.startsWith("/mi-cuenta")
    ? "/mi-cuenta/acceso?error=recovery"
    : "/admin/login?error=recovery";
}
