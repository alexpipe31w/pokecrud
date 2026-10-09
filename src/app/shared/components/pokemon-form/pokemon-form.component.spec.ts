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

  describe('validaciones', () => {
    const api = () =>
      component as unknown as {
        form: { patchValue(v: object): void; get(path: string): { errors: unknown } | null };
        submit(): void;
      };
    const submitWith = (patch: object) => {
      const emitted: PokemonDraft[] = [];
      component.save.subscribe((p) => emitted.push(p));
      api().form.patchValue(patch);
      api().submit();
      return emitted;
    };

    it('requires a name', () => {
      expect(submitWith({ name: '' })).toHaveLength(0);
      expect(api().form.get('name')?.errors).toMatchObject({ required: true });
    });

    it('requires at least one type', () => {
      expect(submitWith({ types: [] })).toHaveLength(0);
    });

    it('keeps the stats between 1 and 255', () => {
      expect(submitWith({ stats: { hp: 0 } })).toHaveLength(0);
      expect(submitWith({ stats: { hp: 1, attack: 256 } })).toHaveLength(0);
    });

    it('rejects a negative price', () => {
      expect(submitWith({ price: -5 })).toHaveLength(0);
    });

    it('normalizes the data before emitting', () => {
      const [p] = submitWith({
        name: '  PIKACHU ',
        types: ['electric', 'fairy', 'steel'],
        abilities: ' Static ,, Lightning-Rod ',
        stock: 7.9,
      });
      expect(p.name).toBe('pikachu');
      expect(p.types).toEqual(['electric', 'fairy']);
      expect(p.abilities).toEqual(['static', 'lightning-rod']);
      expect(p.stock).toBe(7);
    });
  });
});
