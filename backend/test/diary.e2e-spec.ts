import { runReferenceTransaction } from './firestore-transaction.stub.js';
import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { FirebaseService } from '../src/modules/firebase/firebase.service.js';

describe('Diary and Journal API (e2e)', () => {
  let app: INestApplication;

  // In-memory Firestore simulation for diary subcollections
  const diaryStore = new Map<string, unknown>();

  const mockAuth = {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'user-diary-token') {
        return { uid: 'user-diary-1', email: 'diary1@example.com', email_verified: true };
      }
      if (token === 'user-obese3-token') {
        // Usuário com obesidade grau III isolada ou sem autorização clínica para déficit
        return { uid: 'user-obese3', email: 'obese3@example.com', email_verified: true };
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
    runTransaction: runReferenceTransaction,
    collection: vi.fn((colName: string) => {
      if (colName !== 'users') throw new Error(`Unexpected collection ${colName}`);
      return {
        doc: vi.fn((uid: string) => ({
          collection: vi.fn((subCol: string) => {
            const prefix = `${uid}/${subCol}/`;
            return {
              doc: vi.fn((docId: string) => {
                const key = `${prefix}${docId}`;
                return {
                  id: docId,
                  get: vi.fn(async () => {
                    const data = diaryStore.get(key);
                    return { exists: Boolean(data), data: () => data };
                  }),
                  set: vi.fn(async (val: unknown) => {
                    diaryStore.set(key, val);
                  }),
                  delete: vi.fn(async () => {
                    diaryStore.delete(key);
                  }),
                };
              }),
              where: vi.fn((field: string, op: string, val: unknown) => {
                let results = Array.from(diaryStore.entries())
                  .filter(([k]) => k.startsWith(prefix))
                  .map(([, v]) => v as Record<string, unknown>);

                const filter = (f: string, operator: string, v: unknown) => {
                  if (operator === '==') results = results.filter((item) => item[f] === v);
                  else if (operator === '>=')
                    results = results.filter((item) => (item[f] as string) >= (v as string));
                  else if (operator === '<=')
                    results = results.filter((item) => (item[f] as string) <= (v as string));
                };

                filter(field, op, val);

                const chain = {
                  where: vi.fn((f2: string, op2: string, v2: unknown) => {
                    filter(f2, op2, v2);
                    return chain;
                  }),
                  limit: vi.fn((lim: number) => ({
                    get: vi.fn(async () => {
                      const limited = results.slice(0, lim);
                      return {
                        empty: limited.length === 0,
                        docs: limited.map((item) => ({ data: () => item })),
                      };
                    }),
                  })),
                  get: vi.fn(async () => ({
                    empty: results.length === 0,
                    docs: results.map((item) => ({ data: () => item })),
                  })),
                };

                return chain;
              }),
            };
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
    it('retorna 401 sem autenticação', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/diary/me?date=2026-10-16');
      expect(res.status).toBe(401);
    });

    it('retorna 403 se o e-mail não estiver verificado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/diary/me?date=2026-10-16')
        .set('Authorization', 'Bearer unverified-token');
      expect(res.status).toBe(403);
    });
  });

  describe('Independência da Adaptação e Risco Clínico (Regra Fundamental)', () => {
    it('permite que usuário com obesidade grau III ou sem plano registre refeições e hábitos normalmente', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/diary/me/meals')
        .set('Authorization', 'Bearer user-obese3-token')
        .send({
          date: '2026-10-16',
          mealType: 'breakfast',
          title: 'Café da manhã',
          items: [{ foodId: 'taco_1', amount: 100, unit: 'g' }],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.userId).toBe('user-obese3');
    });
  });

  describe('Refeições e Snapshots (/api/v1/diary/me/meals)', () => {
    let createdMealId: string;

    it('cria refeição com medida caseira e snapshot imutável', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/diary/me/meals')
        .set('Authorization', 'Bearer user-diary-token')
        .send({
          date: '2026-10-16',
          mealType: 'lunch',
          title: 'Almoço Completo',
          items: [
            {
              foodId: 'taco_1', // Arroz, integral, cozido
              amount: 2,
              unit: 'household',
              householdMeasureId: 'colher_sopa', // IBGE: 20g cada -> 40g
            },
          ],
          clientRequestId: 'meal-lunch-1',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^meal_/);
      expect(res.body.items.length).toBe(1);

      const item = res.body.items[0];
      expect(item.name).toBe('Arroz, integral, cozido');
      expect(item.weightG).toBe(40);
      expect(item.householdMeasureLabel).toBe('Colher de sopa cheia');
      expect(item.calculatedNutrients.energyKcal).toBeCloseTo(49.413957, 8); // 123.53 * 50 / 100

      expect(res.body.totals.energyKcal.value).toBeCloseTo(49.413957, 8);
      expect(res.body.totals.energyKcal.isComplete).toBe(true);

      createdMealId = res.body.id;
    });

    it('rejeita medida caseira inexistente para o alimento', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/diary/me/meals')
        .set('Authorization', 'Bearer user-diary-token')
        .send({
          date: '2026-10-16',
          mealType: 'dinner',
          items: [
            {
              foodId: 'taco_1',
              amount: 1,
              unit: 'household',
              householdMeasureId: 'fatia_inexistente',
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_HOUSEHOLD_MEASURE');
    });

    it('mantém idempotência quando o mesmo clientRequestId for enviado', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/diary/me/meals')
        .set('Authorization', 'Bearer user-diary-token')
        .send({
          date: '2026-10-16',
          mealType: 'lunch',
          title: 'Almoço Completo',
          items: [
            {
              foodId: 'taco_1',
              amount: 2,
              unit: 'household',
              householdMeasureId: 'colher_sopa',
            },
          ],
          clientRequestId: 'meal-lunch-1',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(createdMealId);
    });

    it('atualiza refeição via PATCH /api/v1/diary/me/meals/:id', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/diary/me/meals/${createdMealId}`)
        .set('Authorization', 'Bearer user-diary-token')
        .send({
          title: 'Almoço Atualizado',
          items: [{ foodId: 'taco_1', amount: 100, unit: 'g' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.title).toBe('Almoço Atualizado');
      expect(res.body.items[0].weightG).toBe(100);
      expect(res.body.totals.energyKcal.value).toBeCloseTo(123.5348925, 9);
    });

    it('exclui refeição via DELETE /api/v1/diary/me/meals/:id', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/diary/me/meals/${createdMealId}`)
        .set('Authorization', 'Bearer user-diary-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const getRes = await request(app.getHttpServer())
        .patch(`/api/v1/diary/me/meals/${createdMealId}`)
        .set('Authorization', 'Bearer user-diary-token')
        .send({ title: 'Tentar alterar excluído' });

      expect(getRes.status).toBe(404);
    });
  });

  describe('Hidratação (/api/v1/diary/me/water)', () => {
    let waterId: string;

    it('registra água com quantidade em ml e suporta múltiplos registros', async () => {
      const res1 = await request(app.getHttpServer())
        .post('/api/v1/diary/me/water')
        .set('Authorization', 'Bearer user-diary-token')
        .send({ date: '2026-10-16', amountMl: 350, clientRequestId: 'water-1' });

      expect(res1.status).toBe(201);
      expect(res1.body.amountMl).toBe(350);
      waterId = res1.body.id;

      const res2 = await request(app.getHttpServer())
        .post('/api/v1/diary/me/water')
        .set('Authorization', 'Bearer user-diary-token')
        .send({ date: '2026-10-16', amountMl: 500, clientRequestId: 'water-2' });

      expect(res2.status).toBe(201);
      expect(res2.body.amountMl).toBe(500);
    });

    it('mantém idempotência por clientRequestId em água', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/diary/me/water')
        .set('Authorization', 'Bearer user-diary-token')
        .send({ date: '2026-10-16', amountMl: 350, clientRequestId: 'water-1' });

      expect(res.status).toBe(201);
      expect(res.body.id).toBe(waterId);
    });

    it('exclui registro de água via DELETE', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/diary/me/water/${waterId}`)
        .set('Authorization', 'Bearer user-diary-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Atividades Físicas (/api/v1/diary/me/activities)', () => {
    let actId: string;

    it('registra atividade física sem gerar gasto calórico fictício', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/diary/me/activities')
        .set('Authorization', 'Bearer user-diary-token')
        .send({
          date: '2026-10-16',
          type: 'cardio',
          description: 'Caminhada moderada',
          durationMinutes: 40,
          intensity: 'moderate',
          clientRequestId: 'act-1',
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.durationMinutes).toBe(40);
      expect(res.body.intensity).toBe('moderate');

      // Garante que não existem calorias inventadas
      expect(res.body.caloriesBurned).toBeUndefined();
      expect(res.body.calories).toBeUndefined();

      actId = res.body.id;
    });

    it('atualiza atividade física existente', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/diary/me/activities/${actId}`)
        .set('Authorization', 'Bearer user-diary-token')
        .send({ durationMinutes: 50 });

      expect(res.status).toBe(200);
      expect(res.body.durationMinutes).toBe(50);
    });

    it('exclui atividade física', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/diary/me/activities/${actId}`)
        .set('Authorization', 'Bearer user-diary-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Peso Semanal (/api/v1/diary/me/weight)', () => {
    it('registra peso e atualiza de forma idempotente para a mesma data civil', async () => {
      const res1 = await request(app.getHttpServer())
        .put('/api/v1/diary/me/weight')
        .set('Authorization', 'Bearer user-diary-token')
        .send({ date: '2026-10-16', weightKg: 85.5 });

      expect(res1.status).toBe(200);
      expect(res1.body.weightKg).toBe(85.5);

      const res2 = await request(app.getHttpServer())
        .put('/api/v1/diary/me/weight')
        .set('Authorization', 'Bearer user-diary-token')
        .send({ date: '2026-10-16', weightKg: 85.2 });

      expect(res2.status).toBe(200);
      expect(res2.body.weightKg).toBe(85.2);
    });

    it('exclui peso da data civil via DELETE', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/v1/diary/me/weight/2026-10-16')
        .set('Authorization', 'Bearer user-diary-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Leitura do Diário (/api/v1/diary/me e /summary)', () => {
    it('dia sem refeições não afirma consumo de 0 kcal', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/diary/me?date=2026-10-01')
        .set('Authorization', 'Bearer user-diary-token');

      expect(res.status).toBe(200);
      expect(res.body.date).toBe('2026-10-01');
      expect(res.body.nutritionTotals.hasEntries).toBe(false);
      expect(res.body.nutritionTotals.energyKcal.value).toBeNull();
      expect(res.body.hasAnyEntries).toBe(false);
    });

    it('retorna resumo compacto para o calendário via /api/v1/diary/me/summary', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/diary/me/summary?from=2026-10-01&to=2026-10-05')
        .set('Authorization', 'Bearer user-diary-token');

      expect(res.status).toBe(200);
      expect(res.body.items.length).toBe(5);
      expect(res.body.items[0].date).toBe('2026-10-01');
      expect(res.body.items[0].hasMealEntries).toBe(false);
    });

    it('rejeita resumo com intervalo maior que 62 dias (400)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/diary/me/summary?from=2026-01-01&to=2026-04-01')
        .set('Authorization', 'Bearer user-diary-token');

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('DATE_RANGE_TOO_LARGE');
    });
  });
});
