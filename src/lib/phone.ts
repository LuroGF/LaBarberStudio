/** Convierte un móvil español habitual a E.164. También admite números internacionales con + o 00. */
export function normalizePhone(input: string): string | null {
  let value = input.trim().replace(/[\s().-]/g, "");
  if (value.startsWith("00")) value = `+${value.slice(2)}`;
  if (!value.startsWith("+") && /^[6789]\d{8}$/.test(value)) value = `+34${value}`;
  return /^\+\d{8,15}$/.test(value) ? value : null;
}

export function formatPhone(phone: string): string {
  if (/^\+34\d{9}$/.test(phone)) {
    const local = phone.slice(3);
    return `+34 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  return phone;
}

