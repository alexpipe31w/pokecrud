import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import { GameButtonComponent } from './game-button.component';

describe('GameButtonComponent', () => {
  let fixture: ComponentFixture<GameButtonComponent>;
  const haptics = { tap: vi.fn() };
  const audio = { playSfx: vi.fn(() => Promise.resolve()) };
  const button = (): HTMLButtonElement => fixture.nativeElement.querySelector('button');
  const pointerDown = () => button().dispatchEvent(new Event('pointerdown'));

  beforeEach(() => {
    haptics.tap.mockClear();
    audio.playSfx.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: HapticsService, useValue: haptics },
        { provide: AudioService, useValue: audio },
      ],
    });
    fixture = TestBed.createComponent(GameButtonComponent);
    fixture.componentRef.setInput('label', 'Lanzar');
    fixture.detectChanges();
  });

  it('muestra la etiqueta', () => {
    expect(fixture.nativeElement.textContent).toContain('Lanzar');
  });

  it('emite pressed al hacer clic y no si está deshabilitado', () => {
    const spy = vi.fn();
    fixture.componentInstance.pressed.subscribe(spy);
    button().click();
    expect(spy).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    button().click();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('al apretar (pointerdown) vibra y suena el clic', () => {
    pointerDown();
    expect(haptics.tap).toHaveBeenCalledTimes(1);
    expect(audio.playSfx).toHaveBeenCalledWith('tap');
  });

  it('deshabilitado no da feedback', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    pointerDown();
    expect(haptics.tap).not.toHaveBeenCalled();
    expect(audio.playSfx).not.toHaveBeenCalled();
  });
});
