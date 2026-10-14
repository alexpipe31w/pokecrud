import { CurrencyPipe, TitleCasePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { POKEMON_TYPES } from '../../core/constants/pokemon-types';
import { dexNumber, displayName } from '../../core/utils/pokemon-defaults';
import { spriteUrls } from '../../core/utils/sprites';
import { Pokemon } from '../../models/pokemon.model';
import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';

/** Escalonado de la entrada (como "Mis Pokémon"): 30 ms cada una, como mucho 12 por página de 20. */
const STAGGER_MS = 30;
const STAGGER_MAX = 12;
const PAGE = 20;
const priceFormat = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/**
 * Tarjeta de un Pokémon del inventario (F3-06a): teñida con su tipo, arte grande, número, nombre, tipos, precio en
 * dorado y stock ("Agotado" en rojo y el arte en gris si 0). Toda la tarjeta enlaza a su ficha `/pokemon/:id`.
 */
@Component({
  selector: 'app-inventory-card',
  imports: [CurrencyPipe, TitleCasePipe, RouterLink, TypeChipsComponent],
  template: `
    @let p = pokemon();
    <a
      class="inv-card"
      [class.out]="p.stock === 0"
      [routerLink]="['/pokemon', p.id]"
      [attr.aria-label]="label()"
      [style.--tint]="tint()"
      [style.animation-delay.ms]="delay()"
    >
      <span class="dex" aria-hidden="true">{{ dex() }}</span>
      <span class="stock" aria-hidden="true">
        {{ p.stock === 0 ? 'Agotado' : p.stock + ' en stock' }}
      </span>
      <img
        [src]="urls()[0]"
        alt=""
        width="96"
        height="96"
        loading="lazy"
        decoding="async"
        (error)="nextArt($event)"
      />
      <span class="name" aria-hidden="true">{{ p.name | titlecase }}</span>
      <app-type-chips [types]="p.types" aria-hidden="true" />
      <span class="price" aria-hidden="true">{{
        p.price | currency: 'COP' : 'symbol-narrow' : '1.0-0'
      }}</span>
    </a>
  `,
  styleUrl: 'inventory-card.component.scss',
})
export class InventoryCardComponent {
  readonly pokemon = input.required<Pokemon>();
  /** Posición en la lista (para escalonar la entrada). */
  readonly index = input(0);

  protected readonly urls = computed(() => spriteUrls(this.pokemon().id));
  protected readonly dex = computed(() => dexNumber(this.pokemon().id));
  protected readonly tint = computed(
    () => POKEMON_TYPES[this.pokemon().types[0] ?? '']?.color ?? 'var(--ink-2)',
  );
  protected readonly delay = computed(
    () => Math.min(this.index() % PAGE, STAGGER_MAX) * STAGGER_MS,
  );
  protected readonly label = computed(() => {
    const p = this.pokemon();
    const stock = p.stock === 0 ? 'agotado' : `${p.stock} en stock`;
    return `${displayName(p.name)}, ${this.dex()}, ${priceFormat.format(p.price)}, ${stock}`;
  });

  /** Arte que falla → el siguiente (`home` → `official-artwork` → sprite). */
  protected nextArt(event: Event): void {
    const img = event.target as HTMLImageElement;
    const urls = this.urls();
    const next = urls[urls.indexOf(img.src) + 1];
    if (next) img.src = next;
  }
}
