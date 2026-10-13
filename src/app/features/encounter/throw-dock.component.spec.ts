import { TestBed } from '@angular/core/testing';
import { ThrowDockComponent, type ThrowIntent } from './throw-dock.component';

/** Evento de puntero con la hora que diga el test (jsdom no tiene PointerEvent y su timeStamp es "ahora"). */
function pointer(type: string, x: number, y: number, t: number): Event {
  const e = new MouseEvent(type, { clientX: x, clientY: y, bubbles: true });
  Object.defineProperty(e, 'timeStamp', { value: t });
  return e;
}

describe('ThrowDockComponent', () => {
  const setup = (inputs: Record<string, unknown> = {}) => {
    const f = TestBed.createComponent(ThrowDockComponent);
    f.componentRef.setInput('ball', 'POKE_BALL');
    f.componentRef.setInput('qty', { POKE_BALL: 3, GREAT_BALL: 0, ULTRA_BALL: 0, RAZZ_BERRY: 1 });
    for (const [k, v] of Object.entries(inputs)) f.componentRef.setInput(k, v);
    f.detectChanges();
    const thrown: ThrowIntent[] = [];
    f.componentInstance.thrown.subscribe((t) => thrown.push(t));
    const hand = (f.nativeElement as HTMLElement).querySelector<HTMLElement>('.hand')!;
    return { f, hand, thrown };
  };

  it('un lanzamiento recto hacia arriba sale con su potencia, sin puntería ni curva', () => {
    const { hand, thrown } = setup();
    hand.dispatchEvent(pointer('pointerdown', 200, 700, 0));
    hand.dispatchEvent(pointer('pointermove', 200, 680, 20));
    hand.dispatchEvent(pointer('pointermove', 200, 620, 60));
    hand.dispatchEvent(pointer('pointerup', 200, 556, 80)); // 144 px en 80 ms = 1800 px/s
    expect(thrown).toHaveLength(1);
    expect(thrown[0].power).toBeCloseTo(1, 6);
    expect(thrown[0].aim).toBeCloseTo(0, 6);
    expect(thrown[0].curve).toBe(0);
  });

  it('arrastrar hacia abajo no lanza y la bola vuelve a la mano', () => {
    const { hand, thrown } = setup();
    hand.dispatchEvent(pointer('pointerdown', 200, 700, 0));
    hand.dispatchEvent(pointer('pointermove', 200, 740, 40));
    hand.dispatchEvent(pointer('pointerup', 200, 760, 80));
    expect(thrown).toHaveLength(0);
    expect(hand.style.transform).toBe('');
  });

  it('sin bola en la mano (disabled) no se puede agarrar', () => {
    const { hand, thrown } = setup({ disabled: true });
    hand.dispatchEvent(pointer('pointerdown', 200, 700, 0));
    hand.dispatchEvent(pointer('pointerup', 200, 556, 80));
    expect(thrown).toHaveLength(0);
  });

  it('las bolas que no quedan no se pueden elegir', () => {
    const { f } = setup();
    const buttons = [...(f.nativeElement as HTMLElement).querySelectorAll('button')];
    expect(buttons.map((b) => b.disabled)).toEqual([false, true, true, false]);
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true');
  });
});
