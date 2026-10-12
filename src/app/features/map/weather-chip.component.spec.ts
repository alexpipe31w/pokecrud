import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WeatherChipComponent } from './weather-chip.component';

describe('WeatherChipComponent', () => {
  let fixture: ComponentFixture<WeatherChipComponent>;
  const set = (weather: string | null, night = false) => {
    fixture.componentRef.setInput('weather', weather);
    fixture.componentRef.setInput('night', night);
    fixture.detectChanges();
  };
  const text = (): string => fixture.nativeElement.textContent.trim();
  /** `[name]` es una propiedad del elemento ion-icon, no un atributo. */
  const icon = (): string | null =>
    (fixture.nativeElement.querySelector('ion-icon') as { name?: string } | null)?.name ?? null;

  beforeEach(() => {
    fixture = TestBed.createComponent(WeatherChipComponent);
  });

  it('sin datos no muestra nada (nunca "undefined")', () => {
    set(null);
    expect(text()).toBe('');
    set('tornado');
    expect(text()).toBe('');
  });

  it('muestra el clima en español con su icono', () => {
    set('rain');
    expect(text()).toBe('Lluvia');
    expect(icon()).toBe('rainy-outline');
  });

  it('despejado: sol de día y luna de noche', () => {
    set('clear');
    expect(icon()).toBe('sunny-outline');
    set('clear', true);
    expect(icon()).toBe('moon-outline');
    expect(text()).toBe('Despejado');
  });
});
