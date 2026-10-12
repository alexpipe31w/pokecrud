export const JOYSTICK_DEADZONE = 0.15;
/** Velocidad con el joystick al tope: trote (con la mitad se camina, F1-05 elige la animación por velocidad). */
export const JOYSTICK_MAX_MS = 4;

/**
 * (dx, dy) = desplazamiento del mando en radios (−1..1, y hacia abajo como la pantalla). Arriba = hacia donde mira
 * la cámara (`headingDeg`). Devuelve metros por segundo hacia el este y el norte.
 */
export function joystickVelocity(dx: number, dy: number, headingDeg: number): { east: number; north: number } {
  let mag = Math.hypot(dx, dy);
  if (mag < JOYSTICK_DEADZONE) return { east: 0, north: 0 };
  const scale = Math.min(1, mag) / mag;
  mag = Math.min(1, mag);
  const fwd = -dy * scale; // arriba de la pantalla = adelante
  const right = dx * scale;
  const h = (headingDeg * Math.PI) / 180;
  // La velocidad crece desde 0 al salir de la zona muerta (sin salto) hasta JOYSTICK_MAX_MS en el borde.
  const speed = (JOYSTICK_MAX_MS * ((mag - JOYSTICK_DEADZONE) / (1 - JOYSTICK_DEADZONE))) / mag;
  return {
    east: (fwd * Math.sin(h) + right * Math.cos(h)) * speed,
    north: (fwd * Math.cos(h) - right * Math.sin(h)) * speed,
  };
}
