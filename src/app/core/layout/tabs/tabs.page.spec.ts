import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TabsPage } from './tabs.page';

describe('TabsPage', () => {
  let fixture: ComponentFixture<TabsPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TabsPage);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('does not show the hidden sections (Equipos, Favoritos, Mis Pokémon)', () => {
    expect(fixture.nativeElement.querySelectorAll('ion-tab-button').length).toBe(0);
  });
});
