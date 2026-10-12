import { randomInt } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  GoneException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  type ThrowQuality,
  resolveThrow,
} from '../../../shared/engine/capture.js';
import { createRng } from '../../../shared/engine/rng.js';
import {
  type WildSpawn,
  parseSpawnId,
  slotEndsAt,
  slotFor,
} from '../../../shared/engine/spawns.js';
import { BagService, type BagView } from '../bag/bag.service.js';
import { isUniqueViolation } from '../common/prisma-errors.js';
import { Prisma } from '../generated/prisma/client.js';
import { LocationService, distanceM } from '../location/location.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProgressionService } from '../progression/progression.service.js';
import { SpawnsService } from '../spawns/spawns.service.js';
import type { ThrowDto } from './encounters.dto.js';

/**
 * Quién resuelve el lanzamiento: `resolveThrow` de shared/ (D-027). Es un proveedor para que los e2e puedan forzar
 * capturado / fallo / huida y probar la transacción sin depender del azar.
 */
export const THROW_RESOLVER = Symbol('THROW_RESOLVER');
export type ThrowResolver = typeof resolveThrow;

/** Hay que estar a esta distancia o menos del Pokémon (ARQUITECTURA §6). */
export const MAX_DISTANCE_M = 80;
/** La última ubicación (de GET /spawns) vale este tiempo. */
export const LOCATION_MAX_AGE_MS = 5 * 60_000;
/** XP: capturar 100; por lanzamiento que acierta, el bonus de precisión y de curva (como Pokémon GO). */
export const CAPTURE_XP = 100;
export const QUALITY_XP: Record<ThrowQuality, number> = {
  none: 0,
  nice: 10,
  great: 50,
  excellent: 100,
};
export const CURVE_XP = 10;
/** Antitrampa de precisión: si ≥ 12 de los últimos 20 lanzamientos fueron "excellent", el nuevo cuenta como "great". */
const PLAUSIBLE_WINDOW = 20;
const MAX_EXCELLENT_IN_WINDOW = 12;
/**
 * Lanzamientos simultáneos del mismo jugador se esperan entre sí por el bloqueo de la fila de la mochila (es lo que
 * los hace seguros). Con la BD en otro país cada transacción son ~1 s: se da margen para no cortarlas.
 */
const TX_OPTIONS = { maxWait: 5_000, timeout: 10_000 };
/** Retención (D-028): los lanzamientos solo sirven para idempotencia y antitrampa; los resultados, mientras vive la franja. */
const THROW_RETENTION_MS = 7 * 24 * 3600_000;
const RESULT_RETENTION_MS = 24 * 3600_000;

export interface EncounterView {
  id: string;
  speciesId: number;
  level: number;
  gender: 'M' | 'F' | null;
  shiny: boolean;
  heightScale: number;
  expiresAt: string;
  /** Si este jugador ya lo resolvió. */
  status: 'open' | 'caught' | 'fled';
}

export interface CaughtView {
  id: string;
  speciesId: number;
  level: number;
  gender: 'M' | 'F' | null;
  shiny: boolean;
  nature: string;
  heightScale: number;
  moves: number[];
}

export interface ThrowResult {
  clientThrowId: string;
  captured: boolean;
  shakes: number;
  fled: boolean;
  /** Calidad con la que contó el servidor (puede ser menor que la pedida). */
  throwQuality: ThrowQuality;
  xpGained: number;
  caught: CaughtView | null;
  bag: BagView;
}

const caughtView = (c: {
  id: string;
  speciesId: number;
  level: number;
  gender: 'M' | 'F' | null;
  shiny: boolean;
  nature: string;
  heightScale: number;
  moves: number[];
}): CaughtView => ({
  id: c.id,
  speciesId: c.speciesId,
  level: c.level,
  gender: c.gender,
  shiny: c.shiny,
  nature: c.nature,
  heightScale: c.heightScale,
  moves: c.moves,
});

/**
 * Encuentro y captura AUTORITATIVOS (F2-06, ARQUITECTURA §6, D-028). El cliente solo dice qué bola, qué baya,
 * cómo lanzó y un id de lanzamiento; el servidor recalcula el spawn, comprueba franja y distancia, gasta los
 * objetos con UPDATE condicional, tira SU RNG y guarda todo en UNA transacción.
 */
@Injectable()
export class EncountersService {
  private readonly logger = new Logger(EncountersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly spawns: SpawnsService,
    private readonly location: LocationService,
    private readonly progression: ProgressionService,
    private readonly bag: BagService,
    @Inject(THROW_RESOLVER) private readonly resolve: ThrowResolver,
  ) {}

  async details(
    playerId: string,
    encounterId: string,
    now = Date.now(),
  ): Promise<EncounterView> {
    const spawn = await this.reachableSpawn(playerId, encounterId, now);
    const result = await this.prisma.encounterResult.findUnique({
      where: { playerId_encounterId: { playerId, encounterId } },
      select: { outcome: true },
    });
    return {
      id: spawn.id,
      speciesId: spawn.speciesId,
      level: spawn.level,
      gender: spawn.gender,
      shiny: spawn.shiny,
      heightScale: this.spawns.heightScale(spawn.id),
      expiresAt: new Date(slotEndsAt(spawn.slot)).toISOString(),
      status: !result
        ? 'open'
        : result.outcome === 'CAUGHT'
          ? 'caught'
          : 'fled',
    };
  }

  async throw(
    playerId: string,
    encounterId: string,
    dto: ThrowDto,
    now = Date.now(),
  ): Promise<ThrowResult> {
    // 1) Reintento de red: mismo clientThrowId → mismo resultado, aunque la franja ya haya acabado.
    const replay = await this.replay(playerId, encounterId, dto.clientThrowId);
    if (replay) return replay;

    // 2) El spawn existe, su franja sigue viva y el jugador está cerca.
    const spawn = await this.reachableSpawn(playerId, encounterId, now);
    const species = this.spawns.speciesDetails(spawn.speciesId);
    if (!species) {
      throw new ServiceUnavailableException('Faltan los datos de esa especie');
    }
    const quality = await this.plausibleQuality(playerId, dto.throwQuality);

    // 3) El RNG es del servidor y no se puede predecir (semilla criptográfica por lanzamiento).
    const outcome = this.resolve(
      {
        captureRate: species.captureRate,
        ball: dto.ball,
        berry: dto.berry ?? null,
        throwQuality: quality,
        curve: dto.curve,
      },
      {
        captureRate: species.captureRate,
        speed: species.speed,
        isLegendary: species.isLegendary,
        isMythical: species.isMythical,
      },
      createRng(randomInt(0, 2 ** 32)),
    );
    const xpGained =
      QUALITY_XP[quality] +
      (dto.curve ? CURVE_XP : 0) +
      (outcome.captured ? CAPTURE_XP : 0);

    // 4) Todo o nada.
    try {
      const caught = await this.prisma.$transaction(async (tx) => {
        const resolved = await tx.encounterResult.findUnique({
          where: { playerId_encounterId: { playerId, encounterId } },
          select: { outcome: true },
        });
        if (resolved) {
          throw new ConflictException(
            resolved.outcome === 'CAUGHT'
              ? 'Ya capturaste este Pokémon'
              : 'Este Pokémon ya huyó',
          );
        }
        await this.spend(
          tx,
          playerId,
          dto.ball,
          'No te quedan bolas de ese tipo',
        );
        if (dto.berry) {
          await this.spend(
            tx,
            playerId,
            dto.berry,
            'No te quedan bayas de ese tipo',
          );
        }
        const created = outcome.captured
          ? await tx.caughtPokemon.create({
              data: {
                playerId,
                speciesId: spawn.speciesId,
                level: spawn.level,
                ivs: { ...spawn.ivs },
                nature: spawn.nature,
                gender: spawn.gender,
                shiny: spawn.shiny,
                heightScale: this.spawns.heightScale(spawn.id),
                moves: this.spawns.defaultMoves(spawn.speciesId, spawn.level),
                ball: dto.ball,
                encounterId,
                caughtLat: spawn.lat,
                caughtLng: spawn.lng,
              },
            })
          : null;
        if (outcome.captured || outcome.fled) {
          // UNIQUE (playerId, encounterId): si otro lanzamiento simultáneo ya lo resolvió, esto falla y se deshace
          // TODO (incluida la bola gastada).
          await tx.encounterResult.create({
            data: {
              playerId,
              encounterId,
              outcome: outcome.captured ? 'CAUGHT' : 'FLED',
            },
          });
        }
        if (xpGained > 0) {
          await this.progression.addXp(playerId, xpGained, tx);
        }
        // UNIQUE (playerId, clientThrowId): un reintento simultáneo con el mismo id falla aquí y no gasta nada.
        await tx.throw.create({
          data: {
            playerId,
            clientThrowId: dto.clientThrowId,
            encounterId,
            ball: dto.ball,
            berry: dto.berry ?? null,
            throwQuality: quality,
            curve: dto.curve,
            captured: outcome.captured,
            shakes: outcome.shakes,
            fled: outcome.fled,
            xpGained,
            caughtPokemonId: created?.id ?? null,
          },
        });
        return created;
      }, TX_OPTIONS);

      this.logger.log({
        msg: 'encounter.throw',
        playerId,
        encounterId,
        speciesId: spawn.speciesId,
        ball: dto.ball,
        quality,
        captured: outcome.captured,
        fled: outcome.fled,
        xpGained,
      });
      void this.prune(playerId, now);
      return {
        clientThrowId: dto.clientThrowId,
        captured: outcome.captured,
        shakes: outcome.shakes,
        fled: outcome.fled,
        throwQuality: quality,
        xpGained,
        caught: caught ? caughtView(caught) : null,
        bag: await this.bag.get(playerId),
      };
    } catch (err) {
      if (isUniqueViolation(err)) {
        const target = uniqueTarget(err);
        if (target.includes('clientThrowId')) {
          const stored = await this.replay(
            playerId,
            encounterId,
            dto.clientThrowId,
          );
          if (stored) return stored;
        }
        throw new ConflictException(
          'Este Pokémon ya se resolvió en otro lanzamiento',
        );
      }
      throw err;
    }
  }

  /** El spawn del id, si su franja sigue viva y el jugador estuvo cerca hace poco. */
  private async reachableSpawn(
    playerId: string,
    encounterId: string,
    now: number,
  ): Promise<WildSpawn> {
    const parsed = parseSpawnId(encounterId);
    if (!parsed) throw new NotFoundException('Ese Pokémon no existe');
    if (parsed.slot !== slotFor(now)) {
      throw new GoneException('Ese Pokémon ya se fue');
    }
    const spawn = await this.spawns.spawnById(encounterId);
    if (!spawn) throw new NotFoundException('Ese Pokémon no existe');

    const last = await this.location.last(playerId);
    if (!last || now - last.at.getTime() > LOCATION_MAX_AGE_MS) {
      throw new ForbiddenException(
        'No sabemos dónde estás: actualiza el mapa e inténtalo de nuevo',
      );
    }
    if (distanceM(last.lat, last.lng, spawn.lat, spawn.lng) > MAX_DISTANCE_M) {
      throw new ForbiddenException('Estás demasiado lejos de ese Pokémon');
    }
    return spawn;
  }

  /** Gasta 1 unidad en la propia sentencia (`qty >= 1`): dos lanzamientos a la vez nunca dejan la bolsa en −1. */
  private async spend(
    tx: Prisma.TransactionClient,
    playerId: string,
    item: 'POKE_BALL' | 'GREAT_BALL' | 'ULTRA_BALL' | 'RAZZ_BERRY',
    message: string,
  ): Promise<void> {
    const { count } = await tx.inventory.updateMany({
      where: { playerId, item, qty: { gte: 1 } },
      data: { qty: { decrement: 1 } },
    });
    if (count === 0) throw new ConflictException(message);
  }

  private async plausibleQuality(
    playerId: string,
    requested: ThrowQuality,
  ): Promise<ThrowQuality> {
    if (requested !== 'excellent') return requested;
    const recent = await this.prisma.throw.findMany({
      where: { playerId },
      orderBy: { createdAt: 'desc' },
      take: PLAUSIBLE_WINDOW,
      select: { throwQuality: true },
    });
    const excellent = recent.filter(
      (t) => t.throwQuality === 'excellent',
    ).length;
    if (excellent >= MAX_EXCELLENT_IN_WINDOW) {
      this.logger.warn({
        msg: 'encounter.throw.quality_capped',
        playerId,
        excellent,
      });
      return 'great';
    }
    return requested;
  }

  private async replay(
    playerId: string,
    encounterId: string,
    clientThrowId: string,
  ): Promise<ThrowResult | null> {
    const stored = await this.prisma.throw.findUnique({
      where: { playerId_clientThrowId: { playerId, clientThrowId } },
    });
    if (!stored) return null;
    if (stored.encounterId !== encounterId) {
      throw new ConflictException(
        'Ese clientThrowId ya se usó en otro encuentro',
      );
    }
    const caught = stored.caughtPokemonId
      ? await this.prisma.caughtPokemon.findFirst({
          where: { id: stored.caughtPokemonId, playerId },
        })
      : null;
    return {
      clientThrowId,
      captured: stored.captured,
      shakes: stored.shakes,
      fled: stored.fled,
      throwQuality: stored.throwQuality,
      xpGained: stored.xpGained,
      caught: caught ? caughtView(caught) : null,
      bag: await this.bag.get(playerId),
    };
  }

  /** Retención (D-028), mejor esfuerzo y fuera de la respuesta: si falla, queda en el log y se reintenta al siguiente lanzamiento. */
  private async prune(playerId: string, now: number): Promise<void> {
    try {
      await this.prisma.throw.deleteMany({
        where: {
          playerId,
          createdAt: { lt: new Date(now - THROW_RETENTION_MS) },
        },
      });
      await this.prisma.encounterResult.deleteMany({
        where: {
          playerId,
          createdAt: { lt: new Date(now - RESULT_RETENTION_MS) },
        },
      });
    } catch (err) {
      this.logger.warn({
        msg: 'encounter.prune_failed',
        playerId,
        reason: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

/** Columnas del UNIQUE violado (Prisma las da en `meta.target`, o en el mensaje con el adaptador pg). */
function uniqueTarget(err: unknown): string {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const target = err.meta?.['target'];
    if (Array.isArray(target)) return target.join(',');
    if (typeof target === 'string') return target;
    return JSON.stringify(err.meta ?? {}) + err.message;
  }
  return '';
}
