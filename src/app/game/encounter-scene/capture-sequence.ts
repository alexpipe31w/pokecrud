/**
 * Coreografía de la captura (F2-07, DISENO §5): qué pasa y cuánto dura desde que la bola golpea al Pokémon.
 *
 *   golpe → absorb (luz roja hacia dentro) → drop (cae con rebote) → [espera al servidor] →
 *   (pause → shake) × sacudidas → pause → click (¡capturado!) | burst (se escapa) [→ flee (huye)]
 *
 * La primera parte se conoce al golpear (`preTimeline`); el resto, cuando responde el servidor (`resultTimeline`),
 * que empieza donde acabe la primera o cuando llegue la respuesta si tarda más. Solo tiempos: la escena pinta.
 */
export type SeqStep = 'absorb' | 'drop' | 'pause' | 'shake' | 'click' | 'burst' | 'flee';

export interface SeqItem {
  step: SeqStep;
  /** ms (mismo reloj que el resto de la escena). */
  start: number;
  end: number;
  /** Número de sacudida (1..3) en `shake`. */
  index?: number;
}

export const SEQ_MS: Readonly<Record<SeqStep, number>> = {
  absorb: 600,
  drop: 700,
  pause: 350,
  shake: 500,
  click: 1000,
  burst: 600,
  flee: 900,
};
/** Pausa tensa antes del final (más larga que entre sacudidas). */
const FINAL_PAUSE_MS = 450;

export interface SeqResult {
  captured: boolean;
  shakes: number;
  fled: boolean;
}

/** `speed` 2 = el doble de rápido ("reducir efectos", D-033). */
export function preTimeline(start: number, speed = 1): SeqItem[] {
  const items: SeqItem[] = [];
  let t = start;
  for (const step of ['absorb', 'drop'] as const) {
    items.push({ step, start: t, end: t + SEQ_MS[step] / speed });
    t += SEQ_MS[step] / speed;
  }
  return items;
}

export function resultTimeline(r: SeqResult, start: number, speed = 1): SeqItem[] {
  const items: SeqItem[] = [];
  let t = start;
  const push = (step: SeqStep, ms: number, index?: number) => {
    items.push({ step, start: t, end: t + ms / speed, ...(index ? { index } : {}) });
    t += ms / speed;
  };
  const shakes = Math.max(0, Math.min(3, r.shakes));
  for (let i = 1; i <= shakes; i++) {
    push('pause', SEQ_MS.pause);
    push('shake', SEQ_MS.shake, i);
  }
  push('pause', FINAL_PAUSE_MS);
  if (r.captured) {
    push('click', SEQ_MS.click);
  } else {
    push('burst', SEQ_MS.burst);
    if (r.fled) push('flee', SEQ_MS.flee);
  }
  return items;
}

export const timelineEnd = (items: readonly SeqItem[]): number => items[items.length - 1].end;

/** Paso en curso en `t` y su avance 0..1; null antes del primero o después del último. */
export function stepAt(items: readonly SeqItem[], t: number): { item: SeqItem; k: number } | null {
  for (const item of items) {
    if (t >= item.start && t < item.end)
      return { item, k: (t - item.start) / (item.end - item.start) };
  }
  return null;
}

/** Altura de la bola al caer (paso `drop`, k 0..1): cae acelerando hasta `restY` y da un botecito. */
export function ballDropY(k: number, fromY: number, restY: number): number {
  if (k < 0.6) {
    const f = k / 0.6;
    return fromY + (restY - fromY) * f * f;
  }
  return restY + 0.08 * Math.sin((Math.PI * (k - 0.6)) / 0.4);
}

/** Inclinación de la bola en una sacudida (paso `shake`, k 0..1): dos vaivenes que se apagan. */
export const shakeAngle = (k: number): number => 0.45 * Math.sin(k * Math.PI * 4) * (1 - k);
