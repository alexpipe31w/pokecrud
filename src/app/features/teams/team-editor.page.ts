import { Component, computed, inject, input, signal } from '@angular/core';
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
import type { CollectionItem } from '@shared/protocol/collection';
import { TEAM_MAX } from '@shared/protocol/teams';

import { CollectionService } from '../../services/game/collection.service';
import { HapticsService } from '../../services/game/haptics.service';
import { TeamsService } from '../../services/game/teams.service';
import { ConfirmPanelComponent } from '../../shared/ui/confirm-panel.component';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { CollectionCardComponent } from '../collection/collection-card.component';
import { TeamSlotsComponent } from './team-slots.component';

/** Nombre: 1-50 caracteres (DTO del servidor). */
const NAME_MAX = 50;

/**
 * Editor de un equipo (F3-06b, D-054): `/equipos/nuevo` y `/equipos/:id`. Nombre, los 6 huecos arriba (tocar uno lo
 * quita) y "Mis Pokémon" en modo selección debajo (máx. 6, sin repetir; el 7º queda deshabilitado). Guardar crea o
 * hace PATCH; borrar pide confirmación. El servidor comprueba que todos son tuyos.
 */
@Component({
  selector: 'app-team-editor',
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    GameButtonComponent,
    ConfirmPanelComponent,
    CollectionCardComponent,
    TeamSlotsComponent,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/equipos" text="Equipos"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ teamId() ? 'Editar equipo' : 'Nuevo equipo' }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="page">
        <div class="top">
          <div class="field">
            <label class="field__label" for="team-name">Nombre del equipo</label>
            <input
              #n
              id="team-name"
              class="field__input"
              [value]="name()"
              [attr.maxlength]="nameMax"
              autocomplete="off"
              placeholder="Mi equipo"
              (input)="name.set(n.value)"
            />
          </div>
          <div class="slots-head">
            <span>Tu equipo</span>
            <strong>{{ chosen().length }}/{{ max }}</strong>
          </div>
          <app-team-slots [members]="chosenItems()" [removable]="true" (removed)="toggle($event)" />
        </div>

        <h2>Elige de tus Pokémon</h2>
        @if (collection.items().length) {
          <ul class="grid">
            @for (it of collection.items(); track it.id; let i = $index) {
              <li>
                <app-collection-card
                  [item]="it"
                  [index]="i"
                  [selectable]="true"
                  [selected]="isChosen(it.id)"
                  [disabled]="full() && !isChosen(it.id)"
                  (toggled)="toggle($event)"
                />
              </li>
            }
          </ul>
          @if (collection.hasMore()) {
            <app-game-button
              label="Cargar más"
              variant="glass"
              [block]="true"
              [loading]="collection.loading()"
              (pressed)="collection.loadMore()"
            />
          }
        } @else if (collection.loading()) {
          <p class="state" role="status">Cargando tus Pokémon…</p>
        } @else {
          <p class="state">Aún no has capturado ningún Pokémon. ¡Sal a buscarlos al mapa!</p>
        }

        @if (notice(); as m) {
          <p class="notice" role="alert">{{ m }}</p>
        }
        <div class="actions">
          <app-game-button
            label="Guardar equipo"
            [block]="true"
            [disabled]="!canSave()"
            [loading]="saving()"
            (pressed)="save()"
          />
          @if (teamId()) {
            @if (confirming()) {
              <app-confirm-panel
                label="Confirmar borrado"
                [message]="'¿Borrar el equipo «' + name().trim() + '»?'"
                confirmLabel="Borrar"
                [danger]="true"
                [busy]="saving()"
                (confirmed)="removeTeam()"
                (cancelled)="confirming.set(false)"
              />
            } @else {
              <app-game-button
                label="Borrar equipo"
                variant="glass"
                [block]="true"
                (pressed)="confirming.set(true)"
              />
            }
          }
        </div>
      </div>
    </ion-content>
  `,
  styleUrl: 'team-editor.page.scss',
})
export class TeamEditorPage implements ViewWillEnter {
  /** `:id` de `/equipos/:id` (no existe en `/equipos/nuevo`). */
  readonly id = input<string>();

  private readonly teams = inject(TeamsService);
  protected readonly collection = inject(CollectionService);
  private readonly nav = inject(NavController);
  private readonly haptics = inject(HapticsService);

  protected readonly max = TEAM_MAX;
  protected readonly nameMax = NAME_MAX;
  protected readonly name = signal('');
  protected readonly chosen = signal<string[]>([]);
  protected readonly saving = signal(false);
  protected readonly confirming = signal(false);
  protected readonly notice = signal<string | null>(null);

  protected readonly teamId = computed(() => {
    const n = Number(this.id());
    return Number.isInteger(n) && n > 0 ? n : null;
  });
  protected readonly full = computed(() => this.chosen().length >= TEAM_MAX);
  protected readonly canSave = computed(() => {
    const n = this.name().trim().length;
    return n >= 1 && n <= NAME_MAX && !this.saving();
  });
  protected readonly chosenItems = computed(() => this.chosen().map((id) => this.find(id) ?? null));

  async ionViewWillEnter(): Promise<void> {
    this.confirming.set(false);
    this.notice.set(null);
    if (!this.collection.items().length) void this.collection.load();
    const id = this.teamId();
    if (id === null) {
      this.name.set('');
      this.chosen.set([]);
      return;
    }
    if (!this.teams.teams()) await this.teams.load();
    const team = this.teams.teams()?.find((t) => t.id === id);
    if (!team) {
      this.notice.set('Ese equipo ya no existe.');
      return;
    }
    this.name.set(team.name);
    this.chosen.set([...team.caughtIds]);
  }

  protected isChosen(id: string): boolean {
    return this.chosen().includes(id);
  }

  /** Pulsar un Pokémon lo añade (si hay hueco) o lo quita. */
  protected toggle(id: string): void {
    this.haptics.tap();
    this.chosen.update((list) =>
      list.includes(id)
        ? list.filter((c) => c !== id)
        : list.length < TEAM_MAX
          ? [...list, id]
          : list,
    );
  }

  protected async save(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.notice.set(null);
    const name = this.name().trim();
    const ids = this.chosen();
    const known = ids.map((i) => this.find(i)).filter((i): i is CollectionItem => !!i);
    try {
      const id = this.teamId();
      if (id === null) await this.teams.create(name, ids, known);
      else await this.teams.update(id, { name, caughtIds: ids }, known);
      this.nav.navigateBack('/equipos');
    } catch (err) {
      const status = (err as { status?: number }).status;
      this.notice.set(
        status === 400
          ? 'Alguno de esos Pokémon ya no es tuyo (¿lo transferiste?).'
          : 'No se pudo guardar el equipo.',
      );
    } finally {
      this.saving.set(false);
    }
  }

  protected async removeTeam(): Promise<void> {
    const id = this.teamId();
    if (id === null) return;
    this.saving.set(true);
    try {
      await this.teams.remove(id);
      this.nav.navigateBack('/equipos');
    } catch {
      this.confirming.set(false);
      this.notice.set('No se pudo borrar el equipo.');
    } finally {
      this.saving.set(false);
    }
  }

  private find(id: string): CollectionItem | undefined {
    return this.collection.items().find((i) => i.id === id) ?? this.teams.member(id);
  }
}
