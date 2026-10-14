import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';

// e2e contra la base de datos REAL (server/.env). Sin .env este test falla a propósito.
describe('Health (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health/live → 200 {status: ok}', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect({ status: 'ok' });
  });

  it('GET /health/ready → 200 {status: ok, db: ok} con la base real', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect({ status: 'ok', db: 'ok' });
  });

  it('devuelve un x-request-id para correlacionar logs', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/live')
      .expect(200);
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('respeta un x-request-id que venga del cliente', async () => {
    const res = await request(app.getHttpServer())
      .get('/health/live')
      .set('x-request-id', 'prueba-123')
      .expect(200);
    expect(res.headers['x-request-id']).toBe('prueba-123');
  });

  it('una ruta inexistente da 404 en JSON sin stack', async () => {
    const res = await request(app.getHttpServer())
      .get('/no-existe')
      .expect(404);
    expect(res.body).toMatchObject({ statusCode: 404 });
    expect(JSON.stringify(res.body)).not.toContain('at ');
  });
});
