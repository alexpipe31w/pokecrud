import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_PIPE } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { AuthModule } from './auth/auth.module.js';
import { CustomPokemonModule } from './custom-pokemon/custom-pokemon.module.js';
import { FavoritesModule } from './favorites/favorites.module.js';
import { validateEnv } from './config/env.validation.js';
import { HealthModule } from './health/health.module.js';
import { InventoryModule } from './inventory/inventory.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SpawnsModule } from './spawns/spawns.module.js';
import { BagModule } from './bag/bag.module.js';
import { ProgressionModule } from './progression/progression.module.js';
import { EncountersModule } from './encounters/encounters.module.js';
import { TeamsModule } from './teams/teams.module.js';

const isProd = process.env['NODE_ENV'] === 'production';
const isTest = Boolean(process.env['VITEST']);

/** Id de correlación: el que mande el cliente (x-request-id) o uno nuevo; se devuelve en la respuesta. */
function requestId(req: IncomingMessage, res: ServerResponse): string {
  const incoming = req.headers['x-request-id'];
  const id =
    typeof incoming === 'string' && incoming.length <= 128
      ? incoming
      : randomUUID();
  res.setHeader('x-request-id', id);
  return id;
}

@Module({
  imports: [
    // Sin JWT_SECRET (≥ 32) o DATABASE_URL el servidor no arranca (ver config/env.validation.ts).
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    LoggerModule.forRoot({
      pinoHttp: {
        // JSON en producción; legible en desarrollo; silencio en los tests.
        level: isTest ? 'silent' : isProd ? 'info' : 'debug',
        transport:
          isProd || isTest
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
        redact: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.body.password',
          'req.body.refreshToken',
        ],
        genReqId: requestId,
      },
    }),
    // Límite global por IP (almacén en memoria: un solo proceso, D-005). Las rutas de auth tienen el suyo.
    ThrottlerModule.forRoot({
      throttlers: [{ ttl: 60_000, limit: 120 }],
      errorMessage:
        'Demasiadas peticiones. Espera un momento e inténtalo de nuevo.',
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    // CRUD del curso (F0-08), mismo contrato que JSON Server.
    InventoryModule,
    TeamsModule,
    FavoritesModule,
    CustomPokemonModule,
    // Juego (F1-06): Pokémon salvajes deterministas.
    SpawnsModule,
    // F1-08: mochila (GET /bag) y XP/nivel (sin endpoint, lo usan captura y combate).
    BagModule,
    ProgressionModule,
    // F2-06: encuentro y captura autoritativos.
    EncountersModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Validación global de DTOs. Aquí (y no en main.ts) para que también aplique en los tests e2e.
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    },
  ],
})
export class AppModule {}
