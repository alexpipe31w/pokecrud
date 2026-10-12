import { TestBed } from '@angular/core/testing';
import { PlayerHudComponent } from './player-hud.component';

describe('PlayerHudComponent', () => {
  const render = (inputs: { nickname: string; xp: number; balls?: number | null }) => {
    const fixture = TestBed.createComponent(PlayerHudComponent);
    fixture.componentRef.setInput('nickname', inputs.nickname);
    fixture.componentRef.setInput('xp', inputs.xp);
    if (inputs.balls !== undefined) fixture.componentRef.setInput('balls', inputs.balls);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('nivel y barra salen de la XP con la curva compartida', () => {
    const el = render({ nickname: 'ash', xp: 1500, balls: 35 });
    expect(el.querySelector('.level')?.textContent?.trim()).toBe('2');
    expect(el.querySelector('.avatar')?.textContent?.trim()).toBe('A');
    expect(el.querySelector('.xp__text')?.textContent?.trim()).toBe('500 / 2000 XP');
    expect((el.querySelector('.xp__fill') as HTMLElement).style.transform).toBe('scaleX(0.25)');
    expect(el.querySelector('.balls')?.textContent?.trim()).toBe('35');
    expect(el.getAttribute('aria-label')).toBe('ash, nivel 2, 500 de 2000 XP, 35 bolas');
  });

  it('sin mochila cargada no enseña bolas; en el nivel máximo lo dice', () => {
    const el = render({ nickname: 'red', xp: 9_999_999 });
    expect(el.querySelector('.balls')).toBeNull();
    expect(el.querySelector('.level')?.textContent?.trim()).toBe('40');
    expect(el.querySelector('.xp__text')?.textContent?.trim()).toBe('Nivel máximo');
  });
});
