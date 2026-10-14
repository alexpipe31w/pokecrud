import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular';

import { POKEMON_TYPES } from '../../core/constants/pokemon-types';
import { spriteUrls } from '../../core/utils/sprites';
import { DatasetService } from '../../services/game/dataset.service';
import { FavoritesService } from '../../services/game/favorites.service';
import { StarRatingComponent } from '../../shared/ui/star-rating.component';

/**
 * Mis favoritos (F3-06c, `/favorites` del curso): especies marcadas desde su ficha de la Pokédex, con su valoración y
 * su nota; tocar una abre la ficha (allí se edita o se quita). Vacía que manda a la Pokédex.
 */
@Component({
  selector: 'app-favorites',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    StarRatingComponent,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/mapa" text="Mapa"></ion-back-button>
        </ion-buttons>
        <ion-title>Favoritos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="page">
        @if (favorites.error(); as e) {
          <p class="state">{{ e }}</p>
        } @else if (cards(); as list) {
          @if (list.length) {
            <p class="count">
              {{ list.length }} {{ list.length === 1 ? 'favorito' : 'favoritos' }}
            </p>
          }
          @for (f of list; track f.id) {
            <a class="fav" [routerLink]="['/pokedex', f.pokemonId]" [style.--tint]="f.tint">
              <img [src]="f.art" alt="" width="72" height="72" loading="lazy" />
              <span class="body">
                <strong>{{ f.name }}</strong>
                <app-star-rating [value]="f.rating" [readonly]="true" />
                @if (f.note) {
                  <span class="note">{{ f.note }}</span>
                }
              </span>
            </a>
          } @empty {
            <div class="state">
              <span class="heart" aria-hidden="true">♡</span>
              <h2>Aún no tienes favoritos</h2>
              <p>Abre un Pokémon en la Pokédex y pulsa «Favorito».</p>
              <a class="cta" routerLink="/pokedex">Ir a la Pokédex</a>
            </div>
          }
        } @else {
          <p class="state" role="status">Cargando tus favoritos…</p>
        }
      </div>
    </ion-content>
  `,
  styleUrl: 'favorites.page.scss',
})
export class FavoritesPage implements ViewWillEnter {
  protected readonly favorites = inject(FavoritesService);
  private readonly dataset = inject(DatasetService);

  protected readonly cards = computed(() =>
    this.favorites.favorites()?.map((f) => {
      const s = this.dataset.species().get(f.pokemonId);
      return {
        ...f,
        name: s?.names.es ?? f.pokemonName,
        art: spriteUrls(f.pokemonId)[0],
        tint: POKEMON_TYPES[s?.types[0] ?? '']?.color ?? 'var(--ink-2)',
      };
    }),
  );

  ionViewWillEnter(): void {
    void this.favorites.load();
  }
}
