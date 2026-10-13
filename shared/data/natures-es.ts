import type { Nature } from '../engine/spawns.js';

/**
 * Nombre en español de cada naturaleza (F2-07, ficha del capturado). Sacados de PokéAPI (`/nature/{1..25}`,
 * `names[language = es]`) el 2026-10-12: el dataset no trae naturalezas y no se inventa nada (REGLA 3).
 */
export const NATURE_NAMES_ES: Readonly<Record<Nature, string>> = {
  hardy: 'Fuerte',
  lonely: 'Huraña',
  brave: 'Audaz',
  adamant: 'Firme',
  naughty: 'Pícara',
  bold: 'Osada',
  docile: 'Dócil',
  relaxed: 'Plácida',
  impish: 'Agitada',
  lax: 'Floja',
  timid: 'Miedosa',
  hasty: 'Activa',
  serious: 'Seria',
  jolly: 'Alegre',
  naive: 'Ingenua',
  modest: 'Modesta',
  mild: 'Afable',
  quiet: 'Mansa',
  bashful: 'Tímida',
  rash: 'Alocada',
  calm: 'Serena',
  gentle: 'Amable',
  sassy: 'Grosera',
  careful: 'Cauta',
  quirky: 'Rara',
};

/** Nombre en español; si llega una naturaleza desconocida, la clave tal cual (nunca `undefined` en pantalla). */
export const natureNameEs = (nature: string): string =>
  (NATURE_NAMES_ES as Record<string, string>)[nature] ?? nature;
