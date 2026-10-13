import { TestBed } from '@angular/core/testing';
import { SearchFieldComponent } from './search-field.component';

describe('SearchFieldComponent', () => {
  it('has an accessible label and emits what is typed', () => {
    const f = TestBed.createComponent(SearchFieldComponent);
    f.componentRef.setInput('label', 'Buscar en el inventario');
    f.componentRef.setInput('placeholder', 'Número o nombre');
    f.detectChanges();
    const typed: string[] = [];
    f.componentInstance.query.subscribe((v: string) => typed.push(v));

    const input = (f.nativeElement as HTMLElement).querySelector('input')!;
    expect(input.labels?.[0]?.textContent).toContain('Buscar en el inventario');
    expect(input.placeholder).toBe('Número o nombre');
    input.value = 'pika';
    input.dispatchEvent(new Event('input'));
    expect(typed).toEqual(['pika']);
  });
});
