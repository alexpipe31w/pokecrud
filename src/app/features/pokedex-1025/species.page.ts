import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { map } from 'rxjs';
import { POKEMON_TYPES } from '../../core/constants/pokemon-types';
import { spriteUrls } from '../../core/utils/sprites';
import { AudioService } from '../../services/game/audio.service';
import { DatasetService } from '../../services/game/dataset.service';
import { PokedexService } from '../../services/game/pokedex.service';
import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';
import { EvolutionChainComponent } from './evolution-chain.component';
import { FavoriteToggleComponent } from './favorite-toggle.component';
import { SpeciesWeaknessesComponent } from './species-weaknesses.component';

const HABITAT_ES: Record<string, string> = {
  grassland: 'Pradera',
  forest: 'Bosque',
  'waters-edge': 'Orilla',
  mountain: 'Montaña',
  cave: 'Cueva',
  sea: 'Mar',
  urban: 'Ciudad',
  'rough-terrain': 'Terreno agreste',
  rare: 'Raro',
};
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

/**
 * Ficha de una especie de la Pokédex (F3-04): arte, Nº, nombre, categoría, tipos, descripción en español, altura y
 * peso de la especie, hábitat, generación, grito, favorito (F3-06c), debilidades calculadas y cadena evolutiva. Sin ver → solo la silueta
 * (se descubre jugando). Tras abrir la ficha desde otra especie de la cadena, la ruta cambia sin recrear la página.
 */
@Component({
  selector: 'app-species',
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    TypeChipsComponent,
    SpeciesWeaknessesComponent,
    EvolutionChainComponent,
    FavoriteToggleComponent,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/pokedex" text="Pokédex"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ num() }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (species(); as s) {
        <div class="page" [style.--tint]="tint()">
          @if (status() === 'unseen') {
            <div class="hero">
              <img class="silhouette" [src]="art()" alt="" />
              <h1>???</h1>
              <p>Aún no has visto este Pokémon. Sal a buscarlo.</p>
            </div>
          } @else {
            <div class="hero">
              <img [src]="art()" [alt]="s.names.es" width="200" height="200" />
              <h1>{{ s.names.es }}</h1>
              <p class="genus">{{ s.genus }}</p>
              <app-type-chips [types]="s.types" />
              <div class="actions">
                <button type="button" class="cry" (click)="cry(s.id)">🔊 Grito</button>
                <app-favorite-toggle [speciesId]="s.id" [name]="s.name" [label]="s.names.es" />
              </div>
              @if (status() === 'caught') {
                <p class="caught">✓ Capturado</p>
              }
            </div>
            <p class="flavor">{{ s.flavor }}</p>
            <dl class="facts">
              <div>
                <dt>Altura</dt>
                <dd>{{ (s.height / 10).toFixed(1) }} m</dd>
              </div>
              <div>
                <dt>Peso</dt>
                <dd>{{ (s.weight / 10).toFixed(1) }} kg</dd>
              </div>
              <div>
                <dt>Generación</dt>
                <dd>{{ roman(s.generation) }}</dd>
              </div>
              @if (habitat(); as h) {
                <div>
                  <dt>Hábitat</dt>
                  <dd>{{ h }}</dd>
                </div>
              }
            </dl>
            <app-species-weaknesses [types]="s.types" />
            <app-evolution-chain [speciesId]="s.id" />
          }
        </div>
      } @else {
        <p class="missing">No existe esa especie.</p>
      }
    </ion-content>
  `,
  styles: `
    .page {
      min-height: 100%;
      padding: var(--s-4) var(--s-4) var(--s-8);
      background: linear-gradient(
        color-mix(in srgb, var(--tint), transparent 70%),
        transparent 340px
      );
    }
    .hero {
      display: grid;
      justify-items: center;
      gap: var(--s-1);
      text-align: center;
    }
    img {
      width: 200px;
      height: 200px;
      object-fit: contain;
      filter: drop-shadow(0 8px 12px rgb(15 26 43 / 0.3));
    }
    .silhouette {
      filter: brightness(0);
      opacity: 0.25;
    }
    h1 {
      margin: 0;
      font: 700 1.8rem/1.1 var(--font-display);
    }
    .genus,
    .caught {
      margin: 0;
    }
    .caught {
      font-weight: 700;
      color: var(--success);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--s-2);
    }
    .cry {
      min-height: 44px;
      padding: 0 var(--s-4);
      border: 0;
      border-radius: var(--r-chip);
      background: color-mix(in srgb, currentColor 10%, transparent);
      color: inherit;
      font: 600 0.95rem/1 system-ui;
    }
    .flavor {
      margin: var(--s-4) 0;
      line-height: 1.45;
    }
    .facts {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--s-2);
      margin: 0;
    }
    dt {
      font-size: 0.8rem;
      opacity: 0.7;
    }
    dd {
      margin: 0;
      font-weight: 700;
    }
    .missing {
      padding: var(--s-8);
      text-align: center;
    }
  `,
})
export class SpeciesPage {
  private readonly dataset = inject(DatasetService);
  private readonly dex = inject(PokedexService);
  private readonly audio = inject(AudioService);
  private readonly id = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((p) => Number(p.get('id')))),
    { initialValue: 0 },
  );

  protected readonly species = computed(() => this.dataset.species().get(this.id()) ?? null);
  protected readonly status = computed(() => this.dex.statusOf(this.id()));
  protected readonly num = computed(() => `Nº ${String(this.id()).padStart(4, '0')}`);
  protected readonly art = computed(() => spriteUrls(this.id())[0]);
  protected readonly tint = computed(
    () => POKEMON_TYPES[this.species()?.types[0] ?? '']?.color ?? 'var(--ink-2)',
  );
  protected readonly habitat = computed(() => {
    const h = this.species()?.habitat;
    return h ? (HABITAT_ES[h] ?? null) : null;
  });

  constructor() {
    void this.dex.load();
  }

  protected roman(n: number): string {
    return ROMAN[n] ?? String(n);
  }

  protected cry(id: number): void {
    void this.audio.playCry(id);
  }
}
