import { TitleCasePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  NavController,
} from '@ionic/angular';
import { catchError, of } from 'rxjs';

import { dexNumber, displayName, spriteUrl } from '../../core/utils/pokemon-defaults';
import { PokemonDraft, PokemonRef } from '../../models/pokemon.model';
import { PokeApiService, filterRefs } from '../../services/poke-api.service';
import { PokemonService } from '../../services/pokemon.service';
import { UiService } from '../../services/ui.service';
import { PokemonFormComponent } from '../../shared/components/pokemon-form/pokemon-form.component';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { SearchFieldComponent } from '../../shared/ui/search-field.component';

/** Resultados que se muestran a la vez en el buscador. */
const MAX_RESULTS = 30;

/**
 * Agregar un Pokémon: se busca por número o nombre en PokéAPI (cualquier generación)
 * y el formulario aparece prellenado con sus datos para editarlos antes de guardar.
 */
@Component({
  selector: 'app-pokemon-add',
  templateUrl: 'pokemon-add.page.html',
  styleUrl: 'pokemon-add.page.scss',
  imports: [
    TitleCasePipe,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
    PokemonFormComponent,
    GameButtonComponent,
    SearchFieldComponent,
  ],
})
export class PokemonAddPage {
  private readonly pokeApi = inject(PokeApiService);
  private readonly pokemonService = inject(PokemonService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  private readonly navCtrl = inject(NavController);

  /** Todos los nombres de PokéAPI (`null` mientras cargan, `[]` si falla). */
  protected readonly refs = toSignal(this.pokeApi.listAll().pipe(catchError(() => of([]))), {
    initialValue: null,
  });

  protected readonly term = signal('');
  private readonly matches = computed(() => {
    const refs = this.refs();
    const term = this.term().trim();
    return refs && term ? filterRefs(refs, term) : [];
  });
  protected readonly totalMatches = computed(() => this.matches().length);
  protected readonly results = computed(() => this.matches().slice(0, MAX_RESULTS));

  protected readonly selected = signal<PokemonDraft | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly alreadySaved = signal(false);
  protected readonly saving = signal(false);

  protected readonly dexNumber = dexNumber;
  protected readonly spriteUrl = spriteUrl;

  protected pick(ref: PokemonRef): void {
    this.loadingDetail.set(true);
    this.alreadySaved.set(false);
    this.pokemonService.exists(ref.id).subscribe((exists) => this.alreadySaved.set(exists));
    this.pokeApi.getById(ref.id).subscribe({
      next: (draft) => {
        this.selected.set(draft);
        this.loadingDetail.set(false);
      },
      error: (err: Error) => {
        this.loadingDetail.set(false);
        this.ui.toast(err.message || 'No se pudo consultar PokéAPI', 'danger');
      },
    });
  }

  protected backToSearch(): void {
    this.selected.set(null);
    this.alreadySaved.set(false);
  }

  protected goToEdit(): void {
    const p = this.selected();
    if (p) this.router.navigate(['/pokemon', p.id, 'editar'], { replaceUrl: true });
  }

  protected save(draft: PokemonDraft): void {
    if (this.alreadySaved()) {
      this.ui.toast(
        `${dexNumber(draft.id)} ya está en el inventario. Edítalo en su lugar.`,
        'warning',
      );
      return;
    }
    this.saving.set(true);
    this.pokemonService.create(draft).subscribe({
      next: (p) => {
        this.saving.set(false);
        this.ui.toast(`${displayName(p.name)} agregado al inventario`);
        this.navCtrl.navigateBack('/inventario');
      },
      error: () => {
        this.saving.set(false);
        this.ui.toast('No se pudo guardar. Inténtalo de nuevo.', 'danger');
      },
    });
  }
}
