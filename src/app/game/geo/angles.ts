// Grados de brújula: 0 = norte, sentido horario.
export const normDeg = (d: number): number => ((d % 360) + 360) % 360;

/** Diferencia más corta de `from` a `to`, en [-180, 180). */
export const deltaDeg = (from: number, to: number): number => normDeg(to - from + 180) - 180;

/** Suavizado circular: avanza `alpha` (0..1) del camino corto hacia `next`. */
export const smoothAngle = (prev: number, next: number, alpha: number): number =>
  normDeg(prev + deltaDeg(prev, next) * alpha);

/**
 * `deviceorientationabsolute.alpha` gira en sentido antihorario desde el norte; el rumbo de brújula es `360 − alpha`,
 * corregido por la rotación de la pantalla (`screen.orientation.angle`).
 */
export const headingFromAlpha = (alpha: number, screenAngle: number): number => normDeg(360 - alpha + screenAngle);
