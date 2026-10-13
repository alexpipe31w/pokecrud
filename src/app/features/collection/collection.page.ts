import {
  Component,
  ElementRef,
  OnDestroy,
  afterNextRender,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { CollectionService } from '../../services/game/collection.service';
import { CollectionCardComponent } from './collection-card.component';
import { CollectionFiltersComponent } from './collection-filters.component';

/** Esqueletos que se enseñan mientras llega la primera página. */
const SKELETONS = Array.from({ length: 6 }, (_, i) => i);

/**
 * Mis Pokémon (F3-02b, VISION pilar 3): rejilla paginada de lo capturado, con orden y filtros. Pide más al acercarse
 * al final (IntersectionObserver). Estados diseñados (DISENO §6): cargando, vacía, vacía con filtros y error.
 * Al volver de la ficha no se recarga: la ficha ya cambió la fila en `CollectionService`.
 */
@Component({
  selector: 'app-collection',
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    RouterLink,
    CollectionCardComponent,
    CollectionFiltersComponent,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/mapa" text="Mapa"></ion-back-button>
        </ion-buttons>
        <ion-title>
          Mis Pokémon
          @if (collection.total() !== null) {
            <span class="count">· {{ collection.total() }}</span>
          }
        </ion-title>
        <ion-buttons slot="end">
          <button
            type="button"
            class="filters-btn"
            [class.active]="collection.filtered()"
            aria-haspopup="dialog"
            [attr.aria-expanded]="filtersOpen()"
            (click)="filtersOpen.set(true)"
          >
            Filtros
          </button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      @if (collection.items().length) {
        <div class="grid">
          @for (it of collection.items(); track it.id; let i = $index) {
            <app-collection-card [item]="it" [index]="i % pageSize" />
          }
        </div>
      } @else if (collection.loading()) {
        <div class="grid" aria-busy="true" aria-label="Cargando tu colección">
          @for (s of skeletons; track s) {
            <div class="skeleton"></div>
          }
        </div>
      } @else if (collection.error()) {
        <div class="state">
          <p>{{ collection.error() }}</p>
          <button type="button" class="cta" (click)="collection.load()">Reintentar</button>
        </div>
      } @else if (collection.total() === 0 && collection.filtered()) {
        <div class="state">
          <p class="big">Ningún Pokémon con estos filtros</p>
          <button type="button" class="cta" (click)="collection.clearFilters()">
            Quitar filtros
          </button>
        </div>
      } @else if (collection.total() === 0) {
        <div class="state">
          <div class="ball" aria-hidden="true"></div>
          <p class="big">Aún no has capturado ningún Pokémon</p>
          <p>Sal al mapa: cuando veas uno moverse entre la hierba, tócalo.</p>
          <a class="cta" routerLink="/mapa">Salir a buscar</a>
        </div>
      }

      @if (collection.items().length && collection.error()) {
        <div class="state small">
          <p>{{ collection.error() }}</p>
          <button type="button" class="cta" (click)="collection.loadMore()">Reintentar</button>
        </div>
      }
      <div #sentinel class="sentinel" aria-hidden="true"></div>
      @if (collection.items().length && collection.loading()) {
        <p class="more" role="status">Cargando más…</p>
      }
    </ion-content>

    <app-collection-filters [open]="filtersOpen()" (closed)="filtersOpen.set(false)" />
  `,
  styles: `
    .count {
      color: var(--ink-2);
      font-weight: 500;
    }
    .filters-btn {
      position: relative;
      min-height: 44px;
      padding: 0 var(--s-4);
      border: 0;
      background: none;
      color: var(--ion-color-primary, var(--accent));
      font: 600 1rem/1 system-ui;
    }
    .filters-btn.active::after {
      content: '';
      position: absolute;
      top: 10px;
      right: 8px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--accent);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: var(--s-3);
      padding: var(--s-4);
    }
    @media (min-width: 600px) {
      .grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
    }
    .skeleton {
      height: 168px;
      border-radius: var(--r-card);
      background: linear-gradient(100deg, var(--paper-2) 40%, var(--paper) 50%, var(--paper-2) 60%)
        0 0 / 300% 100%;
      animation: shine 1.4s linear infinite;
    }
    @keyframes shine {
      to {
        background-position: -150% 0;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .skeleton {
        animation: none;
      }
    }
    .state {
      display: grid;
      justify-items: center;
      gap: var(--s-3);
      padding: var(--s-8) var(--s-6);
      text-align: center;
    }
    .state.small {
      padding: var(--s-4);
    }
    .big {
      margin: 0;
      font: 600 1.25rem/1.1 var(--font-display);
    }
    .ball {
      width: 72px;
      height: 72px;
      border: 3px solid var(--ink);
      border-radius: 50%;
      background:
        radial-gradient(circle, var(--paper) 0 9px, var(--ink) 9px 13px, transparent 13px),
        linear-gradient(var(--accent) 45%, var(--ink) 45% 55%, var(--paper) 55%);
    }
    .cta {
      display: inline-grid;
      place-items: center;
      min-height: 44px;
      padding: 0 var(--s-6);
      border: 0;
      border-radius: var(--r-chip);
      background: var(--accent);
      color: var(--accent-ink);
      font: 600 1rem/1 var(--font-display);
      text-decoration: none;
    }
    .sentinel {
      height: 1px;
    }
    .more {
      text-align: center;
      color: var(--ink-2);
    }
  `,
})
export class CollectionPage implements OnDestroy {
  protected readonly collection = inject(CollectionService);
  private readonly sentinel = viewChild.required<ElementRef<HTMLElement>>('sentinel');
  protected readonly filtersOpen = signal(false);
  protected readonly skeletons = SKELETONS;
  protected readonly pageSize = 30;
  private observer?: IntersectionObserver;

  constructor() {
    // Primera vez: cargar. Al volver de la ficha, la lista ya está (y al día).
    if (!this.collection.items().length && !this.collection.loading()) void this.collection.load();
    afterNextRender(() => {
      if (typeof IntersectionObserver === 'undefined') return;
      this.observer = new IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting) && !this.collection.error())
            void this.collection.loadMore();
        },
        { rootMargin: '400px 0px' },
      );
      this.observer.observe(this.sentinel().nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
