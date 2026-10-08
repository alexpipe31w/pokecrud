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
  IonItem,
  IonLabel,
  IonList,
  IonSearchbar,
  IonSpinner,
  IonText,
  IonThumbnail,
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

/**
 * Agregar un Pokémon: se busca por número o nombre en PokéAPI (1–151)
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
    IonSearchbar,
    IonList,
    IonItem,
    IonThumbnail,
    IonLabel,
    IonSpinner,
    IonText,
    IonButton,
    PokemonFormComponent,
  ],
})
export class PokemonAddPage {
  private readonly pokeApi = inject(PokeApiService);
  private readonly pokemonService = inject(PokemonService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);
  private readonly navCtrl = inject(NavController);

  /** Los 151 nombres de PokéAPI (`null` mientras cargan, `[]` si falla). */
  protected readonly refs = toSignal(this.pokeApi.list151().pipe(catchError(() => of([]))), {
    initialValue: null,
  });

  protected readonly term = signal('');
  protected readonly results = computed(() => {
    const refs = this.refs();
    const term = this.term().trim();
    return refs && term ? filterRefs(refs, term).slice(0, 30) : [];
  });

  protected readonly selected = signal<PokemonDraft | null>(null);
  protected readonly loadingDetail = signal(false);
  protected readonly alreadySaved = signal(false);
  protected readonly saving = signal(false);

  protected readonly dexNumber = dexNumber;
  protected readonly spriteUrl = spriteUrl;

  protected onSearch(event: Event): void {
    this.term.set((event as CustomEvent<{ value?: string | null }>).detail.value ?? '');
  }

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
        `${dexNumber(draft.id)} ya está en la base de datos. Edítalo en su lugar.`,
        'warning',
      );
      return;
    }
    this.saving.set(true);
    this.pokemonService.create(draft).subscribe({
      next: (p) => {
        this.saving.set(false);
        this.ui.toast(`${displayName(p.name)} agregado a la Pokédex`);
        this.navCtrl.navigateBack('/tabs/pokedex');
      },
      error: () => {
        this.saving.set(false);
        this.ui.toast('No se pudo guardar. ¿Está corriendo `npm run api`?', 'danger');
      },
    });
  }
}
