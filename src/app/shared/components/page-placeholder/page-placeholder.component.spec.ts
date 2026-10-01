import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PagePlaceholderComponent } from './page-placeholder.component';

describe('PagePlaceholderComponent', () => {
  let fixture: ComponentFixture<PagePlaceholderComponent>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PagePlaceholderComponent);
    fixture.componentRef.setInput('title', 'Pokédex');
    fixture.componentRef.setInput('issue', 'IS-11');
    fixture.detectChanges();
  });

  it('should show the title and the issue', () => {
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Pokédex');
    expect(text).toContain('IS-11');
  });
});
