import { CurrencyPipe, DecimalPipe, TitleCasePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonProgressBar,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  NavController,
  ViewWillEnter,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { createOutline, trashOutline } from 'ionicons/icons';
import { catchError, of } from 'rxjs';

import { dexNumber, displayName } from '../../core/utils/pokemon-defaults';
import { Pokemon, PokemonStats } from '../../models/pokemon.model';
import { PokeApiService } from '../../services/poke-api.service';
import { PokemonService } from '../../services/pokemon.service';
import { UiService } from '../../services/ui.service';
import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';

const STAT_LABELS: { key: keyof PokemonStats; label: string }[] = [
  { key: 'hp', label: 'PS' },
  { key: 'attack', label: 'Ataque' },
  { key: 'defense', label: 'Defensa' },
  { key: 'specialAttack', label: 'Ataque esp.' },
  { key: 'specialDefense', label: 'Defensa esp.' },
  { key: 'speed', label: 'Velocidad' },
];

/** Detalle de un Pokémon guardado en la base de datos (IS-12 · HU-04). */
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
    IonButton,
    IonIcon,
    IonProgressBar,
    IonSpinner,
    IonText,
    TypeChipsComponent,
  ],
})
export class PokemonDetailPage implements ViewWillEnter {
  /** Parámetro `:id` de la ruta `/pokemon/:id` (llega por `withComponentInputBinding`). */
  readonly id = input<string>();

  private readonly pokemonService = inject(PokemonService);
  private readonly pokeApi = inject(PokeApiService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  private readonly navCtrl = inject(NavController);

  protected readonly pokemon = signal<Pokemon | null>(null);
  protected readonly loading = signal(true);
  protected readonly notFound = signal(false);
  /** `null` mientras carga; texto vacío si PokéAPI no responde. */
  protected readonly description = signal<string | null>(null);

  protected readonly statLabels = STAT_LABELS;
  protected readonly dexNumber = dexNumber;

  constructor() {
    addIcons({ createOutline, trashOutline });
  }

  ionViewWillEnter(): void {
    this.load();
  }

  protected load(): void {
    const id = Number(this.id());
    this.loading.set(true);
    this.notFound.set(false);
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

  protected goToList(): void {
    this.navCtrl.navigateBack('/tabs/pokedex');
  }

  protected edit(): void {
    this.router.navigate(['/pokemon', this.id(), 'editar']);
  }

  protected async remove(): Promise<void> {
    const p = this.pokemon();
    if (!p) return;
    const ok = await this.ui.confirm(
      'Eliminar Pokémon',
      `¿Seguro que quieres eliminar a ${displayName(p.name)} (${dexNumber(p.id)})?`,
    );
    if (!ok) return;
    this.pokemonService.delete(p.id).subscribe({
      next: () => {
        this.ui.toast(`${displayName(p.name)} eliminado`);
        this.navCtrl.navigateBack('/tabs/pokedex');
      },
      error: () => this.ui.toast('No se pudo eliminar', 'danger'),
    });
  }
}
