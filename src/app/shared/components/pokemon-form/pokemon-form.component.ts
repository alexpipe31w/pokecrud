import { Component, computed, effect, inject, input, output } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { POKEMON_TYPES, POKEMON_TYPE_KEYS } from '../../../core/constants/pokemon-types';
import { dexNumber } from '../../../core/utils/pokemon-defaults';
import { PokemonDraft } from '../../../models/pokemon.model';
import { GameButtonComponent } from '../../ui/game-button.component';

/** Un Pokémon tiene como mucho 2 tipos. */
const MAX_TYPES = 2;

/** Campos de stats que se muestran en el formulario. */
const STAT_FIELDS = [
  { key: 'hp', label: 'PS' },
  { key: 'attack', label: 'Ataque' },
  { key: 'defense', label: 'Defensa' },
  { key: 'specialAttack', label: 'At. Esp.' },
  { key: 'specialDefense', label: 'Def. Esp.' },
  { key: 'speed', label: 'Velocidad' },
] as const;

/**
 * Formulario de un Pokémon. Se usa para agregar (prellenado con PokéAPI)
 * y para editar (prellenado con la base de datos). Con los campos del juego (`forms.scss`) y los tipos como chips
 * táctiles de máx. 2 (F3-06a); la forma del formulario y lo que emite no cambian.
 */
@Component({
  selector: 'app-pokemon-form',
  templateUrl: 'pokemon-form.component.html',
  styleUrl: 'pokemon-form.component.scss',
  imports: [ReactiveFormsModule, GameButtonComponent],
})
export class PokemonFormComponent {
  /** Datos con los que se rellena el formulario. */
  readonly initial = input.required<PokemonDraft>();
  readonly submitLabel = input('Guardar');
  readonly saving = input(false);
  readonly save = output<PokemonDraft>();

  protected readonly typeKeys = POKEMON_TYPE_KEYS;
  protected readonly types = POKEMON_TYPES;
  protected readonly statFields = STAT_FIELDS;
  protected readonly dexNumber = dexNumber;
  /** Color del tipo principal del Pokémon (fondo del arte). */
  protected readonly tint = computed(
    () => POKEMON_TYPES[this.initial().types[0] ?? '']?.color ?? 'var(--ink-2)',
  );

  private readonly fb = inject(NonNullableFormBuilder);

  private readonly stat = () =>
    this.fb.control(1, [Validators.required, Validators.min(1), Validators.max(255)]);

  protected readonly form = this.fb.group({
    name: this.fb.control('', [Validators.required, Validators.maxLength(30)]),
    types: this.fb.control<string[]>([], [Validators.required]),
    abilities: this.fb.control(''),
    imageUrl: this.fb.control(''),
    height: this.fb.control(0, [Validators.required, Validators.min(0)]),
    weight: this.fb.control(0, [Validators.required, Validators.min(0)]),
    baseExperience: this.fb.control(0, [Validators.required, Validators.min(0)]),
    price: this.fb.control(0, [Validators.required, Validators.min(0)]),
    stock: this.fb.control(0, [Validators.required, Validators.min(0)]),
    stats: this.fb.group({
      hp: this.stat(),
      attack: this.stat(),
      defense: this.stat(),
      specialAttack: this.stat(),
      specialDefense: this.stat(),
      speed: this.stat(),
    }),
  });

  constructor() {
    effect(() => {
      const p = this.initial();
      this.form.reset({ ...p, abilities: p.abilities.join(', ') });
    });
  }

  protected isType(key: string): boolean {
    return this.form.controls.types.value.includes(key);
  }

  protected typesFull(): boolean {
    return this.form.controls.types.value.length >= MAX_TYPES;
  }

  /** Pulsar un tipo lo añade (si quedan huecos) o lo quita. */
  protected toggleType(key: string): void {
    const control = this.form.controls.types;
    const current = control.value;
    if (current.includes(key)) control.setValue(current.filter((t) => t !== key));
    else if (current.length < MAX_TYPES) control.setValue([...current, key]);
    control.markAsTouched();
  }

  protected invalid(path: string): boolean {
    const control = this.form.get(path);
    return !!control && control.invalid && (control.touched || control.dirty);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    const types = v.types.slice(0, MAX_TYPES);
    this.save.emit({
      ...this.initial(),
      ...v,
      name: v.name.trim().toLowerCase(),
      types,
      abilities: v.abilities
        .split(',')
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean),
      height: Number(v.height),
      weight: Number(v.weight),
      baseExperience: Number(v.baseExperience),
      price: Number(v.price),
      stock: Math.trunc(Number(v.stock)),
      stats: {
        hp: Number(v.stats.hp),
        attack: Number(v.stats.attack),
        defense: Number(v.stats.defense),
        specialAttack: Number(v.stats.specialAttack),
        specialDefense: Number(v.stats.specialDefense),
        speed: Number(v.stats.speed),
      },
    });
  }
}
