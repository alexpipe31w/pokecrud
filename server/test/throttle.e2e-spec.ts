import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { Public } from '../src/auth/auth.decorators.js';

/** Ruta de prueba: el guard global solo actúa sobre rutas que existen (un 404 no cuenta). */
@Public()
@Controller('ping')
class PingController {
  @Get()
  ping(): string {
    return 'pong';
  }
}

describe('Rate limit global (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [PingController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('a partir de la petición 121 en un minuto responde 429', async () => {
    const server = app.getHttpServer();
    for (let i = 0; i < 120; i++)
      await request(server).get('/ping').expect(200);
    await request(server).get('/ping').expect(429);
  });

  it('/health no está limitado aunque se pase el límite', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(200);
  });
});
