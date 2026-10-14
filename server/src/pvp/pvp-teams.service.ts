import { Injectable } from '@nestjs/common';
import type { PokemonInit } from '../../../shared/engine/battle/battle-engine.js';
import { calcStats, type Stats } from '../../../shared/engine/battle/stats.js';
import type { Nature } from '../../../shared/engine/spawns.js';
import { PVP_LEVEL } from '../../../shared/protocol/pvp.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SpawnsService } from '../spawns/spawns.service.js';
import { PvpFailure } from './pvp-failure.js';

/** Un lado listo para `createBattle`: el apodo del jugador y su equipo. */
export interface PvpSideInit {
  name: string;
  team: PokemonInit[];
}

/**
 * Equipo de PvP (D-056, reglas 1 y 2): `Team.caughtIds` del jugador, en su orden, a nivel 50 con los IVs y la
 * naturaleza de cada individuo y los movimientos que tendría a nivel 50. Dos consultas, sin N+1. Lo que se carga se
 * congela: transferir o editar el equipo después no cambia el combate.
 */
@Injectable()
export class PvpTeamsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly spawns: SpawnsService,
  ) {}

  async load(playerId: string, teamId: number): Promise<PvpSideInit> {
    const team = await this.prisma.team.findFirst({
      where: { id: teamId, playerId },
      select: { caughtIds: true, player: { select: { nickname: true } } },
    });
    if (!team) throw new PvpFailure('team-not-found');

    const rows = team.caughtIds.length
      ? await this.prisma.caughtPokemon.findMany({
          where: { id: { in: team.caughtIds }, playerId },
          select: { id: true, speciesId: true, ivs: true, nature: true },
        })
      : [];
    const byId = new Map(rows.map((r) => [r.id, r]));
    const members: PokemonInit[] = [];
    for (const id of team.caughtIds) {
      const row = byId.get(id);
      const species = row && this.spawns.speciesDetails(row.speciesId);
      // Transferido (ya no es suyo) o especie fuera del dataset: se salta.
      if (!row || !species) continue;
      members.push({
        uid: row.id,
        speciesId: row.speciesId,
        level: PVP_LEVEL,
        types: species.types,
        stats: calcStats(
          species.baseStats,
          row.ivs as unknown as Stats,
          PVP_LEVEL,
          row.nature as Nature,
        ),
        moves: this.spawns.defaultMoves(row.speciesId, PVP_LEVEL),
      });
    }
    if (members.length === 0) throw new PvpFailure('team-empty');
    return { name: team.player.nickname, team: members };
  }
}
