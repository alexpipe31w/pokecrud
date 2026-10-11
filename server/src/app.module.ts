import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

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
    ConfigModule.forRoot({ isGlobal: true }),
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
        ],
        genReqId: requestId,
      },
    }),
    // Límite global por IP (almacén en memoria: un solo proceso, D-005). Login tendrá uno propio (F0-07).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
    PrismaModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
