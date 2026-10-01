import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { PokemonDetailPage } from './pokemon-detail.page';

describe('PokemonDetailPage', () => {
  let fixture: ComponentFixture<PokemonDetailPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokemonDetailPage],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PokemonDetailPage);
    fixture.componentRef.setInput('id', '25');
    fixture.detectChanges();
  });

  it('should show the id received from the route', () => {
    expect(fixture.nativeElement.textContent).toContain('#25');
  });
});
