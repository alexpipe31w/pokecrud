import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Move, TypeInfo } from '../../../shared/data/dataset.types.js';
import { buildTypeChart } from '../../../shared/engine/battle/type-chart.js';
import type { BattleContext } from '../../../shared/engine/battle/types.js';

/**
 * Datos fijos del motor de combate en el servidor (F5, D-056): movimientos y tabla de tipos del dataset, cargados una
 * vez (como `SpawnsService`). Sin dataset el PvP responde `server-error` en vez de tumbar el servidor.
 */
@Injectable()
export class BattleDataService {
  private readonly logger = new Logger(BattleDataService.name);
  readonly ctx: BattleContext | null;

  constructor(config: ConfigService) {
    const dir = dirname(
      resolve(
        config.get<string>('DATASET_PATH') ??
          resolve(process.cwd(), '../src/assets/data/pokedex.json'),
      ),
    );
    let ctx: BattleContext | null = null;
    try {
      const read = <T>(file: string): T =>
        JSON.parse(readFileSync(resolve(dir, file), 'utf8')) as T;
      const moves = read<Move[]>('moves.json');
      ctx = {
        moves: new Map(moves.map((m) => [m.id, m])),
        chart: buildTypeChart(read<TypeInfo[]>('types.json')),
      };
    } catch (err) {
      this.logger.error({
        msg: 'pvp.battle_data_unavailable',
        dir,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
    this.ctx = ctx;
  }
}
