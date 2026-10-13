import { Component, computed, effect, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonTitle,
  IonToolbar,
  ViewWillEnter,
  ViewWillLeave,
} from '@ionic/angular';

import { AuthService } from '../../core/auth/auth.service';
import { TeamsService } from '../../services/game/teams.service';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { TeamSlotsComponent } from '../teams/team-slots.component';
import { PvpBallComponent } from './pvp-ball.component';
import { PvpCodeInputComponent } from './pvp-code-input.component';
import { PvpCodeComponent } from './pvp-code.component';
import { PvpLobbyStore } from './pvp-lobby.store';
import { PvpSearchingComponent } from './pvp-searching.component';
import { PvpVersusComponent } from './pvp-versus.component';

/**
 * Combate en vivo (F5-03, D-056): la arena de noche donde se elige equipo y se busca rival — invitar con un código,
 * escribir el de un amigo o buscar a cualquiera — hasta el cara a cara. La lógica vive en `PvpLobbyStore`.
 */
@Component({
  selector: 'app-pvp',
  providers: [PvpLobbyStore],
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
    PvpBallComponent,
    PvpCodeComponent,
    PvpCodeInputComponent,
    PvpSearchingComponent,
    PvpVersusComponent,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/mapa" text="Mapa"></ion-back-button>
        </ion-buttons>
        <ion-title>Combate en vivo</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="arena">
      <div class="page">
        @switch (lobby.phase()) {
          @case ('connecting') {
            <div class="center" role="status">
              <app-pvp-ball />
              <p>Entrando en la arena…</p>
              <p class="quiet">Si el servidor dormía, tarda hasta un minuto.</p>
            </div>
          }
          @case ('error') {
            <div class="center">
              <p role="alert">{{ lobby.notice() }}</p>
              <app-game-button label="Reintentar" variant="gold" (pressed)="lobby.enter()" />
            </div>
          }
          @case ('inviting') {
            <app-pvp-code
              [code]="lobby.code() ?? ''"
              [remainingS]="lobby.remainingS()"
              (cancelled)="lobby.cancel()"
            />
          }
          @case ('joining') {
            <app-pvp-code-input
              [busy]="lobby.busy()"
              [rejected]="lobby.rejections()"
              (submitted)="lobby.join($event)"
              (cancelled)="lobby.cancel()"
            />
            @if (lobby.notice(); as n) {
              <p class="notice" role="alert">{{ n }}</p>
            }
          }
          @case ('queue') {
            <app-pvp-searching (cancelled)="lobby.cancel()" />
          }
          @case ('matched') {
            @if (lobby.match(); as m) {
              <app-pvp-versus
                [myName]="myName()"
                [opponent]="m.opponent"
                [myLead]="m.myLead"
                [foeLead]="m.foeLead"
                [busy]="lobby.busy()"
                (forfeit)="lobby.forfeit()"
              />
            }
          }
          @default {
            <h1 class="title">Combate en vivo</h1>
            <p class="sub">Tu equipo contra el de un compañero, a nivel 50 para que sea justo.</p>

            @if (teams.error(); as e) {
              <div class="center">
                <p role="alert">{{ e }}</p>
                <app-game-button label="Reintentar" variant="glass" (pressed)="teams.load()" />
              </div>
            } @else if (teams.teams() === null) {
              <p class="quiet" role="status">Cargando tus equipos…</p>
            } @else if (choices().length === 0) {
              <div class="center empty">
                <app-pvp-ball />
                <h2>Necesitas un equipo</h2>
                <p class="quiet">Elige hasta 6 de tus Pokémon capturados para combatir.</p>
                <a class="cta" routerLink="/equipos/nuevo">Crear equipo</a>
              </div>
            } @else {
              <section class="team" aria-labelledby="team-h">
                <h2 id="team-h">Tu equipo</h2>
                <div class="chips" role="radiogroup" aria-labelledby="team-h">
                  @for (t of choices(); track t.id) {
                    <button
                      type="button"
                      role="radio"
                      class="chip"
                      [attr.aria-checked]="t.id === lobby.teamId()"
                      (click)="lobby.teamId.set(t.id)"
                    >
                      {{ t.name }}
                    </button>
                  }
                </div>
                <app-team-slots [members]="members()" />
              </section>

              <div class="actions">
                <app-game-button
                  label="Buscar rival"
                  [block]="true"
                  [loading]="lobby.busy()"
                  (pressed)="lobby.searchRival()"
                />
                <div class="pair">
                  <app-game-button
                    label="Invitar"
                    variant="glass"
                    [block]="true"
                    (pressed)="lobby.invite()"
                  />
                  <app-game-button
                    label="Tengo un código"
                    variant="glass"
                    [block]="true"
                    (pressed)="lobby.openJoin()"
                  />
                </div>
              </div>
            }
            @if (lobby.notice(); as n) {
              <p class="notice" role="status">{{ n }}</p>
            }
          }
        }
      </div>
    </ion-content>
  `,
  styleUrl: 'pvp.page.scss',
})
export class PvpPage implements ViewWillEnter, ViewWillLeave {
  protected readonly lobby = inject(PvpLobbyStore);
  protected readonly teams = inject(TeamsService);
  private readonly auth = inject(AuthService);

  protected readonly myName = computed(() => this.auth.player()?.nickname ?? 'Tú');
  /** Solo los equipos con algún Pokémon capturado sirven para combatir. */
  protected readonly choices = computed(() =>
    (this.teams.teams() ?? []).filter((t) => t.caughtIds.length > 0),
  );
  protected readonly members = computed(() => {
    const team = this.choices().find((t) => t.id === this.lobby.teamId());
    return (team?.caughtIds ?? []).map((id) => this.teams.member(id) ?? null);
  });

  constructor() {
    // Elige solo el primer equipo válido si no hay ninguno elegido (o el elegido ya no existe).
    effect(() => {
      const list = this.choices();
      const current = this.lobby.teamId();
      if (list.length && !list.some((t) => t.id === current)) this.lobby.teamId.set(list[0].id);
    });
  }

  ionViewWillEnter(): void {
    void this.teams.load();
    void this.lobby.enter();
  }

  ionViewWillLeave(): void {
    void this.lobby.leave();
  }
}
