import { Component, computed, inject, input, signal } from '@angular/core';
import { FavoritesService } from '../../services/game/favorites.service';
import { HapticsService } from '../../services/game/haptics.service';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { StarRatingComponent } from '../../shared/ui/star-rating.component';

/** Nota: máx. 500 caracteres (DTO del servidor). */
const NOTE_MAX = 500;

/**
 * Favorito de una especie en su ficha de la Pokédex (F3-06c, `/favorites` del curso): botón "♡ Favorito" / "♥ Favorito
 * ★★★" que abre una hoja con la valoración (1-5 estrellas táctiles) y una nota; guardar crea o actualiza, y se puede
 * quitar.
 */
@Component({
  selector: 'app-favorite-toggle',
  imports: [GameButtonComponent, StarRatingComponent],
  host: { '(document:keydown.escape)': 'open.set(false)' },
  template: `
    <button
      type="button"
      class="fav-btn"
      [class.is-fav]="!!current()"
      [attr.aria-pressed]="!!current()"
      (click)="openSheet()"
    >
      <span class="heart" aria-hidden="true">{{ current() ? '♥' : '♡' }}</span> Favorito
      @if (current(); as c) {
        <app-star-rating [value]="c.rating" [readonly]="true" />
      }
    </button>

    <div
      class="backdrop"
      [class.is-open]="open()"
      (click)="open.set(false)"
      aria-hidden="true"
    ></div>
    <div
      class="sheet"
      role="dialog"
      [attr.aria-label]="'Favorito: ' + title()"
      [class.is-open]="open()"
      [attr.inert]="open() ? null : ''"
    >
      <h2>{{ title() }} en favoritos</h2>
      <app-star-rating [value]="rating()" (changed)="rating.set($event)" />
      <label class="field__label" for="fav-note">Nota (opcional)</label>
      <textarea
        #n
        id="fav-note"
        class="field__input note"
        rows="3"
        [attr.maxlength]="noteMax"
        [value]="note()"
        placeholder="¿Por qué te gusta?"
        (input)="note.set(n.value)"
      ></textarea>
      @if (error(); as e) {
        <p class="field__error" role="alert">{{ e }}</p>
      }
      <app-game-button
        label="Guardar"
        [block]="true"
        [disabled]="rating() < 1"
        [loading]="busy()"
        (pressed)="save()"
      />
      @if (current()) {
        <button type="button" class="plain" [disabled]="busy()" (click)="remove()">
          Quitar de favoritos
        </button>
      }
    </div>
  `,
  styleUrl: 'favorite-toggle.component.scss',
})
export class FavoriteToggleComponent {
  private readonly favorites = inject(FavoritesService);
  private readonly haptics = inject(HapticsService);

  readonly speciesId = input.required<number>();
  /** Nombre de PokéAPI (`charizard`): es lo que guarda el contrato del curso. */
  readonly name = input.required<string>();
  /** Nombre para enseñar (español); si no, el de PokéAPI. */
  readonly label = input('');

  protected readonly noteMax = NOTE_MAX;
  protected readonly open = signal(false);
  protected readonly rating = signal(0);
  protected readonly note = signal('');
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly current = computed(() => this.favorites.of(this.speciesId()));
  protected readonly title = computed(() => this.label() || this.name());

  constructor() {
    if (this.favorites.favorites() === null) void this.favorites.load();
  }

  protected openSheet(): void {
    this.haptics.tap();
    const c = this.current();
    this.rating.set(c?.rating ?? 0);
    this.note.set(c?.note ?? '');
    this.error.set(null);
    this.open.set(true);
  }

  protected async save(): Promise<void> {
    if (this.rating() < 1) return;
    this.busy.set(true);
    try {
      await this.favorites.save({
        pokemonId: this.speciesId(),
        pokemonName: this.name(),
        rating: this.rating(),
        note: this.note().trim(),
      });
      this.haptics.success();
      this.open.set(false);
    } catch {
      this.error.set('No se pudo guardar el favorito.');
    } finally {
      this.busy.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const c = this.current();
    if (!c) return;
    this.busy.set(true);
    try {
      await this.favorites.remove(c.id);
      this.open.set(false);
    } catch {
      this.error.set('No se pudo quitar de favoritos.');
    } finally {
      this.busy.set(false);
    }
  }
}
