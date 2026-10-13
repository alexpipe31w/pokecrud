import { Component, ElementRef, OnDestroy, effect, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import type { TypeName } from '@shared/data/dataset.types';
import type { SideIndex } from '@shared/engine/battle/types';
import { SettingsService } from '../../services/game/settings.service';
import { BattleBurstComponent } from './battle-burst.component';
import { BattleDockComponent } from './battle-dock.component';
import { BattleInfoComponent } from './battle-info.component';
import { BattlePickerComponent } from './battle-picker.component';
import { BattleSheetComponent } from './battle-sheet.component';
import { BattleController, type BattleFx, PLAYER, RIVAL } from './battle.controller';
import { BattlePvpBarComponent } from './battle-pvp-bar.component';
import { PvpBattleSession } from './pvp-battle-session';

interface Burst {
  id: number;
  side: SideIndex;
  color: string;
  amount?: number;
  crit?: boolean;
  heal?: boolean;
}

/**
 * Escena de combate (F4-05, DISENO modo Experience) en `/combate/prueba`: contra los entrenadores de prueba y la IA
 * de F4-06. En `/pvp/combate` (F5-04, `data.pvp`) la misma escena contra otro jugador: el servidor decide y
 * `PvpBattleSession` conecta el socket con el controlador. La lógica está en `BattleController` + el motor de
 * `shared/`; aquí solo se pinta y se anima.
 */
@Component({
  selector: 'app-battle',
  imports: [
    IonContent,
    BattleInfoComponent,
    BattlePickerComponent,
    BattleDockComponent,
    BattleSheetComponent,
    BattleBurstComponent,
    BattlePvpBarComponent,
  ],
  providers: [BattleController, PvpBattleSession],
  template: `
    <ion-content
      [scrollY]="false"
      style="--padding-top: 0; --padding-bottom: 0; --padding-start: 0; --padding-end: 0"
    >
      @if (!pvp && (ctrl.phase() === 'pick-rival' || ctrl.phase() === 'error')) {
        <app-battle-picker (leave)="leave()" />
      } @else {
        <div class="screen">
          <div
            class="arena"
            #arena
            [style.--foe-color]="typeColor(ctrl.shown()[1]?.types?.[0])"
            [style.--me-color]="typeColor(ctrl.shown()[0]?.types?.[0])"
          >
            @if (ctrl.shown()[1]; as foe) {
              <section class="side side--foe">
                <app-battle-info class="info info--foe" [pokemon]="foe" [rival]="true" />
                <div class="platform"></div>
                <img
                  #foeSprite
                  class="sprite sprite--foe"
                  [src]="art(foe.speciesId)"
                  [alt]="foe.name + ' rival'"
                  width="176"
                  height="176"
                />
              </section>
            }
            @if (ctrl.shown()[0]; as me) {
              <section class="side side--me">
                <div class="platform"></div>
                <img
                  #meSprite
                  class="sprite sprite--me"
                  [src]="art(me.speciesId)"
                  [alt]="me.name"
                  width="184"
                  height="184"
                />
                <app-battle-info class="info info--me" [pokemon]="me" [showNumbers]="true" />
              </section>
            }
            @for (b of bursts(); track b.id) {
              <app-battle-burst
                [class.burst--foe]="b.side === 1"
                [class.burst--me]="b.side === 0"
                [color]="b.color"
                [amount]="b.amount"
                [crit]="b.crit ?? false"
                [heal]="b.heal ?? false"
              />
            }
          </div>
          @if (pvp) {
            <app-battle-pvp-bar />
          }
          <app-battle-dock class="dock" (openSheet)="sheet.set(true)" (exit)="leave()" />
          @if (ctrl.phase() === 'switch' || (sheet() && ctrl.phase() === 'choose')) {
            <app-battle-sheet
              [forced]="ctrl.phase() === 'switch'"
              (pick)="pickMember($event)"
              (dismiss)="sheet.set(false)"
            />
          }
        </div>
      }
    </ion-content>
  `,
  styleUrl: './battle.page.scss',
})
export class BattlePage implements OnDestroy {
  protected readonly ctrl = inject(BattleController);
  private readonly router = inject(Router);
  private readonly session = inject(PvpBattleSession);
  /** `/pvp/combate`: contra otro jugador (modo remoto). */
  protected readonly pvp = inject(ActivatedRoute).snapshot.data['pvp'] === true;
  private readonly settings = inject(SettingsService);

  private readonly arena = viewChild<ElementRef<HTMLElement>>('arena');
  private readonly foeSprite = viewChild<ElementRef<HTMLImageElement>>('foeSprite');
  private readonly meSprite = viewChild<ElementRef<HTMLImageElement>>('meSprite');

  protected readonly bursts = signal<Burst[]>([]);
  protected readonly sheet = signal(false);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor() {
    effect(() => {
      const fx = this.ctrl.fx();
      if (fx) this.animate(fx);
    });
    if (this.pvp) void this.session.open(this.ctrl);
  }

  ngOnDestroy(): void {
    for (const t of this.timers) clearTimeout(t);
    this.session.close();
  }

  protected leave(): void {
    void this.router.navigateByUrl(this.pvp ? '/pvp' : '/dev/ui');
  }

  protected pickMember(index: number): void {
    this.sheet.set(false);
    if (this.ctrl.phase() === 'switch') void this.ctrl.forcedSwitch(index);
    else void this.ctrl.act({ kind: 'switch', teamIndex: index });
  }

  protected typeColor(type: TypeName | undefined): string {
    return type ? `var(--t-${type})` : 'var(--ink-2)';
  }
  protected art(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;
  }

  /** Efectos con Web Animations: se pueden repetir y no dejan clases colgadas. Solo transform y opacity. */
  private animate(fx: BattleFx): void {
    const reduce =
      this.settings.settings().reduceEffects ||
      (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
    const el = (fx.side === RIVAL ? this.foeSprite() : this.meSprite())?.nativeElement;
    const toward = fx.side === PLAYER ? 1 : -1;
    const flip = fx.side === PLAYER ? ' scaleX(-1)' : '';
    const ease = 'cubic-bezier(0.23, 1, 0.32, 1)';

    switch (fx.kind) {
      case 'enter':
        if (!el) return;
        el.getAnimations().forEach((a) => a.cancel());
        el.animate(
          [
            { opacity: 0, transform: `translateY(12px) scale(0.95)${flip}` },
            { opacity: 1, transform: `translateY(0) scale(1)${flip}` },
          ],
          { duration: reduce ? 1 : 420, easing: ease },
        );
        return;
      case 'lunge':
        el?.animate(
          [
            { transform: `translate(0, 0)${flip}` },
            { transform: `translate(${toward * 22}px, ${-toward * 16}px)${flip}` },
            { transform: `translate(0, 0)${flip}` },
          ],
          { duration: reduce ? 1 : 300, easing: ease },
        );
        return;
      case 'hit': {
        const ratio = fx.ratio ?? 0;
        if (el && !reduce) {
          const amp = 4 + Math.min(1, ratio) * 18;
          el.animate(
            [
              { transform: `translateX(0)${flip}`, opacity: 1 },
              { transform: `translateX(${-amp}px)${flip}`, opacity: 0.35 },
              { transform: `translateX(${amp}px)${flip}`, opacity: 1 },
              { transform: `translateX(${-amp / 2}px)${flip}`, opacity: 0.35 },
              { transform: `translateX(0)${flip}`, opacity: 1 },
            ],
            { duration: 380, easing: 'linear' },
          );
        }
        // Golpes grandes sacuden toda la escena (DISENO §5: proporcional al daño).
        if (ratio > 0.35 && !reduce) {
          const shake = 3 + ratio * 8;
          this.arena()?.nativeElement.animate(
            [
              { transform: 'translate(0, 0)' },
              { transform: `translate(${shake}px, ${-shake / 2}px)` },
              { transform: `translate(${-shake}px, ${shake / 2}px)` },
              { transform: 'translate(0, 0)' },
            ],
            { duration: 260, easing: 'linear' },
          );
        }
        this.burst({
          side: fx.side,
          color: fx.moveType ? `var(--t-${fx.moveType})` : 'var(--paper)',
          amount: fx.amount,
          crit: fx.crit,
        });
        return;
      }
      case 'heal':
        this.burst({ side: fx.side, color: 'var(--success)', amount: fx.amount, heal: true });
        return;
      case 'status':
        el?.animate(
          [
            { transform: `scale(1)${flip}` },
            { transform: `scale(1.06)${flip}` },
            { transform: `scale(1)${flip}` },
          ],
          { duration: reduce ? 1 : 360, easing: ease },
        );
        return;
      case 'faint':
        el?.animate(
          [
            { opacity: 1, transform: `translateY(0)${flip}` },
            { opacity: 0, transform: `translateY(48px)${flip}` },
          ],
          {
            duration: reduce ? 1 : 620,
            easing: 'cubic-bezier(0.77, 0, 0.175, 1)',
            fill: 'forwards',
          },
        );
        return;
    }
  }

  private burst(b: Omit<Burst, 'id'>): void {
    const id = Date.now() + Math.random();
    this.bursts.update((list) => [...list, { ...b, id }]);
    this.later(() => this.bursts.update((list) => list.filter((x) => x.id !== id)), 900);
  }

  private later(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      this.timers.delete(t);
      fn();
    }, ms);
    this.timers.add(t);
  }
}
