import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { spriteUrls } from '../../core/utils/sprites';
import { DatasetService } from '../../services/game/dataset.service';
import { PokedexService } from '../../services/game/pokedex.service';

const GENERATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
const TOTAL = 1025;
const GEN_KEY = 'pokecrud.pokedex.gen';

const readGen = (): number => {
  try {
    const n = Number(localStorage.getItem(GEN_KEY));
    return GENERATIONS.includes(n) ? n : 1;
  } catch {
    return 1; // almacenamiento bloqueado: la primera generación
  }
};

/**
 * Pokédex de las 1025 especies (F3-04, VISION pilar 3): por generación, cada especie sin ver (silueta, "???"), vista
 * (arte en color) o capturada (arte + Poké Ball). Lo visto/capturado viene de `GET /pokedex`; lo demás del dataset.
 */
@Component({
  selector: 'app-pokedex',
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, RouterLink],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/mapa" text="Mapa"></ion-back-button>
        </ion-buttons>
        <ion-title>Pokédex</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <p class="totals">
        <strong>{{ dex.caughtCount() }}</strong> capturados · {{ dex.seenCount() }} vistos · de
        {{ total }}
      </p>
      <nav class="gens" aria-label="Generación">
        @for (g of gens(); track g.n) {
          <button
            type="button"
            [attr.aria-pressed]="gen() === g.n"
            [attr.aria-label]="
              'Generación ' + g.roman + ': ' + g.caught + ' de ' + g.size + ' capturados'
            "
            (click)="pick(g.n)"
          >
            {{ g.roman }}<small>{{ g.caught }}/{{ g.size }}</small>
          </button>
        }
      </nav>

      @if (dex.error(); as e) {
        <div class="state">
          <p>{{ e }}</p>
          <button type="button" class="retry" (click)="dex.load()">Reintentar</button>
        </div>
      } @else {
        <ul class="grid" [attr.aria-busy]="!dex.loaded()">
          @for (s of list(); track s.id) {
            <li>
              @if (status(s.id) === 'unseen') {
                <div class="cell unseen" [attr.aria-label]="'Nº ' + s.id + ', sin ver'">
                  <img
                    [src]="art(s.id)"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    (error)="fallback($event, s.id)"
                  />
                  <span class="num">{{ num(s.id) }}</span>
                  <span class="name">???</span>
                </div>
              } @else {
                <a
                  class="cell"
                  [routerLink]="['/pokedex', s.id]"
                  [attr.aria-label]="
                    'Nº ' +
                    s.id +
                    ', ' +
                    s.name +
                    (status(s.id) === 'caught' ? ', capturado' : ', visto')
                  "
                >
                  <img
                    [src]="art(s.id)"
                    alt=""
                    loading="lazy"
                    decoding="async"
                    (error)="fallback($event, s.id)"
                  />
                  <span class="num">{{ num(s.id) }}</span>
                  <span class="name">{{ s.name }}</span>
                  @if (status(s.id) === 'caught') {
                    <span class="ball" aria-hidden="true"></span>
                  }
                </a>
              }
            </li>
          }
        </ul>
      }
    </ion-content>
  `,
  styles: `
    .totals {
      margin: var(--s-4) var(--s-4) var(--s-2);
      font-variant-numeric: tabular-nums;
    }
    .gens {
      display: flex;
      gap: var(--s-2);
      overflow-x: auto;
      padding: 0 var(--s-4) var(--s-2);
    }
    .gens button {
      display: grid;
      flex: none;
      min-width: 52px;
      min-height: 44px;
      border: 0;
      border-radius: var(--r-card);
      background: color-mix(in srgb, currentColor 10%, transparent);
      color: inherit;
      font: 700 1rem/1.1 var(--font-display);
    }
    .gens small {
      font: 500 0.7rem/1 system-ui;
      opacity: 0.75;
    }
    .gens [aria-pressed='true'] {
      background: var(--accent);
      color: var(--accent-ink);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: var(--s-2);
      margin: 0;
      padding: var(--s-2) var(--s-4) var(--s-8);
      list-style: none;
    }
    .cell {
      position: relative;
      display: grid;
      justify-items: center;
      padding: var(--s-2);
      border-radius: var(--r-card);
      background: color-mix(in srgb, currentColor 6%, transparent);
      color: inherit;
      text-decoration: none;
    }
    img {
      width: 72px;
      height: 72px;
      object-fit: contain;
    }
    .unseen img {
      filter: brightness(0);
      opacity: 0.22;
    }
    .num {
      font: 600 0.75rem/1 system-ui;
      font-variant-numeric: tabular-nums;
      opacity: 0.7;
    }
    .name {
      max-width: 100%;
      overflow: hidden;
      font-size: 0.85rem;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .ball {
      position: absolute;
      top: 6px;
      right: 6px;
      width: 14px;
      height: 14px;
      border: 2px solid var(--ink);
      border-radius: 50%;
      background: linear-gradient(var(--accent) 45%, var(--ink) 45% 55%, var(--paper) 55%);
    }
    .state {
      text-align: center;
    }
    .retry {
      min-height: 44px;
      padding: 0 var(--s-6);
      border: 0;
      border-radius: var(--r-chip);
      background: var(--accent);
      color: var(--accent-ink);
    }
  `,
})
export class PokedexPage {
  protected readonly dex = inject(PokedexService);
  private readonly dataset = inject(DatasetService);
  protected readonly total = TOTAL;
  protected readonly gen = signal(readGen());

  private readonly all = computed(() =>
    [...this.dataset.species().values()]
      .map((s) => ({ id: s.id, name: s.names.es, generation: s.generation }))
      .sort((a, b) => a.id - b.id),
  );
  protected readonly list = computed(() => this.all().filter((s) => s.generation === this.gen()));
  protected readonly gens = computed(() =>
    GENERATIONS.map((n) => {
      const inGen = this.all().filter((s) => s.generation === n);
      return {
        n,
        roman: ROMAN[n],
        size: inGen.length,
        caught: inGen.filter((s) => this.dex.statusOf(s.id) === 'caught').length,
      };
    }),
  );

  constructor() {
    void this.dex.load();
  }

  protected status(id: number) {
    return this.dex.statusOf(id);
  }

  protected art(id: number): string {
    return spriteUrls(id)[0];
  }

  /** Si el arte no carga, el siguiente de la lista (CLAUDE.md: no todas las especies tienen `home`). */
  protected fallback(ev: Event, id: number): void {
    const img = ev.target as HTMLImageElement;
    const urls = spriteUrls(id);
    const i = urls.indexOf(img.src);
    if (i >= 0 && i < urls.length - 1) img.src = urls[i + 1];
  }

  protected num(id: number): string {
    return `Nº ${String(id).padStart(4, '0')}`;
  }

  protected pick(n: number): void {
    this.gen.set(n);
    try {
      localStorage.setItem(GEN_KEY, String(n));
    } catch {
      // sin almacenamiento: no se recuerda, no pasa nada
    }
  }
}
