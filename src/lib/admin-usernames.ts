export const ADMIN_USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function normalizeAdminUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidAdminUsername(value: string) {
  return ADMIN_USERNAME_PATTERN.test(normalizeAdminUsername(value));
}
