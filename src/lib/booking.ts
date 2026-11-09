import { createHash, randomBytes } from "node:crypto";

export const MANAGE_TOKEN_RE = /^[a-f0-9]{64}$/;

export function createManageToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashManageToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function bookingErrorMessage(message: string): string {
  if (message.includes("SLOT_UNAVAILABLE")) return "Esa hora acaba de dejar de estar disponible. Elige otra.";
  if (message.includes("TOO_MANY_ACTIVE")) return "Ya hay demasiadas citas activas asociadas a ese teléfono.";
  if (message.includes("INVALID_PHONE")) return "Escribe un teléfono válido. Para España puedes usar 9 cifras.";
  if (message.includes("SERVICE_UNAVAILABLE")) return "El servicio seleccionado ya no está disponible.";
  if (message.includes("NO_BARBER")) return "Ahora mismo no se pueden aceptar reservas.";
  return "No se ha podido crear la cita. Inténtalo de nuevo.";
}

