import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { type EvolutionNode, evolutionTree, methodText } from '@shared/engine/evolution-chain';
import { spriteUrls } from '../../core/utils/sprites';
import { DatasetService } from '../../services/game/dataset.service';
import { PokedexService } from '../../services/game/pokedex.service';

interface Step {
  id: number;
  name: string;
  seen: boolean;
  current: boolean;
  method: string | null;
}

/**
 * Cadena evolutiva de la especie (F3-04): por columnas (etapas), las ramas apiladas (Eevee). Lo no visto sale como
 * silueta y sin nombre. Bajo cada evolución, cómo evoluciona en los juegos (informativo; aquí se usan caramelos, F3-05).
 */
@Component({
  selector: 'app-evolution-chain',
  imports: [RouterLink],
  template: `
    <h2>Cadena evolutiva</h2>
    @if (stages().length > 1) {
      <div class="chain">
        @for (stage of stages(); track $index; let first = $first) {
          @if (!first) {
            <span class="arrow" aria-hidden="true">→</span>
          }
          <div class="stage">
            @for (s of stage; track s.id) {
              <a
                class="node"
                [class.current]="s.current"
                [class.unseen]="!s.seen"
                [routerLink]="s.seen ? ['/pokedex', s.id] : null"
                [attr.aria-label]="s.seen ? s.name : 'Sin ver'"
              >
                <img [src]="art(s.id)" alt="" loading="lazy" />
                <span>{{ s.seen ? s.name : '???' }}</span>
                @if (s.method) {
                  <small>{{ s.method }}</small>
                }
              </a>
            }
          </div>
        }
      </div>
    } @else {
      <p>No evoluciona.</p>
    }
  `,
  styles: `
    h2 {
      margin: var(--s-4) 0 var(--s-2);
      font: 600 1.05rem/1 var(--font-display);
    }
    .chain {
      display: flex;
      align-items: center;
      gap: var(--s-1);
      overflow-x: auto;
      padding-bottom: var(--s-2);
    }
    .stage {
      display: grid;
      gap: var(--s-1);
    }
    .arrow {
      font-size: 1.2rem;
      opacity: 0.6;
    }
    .node {
      display: grid;
      justify-items: center;
      min-width: 84px;
      padding: var(--s-1);
      border-radius: var(--r-card);
      color: inherit;
      text-align: center;
      text-decoration: none;
    }
    .current {
      background: color-mix(in srgb, currentColor 10%, transparent);
    }
    img {
      width: 56px;
      height: 56px;
      object-fit: contain;
    }
    .unseen img {
      filter: brightness(0);
      opacity: 0.22;
    }
    span {
      font-size: 0.85rem;
      font-weight: 600;
    }
    small {
      font-size: 0.72rem;
      opacity: 0.75;
    }
  `,
})
export class EvolutionChainComponent {
  private readonly dataset = inject(DatasetService);
  private readonly dex = inject(PokedexService);
  readonly speciesId = input.required<number>();

  /** Árbol → columnas por etapa (Eevee: [Eevee] → [8 ramas]). */
  protected readonly stages = computed<Step[][]>(() => {
    const species = this.dataset.species();
    const root = evolutionTree(species, this.speciesId());
    const stages: Step[][] = [];
    const walk = (node: EvolutionNode, depth: number, method: string | null) => {
      const s = species.get(node.id);
      (stages[depth] ??= []).push({
        id: node.id,
        name: s?.names.es ?? `#${node.id}`,
        seen: this.dex.statusOf(node.id) !== 'unseen',
        current: node.id === this.speciesId(),
        method,
      });
      for (const e of node.next) walk(e.node, depth + 1, methodText(e.link));
    };
    walk(root, 0, null);
    return stages;
  });

  protected art(id: number): string {
    return spriteUrls(id)[0];
  }
}
