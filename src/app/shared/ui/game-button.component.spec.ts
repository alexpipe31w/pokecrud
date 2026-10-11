import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameButtonComponent } from './game-button.component';

describe('GameButtonComponent', () => {
  let fixture: ComponentFixture<GameButtonComponent>;
  beforeEach(() => {
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
    fixture.nativeElement.querySelector('button').click();
    expect(spy).toHaveBeenCalledTimes(1);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
