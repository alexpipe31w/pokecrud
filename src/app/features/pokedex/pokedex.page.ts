import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonFab,
  IonFabButton,
  IonHeader,
  IonIcon,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  InfiniteScrollCustomEvent,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSpinner,
  IonText,
  IonThumbnail,
  IonToolbar,
  RefresherCustomEvent,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, createOutline, trashOutline } from 'ionicons/icons';
import { finalize } from 'rxjs';

import { POKEDEX_PAGE_SIZE } from '../../core/constants/app.constants';
import { POKEMON_TYPES, POKEMON_TYPE_KEYS } from '../../core/constants/pokemon-types';
import { dexNumber, displayName, spriteUrl } from '../../core/utils/pokemon-defaults';
import { Pokemon } from '../../models/pokemon.model';
import { filterRefs } from '../../services/poke-api.service';
import { PokemonService } from '../../services/pokemon.service';
import { UiService } from '../../services/ui.service';
import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';

/** Deja solo los Pokémon que tienen el tipo indicado; sin tipo devuelve la lista completa (HU-14). */
export function filterByType<T extends Pick<Pokemon, 'types'>>(
  list: T[],
  type: string | null,
): T[] {
  return type ? list.filter((p) => p.types.includes(type)) : list;
}

/** Listado de los Pokémon guardados en la base de datos (IS-11 · HU-03, HU-14). */
@Component({
  selector: 'app-pokedex',
  templateUrl: 'pokedex.page.html',
  styleUrl: 'pokedex.page.scss',
  imports: [
    CurrencyPipe,
    TitleCasePipe,
    IonHeader,
    IonToolbar,
    IonContent,
    IonSearchbar,
    IonList,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonThumbnail,
    IonLabel,
    IonNote,
    IonIcon,
    IonFab,
    IonFabButton,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
    IonSpinner,
    IonText,
    IonButton,
    TypeChipsComponent,
  ],
})
export class PokedexPage {
  private readonly pokemonService = inject(PokemonService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  protected readonly pokemon = signal<Pokemon[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly term = signal('');
  /** Tipo elegido en el filtro; `null` = todos (HU-14). */
  protected readonly type = signal<string | null>(null);

  /** Cuántos Pokémon se muestran: 20 al inicio y 20 más con cada scroll (HU-03). */
  protected readonly shown = signal(POKEDEX_PAGE_SIZE);

  /** Tipos que tiene al menos un Pokémon guardado, en el orden de POKEMON_TYPES. */
  protected readonly availableTypes = computed(() => {
    const present = new Set(this.pokemon().flatMap((p) => p.types));
    return POKEMON_TYPE_KEYS.filter((t) => present.has(t));
  });

  protected readonly filtered = computed(() =>
    filterByType(filterRefs(this.pokemon(), this.term()), this.type()),
  );
  protected readonly visible = computed(() => this.filtered().slice(0, this.shown()));
  protected readonly hasMore = computed(() => this.shown() < this.filtered().length);

  protected readonly dexNumber = dexNumber;
  protected readonly spriteUrl = spriteUrl;
  protected readonly types = POKEMON_TYPES;

  constructor() {
    addIcons({ add, createOutline, trashOutline });
    // Carga inicial y recarga automática cuando se agrega, edita o elimina un Pokémon.
    effect(() => {
      this.pokemonService.version();
      untracked(() => this.load());
    });
  }

  protected load(refresher?: RefresherCustomEvent): void {
    if (!refresher) this.loading.set(true);
    this.error.set(null);
    this.pokemonService
      .getAll()
      .pipe(
        finalize(() => {
          this.loading.set(false);
          refresher?.target.complete();
        }),
      )
      .subscribe({
        next: (list) => this.pokemon.set(list),
        error: () =>
          this.error.set(
            'No se pudo conectar con la base de datos. ¿Está corriendo «npm run api»?',
          ),
      });
  }

  protected loadMore(event: InfiniteScrollCustomEvent): void {
    this.shown.update((n) => n + POKEDEX_PAGE_SIZE);
    event.target.complete();
  }

  protected onSearch(event: Event): void {
    this.shown.set(POKEDEX_PAGE_SIZE);
    this.term.set((event as CustomEvent<{ value?: string | null }>).detail.value ?? '');
  }

  /** Elige un tipo; tocar el tipo ya elegido quita el filtro. */
  protected selectType(type: string | null): void {
    this.shown.set(POKEDEX_PAGE_SIZE);
    this.type.set(type === this.type() ? null : type);
  }

  protected open(p: Pokemon): void {
    this.router.navigate(['/pokemon', p.id]);
  }

  protected edit(p: Pokemon, sliding: IonItemSliding): void {
    sliding.close();
    this.router.navigate(['/pokemon', p.id, 'editar']);
  }

  protected async remove(p: Pokemon, sliding: IonItemSliding): Promise<void> {
    await sliding.close();
    const ok = await this.ui.confirm(
      'Eliminar Pokémon',
      `¿Seguro que quieres eliminar a ${displayName(p.name)} (${dexNumber(p.id)})?`,
    );
    if (!ok) return;
    this.pokemonService.delete(p.id).subscribe({
      next: () => this.ui.toast(`${displayName(p.name)} eliminado`),
      // El interceptor de errores ya muestra el mensaje.
      error: () => undefined,
    });
  }

  protected add(): void {
    this.router.navigate(['/pokemon/nuevo']);
  }
}
