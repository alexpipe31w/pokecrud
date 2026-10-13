/**
 * Valor de un token CSS de DISENO §2 para three.js (que no lee variables CSS): `[token, valor]`; se usa el valor
 * escrito si no hay documento o el token no está definido (tests en jsdom).
 */
export function cssColor([token, fallback]: readonly [string, string]): string {
  if (typeof document === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim() || fallback;
}
