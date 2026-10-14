import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DatasetService } from '../../services/game/dataset.service';
import { EvolvePanelComponent } from './evolve-panel.component';

/** Lo mínimo del dataset: Pichu → Pikachu → Raichu, Eevee → Vaporeon / Jolteon, Tauros sin evolución. */
const sp = (id: number, es: string, chain: number, from: number | null, to: number[]) => [
  id,
  {
    id,
    names: { es, en: es },
    evolutionChainId: chain,
    evolvesFrom: from,
    evolvesTo: to.map((t) => ({ to: t })),
  },
];
const dex = new Map([
  sp(172, 'Pichu', 10, null, [25]),
  sp(25, 'Pikachu', 10, 172, [26]),
  sp(26, 'Raichu', 10, 25, []),
  sp(133, 'Eevee', 67, null, [134, 135]),
  sp(134, 'Vaporeon', 67, 133, []),
  sp(135, 'Jolteon', 67, 133, []),
  sp(128, 'Tauros', 60, null, []),
] as [number, unknown][]);

describe('EvolvePanelComponent', () => {
  const render = (speciesId: number, candy: number) => {
    TestBed.configureTestingModule({
      providers: [{ provide: DatasetService, useValue: { species: signal(dex) } }],
    });
    const f = TestBed.createComponent(EvolvePanelComponent);
    f.componentRef.setInput('speciesId', speciesId);
    f.componentRef.setInput('shiny', false);
    f.componentRef.setInput('candy', candy);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    const buttons = () => [...el.querySelectorAll<HTMLButtonElement>('button.option')];
    return { f, el, buttons };
  };

  it('Pikachu con 37 caramelos: "Evolucionar a Raichu · 100", deshabilitado y "Te faltan 63"', () => {
    const { el, buttons } = render(25, 37);
    expect(buttons()).toHaveLength(1);
    expect(buttons()[0].textContent).toContain('Evolucionar a Raichu');
    expect(buttons()[0].textContent).toContain('100');
    expect(buttons()[0].disabled).toBe(true);
    expect(el.textContent).toContain('Te faltan 63');
  });

  it('con caramelos: pide confirmación y solo entonces emite la especie elegida', () => {
    const { f, el, buttons } = render(133, 50);
    const chosen: number[] = [];
    f.componentInstance.evolve.subscribe((to: number) => chosen.push(to));
    expect(buttons().map((b) => b.disabled)).toEqual([false, false]);
    buttons()[1].click();
    f.detectChanges();
    expect(chosen).toEqual([]);
    expect(el.textContent).toContain('¿Evolucionar a Jolteon por 50 caramelos?');
    el.querySelector<HTMLButtonElement>('button.go')!.click();
    expect(chosen).toEqual([135]);
  });

  it('sin evolución (Tauros) no pinta nada', () => {
    const { el } = render(128, 500);
    expect(el.querySelector('section')).toBeNull();
  });
});
