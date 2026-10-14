import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HapticsService } from '../../services/game/haptics.service';
import { JoystickComponent, type JoystickVector } from './joystick.component';

describe('JoystickComponent', () => {
  let fixture: ComponentFixture<JoystickComponent>;
  let out: JoystickVector[];
  const haptics = { tap: vi.fn() };
  const base = (): HTMLElement => fixture.nativeElement.querySelector('.js');
  /** jsdom no tiene PointerEvent: un Event con las propiedades que se leen. */
  const pointer = (type: string, clientX: number, clientY: number, pointerId = 1) =>
    base().dispatchEvent(Object.assign(new Event(type), { clientX, clientY, pointerId }));
  const keyEv = (type: 'keydown' | 'keyup', key: string) =>
    base().dispatchEvent(new KeyboardEvent(type, { key, cancelable: true }));

  beforeEach(() => {
    haptics.tap.mockClear();
    TestBed.configureTestingModule({ providers: [{ provide: HapticsService, useValue: haptics }] });
    fixture = TestBed.createComponent(JoystickComponent);
    out = [];
    fixture.componentInstance.vector.subscribe((v) => out.push(v));
    fixture.detectChanges();
    // jsdom no maqueta: la base está en (0,0) con 120×120 → centro en (60, 60).
    vi.spyOn(base(), 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 120, 120));
  });

  it('al agarrar: háptico y vector según el dedo (arriba = dy negativo)', () => {
    pointer('pointerdown', 60, 38); // 22 px arriba = medio recorrido
    expect(haptics.tap).toHaveBeenCalledTimes(1);
    expect(out.at(-1)!.dx).toBeCloseTo(0, 6);
    expect(out.at(-1)!.dy).toBeCloseTo(-0.5, 6);
  });

  it('fuera de la base se recorta a 1 y al soltar vuelve a {0,0}', () => {
    pointer('pointerdown', 60, 60);
    pointer('pointermove', 400, 60);
    expect(out.at(-1)!.dx).toBeCloseTo(1, 6);
    pointer('pointerup', 400, 60);
    expect(out.at(-1)).toEqual({ dx: 0, dy: 0 });
  });

  it('ignora un segundo dedo', () => {
    pointer('pointerdown', 60, 60, 1);
    const n = out.length;
    pointer('pointermove', 0, 0, 2);
    expect(out.length).toBe(n);
  });

  it('flechas del teclado: arriba + derecha en diagonal y {0,0} al soltar todas', () => {
    keyEv('keydown', 'ArrowUp');
    keyEv('keydown', 'ArrowRight');
    const v = out.at(-1)!;
    expect(Math.hypot(v.dx, v.dy)).toBeCloseTo(1, 6);
    expect(v.dx).toBeGreaterThan(0);
    expect(v.dy).toBeLessThan(0);
    keyEv('keyup', 'ArrowUp');
    keyEv('keyup', 'ArrowRight');
    expect(out.at(-1)).toEqual({ dx: 0, dy: 0 });
  });
});
