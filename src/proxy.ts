import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sesión de Supabase y bloquea las áreas privadas.
// La comprobación de rol (admin) se repite en el servidor con requireAdmin().
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (toSet) => {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAdminArea = pathname === "/admin" || pathname.startsWith("/admin/");
  const isLogin = pathname === "/admin/login";
  const isCustomerArea = pathname === "/mi-cuenta" || pathname.startsWith("/mi-cuenta/");
  const isCustomerPublic = pathname === "/mi-cuenta/acceso" || pathname === "/mi-cuenta/verificar" || pathname === "/mi-cuenta/recuperar";

  if (isAdminArea && !isLogin && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isCustomerArea && !isCustomerPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/mi-cuenta/acceso";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Las páginas privadas nunca deben guardarse en cachés compartidas.
  if (isAdminArea || isCustomerArea) {
    response.headers.set("Cache-Control", "private, no-store");
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/mi-cuenta/:path*"],
};
