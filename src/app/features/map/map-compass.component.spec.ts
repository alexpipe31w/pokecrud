import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HapticsService } from '../../services/game/haptics.service';
import { MapCompassComponent } from './map-compass.component';

describe('MapCompassComponent', () => {
  let fixture: ComponentFixture<MapCompassComponent>;
  const haptics = { tap: vi.fn() };
  const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');

  beforeEach(() => {
    haptics.tap.mockClear();
    TestBed.configureTestingModule({ providers: [{ provide: HapticsService, useValue: haptics }] });
    fixture = TestBed.createComponent(MapCompassComponent);
    fixture.detectChanges();
  });

  it('la aguja gira al revés que la cámara (apunta al norte de la pantalla)', () => {
    fixture.componentRef.setInput('heading', 90);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('svg').style.transform).toBe('rotate(-90deg)');
  });

  it('al tocarla avisa (alternar) con háptico, y dice su estado al lector de pantalla', () => {
    const toggle = vi.fn();
    fixture.componentInstance.toggle.subscribe(toggle);
    button().dispatchEvent(new Event('pointerdown'));
    button().click();
    expect(haptics.tap).toHaveBeenCalled();
    expect(toggle).toHaveBeenCalledTimes(1);
    expect(button().getAttribute('aria-label')).toContain('sigue tu orientación');
    fixture.componentRef.setInput('northUp', true);
    fixture.detectChanges();
    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(button().getAttribute('aria-label')).toContain('norte arriba');
  });
});
