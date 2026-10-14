import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
} from '@ionic/angular';
import type { CollectionItem } from '@shared/protocol/collection';
import { TEAM_MAX } from '@shared/protocol/teams';

import { DatasetService } from '../../services/game/dataset.service';
import { TeamsService } from '../../services/game/teams.service';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { TeamSlotsComponent } from './team-slots.component';

/**
 * Mis equipos (F3-06b, D-054): cada equipo con sus 6 huecos (arte y PC de sus Pokémon capturados), cuántos lleva y
 * el PC total; tocarlo abre el editor. Vacía diseñada. Se recarga al entrar (un Pokémon transferido o evolucionado
 * se ve al volver).
 */
@Component({
  selector: 'app-teams',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    GameButtonComponent,
    TeamSlotsComponent,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/mapa" text="Mapa"></ion-back-button>
        </ion-buttons>
        <ion-title>Equipos</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="page">
        @if (teams.error(); as e) {
          <div class="state">
            <p>{{ e }}</p>
            <app-game-button label="Reintentar" variant="glass" (pressed)="teams.load()" />
          </div>
        } @else if (cards(); as list) {
          @for (t of list; track t.id) {
            <a class="team" [routerLink]="['/equipos', t.id]" [attr.aria-label]="t.label">
              <div class="head">
                <h2>{{ t.name }}</h2>
                <span class="count">{{ t.size }}/{{ max }}</span>
              </div>
              <app-team-slots [members]="t.members" />
              <p class="cp">PC {{ t.cp }}</p>
            </a>
          } @empty {
            <div class="empty">
              <span class="ball" aria-hidden="true"></span>
              <h2>Arma tu primer equipo</h2>
              <p>Elige hasta 6 Pokémon de los que has capturado.</p>
              <a class="cta" routerLink="/equipos/nuevo">Crear equipo</a>
            </div>
          }
        } @else {
          <p class="state" role="status">Cargando tus equipos…</p>
        }
      </div>

      @if (cards()?.length) {
        <a class="cta new" slot="fixed" routerLink="/equipos/nuevo">+ Nuevo equipo</a>
      }
    </ion-content>
  `,
  styleUrl: 'teams.page.scss',
})
export class TeamsPage implements ViewWillEnter {
  protected readonly teams = inject(TeamsService);
  private readonly dataset = inject(DatasetService);
  protected readonly max = TEAM_MAX;

  protected readonly cards = computed(() =>
    this.teams.teams()?.map((t) => {
      const members = t.caughtIds.map((id) => this.teams.member(id) ?? null);
      const names = members
        .filter((m): m is CollectionItem => !!m)
        .map((m) => m.nickname ?? this.dataset.species().get(m.speciesId)?.names.es ?? '');
      return {
        id: t.id,
        name: t.name,
        members,
        size: t.caughtIds.length,
        cp: members.reduce((sum, m) => sum + (m?.cp ?? 0), 0),
        label: `${t.name}, ${t.caughtIds.length} de ${TEAM_MAX}${names.length ? `: ${names.join(', ')}` : ''}`,
      };
    }),
  );

  ionViewWillEnter(): void {
    void this.teams.load();
  }
}
