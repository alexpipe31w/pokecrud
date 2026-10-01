import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FavoritesPage } from './favorites.page';

describe('FavoritesPage', () => {
  let fixture: ComponentFixture<FavoritesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(FavoritesPage);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
