import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { GlassPanelComponent } from './glass-panel.component';

@Component({
  imports: [GlassPanelComponent],
  template: `<app-glass-panel size="lg"><p class="inside">Hola</p></app-glass-panel>`,
})
class HostComponent {}

describe('GlassPanelComponent', () => {
  it('proyecta el contenido', () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-glass-panel .inside').textContent).toBe('Hola');
  });

  it('aplica la clase del tamaño (sm por defecto)', () => {
    const host = TestBed.createComponent(HostComponent);
    host.detectChanges();
    expect(host.nativeElement.querySelector('app-glass-panel').classList).toContain('gp--lg');

    const solo = TestBed.createComponent(GlassPanelComponent);
    solo.detectChanges();
    expect(solo.nativeElement.classList).toContain('gp--sm');
  });
});
