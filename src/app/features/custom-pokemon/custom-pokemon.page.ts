import { Component, computed, inject, signal } from '@angular/core';
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
import { CustomPokemonService } from '../../services/game/custom-pokemon.service';
import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';

/**
 * Mis Pokémon personalizados (F3-06c, `/customPokemon` del curso): tarjetas con su imagen (o silueta si no tiene o no
 * carga), nombre, tipos y el total de sus stats; tocar una abre su editor. Vacía diseñada.
 */
@Component({
  selector: 'app-custom-pokemon',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    TypeChipsComponent,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/mapa" text="Mapa"></ion-back-button>
        </ion-buttons>
        <ion-title>Personalizados</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="page">
        @if (custom.error(); as e) {
          <p class="state">{{ e }}</p>
        } @else if (cards(); as list) {
          <ul class="grid">
            @for (m of list; track m.id) {
              <li>
                <a class="mon" [routerLink]="['/personalizados', m.id]" [style.--tint]="m.tint">
                  @if (m.imageUrl && !broken().has(m.id)) {
                    <img [src]="m.imageUrl" alt="" loading="lazy" (error)="markBroken(m.id)" />
                  } @else {
                    <span class="silhouette" aria-hidden="true">?</span>
                  }
                  <strong>{{ m.name }}</strong>
                  <app-type-chips [types]="m.types" />
                  <span class="total">Total {{ m.total }}</span>
                </a>
              </li>
            } @empty {
              <li class="state">
                <span class="silhouette big" aria-hidden="true">?</span>
                <h2>Inventa tu propio Pokémon</h2>
                <p>Ponle nombre, tipos, estadísticas y una imagen.</p>
                <a class="cta" routerLink="/personalizados/nuevo">Crear Pokémon</a>
              </li>
            }
          </ul>
        } @else {
          <p class="state" role="status">Cargando…</p>
        }
      </div>
      @if (cards()?.length) {
        <a class="cta new" slot="fixed" routerLink="/personalizados/nuevo">+ Nuevo</a>
      }
    </ion-content>
  `,
  styleUrl: 'custom-pokemon.page.scss',
})
export class CustomPokemonPage implements ViewWillEnter {
  protected readonly custom = inject(CustomPokemonService);
  /** Ids cuya imagen no cargó (se ve la silueta). */
  protected readonly broken = signal<ReadonlySet<number>>(new Set());

  protected readonly cards = computed(() =>
    this.custom.list()?.map((m) => ({
      ...m,
      total: m.stats.hp + m.stats.attack + m.stats.defense + m.stats.speed,
      tint: POKEMON_TYPES[m.types[0] ?? '']?.color ?? 'var(--ink-2)',
    })),
  );

  ionViewWillEnter(): void {
    void this.custom.load();
  }

  protected markBroken(id: number): void {
    this.broken.update((s) => new Set([...s, id]));
  }
}
