import { Component, computed, input } from '@angular/core';
import { levelProgress } from '@shared/engine/progression';

/**
 * Placa del jugador para el HUD del mapa (DISENO §1: avatar/nivel arriba a la izquierda), F1-08: inicial del apodo,
 * nivel, barra de XP del nivel actual y bolas en la mochila. El nivel se calcula de la XP con la misma función que
 * usa el servidor (`shared/engine/progression.ts`), así la barra nunca contradice al servidor.
 */
@Component({
  selector: 'app-player-hud',
  host: { role: 'group', '[attr.aria-label]': 'label()' },
  template: `
    <span class="avatar" aria-hidden="true">{{ initial() }}</span>
    <span class="level" aria-hidden="true">{{ progress().level }}</span>
    <div class="info" aria-hidden="true">
      <strong class="name">{{ nickname() }}</strong>
      <span class="xp">
        <span class="xp__fill" [style.transform]="'scaleX(' + progress().ratio + ')'"></span>
      </span>
      <span class="xp__text">
        @if (progress().needed > 0) {
          {{ progress().current }} / {{ progress().needed }} XP
        } @else {
          Nivel máximo
        }
      </span>
    </div>
    @if (balls() !== null) {
      <span class="balls" aria-hidden="true"><span class="ball"></span>{{ balls() }}</span>
    }
  `,
  styles: `
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--s-3);
      padding: var(--s-2) var(--s-4) var(--s-2) var(--s-2);
      background: var(--surface);
      color: var(--surface-text);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      border-top: 1px solid var(--glass-edge);
      border-radius: var(--r-chip);
      box-shadow: var(--shadow-sm);
      position: relative;
      max-width: 100%;
    }
    .avatar {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      flex: none;
      border-radius: 50%;
      background: radial-gradient(
        circle at 35% 30%,
        color-mix(in srgb, var(--accent), white 35%),
        var(--accent) 65%
      );
      color: var(--accent-ink);
      font: 700 22px/1 var(--font-display);
      text-shadow: 0 1px 2px rgb(0 0 0 / 0.35);
      box-shadow: inset 0 0 0 3px var(--ink);
    }
    .level {
      position: absolute;
      left: 36px;
      bottom: 4px;
      min-width: 22px;
      height: 22px;
      padding: 0 5px;
      display: grid;
      place-items: center;
      border-radius: var(--r-chip);
      background: var(--gold);
      color: var(--ink);
      font: 700 12px/1 var(--font-display);
      box-shadow: 0 0 0 2px var(--surface-text);
    }
    .info {
      display: grid;
      gap: 3px;
      min-width: 0;
    }
    .name {
      font: 600 15px/1.1 var(--font-display);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .xp {
      display: block;
      width: 120px;
      height: 6px;
      border-radius: var(--r-chip);
      background: var(--track);
      overflow: hidden;
    }
    .xp__fill {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: var(--gold);
      transform-origin: left center;
      transition: transform 600ms var(--ease-out);
    }
    .xp__text {
      font-size: 11px;
      opacity: 0.75;
      font-variant-numeric: tabular-nums;
    }
    .balls {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-left: var(--s-2);
      font: 600 15px/1 var(--font-display);
      font-variant-numeric: tabular-nums;
    }
    .ball {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: linear-gradient(var(--accent) 45%, var(--ink) 45% 55%, var(--paper) 55%);
      box-shadow: inset 0 0 0 1.5px var(--ink);
    }
  `,
})
export class PlayerHudComponent {
  readonly nickname = input.required<string>();
  readonly xp = input.required<number>();
  /** Bolas en la mochila; `null` mientras carga (no se enseña). */
  readonly balls = input<number | null>(null);

  protected readonly progress = computed(() => levelProgress(this.xp()));
  protected readonly initial = computed(
    () => this.nickname().trim().charAt(0).toUpperCase() || '?',
  );
  /** Todo lo que se ve, dicho en una frase para el lector de pantalla. */
  protected readonly label = computed(() => {
    const p = this.progress();
    const balls = this.balls();
    return (
      `${this.nickname()}, nivel ${p.level}` +
      (p.needed > 0 ? `, ${p.current} de ${p.needed} XP` : ', nivel máximo') +
      (balls !== null ? `, ${balls} bolas` : '')
    );
  });
}
