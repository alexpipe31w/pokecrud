import type { Gait } from './avatar-motion';

export interface LimbPose {
  /** Radianes de giro sobre el eje X de la cadera/hombro (positivo = hacia delante). */
  legL: number;
  legR: number;
  armL: number;
  armR: number;
  /** Metros de rebote vertical del cuerpo. */
  bob: number;
  /** Radianes de inclinación hacia delante. */
  lean: number;
}

const TAU = 2 * Math.PI;

/** Zancada ≈ 0,75 m andando, 1,2 m corriendo: la cadencia sale de la velocidad (los pies no "patinan"). */
function strideM(gait: Gait): number {
  return gait === 'run' ? 1.2 : 0.75;
}

/**
 * Avanza la fase de la zancada (radianes, en [0, 2π)). Se ACUMULA fotograma a fotograma: calcularla como
 * `velocidad × t` con `t` absoluto haría saltar las piernas cada vez que `AvatarMotion` suaviza la velocidad.
 */
export function advanceStride(phase: number, gait: Gait, speed: number, dt: number): number {
  if (gait === 'idle' || dt <= 0) return phase;
  const next = phase + TAU * (speed / (2 * strideM(gait))) * dt;
  return next % TAU;
}

/** Pose de las extremidades para una fase de zancada; `t` (segundos) solo marca la respiración en reposo. */
export function limbPose(gait: Gait, phase: number, t: number): LimbPose {
  if (gait === 'idle') {
    const b = Math.sin(t * TAU * 0.4) * 0.05;
    return { legL: 0, legR: 0, armL: 0, armR: 0, bob: b, lean: 0 };
  }
  const run = gait === 'run';
  const amp = run ? 0.9 : 0.5;
  const s = Math.sin(phase);
  return {
    legL: s * amp,
    legR: -s * amp,
    armL: -s * amp * 0.8,
    armR: s * amp * 0.8,
    bob: Math.abs(Math.cos(phase)) * (run ? 0.35 : 0.15),
    lean: run ? 0.18 : 0,
  };
}
