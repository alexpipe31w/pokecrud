import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonContent } from '@ionic/angular';

import { AuthService } from '../../core/auth/auth.service';
import { POKEMON_TYPE_KEYS } from '../../core/constants/pokemon-types';
import { AudioService } from '../../services/game/audio.service';
import { DatasetService } from '../../services/game/dataset.service';
import { TypeChipsComponent } from '../../shared/components/type-chips/type-chips.component';
import { GameButtonComponent } from '../../shared/ui/game-button.component';
import { GlassPanelComponent } from '../../shared/ui/glass-panel.component';
import { HpBarComponent } from '../../shared/ui/hp-bar.component';
import { StatBarComponent } from '../../shared/ui/stat-bar.component';

const PIKACHU_STATS = [
  { label: 'PS', value: 35 },
  { label: 'Ataque', value: 55 },
  { label: 'Defensa', value: 40 },
  { label: 'Ataque esp.', value: 50 },
  { label: 'Defensa esp.', value: 50 },
  { label: 'Velocidad', value: 90 },
];

const DEMO_MAX_HP = 120;

/** Escaparate del sistema de diseño (F0-04) y de los servicios base (F0-05). Solo para desarrollo: /dev/ui. */
@Component({
  selector: 'app-dev-ui',
  imports: [
    IonContent,
    GameButtonComponent,
    GlassPanelComponent,
    HpBarComponent,
    StatBarComponent,
    TypeChipsComponent,
  ],
  template: `
    <ion-content [fullscreen]="true">
      <main class="page">
        <header class="page__head">
          <p class="eyebrow">Sistema de diseño</p>
          <h1 class="display">PokéCRUD GO</h1>
          <p class="dataset" data-testid="dataset-status">
            Dataset: {{ dataset.status() }} · {{ dataset.species().size }} especies
          </p>
        </header>

        @if (auth.player(); as player) {
          <section>
            <h2 class="section-title">Sesión</h2>
            <app-glass-panel>
              <div class="row session">
                <p class="session__who" data-testid="session-player">
                  <strong>{{ player.nickname }}</strong> · nivel {{ player.level }} ·
                  {{ player.xp }} XP
                </p>
                <app-game-button label="Cerrar sesión" variant="glass" (pressed)="logout()" />
              </div>
            </app-glass-panel>
          </section>
        }

        <section>
          <h2 class="section-title">Botones</h2>
          <app-glass-panel>
            <div class="row">
              <app-game-button label="Atacar" (pressed)="hit()" [disabled]="demoHp() === 0" />
              <app-game-button label="Poción" variant="gold" (pressed)="heal()" />
              <app-game-button label="Reiniciar" variant="glass" (pressed)="reset()" />
            </div>
            <div class="demo-hp">
              <span class="demo-hp__label">Pikachu</span>
              <app-hp-bar [current]="demoHp()" [max]="maxHp" />
              <span class="demo-hp__value">{{ demoHp() }}/{{ maxHp }}</span>
            </div>
            <div class="row">
              <app-game-button label="Deshabilitado" [disabled]="true" />
            </div>
          </app-glass-panel>
        </section>

        <section>
          <h2 class="section-title">Panel de vidrio y estadísticas</h2>
          <app-glass-panel size="lg">
            <div class="mon">
              <img
                class="mon__art"
                src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/25.png"
                alt="Pikachu"
                width="96"
                height="96"
              />
              <div>
                <p class="mon__dex">#025</p>
                <h3 class="display mon__name">Pikachu</h3>
                <app-type-chips [types]="['electric']" />
                @if (pikachu(); as p) {
                  <p class="mon__genus">{{ p.genus }}</p>
                }
              </div>
            </div>
            <div class="stats">
              @for (s of stats; track s.label) {
                <app-stat-bar [label]="s.label" [value]="s.value" color="var(--t-electric)" />
              }
            </div>
            <div class="row cry">
              <app-game-button label="Oír a Pikachu" variant="gold" (pressed)="playCry()" />
              @if (cryFailed()) {
                <span class="cry__error">No se pudo cargar el grito (¿sin conexión?)</span>
              }
            </div>
          </app-glass-panel>
        </section>

        <section>
          <h2 class="section-title">Barras de PS</h2>
          <app-glass-panel>
            @for (hp of hpSamples; track hp) {
              <div class="demo-hp">
                <span class="demo-hp__label">{{ hp }} %</span>
                <app-hp-bar [current]="hp" [max]="100" />
              </div>
            }
          </app-glass-panel>
        </section>

        <section>
          <h2 class="section-title">Tipos</h2>
          <app-glass-panel>
            <app-type-chips [types]="types" />
          </app-glass-panel>
        </section>
      </main>
    </ion-content>
  `,
  styles: `
    ion-content {
      --background:
        radial-gradient(
          120% 60% at 0% 0%,
          color-mix(in srgb, var(--t-electric) 55%, transparent),
          transparent 60%
        ),
        radial-gradient(
          120% 60% at 100% 100%,
          color-mix(in srgb, var(--t-water) 55%, transparent),
          transparent 60%
        ),
        var(--paper-2);
    }
    @media (prefers-color-scheme: dark) {
      ion-content {
        --background:
          radial-gradient(
            120% 60% at 0% 0%,
            color-mix(in srgb, var(--t-electric) 30%, transparent),
            transparent 60%
          ),
          radial-gradient(
            120% 60% at 100% 100%,
            color-mix(in srgb, var(--t-dragon) 40%, transparent),
            transparent 60%
          ),
          var(--ink);
      }
    }
    .page {
      max-width: 560px;
      margin: 0 auto;
      padding: var(--s-6) var(--s-4) var(--s-8);
      display: grid;
      gap: var(--s-6);
      color: var(--surface-text);
    }
    .display {
      font-family: var(--font-display);
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.05;
      margin: 0;
    }
    .page__head .display {
      font-size: 2.25rem;
    }
    .eyebrow {
      margin: 0 0 var(--s-1);
      font-size: 0.875rem;
      opacity: 0.75;
    }
    .section-title {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.125rem;
      margin: 0 0 var(--s-3);
    }
    .row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--s-3);
    }
    .demo-hp {
      display: grid;
      grid-template-columns: 4.5rem 1fr auto;
      align-items: center;
      gap: var(--s-3);
      margin: var(--s-4) 0;
      font-size: 0.875rem;
    }
    .demo-hp__value {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
    .mon {
      display: flex;
      align-items: center;
      gap: var(--s-4);
      margin-bottom: var(--s-4);
    }
    .mon__art {
      width: 96px;
      height: 96px;
      object-fit: contain;
    }
    .mon__dex {
      margin: 0;
      font-size: 0.875rem;
      opacity: 0.7;
      font-variant-numeric: tabular-nums;
    }
    .mon__name {
      font-size: 1.75rem;
      margin: 0 0 var(--s-2);
    }
    .stats {
      display: grid;
      gap: var(--s-2);
    }
    .session {
      align-items: center;
      justify-content: space-between;
    }
    .session__who {
      margin: 0;
    }
    .dataset {
      margin: var(--s-2) 0 0;
      font-size: 0.875rem;
      opacity: 0.75;
      font-variant-numeric: tabular-nums;
    }
    .mon__genus {
      margin: var(--s-2) 0 0;
      font-size: 0.875rem;
      opacity: 0.75;
    }
    .cry {
      align-items: center;
      margin-top: var(--s-4);
    }
    .cry__error {
      font-size: 0.875rem;
      color: var(--danger);
    }
  `,
})
export class DevUiPage {
  protected readonly dataset = inject(DatasetService);
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly audio = inject(AudioService);
  protected readonly cryFailed = signal(false);
  /** Pikachu tal como viene del dataset (se ve en cuanto termina de cargar). */
  protected readonly pikachu = () => this.dataset.species().get(25);

  protected readonly stats = PIKACHU_STATS;
  protected readonly hpSamples = [80, 35, 10];
  protected readonly types = POKEMON_TYPE_KEYS;
  protected readonly maxHp = DEMO_MAX_HP;
  protected readonly demoHp = signal(DEMO_MAX_HP);

  protected hit(): void {
    this.demoHp.update((hp) => Math.max(0, hp - 25));
  }

  protected heal(): void {
    this.demoHp.update((hp) => Math.min(DEMO_MAX_HP, hp + 20));
  }

  protected async playCry(): Promise<void> {
    this.cryFailed.set(!(await this.audio.playCry(25)));
  }

  protected async logout(): Promise<void> {
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }

  protected reset(): void {
    this.demoHp.set(DEMO_MAX_HP);
  }
}
