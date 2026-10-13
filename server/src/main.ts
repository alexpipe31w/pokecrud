import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';
import { corsOrigins } from './common/cors.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  // En producción (Render) hay un proxy delante: sin esto todos los jugadores tendrían la IP del
  // proxy y el rate limit por IP los bloquearía a todos juntos.
  if (process.env['NODE_ENV'] === 'production') app.set('trust proxy', 1);
  app.use(helmet());
  app.enableCors({
    origin: corsOrigins(),
    credentials: false,
    // Total de un listado paginado (contrato de JSON Server con _page/_limit).
    exposedHeaders: ['X-Total-Count'],
  });
  app.enableShutdownHooks();
  await app.listen(Number(process.env['PORT'] ?? 3000), '0.0.0.0');
}
await bootstrap();
