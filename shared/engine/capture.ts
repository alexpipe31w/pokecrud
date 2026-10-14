import type { ItemId } from './items.js';
import type { Rng } from './rng.js';

/**
 * Fórmula de captura (F2-03, ARQUITECTURA §6): Gen III+ adaptada a Pokémon GO. Pura y con el RNG inyectado: el
 * servidor la ejecuta con SU generador (F2-06) y el cliente solo la usa para enseñar el color del círculo.
 *
 *   a = ((3·PSmax − 2·PSactual) · captureRate · bola · baya · lanzamiento · curva) / (3·PSmax)
 *   b = floor(65536 / (255/a)^0,1875)        (a ≥ 255 → captura segura)
 *   4 comprobaciones: cada una pasa si un entero aleatorio en [0, 65535] < b. Las 4 → capturado.
 *
 * En el mapa los Pokémon están con la vida llena, así que el primer factor vale 1/3.
 */

export type BallId = Extract<ItemId, 'POKE_BALL' | 'GREAT_BALL' | 'ULTRA_BALL'>;
export type BerryId = Extract<ItemId, 'RAZZ_BERRY'>;
export type ThrowQuality = 'none' | 'nice' | 'great' | 'excellent';

export const BALL_BONUS: Readonly<Record<BallId, number>> = {
  POKE_BALL: 1,
  GREAT_BALL: 1.5,
  ULTRA_BALL: 2,
};
export const BERRY_BONUS: Readonly<Record<BerryId, number>> = { RAZZ_BERRY: 1.5 };
/** Círculo de precisión: Bien / Genial / Excelente (ARQUITECTURA §6). */
export const THROW_BONUS: Readonly<Record<ThrowQuality, number>> = {
  none: 1,
  nice: 1.3,
  great: 1.7,
  excellent: 2,
};
/** Bola con efecto. ARQUITECTURA no fijaba el valor: el de Pokémon GO (D-027). */
export const CURVE_BONUS = 1.7;

export const isBall = (item: string): item is BallId => item in BALL_BONUS;
export const isBerry = (item: string): item is BerryId => item in BERRY_BONUS;

export interface CaptureInput {
  /** 3..255 del dataset (1 se admite por si acaso). */
  captureRate: number;
  ball: BallId;
  berry: BerryId | null;
  throwQuality: ThrowQuality;
  curve: boolean;
  /** Por defecto vida llena (en el mapa siempre). */
  hpMax?: number;
  hpCurrent?: number;
}

function checkInput(input: CaptureInput): void {
  const { captureRate, hpMax = 1, hpCurrent = hpMax } = input;
  if (!Number.isInteger(captureRate) || captureRate < 1 || captureRate > 255) {
    throw new RangeError(`captureRate fuera de rango: ${captureRate}`);
  }
  if (!(hpMax > 0) || !(hpCurrent > 0) || hpCurrent > hpMax) {
    throw new RangeError(`PS no válidos: ${hpCurrent}/${hpMax}`);
  }
  if (!isBall(input.ball)) throw new RangeError(`No es una bola: ${String(input.ball)}`);
  if (input.berry !== null && !isBerry(input.berry)) {
    throw new RangeError(`No es una baya: ${String(input.berry)}`);
  }
  if (!(input.throwQuality in THROW_BONUS)) {
    throw new RangeError(`Lanzamiento no válido: ${String(input.throwQuality)}`);
  }
}

/** Valor modificado `a` (sin tope). */
export function captureValue(input: CaptureInput): number {
  checkInput(input);
  const { captureRate, hpMax = 1, hpCurrent = hpMax } = input;
  const bonus =
    BALL_BONUS[input.ball] *
    (input.berry ? BERRY_BONUS[input.berry] : 1) *
    THROW_BONUS[input.throwQuality] *
    (input.curve ? CURVE_BONUS : 1);
  return ((3 * hpMax - 2 * hpCurrent) * captureRate * bonus) / (3 * hpMax);
}

/** Umbral de cada comprobación de sacudida: 65536 = pasa siempre. */
export function shakeThreshold(a: number): number {
  if (a >= 255) return 65536;
  if (a <= 0) return 0;
  return Math.floor(65536 / (255 / a) ** 0.1875);
}

/** Probabilidad de captura de un lanzamiento que acierta (0..1). */
export function captureChance(input: CaptureInput): number {
  return (shakeThreshold(captureValue(input)) / 65536) ** 4;
}

export interface FleeInput {
  captureRate: number;
  /** Velocidad base. */
  speed: number;
  isLegendary: boolean;
  isMythical: boolean;
}

export const MIN_FLEE = 0.05;
export const MAX_FLEE = 0.35;

/**
 * Probabilidad de que huya tras un lanzamiento fallido (VISION: los raros y los rápidos se escapan más).
 * 5 % base + hasta 15 % por rareza + hasta 10 % por velocidad (+10 % legendarios y míticos), tope 35 %.
 */
export function fleeChance(input: FleeInput): number {
  const rarity = 1 - Math.min(Math.max(input.captureRate, 1), 255) / 255;
  const speed = Math.min(Math.max(input.speed, 0), 180) / 180;
  const special = input.isLegendary || input.isMythical ? 0.1 : 0;
  return Math.min(MAX_FLEE, MIN_FLEE + 0.15 * rarity + 0.1 * speed + special);
}

export interface ThrowOutcome {
  captured: boolean;
  /** Sacudidas que se ven antes de abrirse (0-3); 3 también si se captura. */
  shakes: 0 | 1 | 2 | 3;
  /** Solo puede huir si NO se captura. */
  fled: boolean;
}

/**
 * Resuelve un lanzamiento que acierta. Consume SIEMPRE 5 tiradas (4 sacudidas + huida) pase lo que pase: así la
 * secuencia del RNG no depende del resultado y un mismo estado da siempre lo mismo (cambiarlo = D-027).
 */
export function resolveThrow(capture: CaptureInput, flee: FleeInput, rng: Rng): ThrowOutcome {
  const b = shakeThreshold(captureValue(capture));
  const checks = [0, 1, 2, 3].map(() => rng.int(0, 65535) < b);
  const fleeRoll = rng.next();
  const passed = checks.indexOf(false);
  const captured = passed === -1;
  return {
    captured,
    shakes: (captured ? 3 : Math.min(passed, 3)) as ThrowOutcome['shakes'],
    fled: !captured && fleeRoll < fleeChance(flee),
  };
}
