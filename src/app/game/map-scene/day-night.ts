/** Hora local del móvil (DISENO §1), no la del servidor: de 19:00 a 5:59 el mapa va en modo noche. */
export const isNightLocal = (d: Date): boolean => d.getHours() >= 19 || d.getHours() < 6;
