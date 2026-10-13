import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular';

import { AudioService } from '../../../services/game/audio.service';
import { HapticsService } from '../../../services/game/haptics.service';

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
      providers: [
        provideIonicAngular(),
        { provide: HapticsService, useValue: { tap: vi.fn() } },
        { provide: AudioService, useValue: { playSfx: vi.fn() } },
      ],
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
  it('types are chosen with chips: at most 2, a third one is ignored, tapping again removes it', () => {
    const el = fixture.nativeElement as HTMLElement;
    const chip = (label: string) =>
      [...el.querySelectorAll<HTMLButtonElement>('button.type')].find(
        (b) => b.textContent?.trim() === label,
      )!;
    const value = () =>
      (component as unknown as { form: { controls: { types: { value: string[] } } } }).form.controls
        .types.value;

    expect(el.querySelectorAll('button.type')).toHaveLength(18);
    expect(chip('Eléctrico').getAttribute('aria-pressed')).toBe('true');
    chip('Acero').click();
    fixture.detectChanges();
    expect(value()).toEqual(['electric', 'steel']);
    chip('Fuego').click();
    fixture.detectChanges();
    expect(value()).toEqual(['electric', 'steel']);
    expect(chip('Fuego').disabled).toBe(true);
    chip('Eléctrico').click();
    fixture.detectChanges();
    expect(value()).toEqual(['steel']);
    expect(chip('Fuego').disabled).toBe(false);
  });

  it('uses the game form fields (no Ionic inputs) and a game submit button', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('ion-input, ion-select, ion-item')).toBeNull();
    expect(el.querySelectorAll('input.field__input').length).toBeGreaterThanOrEqual(13);
    expect(el.querySelector('app-game-button button[type="submit"]')).not.toBeNull();
  });
});
