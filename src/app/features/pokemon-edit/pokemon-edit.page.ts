import { TitleCasePipe } from '@angular/common';
import { Component, inject, input, signal } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonSpinner,
  IonText,
  IonTitle,
  IonToolbar,
  NavController,
  ViewWillEnter,
} from '@ionic/angular';

import { displayName } from '../../core/utils/pokemon-defaults';
import { Pokemon, PokemonDraft } from '../../models/pokemon.model';
import { PokemonService } from '../../services/pokemon.service';
import { UiService } from '../../services/ui.service';
import { PokemonFormComponent } from '../../shared/components/pokemon-form/pokemon-form.component';

/** Editar un Pokémon guardado en la base de datos. */
@Component({
  selector: 'app-pokemon-edit',
  templateUrl: 'pokemon-edit.page.html',
  imports: [
    TitleCasePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonSpinner,
    IonText,
    PokemonFormComponent,
  ],
})
export class PokemonEditPage implements ViewWillEnter {
  /** Parámetro `:id` de la ruta `/pokemon/:id/editar`. */
  readonly id = input<string>();

  private readonly pokemonService = inject(PokemonService);
  private readonly ui = inject(UiService);
  private readonly navCtrl = inject(NavController);

  protected readonly pokemon = signal<Pokemon | null>(null);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);

  ionViewWillEnter(): void {
    this.loading.set(true);
    this.pokemonService.getById(Number(this.id())).subscribe({
      next: (p) => {
        this.pokemon.set(p);
        this.loading.set(false);
      },
      error: () => {
        this.pokemon.set(null);
        this.loading.set(false);
      },
    });
  }

  protected save(draft: PokemonDraft): void {
    const current = this.pokemon();
    if (!current) return;
    this.saving.set(true);
    this.pokemonService.update({ ...current, ...draft }).subscribe({
      next: (p) => {
        this.saving.set(false);
        this.ui.toast(`${displayName(p.name)} actualizado`);
        this.navCtrl.navigateBack(['/pokemon', p.id]);
      },
      // El interceptor de errores ya muestra el mensaje.
      error: () => this.saving.set(false),
    });
  }
}
