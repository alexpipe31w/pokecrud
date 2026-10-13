/** Mote de un Pokémon capturado (F3-03). Lo usan el DTO del servidor y el formulario de la app. */
export const NICKNAME_MAX = 12;
const ALLOWED = /^[\p{L}\p{N} '\-.]+$/u;

/** Devuelve el mote limpio, `null` si queda vacío, o lanza `RangeError` si no vale. */
export function normalizeNickname(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!s) return null;
  if ([...s].length > NICKNAME_MAX) throw new RangeError(`Máximo ${NICKNAME_MAX} caracteres`);
  if (!ALLOWED.test(s)) throw new RangeError('Solo letras, números, espacios, guion y apóstrofo');
  return s;
}
