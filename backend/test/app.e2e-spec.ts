import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import { Body, Controller, Get, Post, Logger } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { IsString } from 'class-validator';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';

class ValidationProbeDto {
  @IsString()
  name!: string;
}

// Controller presente apenas nos testes para verificar os mecanismos globais.
@Controller('validation-probe')
class ValidationProbeController {
  @Post()
  probe(@Body() body: ValidationProbeDto) {
    return body;
  }

  @Get('failure')
  failure(): never {
    throw new Error('sensitive-internal-detail');
  }
}
// Vite não emite os metadados de tipos; o teste fornece o mesmo metadado do tsc.
Reflect.defineMetadata(
  'design:paramtypes',
  [ValidationProbeDto],
  ValidationProbeController.prototype,
  'probe',
);

describe('API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ValidationProbeController],
    }).compile();
    app = module.createNestApplication();
    configureApp(app);
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });

  it('responde health sem declarar Firebase conectado', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({ status: 'ok' });
  });
  it('padroniza erros e não retorna a query string', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/missing?token=secret')
      .expect(404);
    expect(response.body).toMatchObject({ statusCode: 404, path: '/api/v1/missing' });
    expect(JSON.stringify(response.body)).not.toContain('secret');
    expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
  it('autoriza somente a origem configurada via CORS', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'http://localhost:4200')
      .expect('Access-Control-Allow-Origin', 'http://localhost:4200');
    const denied = await request(app.getHttpServer())
      .get('/api/v1/health')
      .set('Origin', 'https://untrusted.example');
    expect(denied.headers['access-control-allow-origin']).toBeUndefined();
  });
  it('responde preflight para Authorization', async () => {
    await request(app.getHttpServer())
      .options('/api/v1/health')
      .set('Origin', 'http://localhost:4200')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'Authorization')
      .expect(204)
      .expect('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  });
  it('oculta informações internas em falhas inesperadas', async () => {
    const errors = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    try {
      const response = await request(app.getHttpServer())
        .get('/api/v1/validation-probe/failure')
        .expect(500);
      expect(response.body.message).toBe('Erro interno do servidor.');
      expect(JSON.stringify(response.body)).not.toContain('sensitive-internal-detail');
      expect(response.body.stack).toBeUndefined();
      expect(errors).toHaveBeenCalledWith('Falha HTTP 500');
      expect(JSON.stringify(errors.mock.calls)).not.toContain('sensitive-internal-detail');
    } finally {
      errors.mockRestore();
    }
  });
  it('valida DTO e rejeita campos adicionais antes da operação', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .send({ name: 42 })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .send({ name: 'valid', extra: true })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/validation-probe')
      .send({ name: 'valid' })
      .expect(201)
      .expect({ name: 'valid' });
  });
});
