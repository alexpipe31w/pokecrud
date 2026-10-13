import { TestBed } from '@angular/core/testing';
import type { CaughtView } from '@shared/protocol/encounters';

import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import { CaughtCardComponent, XP_COUNT_MS } from './caught-card.component';

const CAUGHT: CaughtView = {
  id: 'c1',
  speciesId: 25,
  level: 12,
  gender: 'M',
  shiny: true,
  nature: 'adamant',
  heightScale: 1.45,
  moves: [85, 98],
};

describe('CaughtCardComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        { provide: AudioService, useValue: { playSfx: vi.fn() } },
      ],
    });
  });
  afterEach(() => vi.useRealTimers());

  const setup = (instant = false) => {
    const f = TestBed.createComponent(CaughtCardComponent);
    f.componentRef.setInput('caught', CAUGHT);
    f.componentRef.setInput('name', 'Pikachu');
    f.componentRef.setInput('moveNames', ['Rayo', 'Ataque Rápido']);
    f.componentRef.setInput('xp', 160);
    f.componentRef.setInput('instant', instant);
    f.detectChanges();
    return f;
  };
  const text = (f: { nativeElement: HTMLElement }) => f.nativeElement.textContent ?? '';

  it('enseña al individuo: nombre, ✦, nivel, naturaleza en español, sexo, tamaño y movimientos', () => {
    const f = setup();
    expect(text(f)).toContain('¡Capturado!');
    expect(text(f)).toContain('Pikachu');
    expect(text(f)).toContain('✦');
    expect(text(f)).toContain('12');
    expect(text(f)).toContain('Firme');
    expect(text(f)).toContain('♂ Macho');
    expect(text(f)).toContain('XL');
    expect(text(f)).toContain('Rayo · Ataque Rápido');
    const img = (f.nativeElement as HTMLElement).querySelector('img')!;
    expect(img.getAttribute('src')).toContain('/other/home/shiny/25.png');
  });

  it('la XP cuenta desde 0 hasta lo ganado', () => {
    const f = setup();
    expect(text(f)).toContain('+0 XP');
    vi.advanceTimersByTime(XP_COUNT_MS);
    f.detectChanges();
    expect(text(f)).toContain('+160 XP');
  });

  it('con "reducir efectos" sale ya contada', () => {
    expect(text(setup(true))).toContain('+160 XP');
  });

  it('si el arte no carga prueba el siguiente', () => {
    const f = setup();
    const img = (f.nativeElement as HTMLElement).querySelector('img')!;
    img.dispatchEvent(new Event('error'));
    f.detectChanges();
    expect(img.getAttribute('src')).toContain('/official-artwork/shiny/25.png');
  });

  it('"Volver al mapa" avisa a la página', () => {
    const f = setup();
    const done = vi.fn();
    f.componentInstance.done.subscribe(done);
    (f.nativeElement as HTMLElement).querySelector('button')!.click();
    expect(done).toHaveBeenCalled();
  });
});
