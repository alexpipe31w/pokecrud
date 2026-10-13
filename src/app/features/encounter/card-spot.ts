import type { ScreenBox } from '../../game/encounter-scene/encounter-scene';

const GAP = 8;

/**
 * Dónde va la ficha del Pokémon (F2-13) para NO taparlo: a su derecha, si no a su izquierda, si no encima y si no
 * debajo (sin meterse en la zona de la mano). Sin caja (en AR mirando a otro lado) o si no cabe en ningún sitio: bajo
 * la cabecera. Píxeles de la pantalla; `area` = franja vertical libre entre la cabecera y la mano.
 */
export function cardSpot(
  box: ScreenBox | null,
  w: number,
  h: number,
  cw: number,
  ch: number,
  area: { minTop: number; maxBottom: number },
): { x: number; y: number } {
  const center = Math.round((w - cw) / 2);
  const clampY = (y: number) =>
    Math.min(Math.max(y, area.minTop), Math.max(area.minTop, area.maxBottom - ch));
  if (!box) return { x: center, y: area.minTop };
  if (w - box.right >= cw + GAP * 2) return { x: Math.round(box.right + GAP), y: clampY(box.top) };
  if (box.left >= cw + GAP * 2) return { x: Math.round(box.left - cw - GAP), y: clampY(box.top) };
  const above = box.top - GAP - ch;
  if (above >= area.minTop) return { x: center, y: Math.round(above) };
  const below = box.bottom + GAP;
  if (below + ch <= area.maxBottom) return { x: center, y: Math.round(below) };
  return { x: center, y: area.minTop };
}
