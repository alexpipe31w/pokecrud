import { Component, computed, inject, input, signal } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  NavController,
  ViewWillEnter,
} from '@ionic/angular';
import type { CustomStats } from '@shared/protocol/course';

import { POKEMON_TYPES } from '../../core/constants/pokemon-types';
import { CustomPokemonService } from '../../services/game/custom-pokemon.service';
import { ConfirmPanelComponent } from '../../shared/ui/confirm-panel.component';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { StatBarComponent } from '../../shared/ui/stat-bar.component';
import { TypePickerComponent } from '../../shared/ui/type-picker.component';

/** Límites del DTO del servidor (`/customPokemon`). */
const NAME_MAX = 30;
const TEXT_MAX = 500;
const STAT_MIN = 1;
const STAT_MAX = 255;
const STAT_DEFAULT = 50;
const URL_OK = /^https?:\/\/\S+$/i;

const STAT_FIELDS: { key: keyof CustomStats; label: string }[] = [
  { key: 'hp', label: 'PS' },
  { key: 'attack', label: 'Ataque' },
  { key: 'defense', label: 'Defensa' },
  { key: 'speed', label: 'Velocidad' },
];

/**
 * Crear o editar un Pokémon personalizado (F3-06c, `/customPokemon` del curso sin cambios): nombre, 1-2 tipos con
 * chips, las 4 stats con deslizadores y su barra, URL de imagen con vista previa (si no carga → silueta) y
 * descripción. Borrar pide confirmación. Que salgan como spawns del grupo es un extra de F7.
 */
@Component({
  selector: 'app-custom-editor',
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    GameButtonComponent,
    ConfirmPanelComponent,
    StatBarComponent,
    TypePickerComponent,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/personalizados" text="Personalizados"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ editId() ? 'Editar Pokémon' : 'Nuevo Pokémon' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="page form" [style.--tint]="tint()">
        <div class="preview">
          @if (showImage()) {
            <img [src]="imageUrl().trim()" alt="" (error)="imgFailed.set(true)" />
          } @else {
            <span class="silhouette" aria-hidden="true">?</span>
          }
          <strong class="title">{{ name().trim() || 'Tu Pokémon' }}</strong>
        </div>

        <div class="field">
          <label class="field__label" for="cp-name">Nombre</label>
          <input
            #n
            id="cp-name"
            class="field__input"
            [value]="name()"
            [attr.maxlength]="nameMax"
            autocomplete="off"
            (input)="name.set(n.value)"
          />
        </div>

        <div class="field" role="group" aria-labelledby="cp-types">
          <span class="field__label" id="cp-types">Tipos (1 o 2)</span>
          <app-type-picker [value]="types()" (changed)="types.set($event)" />
        </div>

        <fieldset class="group">
          <legend>Estadísticas</legend>
          @for (s of statFields; track s.key) {
            <div class="stat">
              <app-stat-bar
                [attr.data-key]="s.key"
                [label]="s.label"
                [value]="stats()[s.key]"
                [color]="tint()"
              />
              <input
                #r
                type="range"
                [id]="'cp-' + s.key"
                [min]="statMin"
                [max]="statMax"
                [value]="stats()[s.key]"
                [attr.aria-label]="s.label"
                (input)="setStat(s.key, r.value)"
              />
            </div>
          }
        </fieldset>

        <div class="field">
          <label class="field__label" for="cp-image">URL de la imagen (opcional)</label>
          <input
            #u
            id="cp-image"
            class="field__input"
            type="url"
            inputmode="url"
            autocomplete="off"
            placeholder="https://…"
            [value]="imageUrl()"
            [attr.aria-invalid]="!urlOk()"
            (input)="setUrl(u.value)"
          />
          @if (!urlOk()) {
            <p class="field__error">Escribe una URL que empiece por http:// o https://</p>
          }
        </div>

        <div class="field">
          <label class="field__label" for="cp-desc">Descripción (opcional)</label>
          <textarea
            #d
            id="cp-desc"
            class="field__input text"
            rows="3"
            [attr.maxlength]="textMax"
            [value]="description()"
            (input)="description.set(d.value)"
          ></textarea>
        </div>

        @if (notice(); as m) {
          <p class="field__error" role="alert">{{ m }}</p>
        }
        <app-game-button
          label="Guardar Pokémon"
          [block]="true"
          [disabled]="!canSave()"
          [loading]="saving()"
          (pressed)="save()"
        />
        @if (editId()) {
          @if (confirming()) {
            <app-confirm-panel
              label="Confirmar borrado"
              [message]="'¿Borrar a ' + name().trim() + '?'"
              confirmLabel="Borrar"
              [danger]="true"
              [busy]="saving()"
              (confirmed)="remove()"
              (cancelled)="confirming.set(false)"
            />
          } @else {
            <app-game-button
              label="Borrar Pokémon"
              variant="glass"
              [block]="true"
              (pressed)="confirming.set(true)"
            />
          }
        }
      </div>
    </ion-content>
  `,
  styleUrl: 'custom-editor.page.scss',
})
export class CustomEditorPage implements ViewWillEnter {
  /** `:id` de `/personalizados/:id` (no existe en `/personalizados/nuevo`). */
  readonly id = input<string>();

  private readonly custom = inject(CustomPokemonService);
  private readonly nav = inject(NavController);

  protected readonly statFields = STAT_FIELDS;
  protected readonly nameMax = NAME_MAX;
  protected readonly textMax = TEXT_MAX;
  protected readonly statMin = STAT_MIN;
  protected readonly statMax = STAT_MAX;

  protected readonly name = signal('');
  protected readonly types = signal<string[]>([]);
  protected readonly stats = signal<CustomStats>(defaultStats());
  protected readonly imageUrl = signal('');
  protected readonly description = signal('');
  protected readonly imgFailed = signal(false);
  protected readonly saving = signal(false);
  protected readonly confirming = signal(false);
  protected readonly notice = signal<string | null>(null);

  protected readonly editId = computed(() => {
    const n = Number(this.id());
    return Number.isInteger(n) && n > 0 ? n : null;
  });
  protected readonly urlOk = computed(() => {
    const u = this.imageUrl().trim();
    return u === '' || URL_OK.test(u);
  });
  protected readonly showImage = computed(
    () => this.imageUrl().trim() !== '' && this.urlOk() && !this.imgFailed(),
  );
  protected readonly tint = computed(
    () => POKEMON_TYPES[this.types()[0] ?? '']?.color ?? 'var(--ink-2)',
  );
  protected readonly canSave = computed(() => {
    const n = this.name().trim().length;
    return n >= 1 && n <= NAME_MAX && this.types().length >= 1 && this.urlOk() && !this.saving();
  });

  async ionViewWillEnter(): Promise<void> {
    this.confirming.set(false);
    this.notice.set(null);
    this.imgFailed.set(false);
    const id = this.editId();
    if (id === null) {
      this.name.set('');
      this.types.set([]);
      this.stats.set(defaultStats());
      this.imageUrl.set('');
      this.description.set('');
      return;
    }
    if (!this.custom.list()) await this.custom.load();
    const m = this.custom.byId(id);
    if (!m) {
      this.notice.set('Ese Pokémon ya no existe.');
      return;
    }
    this.name.set(m.name);
    this.types.set([...m.types]);
    this.stats.set({ ...m.stats });
    this.imageUrl.set(m.imageUrl);
    this.description.set(m.description);
  }

  protected setStat(key: keyof CustomStats, raw: string): void {
    const v = Math.min(STAT_MAX, Math.max(STAT_MIN, Math.round(Number(raw)) || STAT_MIN));
    this.stats.update((s) => ({ ...s, [key]: v }));
  }

  protected setUrl(value: string): void {
    this.imageUrl.set(value);
    this.imgFailed.set(false);
  }

  protected async save(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.notice.set(null);
    const input = {
      name: this.name().trim(),
      types: this.types(),
      stats: this.stats(),
      imageUrl: this.imageUrl().trim(),
      description: this.description().trim(),
    };
    try {
      const id = this.editId();
      if (id === null) await this.custom.create(input);
      else await this.custom.update(id, input);
      this.nav.navigateBack('/personalizados');
    } catch {
      this.notice.set('No se pudo guardar el Pokémon.');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const id = this.editId();
    if (id === null) return;
    this.saving.set(true);
    try {
      await this.custom.remove(id);
      this.nav.navigateBack('/personalizados');
    } catch {
      this.confirming.set(false);
      this.notice.set('No se pudo borrar el Pokémon.');
    } finally {
      this.saving.set(false);
    }
  }
}

function defaultStats(): CustomStats {
  return { hp: STAT_DEFAULT, attack: STAT_DEFAULT, defense: STAT_DEFAULT, speed: STAT_DEFAULT };
}
