import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PokedexPage } from './pokedex.page';

describe('PokedexPage', () => {
  let fixture: ComponentFixture<PokedexPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PokedexPage);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
