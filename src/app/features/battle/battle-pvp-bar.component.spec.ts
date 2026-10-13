import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BattleController } from './battle.controller';
import { BattlePvpBarComponent } from './battle-pvp-bar.component';

describe('BattlePvpBarComponent (F5-04)', () => {
  const ctrl = {
    phase: signal<string>('choose'),
    remainingS: signal(23),
    opponent: signal('rivaldemo'),
    opponentAwayS: signal<number | null>(null),
  };
  const render = () => {
    TestBed.configureTestingModule({ providers: [{ provide: BattleController, useValue: ctrl }] });
    const f = TestBed.createComponent(BattlePvpBarComponent);
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement };
  };

  it('cuenta atrás para elegir; urgente en los últimos 10 s', () => {
    const { f, el } = render();
    expect(el.querySelector('.timer')?.textContent).toContain('23 s');
    expect(el.querySelector('.timer')?.classList).not.toContain('urgent');
    ctrl.remainingS.set(7);
    f.detectChanges();
    expect(el.querySelector('.timer')?.classList).toContain('urgent');
  });

  it('esperando al rival: lo dice; rival desconectado: aviso con sus segundos', () => {
    ctrl.phase.set('waiting');
    ctrl.opponentAwayS.set(42);
    const { el } = render();
    expect(el.textContent).toContain('Esperando a rivaldemo');
    expect(el.querySelector('[role="status"].away')?.textContent).toContain(
      'rivaldemo se desconectó · 42 s para volver',
    );
  });
});
