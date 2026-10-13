/**
 * Coreografía de la evolución (F3-05, DISENO §5): silueta blanca alternando entre la forma A y la B cada vez más
 * rápido → destello → forma nueva a color. Puro: el componente lo llama en cada fotograma con el tiempo transcurrido.
 */

/** Lo que dura la alternancia A↔B. */
export const PULSE_MS = 3000;
/** Lo que dura el destello. */
export const BURST_MS = 400;
/** Periodo de la alternancia al empezar y al acabar (un cambio A↔B cada medio periodo). */
const PERIOD_START_MS = 600;
const PERIOD_END_MS = 60;
/** El destello sube hasta este punto (fracción de BURST_MS) y luego se apaga; bajo el pico aparece la forma B. */
const BURST_PEAK = 0.4;
const GLOW_START = 0.3;

export interface EvolvePose {
  /** Silueta de la forma B (si no, la A). */
  showB: boolean;
  /** Brillo blanco alrededor de la silueta, 0..1. */
  glow: number;
  /** Destello a pantalla completa, 0..1. */
  burst: number;
  /** Ya se ve la forma nueva a color (grito y vibración en este fotograma). */
  revealed: boolean;
  done: boolean;
}

// El periodo baja exponencialmente de 600 a 60 ms en PULSE_MS: p(t) = 600 · r^(t/PULSE_MS), r = 60/600.
const RATIO = PERIOD_END_MS / PERIOD_START_MS;
const LN_INV_RATIO = Math.log(1 / RATIO);
/** Cambios A↔B acumulados hasta `t` (integral de 2 / p(τ)). */
function flipsUntil(t: number): number {
  const pulse = Math.min(t, PULSE_MS);
  let n =
    ((2 * PULSE_MS) / (PERIOD_START_MS * LN_INV_RATIO)) *
    (Math.exp((LN_INV_RATIO * pulse) / PULSE_MS) - 1);
  if (t > PULSE_MS) n += (2 * (t - PULSE_MS)) / PERIOD_END_MS; // esperando al servidor: al ritmo más rápido
  return n;
}

/**
 * Pose de la animación a los `t` ms. `burstAt` es cuándo empieza el destello: `PULSE_MS` si el servidor ya respondió,
 * más tarde si respondió tarde, e `Infinity` mientras no responde (sigue alternando, como la captura espera, D-046).
 */
export function evolvePose(t: number, burstAt: number = PULSE_MS): EvolvePose {
  const start = Math.max(burstAt, PULSE_MS);
  if (t >= start) {
    const k = Math.min(1, (t - start) / BURST_MS);
    const burst = k >= 1 ? 0 : k < BURST_PEAK ? k / BURST_PEAK : (1 - k) / (1 - BURST_PEAK);
    const revealed = k >= BURST_PEAK;
    return { showB: true, glow: revealed ? 0 : 1, burst, revealed, done: k >= 1 };
  }
  const glow = GLOW_START + (1 - GLOW_START) * Math.min(1, t / PULSE_MS);
  return {
    showB: Math.floor(flipsUntil(Math.max(0, t))) % 2 === 1,
    glow,
    burst: 0,
    revealed: false,
    done: false,
  };
}
