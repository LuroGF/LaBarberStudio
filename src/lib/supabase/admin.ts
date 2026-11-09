import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente con la clave service_role: se salta RLS. Úsalo SOLO en código de servidor
 * (Server Actions / Route Handlers) para las reservas públicas. El import de
 * "server-only" hace que el build falle si alguien lo importa desde el navegador.
 */
export function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
