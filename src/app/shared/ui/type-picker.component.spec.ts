import { TestBed } from '@angular/core/testing';
import { TypePickerComponent } from './type-picker.component';

describe('TypePickerComponent', () => {
  it('18 tipos en español; hasta 2: añade, quita y deshabilita el resto cuando está lleno', () => {
    const f = TestBed.createComponent(TypePickerComponent);
    f.componentRef.setInput('value', ['fire']);
    f.detectChanges();
    const got: string[][] = [];
    f.componentInstance.changed.subscribe((v: string[]) => got.push(v));
    const el = f.nativeElement as HTMLElement;
    const chip = (label: string) =>
      [...el.querySelectorAll<HTMLButtonElement>('button.type')].find(
        (b) => b.textContent?.trim() === label,
      )!;
    expect(el.querySelectorAll('button.type')).toHaveLength(18);
    expect(chip('Fuego').getAttribute('aria-pressed')).toBe('true');
    chip('Volador').click();
    expect(got.at(-1)).toEqual(['fire', 'flying']);
    f.componentRef.setInput('value', ['fire', 'flying']);
    f.detectChanges();
    expect(chip('Agua').disabled).toBe(true);
    chip('Fuego').click();
    expect(got.at(-1)).toEqual(['flying']);
  });
});
