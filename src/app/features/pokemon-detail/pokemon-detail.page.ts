import { CurrencyPipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  NavController,
  ViewWillEnter,
} from '@ionic/angular';
import { catchError, of } from 'rxjs';

import { POKEMON_TYPES } from '../../core/constants/pokemon-types';
import { dexNumber, displayName } from '../../core/utils/pokemon-defaults';
import { spriteUrls } from '../../core/utils/sprites';
import { Pokemon, PokemonStats } from '../../models/pokemon.model';
import { PokeApiService } from '../../services/poke-api.service';
import { PokemonService } from '../../services/pokemon.service';
import { AuthService } from '../../core/auth/auth.service';
import { UiService } from '../../services/ui.service';
import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { StatBarComponent } from '../../shared/ui/stat-bar.component';

const STAT_LABELS: { key: keyof PokemonStats; label: string }[] = [
  { key: 'hp', label: 'PS' },
  { key: 'attack', label: 'Ataque' },
  { key: 'defense', label: 'Defensa' },
  { key: 'specialAttack', label: 'At. Esp.' },
  { key: 'specialDefense', label: 'Def. Esp.' },
  { key: 'speed', label: 'Velocidad' },
];

/**
 * Detalle de un Pokémon del inventario (IS-12 · HU-04) con el sistema de diseño (F3-06a): teñido con su tipo, precio y
 * stock destacados, barras de stats del juego y, para ADMIN, editar y eliminar con una confirmación propia.
 */
@Component({
  selector: 'app-pokemon-detail',
  templateUrl: 'pokemon-detail.page.html',
  styleUrl: 'pokemon-detail.page.scss',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    TitleCasePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    TypeChipsComponent,
    GameButtonComponent,
    StatBarComponent,
  ],
})
export class PokemonDetailPage implements ViewWillEnter {
  /** Parámetro `:id` de la ruta `/pokemon/:id` (llega por `withComponentInputBinding`). */
  readonly id = input<string>();

  private readonly pokemonService = inject(PokemonService);
  private readonly pokeApi = inject(PokeApiService);
  private readonly ui = inject(UiService);
  /** Solo un ADMIN ve agregar/editar/eliminar (F0-12); el servidor lo exige igualmente. */
  protected readonly isAdmin = inject(AuthService).isAdmin;
  private readonly router = inject(Router);
  private readonly navCtrl = inject(NavController);

  protected readonly pokemon = signal<Pokemon | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  /** `null` mientras carga; texto vacío si PokéAPI no responde. */
  protected readonly description = signal<string | null>(null);

  protected readonly confirming = signal(false);
  protected readonly deleting = signal(false);
  protected readonly notice = signal<string | null>(null);
  /** Si la imagen guardada falla: el arte de PokéAPI (`home` → `official-artwork` → sprite). */
  private readonly artIndex = signal(-1);

  protected readonly statLabels = STAT_LABELS;
  protected readonly dexNumber = dexNumber;
  protected readonly tint = computed(
    () => POKEMON_TYPES[this.pokemon()?.types[0] ?? '']?.color ?? 'var(--ink-2)',
  );
  protected readonly art = computed(() => {
    const p = this.pokemon();
    if (!p) return '';
    const i = this.artIndex();
    return i < 0 && p.imageUrl ? p.imageUrl : (spriteUrls(p.id)[Math.max(0, i)] ?? '');
  });

  ionViewWillEnter(): void {
    this.load();
  }

  protected load(): void {
    const id = Number(this.id());
    this.loading.set(true);
    this.notFound.set(false);
    this.confirming.set(false);
    this.artIndex.set(-1);
    this.description.set(null);
    this.pokeApi
      .getDescription(id)
      .pipe(catchError(() => of('')))
      .subscribe((d) => this.description.set(d));
    this.pokemonService.getById(id).subscribe({
      next: (p) => {
        this.pokemon.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.notFound.set(true);
        this.loading.set(false);
      },
    });
  }

  protected nextArt(): void {
    this.artIndex.update((i) => i + 1);
  }

  protected goToList(): void {
    this.navCtrl.navigateBack('/inventario');
  }

  protected edit(): void {
    this.router.navigate(['/pokemon', this.id(), 'editar']);
  }

  protected remove(): void {
    const p = this.pokemon();
    if (!p) return;
    this.deleting.set(true);
    this.pokemonService.delete(p.id).subscribe({
      next: () => {
        this.deleting.set(false);
        void this.ui.toast(`${displayName(p.name)} eliminado`);
        this.navCtrl.navigateBack('/inventario');
      },
      error: () => {
        this.deleting.set(false);
        this.confirming.set(false);
        this.notice.set('No se pudo eliminar. Inténtalo de nuevo.');
      },
    });
  }
}
