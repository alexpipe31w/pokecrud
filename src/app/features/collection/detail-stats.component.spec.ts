import { TestBed } from '@angular/core/testing';
import type { Stats } from '@shared/engine/battle/stats';
import { DetailStatsComponent } from './detail-stats.component';

const all = (n: number): Stats => ({
  hp: n,
  attack: n,
  defense: n,
  specialAttack: n,
  specialDefense: n,
  speed: n,
});

describe('DetailStatsComponent', () => {
  const render = (ivs: Stats, nature: string) => {
    const f = TestBed.createComponent(DetailStatsComponent);
    f.componentRef.setInput('ivs', ivs);
    f.componentRef.setInput('stats', all(50));
    f.componentRef.setInput('nature', nature);
    f.detectChanges();
    return f.nativeElement as HTMLElement;
  };

  it('valoración en % y estrellas (2 de 3 con 71 %), con etiqueta para el lector de pantalla', () => {
    const el = render(all(22), 'hardy');
    expect(el.textContent).toContain('71 %');
    expect(el.querySelector('.stars')!.getAttribute('aria-label')).toBe('2 de 3 estrellas');
  });

  it('todo a 31 = perfecto', () => {
    expect(render(all(31), 'hardy').querySelector('.stars')!.getAttribute('aria-label')).toBe(
      'perfecto',
    );
  });

  it('naturaleza en español con lo que sube y baja, y la marca en esas stats', () => {
    const el = render(all(10), 'timid');
    expect(el.querySelector('.nature')!.textContent).toMatch(/Miedosa\s*· ▲ Velocidad · ▼ Ataque/);
    const labels = [...el.querySelectorAll('app-stat-bar')].map((b) => b.textContent ?? '');
    expect(labels.some((t) => t.includes('Velocidad ▲'))).toBe(true);
    expect(labels.some((t) => t.includes('Ataque ▼'))).toBe(true);
  });

  it('naturaleza neutra', () => {
    expect(render(all(10), 'hardy').querySelector('.nature')!.textContent).toContain('neutra');
  });
});
