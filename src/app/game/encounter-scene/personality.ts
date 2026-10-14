import type { Species, TypeName } from '@shared/data/dataset.types';

/**
 * "Personalidad en la captura según la ficha" (VISION): cómo se mueve cada Pokémon en el encuentro (F2-04b). Solo
 * es visual: quién decide si se captura o huye es el servidor (D-027, D-028).
 */
export interface Personality {
  /** 0..1 por su velocidad base: los rápidos saltan más a menudo y más alto (y hacen fallar más lanzamientos). */
  agility: number;
  /** 0..1 por su ratio de captura (y legendario/mítico): los esquivos se mueven más inquietos. */
  skittish: number;
  /** Metros que flota sobre el suelo: los alados vuelan y los fantasma levitan un poco. */
  hover: number;
  /** Tipo Fantasma: semitransparente. */
  ghostly: boolean;
  /** Tipo de sus partículas (el principal). */
  fx: TypeName;
}

const clamp01 = (n: number): number => Math.min(1, Math.max(0, n));

export function personalityOf(s: Species): Personality {
  const flying = s.shape === 'wings' || s.shape === 'bug-wings';
  const ghostly = s.types.includes('ghost');
  return {
    agility: clamp01((s.baseStats.spe - 20) / 130),
    skittish: clamp01(1 - s.captureRate / 255 + (s.isLegendary || s.isMythical ? 0.2 : 0)),
    hover: flying ? 0.6 : ghostly ? 0.3 : 0,
    ghostly,
    fx: s.types[0],
  };
}
