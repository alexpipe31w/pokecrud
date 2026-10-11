import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';

import { PokemonDraft } from '../../../models/pokemon.model';
import { PokemonFormComponent } from './pokemon-form.component';

const PIKACHU: PokemonDraft = {
  id: 25,
  name: 'pikachu',
  types: ['electric'],
  abilities: ['static', 'lightning-rod'],
  imageUrl: '',
  height: 0.4,
  weight: 6,
  baseExperience: 112,
  stats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
  price: 11200,
  stock: 30,
};

describe('PokemonFormComponent', () => {
  let fixture: ComponentFixture<PokemonFormComponent>;
  let component: PokemonFormComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PokemonFormComponent],
      providers: [provideIonicAngular()],
    }).compileComponents();

    fixture = TestBed.createComponent(PokemonFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('initial', PIKACHU);
    fixture.detectChanges();
  });

  it('is prefilled with the initial data', () => {
    const form = (component as unknown as { form: { getRawValue(): Record<string, unknown> } })
      .form;
    expect(form.getRawValue()).toMatchObject({
      name: 'pikachu',
      abilities: 'static, lightning-rod',
      price: 11200,
      stock: 30,
    });
  });

  it('emits the edited pokemon on submit', () => {
    const emitted: PokemonDraft[] = [];
    component.save.subscribe((p) => emitted.push(p));
    const form = (component as unknown as { form: { patchValue(v: object): void } }).form;
    form.patchValue({ price: 50000, abilities: 'Static' });
    (component as unknown as { submit(): void }).submit();

    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toMatchObject({ id: 25, price: 50000, abilities: ['static'] });
  });

  it('does not emit when a field is invalid', () => {
    const emitted: PokemonDraft[] = [];
    component.save.subscribe((p) => emitted.push(p));
    const form = (component as unknown as { form: { patchValue(v: object): void } }).form;
    form.patchValue({ stock: -1 });
    (component as unknown as { submit(): void }).submit();

    expect(emitted).toHaveLength(0);
  });
});
