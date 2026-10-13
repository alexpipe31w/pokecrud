import { cardSpot } from './card-spot';

const W = 390;
const H = 844;
const CARD = { w: 220, h: 270 };
const AREA = { minTop: 120, maxBottom: 650 };
const overlaps = (
  a: { x: number; y: number },
  b: { left: number; top: number; right: number; bottom: number },
) => a.x < b.right && a.x + CARD.w > b.left && a.y < b.bottom && a.y + CARD.h > b.top;

describe('cardSpot (F2-13: la ficha no tapa al Pokémon)', () => {
  it('si cabe a la derecha, a su derecha y a la altura de su cabeza', () => {
    const box = { left: 10, top: 300, right: 120, bottom: 420 };
    expect(cardSpot(box, W, H, CARD.w, CARD.h, AREA)).toEqual({ x: 128, y: 300 });
  });

  it('si no, a su izquierda', () => {
    const box = { left: 260, top: 300, right: 380, bottom: 420 };
    expect(cardSpot(box, W, H, CARD.w, CARD.h, AREA)).toEqual({ x: 32, y: 300 });
  });

  it('Pikachu pequeño y centrado (el caso de Alex): encima de él, sin taparlo', () => {
    const box = { left: 165, top: 470, right: 225, bottom: 560 };
    const p = cardSpot(box, W, H, CARD.w, CARD.h, AREA);
    expect(p.x).toBe(85); // centrada
    expect(p.y + CARD.h).toBeLessThanOrEqual(box.top);
    expect(p.y).toBeGreaterThanOrEqual(AREA.minTop);
    expect(overlaps(p, box)).toBe(false);
  });

  it('si encima no cabe, debajo (sin bajar de la zona de la mano)', () => {
    const box = { left: 165, top: 150, right: 225, bottom: 260 };
    const p = cardSpot(box, W, H, CARD.w, CARD.h, AREA);
    expect(p.y).toBeGreaterThanOrEqual(box.bottom);
    expect(p.y + CARD.h).toBeLessThanOrEqual(AREA.maxBottom);
    expect(overlaps(p, box)).toBe(false);
  });

  it('sin caja (en AR mirando a otro lado) o si no cabe en ningún sitio: bajo la cabecera', () => {
    expect(cardSpot(null, W, H, CARD.w, CARD.h, AREA)).toEqual({ x: 85, y: 120 });
    const huge = { left: 0, top: 130, right: 390, bottom: 640 };
    expect(cardSpot(huge, W, H, CARD.w, CARD.h, AREA)).toEqual({ x: 85, y: 120 });
  });
});
