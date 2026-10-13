import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import type { CollectionDetail, CollectionItem } from '@shared/protocol/collection';
import { POKEMON_TYPES } from '../../core/constants/pokemon-types';
import { spriteUrls } from '../../core/utils/sprites';
import { sizeClass } from '../../game/encounter-scene/encounter-layout';
import { AudioService } from '../../services/game/audio.service';
import { CollectionService } from '../../services/game/collection.service';
import { DatasetService } from '../../services/game/dataset.service';
import { HapticsService } from '../../services/game/haptics.service';
import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';
import { DetailMovesComponent } from './detail-moves.component';
import { DetailOriginComponent } from './detail-origin.component';
import { DetailStatsComponent } from './detail-stats.component';
import { RenameSheetComponent } from './rename-sheet.component';
import { TransferService } from './transfer.service';

/**
 * Ficha del individuo (F3-03, `/coleccion/:id`): arte y grito, PC, mote, favorito, tipos, tamaño y peso reales,
 * valoración de IVs, stats, naturaleza, movimientos, dónde y cuándo se capturó, renombrar y transferir con deshacer.
 * Teñida con el color de su tipo principal (DISENO §1). Mientras llega el detalle enseña lo que ya tenía la lista.
 */
@Component({
  selector: 'app-collection-detail',
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    TypeChipsComponent,
    DetailStatsComponent,
    DetailMovesComponent,
    DetailOriginComponent,
    RenameSheetComponent,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/coleccion" text="Mis Pokémon"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ title() }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div class="page" [style.--tint]="tint()">
        @if (head(); as h) {
          <header class="hero">
            <img [src]="art()" [alt]="speciesName()" width="200" height="200" (error)="nextArt()" />
            <p class="cp"><small>PC</small> {{ h.cp }}</p>
            <div class="name-row">
              <h1>{{ title() }}</h1>
              <button
                type="button"
                class="icon"
                aria-label="Cambiar mote"
                (click)="renaming.set(true)"
              >
                ✎
              </button>
              <button
                type="button"
                class="icon fav"
                [attr.aria-pressed]="h.favorite"
                [attr.aria-label]="h.favorite ? 'Quitar de favoritos' : 'Marcar como favorito'"
                (click)="toggleFavorite(h)"
              >
                {{ h.favorite ? '★' : '☆' }}
              </button>
            </div>
            @if (h.nickname) {
              <p class="species">{{ speciesName() }}</p>
            }
            <app-type-chips [types]="types()" />
            <p class="facts">
              Nv. {{ h.level }}
              @if (h.gender) {
                · {{ h.gender === 'M' ? '♂' : '♀' }}
              }
              @if (h.shiny) {
                · <span class="shiny">✦ Shiny</span>
              }
              @if (measures(); as m) {
                · {{ m }}
              }
            </p>
            @if (detail(); as d) {
              <p class="candy">{{ d.candy.qty }} caramelos de {{ familyName() }}</p>
            }
          </header>
        }

        @if (detail(); as d) {
          <app-detail-stats [ivs]="d.ivs" [stats]="d.stats" [nature]="d.nature" />
          <app-detail-moves [moves]="d.moves" />
          <app-detail-origin
            [caughtAt]="d.caughtAt"
            [ball]="d.ball"
            [lat]="d.caughtLat"
            [lng]="d.caughtLng"
          />

          @if (!confirming()) {
            <button type="button" class="danger" (click)="confirming.set(true)">
              Transferir · +1 caramelo
            </button>
          } @else {
            <div class="confirm" role="alertdialog" aria-label="Confirmar transferencia">
              <p>¿Transferir a {{ title() }}? Recibirás 1 caramelo de {{ familyName() }}.</p>
              <div class="row">
                <button type="button" class="plain" (click)="confirming.set(false)">
                  Cancelar
                </button>
                <button type="button" class="danger" (click)="transfer(d)">Transferir</button>
              </div>
            </div>
          }
        } @else if (error(); as e) {
          <div class="state">
            <p>{{ e }}</p>
            <button type="button" class="plain" (click)="load()">Reintentar</button>
          </div>
        } @else {
          <p class="state" role="status">Cargando la ficha…</p>
        }
        @if (notice(); as n) {
          <p class="notice" role="alert">{{ n }}</p>
        }
      </div>
    </ion-content>

    <app-rename-sheet
      [open]="renaming()"
      [nickname]="head()?.nickname ?? null"
      [speciesName]="speciesName()"
      [busy]="saving()"
      (saved)="rename($event)"
      (closed)="renaming.set(false)"
    />
  `,
  styles: `
    .page {
      min-height: 100%;
      padding: var(--s-4) var(--s-4) var(--s-8);
      background: linear-gradient(
        color-mix(in srgb, var(--tint), transparent 70%),
        transparent 360px
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
      animation: in 320ms var(--ease-out) both;
    }
    @keyframes in {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
    }
    .cp {
      margin: 0;
      font: 700 2rem/1 var(--font-display);
      letter-spacing: -0.02em;
    }
    .cp small {
      font-size: 1rem;
    }
    .name-row {
      display: flex;
      align-items: center;
      gap: var(--s-1);
    }
    h1 {
      margin: 0;
      font: 700 1.6rem/1.1 var(--font-display);
    }
    .icon {
      min-width: 44px;
      min-height: 44px;
      border: 0;
      background: none;
      color: inherit;
      font-size: 1.3rem;
    }
    .fav {
      color: var(--gold);
    }
    .species,
    .facts,
    .candy {
      margin: 0;
    }
    .shiny {
      color: var(--gold);
      font-weight: 700;
    }
    .candy {
      font-weight: 700;
    }
    .danger,
    .plain {
      min-height: 48px;
      padding: 0 var(--s-6);
      border: 0;
      border-radius: var(--r-chip);
      font: 600 1rem/1 var(--font-display);
    }
    .danger {
      width: 100%;
      margin-top: var(--s-6);
      background: var(--danger);
      color: var(--accent-ink);
    }
    .plain {
      background: color-mix(in srgb, currentColor 10%, transparent);
      color: inherit;
    }
    .confirm .row {
      display: flex;
      gap: var(--s-2);
    }
    .confirm .danger {
      margin-top: 0;
    }
    .state,
    .notice {
      text-align: center;
    }
  `,
})
export class CollectionDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly collection = inject(CollectionService);
  private readonly dataset = inject(DatasetService);
  private readonly audio = inject(AudioService);
  private readonly haptics = inject(HapticsService);
  private readonly transfers = inject(TransferService);

  private readonly id = this.route.snapshot.paramMap.get('id') ?? '';
  protected readonly detail = signal<CollectionDetail | null>(null);
  protected readonly error = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly renaming = signal(false);
  protected readonly saving = signal(false);
  protected readonly confirming = signal(false);
  private readonly artIndex = signal(0);
  /** Lo que ya tenía la lista mientras llega el detalle (cabecera inmediata). */
  private readonly fromList = computed(
    () => this.collection.items().find((i) => i.id === this.id) ?? null,
  );
  protected readonly head = computed<CollectionItem | null>(() => this.detail() ?? this.fromList());

  private readonly species = computed(() => {
    const h = this.head();
    return h ? this.dataset.species().get(h.speciesId) : undefined;
  });
  protected readonly speciesName = computed(
    () => this.species()?.names.es ?? `#${this.head()?.speciesId ?? ''}`,
  );
  protected readonly title = computed(() => this.head()?.nickname ?? this.speciesName());
  protected readonly types = computed(() => this.species()?.types ?? []);
  protected readonly tint = computed(
    () => POKEMON_TYPES[this.types()[0] ?? '']?.color ?? 'var(--ink-2)',
  );
  protected readonly art = computed(() => {
    const h = this.head();
    return h ? (spriteUrls(h.speciesId, h.shiny)[this.artIndex()] ?? '') : '';
  });
  /** Altura y peso reales × XS/XL (como en el encuentro; el peso escala lineal, D-049). */
  protected readonly measures = computed(() => {
    const s = this.species();
    const d = this.detail();
    if (!s || !d) return null;
    const m = ((s.height / 10) * d.heightScale).toFixed(2);
    const kg = ((s.weight / 10) * d.heightScale).toFixed(1);
    const cls = sizeClass(d.heightScale);
    return `${m} m · ${kg} kg${cls ? ` · ${cls}` : ''}`;
  });
  protected readonly familyName = computed(() => {
    const d = this.detail();
    if (!d) return '';
    const first = [...this.dataset.species().values()].find(
      (s) => s.evolutionChainId === d.candy.familyId && s.evolvesFrom === null,
    );
    return first?.names.es ?? this.speciesName();
  });

  constructor() {
    void this.load();
  }

  protected async load(): Promise<void> {
    this.error.set(null);
    try {
      const d = await this.collection.detail(this.id);
      this.detail.set(d);
      void this.audio.playCry(d.speciesId);
    } catch (err) {
      const status = (err as { status?: number }).status;
      this.error.set(
        status === 404 ? 'Este Pokémon ya no está en tu colección.' : 'No se pudo cargar la ficha.',
      );
    }
  }

  protected nextArt(): void {
    this.artIndex.update((i) => i + 1);
  }

  protected async toggleFavorite(h: CollectionItem): Promise<void> {
    this.haptics.tap();
    const favorite = !h.favorite;
    this.applyLocal({ favorite });
    try {
      await this.collection.patch(this.id, { favorite });
    } catch {
      this.applyLocal({ favorite: !favorite });
      this.flash('No se pudo guardar el favorito.');
    }
  }

  protected async rename(nickname: string | null): Promise<void> {
    this.saving.set(true);
    try {
      const item = await this.collection.patch(this.id, { nickname });
      this.applyLocal({ nickname: item.nickname });
      this.renaming.set(false);
      this.haptics.tap();
    } catch {
      this.flash('No se pudo cambiar el mote.');
    } finally {
      this.saving.set(false);
    }
  }

  protected transfer(d: CollectionDetail): void {
    this.haptics.tap();
    this.transfers.start(d, this.title());
    void this.router.navigateByUrl('/coleccion');
  }

  private applyLocal(patch: Partial<CollectionItem>): void {
    this.detail.update((d) => (d ? { ...d, ...patch } : d));
    this.collection.patchItem(this.id, patch);
  }

  private flash(text: string): void {
    this.notice.set(text);
    setTimeout(() => this.notice.set(null), 3000);
  }
}
