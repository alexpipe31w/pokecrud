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

/** Zancada ≈ 0,75 m andando, 1,2 m corriendo: la cadencia sale de la velocidad (los pies no "patinan"). */
export function limbPose(gait: Gait, speed: number, t: number): LimbPose {
  if (gait === 'idle') {
    const b = Math.sin(t * 2 * Math.PI * 0.4) * 0.05;
    return { legL: 0, legR: 0, armL: 0, armR: 0, bob: b, lean: 0 };
  }
  const run = gait === 'run';
  const stride = run ? 1.2 : 0.75;
  const phase = 2 * Math.PI * (speed / (2 * stride)) * t;
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
