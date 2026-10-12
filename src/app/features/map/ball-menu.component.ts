import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  bookOutline,
  flashOutline,
  gameControllerOutline,
  logOutOutline,
  sparklesOutline,
} from 'ionicons/icons';

import { AuthService } from '../../core/auth/auth.service';
import { AudioService } from '../../services/game/audio.service';
import { HapticsService } from '../../services/game/haptics.service';
import { SettingsService } from '../../services/game/settings.service';
import { DEFAULT_CENTER, LocationService } from '../../services/location/location.service';

/** Arrastrar la hoja más de esto hacia abajo la cierra. */
const DRAG_CLOSE_PX = 80;

/**
 * Menú del juego (DISENO §1): botón Poké Ball abajo en el centro que abre una hoja con las secciones. Sustituye a las
 * pestañas de Ionic. Se cierra tocando fuera, arrastrando la hoja hacia abajo o con Escape.
 * (Mis Pokémon, Equipos y Favoritos se añaden cuando existan, F3.)
 */
@Component({
  selector: 'app-ball-menu',
  imports: [IonIcon],
  host: { '(document:keydown.escape)': 'close()' },
  template: `
    <button
      #ball
      type="button"
      class="ball"
      aria-label="Menú"
      aria-haspopup="dialog"
      [attr.aria-expanded]="open()"
      (pointerdown)="feedback()"
      (click)="toggle()"
    ></button>

    <div class="backdrop" [class.is-open]="open()" (click)="close()" aria-hidden="true"></div>
    <div
      class="sheet"
      role="dialog"
      aria-label="Menú del juego"
      [class.is-open]="open()"
      [class.is-dragging]="dragY() > 0"
      [style.transform]="open() && dragY() > 0 ? 'translateY(' + dragY() + 'px)' : null"
      [attr.inert]="open() ? null : ''"
      (pointerdown)="dragStart($event)"
      (pointermove)="dragMove($event)"
      (pointerup)="dragEnd()"
      (pointercancel)="dragEnd()"
    >
      <div class="grip" aria-hidden="true"></div>
      <button #first type="button" (click)="go('/pokedex')">
        <ion-icon name="book-outline" aria-hidden="true" />Pokédex
      </button>
      <button type="button" (click)="go('/combate/prueba')">
        <ion-icon name="flash-outline" aria-hidden="true" />Combate de prueba
      </button>
      <button type="button" role="switch" [attr.aria-checked]="joystick()" (click)="toggleJoystick()">
        <ion-icon name="game-controller-outline" aria-hidden="true" />Joystick
        <span class="state">{{ joystick() ? 'Sí' : 'No' }}</span>
      </button>
      <button type="button" role="switch" [attr.aria-checked]="reduceEffects()" (click)="toggleEffects()">
        <ion-icon name="sparkles-outline" aria-hidden="true" />Reducir efectos
        <span class="state">{{ reduceEffects() ? 'Sí' : 'No' }}</span>
      </button>
      <button type="button" class="danger" (click)="logout()">
        <ion-icon name="log-out-outline" aria-hidden="true" />Cerrar sesión
      </button>
    </div>
  `,
  styles: `
    .ball {
      position: absolute;
      z-index: 10;
      left: 50%;
      bottom: calc(var(--ion-safe-area-bottom, 0px) + var(--s-6));
      width: 72px;
      height: 72px;
      margin-left: -36px;
      border: 3px solid var(--ink);
      border-radius: 50%;
      background:
        radial-gradient(circle, var(--paper) 0 9px, var(--ink) 9px 13px, transparent 13px),
        linear-gradient(var(--accent) 45%, var(--ink) 45% 55%, var(--paper) 55%);
      box-shadow: var(--shadow-accent);
      transition: transform var(--dur-press) var(--ease-out);
      -webkit-tap-highlight-color: transparent;
    }
    .ball:active {
      transform: scale(0.97);
    }
    .backdrop {
      position: absolute;
      inset: 0;
      z-index: 30;
      background: color-mix(in srgb, var(--ink) 45%, transparent);
      opacity: 0;
      pointer-events: none;
      transition: opacity var(--dur-panel) var(--ease-drawer);
    }
    .sheet {
      position: absolute;
      z-index: 31;
      left: 0;
      right: 0;
      bottom: 0;
      display: grid;
      gap: var(--s-1);
      padding: var(--s-2) var(--s-4) calc(var(--ion-safe-area-bottom, 0px) + var(--s-4));
      border-radius: var(--r-sheet) var(--r-sheet) 0 0;
      background: var(--surface);
      color: var(--surface-text);
      backdrop-filter: blur(20px) saturate(160%);
      border-top: 1px solid var(--glass-edge);
      box-shadow: var(--shadow-lg);
      transform: translateY(100%);
      transition: transform var(--dur-panel) var(--ease-drawer);
      touch-action: none;
    }
    .is-open {
      opacity: 1;
      pointer-events: auto;
    }
    .sheet.is-open {
      transform: none;
    }
    .sheet.is-dragging {
      transition: none;
    }
    .grip {
      justify-self: center;
      width: 40px;
      height: 5px;
      margin-bottom: var(--s-2);
      border-radius: 3px;
      background: var(--track);
    }
    .sheet button {
      display: flex;
      align-items: center;
      gap: var(--s-3);
      min-height: 52px;
      padding: 0 var(--s-3);
      border: 0;
      border-radius: var(--r-chip);
      background: transparent;
      color: inherit;
      font: 600 1rem/1 var(--font-display);
      text-align: left;
    }
    .sheet button:active {
      background: var(--track);
    }
    ion-icon {
      font-size: 1.4rem;
    }
    .state {
      margin-left: auto;
      opacity: 0.7;
    }
    .sheet .danger {
      color: var(--danger-ink);
    }
  `,
})
export class BallMenuComponent {
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly location = inject(LocationService);
  private readonly settings = inject(SettingsService);
  private readonly haptics = inject(HapticsService);
  private readonly audio = inject(AudioService);
  private readonly ball = viewChild.required<ElementRef<HTMLButtonElement>>('ball');
  private readonly first = viewChild.required<ElementRef<HTMLButtonElement>>('first');

  protected readonly open = signal(false);
  protected readonly dragY = signal(0);
  protected readonly joystick = () => this.location.status() === 'joystick';
  protected readonly reduceEffects = () => this.settings.settings().reduceEffects;
  private dragFrom: number | null = null;

  constructor() {
    addIcons({ bookOutline, flashOutline, gameControllerOutline, logOutOutline, sparklesOutline });
  }

  protected feedback(): void {
    this.haptics.tap();
    void this.audio.playSfx('tap');
  }

  protected toggle(): void {
    if (this.open()) return this.close();
    this.open.set(true);
    this.first().nativeElement.focus();
  }

  close(): void {
    if (!this.open()) return;
    this.open.set(false);
    this.dragY.set(0);
    this.ball().nativeElement.focus();
  }

  protected go(url: string): void {
    this.close();
    void this.router.navigateByUrl(url);
  }

  protected toggleJoystick(): void {
    if (this.joystick()) {
      void this.location.useGps();
    } else {
      void this.location.stop();
      this.location.useJoystickAt(this.location.position() ?? DEFAULT_CENTER);
    }
  }

  protected toggleEffects(): void {
    this.settings.update({ reduceEffects: !this.reduceEffects() });
  }

  protected async logout(): Promise<void> {
    this.close();
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }

  // Arrastrar hacia abajo para cerrar (solo hacia abajo; hacia arriba no se mueve).
  protected dragStart(e: PointerEvent): void {
    this.dragFrom = e.clientY;
  }

  protected dragMove(e: PointerEvent): void {
    if (this.dragFrom === null) return;
    this.dragY.set(Math.max(0, e.clientY - this.dragFrom));
  }

  protected dragEnd(): void {
    if (this.dragFrom === null) return;
    this.dragFrom = null;
    if (this.dragY() > DRAG_CLOSE_PX) this.close();
    else this.dragY.set(0);
  }
}
