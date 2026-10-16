import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { FirebaseService } from '../src/modules/firebase/firebase.service.js';

describe('Foods Catalog API (e2e)', () => {
  let app: INestApplication;

  const customFoodsStore = new Map<string, unknown>();

  const mockAuth = {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'user-1-token') {
        return { uid: 'user-foods-1', email: 'user1@example.com', email_verified: true };
      }
      if (token === 'user-2-token') {
        return { uid: 'user-foods-2', email: 'user2@example.com', email_verified: true };
      }
      if (token === 'unverified-token') {
        return { uid: 'user-unverified', email: 'unverified@example.com', email_verified: false };
      }
      throw new Error('Firebase ID token is invalid or expired');
    }),
    getUser: vi.fn(async (uid: string) => {
      return { uid, email: `${uid}@example.com`, emailVerified: uid !== 'user-unverified' };
    }),
  };

  const mockFirestore = {
    collection: vi.fn((colName: string) => {
      if (colName !== 'users') throw new Error(`Unexpected collection ${colName}`);
      return {
        doc: vi.fn((uid: string) => ({
          collection: vi.fn((subCol: string) => {
            if (subCol === 'customFoods') {
              return {
                doc: vi.fn((docId: string) => {
                  const key = `${uid}/${docId}`;
                  return {
                    id: docId,
                    get: vi.fn(async () => {
                      const data = customFoodsStore.get(key);
                      return { exists: Boolean(data), data: () => data };
                    }),
                    set: vi.fn(async (val: unknown) => {
                      customFoodsStore.set(key, val);
                    }),
                    update: vi.fn(async (patch: Record<string, unknown>) => {
                      const current = (customFoodsStore.get(key) as Record<string, unknown>) || {};
                      customFoodsStore.set(key, { ...current, ...patch });
                    }),
                  };
                }),
                where: vi.fn((field: string, _op: string, val: unknown) => ({
                  get: vi.fn(async () => {
                    const prefix = `${uid}/`;
                    const docs = Array.from(customFoodsStore.entries())
                      .filter(([k, v]) => k.startsWith(prefix) && (v as Record<string, unknown>)[field] === val)
                      .map(([, v]) => ({ data: () => v }));
                    return { docs };
                  }),
                })),
              };
            }
            throw new Error(`Unexpected subcollection ${subCol}`);
          }),
        })),
      };
    }),
  };

  const mockFirebaseService = {
    isAvailable: vi.fn(() => true),
    isConfigured: () => true,
    getAuth: () => mockAuth,
    getFirestore: () => mockFirestore,
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseService)
      .useValue(mockFirebaseService)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Autenticação e Permissões', () => {
    it('retorna 401 Unauthorized sem token', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/foods');
      expect(res.status).toBe(401);
    });

    it('retorna 403 Forbidden para usuário com e-mail não verificado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/foods')
        .set('Authorization', 'Bearer unverified-token');
      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/foods (Busca no Catálogo)', () => {
    it('pesquisa alimentos com normalização de acentos (ex: feijao)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/foods?query=feijao')
        .set('Authorization', 'Bearer user-1-token');

      expect(res.status).toBe(200);
      expect(res.body.items).toBeDefined();
      expect(res.body.items.length).toBeGreaterThan(0);
      expect(res.body.total).toBeGreaterThan(0);
      expect(res.body.items.some((i: { name: string }) => i.name.toLowerCase().includes('feijão'))).toBe(true);
    });

    it('suporta filtro por categoria e paginação com limit e offset', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/foods?category=Cereais e derivados&limit=5&offset=0')
        .set('Authorization', 'Bearer user-1-token');

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(5);
      expect(res.body.limit).toBe(5);
      expect(res.body.offset).toBe(0);
      expect(res.body.hasMore).toBe(true);
      expect(res.body.items.every((i: { category: string }) => i.category === 'Cereais e derivados')).toBe(true);
    });
  });

  describe('GET /api/v1/foods/:id', () => {
    it('retorna alimento oficial do catálogo TACO', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/foods/taco_1')
        .set('Authorization', 'Bearer user-1-token');

      expect(res.status).toBe(200);
      expect(res.body.id).toBe('taco_1');
      expect(res.body.name).toBe('Arroz, integral, cozido');
      expect(res.body.preparation).toBe('cozido');
      expect(res.body.nutrientsPer100g.energyKcal).toBeDefined();
      expect(res.body.householdMeasures.length).toBeGreaterThan(0);
    });

    it('retorna 404 para ID inexistente', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/foods/inexistente_123')
        .set('Authorization', 'Bearer user-1-token');

      expect(res.status).toBe(404);
    });
  });

  describe('Alimentos Personalizados (CRUD)', () => {
    let customFoodId: string;

    it('cria alimento personalizado via POST /api/v1/foods/me', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/foods/me')
        .set('Authorization', 'Bearer user-1-token')
        .send({
          name: 'Vitamina de Morango com Aveia',
          preparation: 'batido',
          category: 'Bebidas',
          nutrientsPer100g: {
            energyKcal: 75,
            proteinG: 3.5,
            carbohydrateG: 12,
            fatG: 1.5,
            fiberG: 2,
          },
          householdMeasures: [
            { id: 'copo', label: 'Copo cheio (250ml)', grams: 250 },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^custom_/);
      expect(res.body.name).toBe('Vitamina de Morango com Aveia');
      expect(res.body.isCustom).toBe(true);
      expect(res.body.userId).toBe('user-foods-1');
      customFoodId = res.body.id;
    });

    it('isola alimento personalizado: outro usuário recebe 404', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/foods/${customFoodId}`)
        .set('Authorization', 'Bearer user-2-token');

      expect(res.status).toBe(404);
    });

    it('atualiza alimento personalizado via PATCH /api/v1/foods/me/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/foods/me/${customFoodId}`)
        .set('Authorization', 'Bearer user-1-token')
        .send({
          name: 'Vitamina de Morango, Aveia e Chia',
          nutrientsPer100g: {
            energyKcal: 85,
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Vitamina de Morango, Aveia e Chia');
      expect(res.body.nutrientsPer100g.energyKcal).toBe(85);
      expect(res.body.nutrientsPer100g.proteinG).toBe(3.5); // preservado
    });

    it('impede alteração de alimento oficial do TACO (403)', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/v1/foods/me/taco_1')
        .set('Authorization', 'Bearer user-1-token')
        .send({ name: 'Arroz Modificado' });

      expect(res.status).toBe(403);
    });

    it('exclui alimento personalizado logicamente via DELETE /api/v1/foods/me/:id', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/foods/me/${customFoodId}`)
        .set('Authorization', 'Bearer user-1-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Consulta posterior retorna 404
      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/foods/${customFoodId}`)
        .set('Authorization', 'Bearer user-1-token');

      expect(getRes.status).toBe(404);
    });
  });
});
