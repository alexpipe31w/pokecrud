import { TestBed } from '@angular/core/testing';
import { HpBarComponent } from './hp-bar.component';

function render(current: number, max = 100): HTMLElement {
  const fixture = TestBed.createComponent(HpBarComponent);
  fixture.componentRef.setInput('current', current);
  fixture.componentRef.setInput('max', max);
  fixture.detectChanges();
  return fixture.nativeElement.querySelector('.hp__fill');
}

describe('HpBarComponent', () => {
  it('verde por encima del 50 %', () => {
    expect(render(80).style.background).toBe('var(--success)');
    expect(render(51).style.background).toBe('var(--success)');
  });

  it('amarillo entre el 20 % y el 50 %', () => {
    expect(render(50).style.background).toBe('var(--gold)');
    expect(render(35).style.background).toBe('var(--gold)');
    expect(render(20).style.background).toBe('var(--gold)');
  });

  it('rojo por debajo del 20 %', () => {
    expect(render(10).style.background).toBe('var(--danger)');
  });

  it('escala con transform y se queda en [0, 1]', () => {
    expect(render(30, 60).style.transform).toBe('scaleX(0.5)');
    expect(render(-5).style.transform).toBe('scaleX(0)');
    expect(render(150).style.transform).toBe('scaleX(1)');
  });
});
