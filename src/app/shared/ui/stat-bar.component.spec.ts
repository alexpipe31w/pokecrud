import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatBarComponent } from './stat-bar.component';

describe('StatBarComponent', () => {
  let fixture: ComponentFixture<StatBarComponent>;
  const fill = (): HTMLElement => fixture.nativeElement.querySelector('.sb__fill');

  beforeEach(() => {
    fixture = TestBed.createComponent(StatBarComponent);
    fixture.componentRef.setInput('label', 'Ataque');
  });

  it('escala la barra con scaleX(value/max) y muestra el número', () => {
    fixture.componentRef.setInput('value', 128);
    fixture.detectChanges();
    expect(fill().style.transform).toBe(`scaleX(${128 / 255})`);
    expect(fixture.nativeElement.textContent).toContain('Ataque');
    expect(fixture.nativeElement.textContent).toContain('128');
  });

  it('nunca pasa de 1 aunque el valor supere el máximo', () => {
    fixture.componentRef.setInput('value', 300);
    fixture.detectChanges();
    expect(fill().style.transform).toBe('scaleX(1)');
  });
});
