import { TestBed } from '@angular/core/testing';
import { StarRatingComponent } from './star-rating.component';

describe('StarRatingComponent', () => {
  const render = (value: number, readonly = false) => {
    const f = TestBed.createComponent(StarRatingComponent);
    f.componentRef.setInput('value', value);
    f.componentRef.setInput('readonly', readonly);
    f.detectChanges();
    return { f, el: f.nativeElement as HTMLElement };
  };

  it('5 estrellas como radios accesibles; pulsar la 4ª emite 4', () => {
    const { f, el } = render(2);
    const got: number[] = [];
    f.componentInstance.changed.subscribe((v: number) => got.push(v));
    const stars = [...el.querySelectorAll<HTMLButtonElement>('button[role="radio"]')];
    expect(stars).toHaveLength(5);
    expect(el.querySelector('[role="radiogroup"]')?.getAttribute('aria-label')).toBe('Valoración');
    expect(stars.map((s) => s.getAttribute('aria-checked'))).toEqual([
      'false',
      'true',
      'false',
      'false',
      'false',
    ]);
    expect(stars[3].getAttribute('aria-label')).toBe('4 de 5');
    stars[3].click();
    expect(got).toEqual([4]);
  });

  it('solo lectura: sin botones, con "3 de 5" para el lector', () => {
    const { el } = render(3, true);
    expect(el.querySelector('button')).toBeNull();
    expect(el.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('3 de 5');
    expect(el.querySelectorAll('.on')).toHaveLength(3);
  });
});
