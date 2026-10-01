import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MyPokemonPage } from './my-pokemon.page';

describe('MyPokemonPage', () => {
  let fixture: ComponentFixture<MyPokemonPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MyPokemonPage);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
