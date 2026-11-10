import "server-only";

/** Se llama después de `connection()` para obtener la hora de esta petición, nunca al precalcular. */
export function requestTimeMs() {
  return Date.now();
}

