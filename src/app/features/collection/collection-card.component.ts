import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { CollectionItem } from '@shared/protocol/collection';
import { POKEMON_TYPES } from '../../core/constants/pokemon-types';
import { spriteUrls } from '../../core/utils/sprites';
import { DatasetService } from '../../services/game/dataset.service';

/** Retardo de la entrada escalonada (DISENO §4.9: 30-50 ms), con tope para que la página 2 no espere 1 s. */
export const STAGGER_MS = 40;
const STAGGER_MAX = 12;

/**
 * Tarjeta de un Pokémon de "Mis Pokémon" (F3-02b): arte, mote o nombre, PC, nivel, favorito y brillo si es shiny.
 * Tintada con el color de su tipo principal (DISENO §1). Toda la tarjeta es el enlace a su ficha (F3-03).
 */
@Component({
  selector: 'app-collection-card',
  imports: [RouterLink],
  template: `
    <a
      class="card"
      [class.shiny]="item().shiny"
      [routerLink]="['/coleccion', item().id]"
      [attr.aria-label]="label()"
      [style.--tint]="tint()"
      [style.animation-delay.ms]="delay()"
    >
      <span class="cp" aria-hidden="true"><small>PC</small> {{ item().cp }}</span>
      @if (item().favorite) {
        <span class="fav" aria-hidden="true">★</span>
      }
      <img [src]="src()" alt="" loading="lazy" decoding="async" (error)="nextArt()" />
      <span class="name" aria-hidden="true">{{ title() }}</span>
      <span class="level" aria-hidden="true">Nv. {{ item().level }}</span>
    </a>
  `,
  styles: `
    :host {
      display: block;
    }
    .card {
      position: relative;
      display: grid;
      justify-items: center;
      gap: var(--s-1);
      min-height: 44px;
      padding: var(--s-3) var(--s-2) var(--s-3);
      border-radius: var(--r-card);
      background:
        radial-gradient(
          circle at 50% 38%,
          color-mix(in srgb, var(--tint), white 35%),
          transparent 70%
        ),
        color-mix(in srgb, var(--tint), var(--paper) 70%);
      color: var(--ink);
      text-decoration: none;
      box-shadow: var(--shadow-sm);
      animation: enter 220ms var(--ease-out) both;
      transition: transform var(--dur-press) var(--ease-out);
    }
    .card:active {
      transform: scale(0.97);
    }
    .card:focus-visible {
      outline: 3px solid var(--accent);
      outline-offset: 2px;
    }
    .shiny {
      box-shadow:
        0 0 0 2px var(--gold),
        0 0 16px color-mix(in srgb, var(--gold), transparent 40%);
    }
    img {
      width: 96px;
      height: 96px;
      object-fit: contain;
      filter: drop-shadow(0 4px 6px rgb(15 26 43 / 0.25));
    }
    .cp {
      font: 700 1.15rem/1 var(--font-display);
      letter-spacing: -0.02em;
    }
    .cp small {
      font-size: 0.7rem;
    }
    .fav {
      position: absolute;
      top: var(--s-2);
      right: var(--s-3);
      color: var(--gold);
      text-shadow: 0 1px 2px rgb(15 26 43 / 0.4);
    }
    .name {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
    .level {
      font-size: 0.8rem;
      color: var(--ink-2);
      font-variant-numeric: tabular-nums;
    }
    @keyframes enter {
      from {
        opacity: 0;
        transform: translateY(8px) scale(0.97);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      @keyframes enter {
        from {
          opacity: 0;
        }
      }
    }
  `,
})
export class CollectionCardComponent {
  private readonly dataset = inject(DatasetService);
  readonly item = input.required<CollectionItem>();
  /** Posición en la página (para escalonar la entrada). */
  readonly index = input(0);

  private readonly artIndex = signal(0);
  private readonly species = computed(() => this.dataset.species().get(this.item().speciesId));
  protected readonly speciesName = computed(
    () => this.species()?.names.es ?? `#${this.item().speciesId}`,
  );
  protected readonly title = computed(() => this.item().nickname ?? this.speciesName());
  protected readonly tint = computed(
    () => POKEMON_TYPES[this.species()?.types[0] ?? '']?.color ?? 'var(--ink-2)',
  );
  protected readonly src = computed(
    () => spriteUrls(this.item().speciesId, this.item().shiny)[this.artIndex()] ?? '',
  );
  protected readonly delay = computed(() => Math.min(this.index(), STAGGER_MAX) * STAGGER_MS);
  protected readonly label = computed(() => {
    const i = this.item();
    const name = i.nickname ? `${i.nickname} (${this.speciesName()})` : this.speciesName();
    return [
      name,
      `PC ${i.cp}`,
      `nivel ${i.level}`,
      ...(i.shiny ? ['shiny'] : []),
      ...(i.favorite ? ['favorito'] : []),
    ].join(', ');
  });

  protected nextArt(): void {
    const urls = spriteUrls(this.item().speciesId, this.item().shiny);
    if (this.artIndex() < urls.length - 1) this.artIndex.update((n) => n + 1);
  }
}
