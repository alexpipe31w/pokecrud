import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  InfiniteScrollCustomEvent,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
  RefresherCustomEvent,
} from '@ionic/angular';
import { finalize } from 'rxjs';

import { POKEDEX_PAGE_SIZE } from '../../core/constants/app.constants';
import { POKEMON_TYPES } from '../../core/constants/pokemon-types';
import { dexNumber, displayName } from '../../core/utils/pokemon-defaults';
import { spriteUrls } from '../../core/utils/sprites';
import { Pokemon } from '../../models/pokemon.model';
import { filterRefs } from '../../services/poke-api.service';
import { PokemonService } from '../../services/pokemon.service';
import { AuthService } from '../../core/auth/auth.service';
import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';
import { GameButtonComponent } from '../../shared/ui/game-button.component';

/** Escalonado de la entrada de las tarjetas (como "Mis Pokémon"): 30 ms cada una, como mucho 12. */
const STAGGER_MS = 30;
const STAGGER_MAX = 12;
const priceFormat = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Inventario de la tienda (IS-11 · HU-03), con el sistema de diseño del juego (F3-06a): rejilla de tarjetas teñidas
 * con el tipo, precio y stock destacados ("Agotado" si 0), buscador y scroll infinito de 20 en 20. Editar y eliminar
 * están en la ficha (`/pokemon/:id`); "Agregar" solo para ADMIN (D-023), que el servidor exige igualmente.
 */
@Component({
  selector: 'app-inventory',
  templateUrl: 'inventory.page.html',
  styleUrl: 'inventory.page.scss',
  imports: [
    CurrencyPipe,
    TitleCasePipe,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInfiniteScroll,
    IonInfiniteScrollContent,
    IonRefresher,
    IonRefresherContent,
    TypeChipsComponent,
    GameButtonComponent,
  ],
})
export class InventoryPage {
  private readonly pokemonService = inject(PokemonService);
  /** Solo un ADMIN ve agregar/editar/eliminar (F0-12); el servidor lo exige igualmente. */
  protected readonly isAdmin = inject(AuthService).isAdmin;
  private readonly router = inject(Router);

  protected readonly pokemon = signal<Pokemon[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly term = signal('');

  /** Cuántos Pokémon se muestran: 20 al inicio y 20 más con cada scroll (HU-03). */
  protected readonly shown = signal(POKEDEX_PAGE_SIZE);

  protected readonly filtered = computed(() => filterRefs(this.pokemon(), this.term()));
  protected readonly visible = computed(() => this.filtered().slice(0, this.shown()));
  protected readonly hasMore = computed(() => this.shown() < this.filtered().length);

  protected readonly dexNumber = dexNumber;

  constructor() {
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
        error: () => this.error.set('No se pudo cargar el inventario.'),
      });
  }

  protected loadMore(event: InfiniteScrollCustomEvent): void {
    this.shown.update((n) => n + POKEDEX_PAGE_SIZE);
    event.target.complete();
  }

  protected onSearch(value: string): void {
    this.shown.set(POKEDEX_PAGE_SIZE);
    this.term.set(value);
  }

  protected art(id: number): string {
    return spriteUrls(id)[0];
  }

  /** Arte que falla → el siguiente de la lista (`home` → `official-artwork` → sprite). */
  protected nextArt(event: Event, id: number): void {
    const img = event.target as HTMLImageElement;
    const urls = spriteUrls(id);
    const next = urls[urls.indexOf(img.src) + 1];
    if (next) img.src = next;
  }

  protected tint(p: Pokemon): string {
    return POKEMON_TYPES[p.types[0] ?? '']?.color ?? 'var(--ink-2)';
  }

  protected delay(index: number): number {
    return Math.min(index % POKEDEX_PAGE_SIZE, STAGGER_MAX) * STAGGER_MS;
  }

  protected label(p: Pokemon): string {
    const stock = p.stock === 0 ? 'agotado' : `${p.stock} en stock`;
    return `${displayName(p.name)}, ${dexNumber(p.id)}, ${priceFormat.format(p.price)}, ${stock}`;
  }

  protected add(): void {
    this.router.navigate(['/pokemon/nuevo']);
  }
}
