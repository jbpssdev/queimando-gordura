import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { FirebaseService } from '../src/modules/firebase/firebase.service.js';
import type { AssessmentDocument } from '../src/modules/assessment/types/assessment.types.js';
import type { AssessmentResultDocument } from '../src/modules/assessment/types/metrics.types.js';

describe('Assessment & Metrics (e2e)', () => {
  let app: INestApplication;

  // In-memory Firestore simulation
  const assessmentDocs = new Map<string, AssessmentDocument>();
  const currentResults = new Map<string, AssessmentResultDocument>();
  const revResults = new Map<string, AssessmentResultDocument>();

  const mockAuth = {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'valid-verified-token') {
        return {
          uid: 'user-assessment-1',
          email: 'user1@example.com',
          email_verified: true,
        };
      }
      if (token === 'another-verified-token') {
        return {
          uid: 'user-assessment-2',
          email: 'user2@example.com',
          email_verified: true,
        };
      }
      if (token === 'unverified-token') {
        return {
          uid: 'user-unverified',
          email: 'unverified@example.com',
          email_verified: false,
        };
      }
      throw new Error('Firebase ID token is invalid or expired');
    }),
    getUser: vi.fn(async (uid: string) => {
      if (uid === 'user-assessment-1') {
        return { uid, email: 'user1@example.com', emailVerified: true };
      }
      if (uid === 'user-assessment-2') {
        return { uid, email: 'user2@example.com', emailVerified: true };
      }
      if (uid === 'user-unverified') {
        return { uid, email: 'unverified@example.com', emailVerified: false };
      }
      throw new Error('User not found');
    }),
  };

  const getResultsDocMap = (path: string) => {
    if (path.endsWith('current')) return currentResults;
    return revResults;
  };

  const mockFirestore = {
    collection: vi.fn((colName: string) => {
      if (colName !== 'users') throw new Error(`Unexpected collection ${colName}`);
      return {
        doc: vi.fn((uid: string) => ({
          collection: vi.fn((subCol: string) => {
            if (subCol !== 'assessments') throw new Error(`Unexpected subcollection ${subCol}`);
            return {
              doc: vi.fn((docId: string) => {
                const assessKey = `${uid}/${docId}`;
                return {
                  id: docId,
                  get: vi.fn(async () => {
                    const data = assessmentDocs.get(assessKey);
                    return {
                      exists: Boolean(data),
                      data: () => data,
                    };
                  }),
                  collection: vi.fn((nestedCol: string) => {
                    if (nestedCol !== 'results')
                      throw new Error(`Unexpected subcollection ${nestedCol}`);
                    return {
                      doc: vi.fn((resultId: string) => {
                        const resKey = `${assessKey}/${resultId}`;
                        const map = getResultsDocMap(resultId);
                        return {
                          id: resultId,
                          get: vi.fn(async () => {
                            const data = map.get(resKey);
                            return {
                              exists: Boolean(data),
                              data: () => data,
                            };
                          }),
                        };
                      }),
                    };
                  }),
                };
              }),
            };
          }),
        })),
      };
    }),
    runTransaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: vi.fn(async (docRef: { id: string }) => {
          // Identify docRef type
          if (docRef.id === 'initial') {
            const data = assessmentDocs.get('user-assessment-1/initial');
            return {
              exists: Boolean(data),
              data: () => data,
            };
          }
          return { exists: false, data: () => null };
        }),
        set: vi.fn((docRef: { id: string }, data: unknown, options?: { merge?: boolean }) => {
          if (docRef.id === 'initial') {
            const key = 'user-assessment-1/initial';
            if (options?.merge && assessmentDocs.has(key)) {
              const current = assessmentDocs.get(key)!;
              assessmentDocs.set(key, { ...current, ...(data as AssessmentDocument) });
            } else {
              assessmentDocs.set(key, data as AssessmentDocument);
            }
          } else if (docRef.id === 'current') {
            currentResults.set(
              'user-assessment-1/initial/current',
              data as AssessmentResultDocument,
            );
          } else if (docRef.id.startsWith('rev_')) {
            revResults.set(
              `user-assessment-1/initial/${docRef.id}`,
              data as AssessmentResultDocument,
            );
          }
        }),
        update: vi.fn((docRef: { id: string }, partial: Partial<AssessmentDocument>) => {
          if (docRef.id === 'initial') {
            const key = 'user-assessment-1/initial';
            const current = assessmentDocs.get(key);
            if (current) {
              assessmentDocs.set(key, { ...current, ...partial });
            }
          }
        }),
      };
      return cb(tx);
    }),
  };

  const mockFirebaseService = {
    isAvailable: vi.fn(() => true),
    getAuth: vi.fn(() => mockAuth),
    getFirestore: vi.fn(() => mockFirestore),
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

  describe('Autenticação e Autorização', () => {
    it('retorna 401 Unauthorized sem token nos endpoints protegidos', async () => {
      const server = app.getHttpServer();
      await request(server).get('/api/v1/assessments/me').expect(401);
      await request(server).patch('/api/v1/assessments/me').send({}).expect(401);
      await request(server).post('/api/v1/assessments/me/evaluate').expect(401);
      await request(server).get('/api/v1/assessments/me/results').expect(401);
    });

    it('retorna 403 Forbidden para usuário com e-mail não verificado', async () => {
      const server = app.getHttpServer();
      await request(server)
        .get('/api/v1/assessments/me')
        .set('Authorization', 'Bearer unverified-token')
        .expect(403);
    });

    it('retorna 404 quando o usuário ainda não possui avaliação', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/assessments/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(404);

      expect(res.body.message).toBe('Avaliação não encontrada.');
    });
  });

  describe('PATCH /api/v1/assessments/me - Validações e Preenchimento Gradual', () => {
    it('rejeita seção inexistente ou inválida com 400', async () => {
      const server = app.getHttpServer();
      await request(server)
        .patch('/api/v1/assessments/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({ section: 'invalid_section', data: { some: 'value' } })
        .expect(400);
    });

    it('rejeita menor de 18 anos na data de nascimento com 400', async () => {
      const server = app.getHttpServer();
      // Nascido há menos de 18 anos
      const res = await request(server)
        .patch('/api/v1/assessments/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({
          section: 'body',
          data: {
            dateOfBirth: '2020-01-01',
          },
        })
        .expect(400);

      expect(JSON.stringify(res.body)).toContain('18 anos');
    });

    it('salva seção body criando draft e revisão 1', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .patch('/api/v1/assessments/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({
          section: 'body',
          data: {
            dateOfBirth: '1992-04-10',
            sexForMetabolicFormula: 'male',
            heightCm: 178,
            weightKg: 84,
            targetWeightKg: 75,
            scaleType: 'standard',
          },
        })
        .expect(200);

      expect(res.body.status).toBe('draft');
      expect(res.body.revision).toBe(1);
      expect(res.body.sections.body.weightKg).toBe(84);
      expect(res.body.sections.health).toBeNull();
    });

    it('salva seção health mesclando sem apagar body e incrementando revisão para 2', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .patch('/api/v1/assessments/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({
          section: 'health',
          data: {
            conditions: [],
            hasNoKnownConditions: true,
            isConditionUnknown: false,
            symptoms: ['none'],
          },
        })
        .expect(200);

      expect(res.body.revision).toBe(2);
      expect(res.body.sections.body.heightCm).toBe(178);
      expect(res.body.sections.health.hasNoKnownConditions).toBe(true);
    });

    it('salva seções routine e nutrition completando a avaliação', async () => {
      const server = app.getHttpServer();

      // Routine
      await request(server)
        .patch('/api/v1/assessments/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({
          section: 'routine',
          data: {
            workPattern: 'sedentary',
            sittingHoursPerDay: 7,
            dailyMovementLevel: 'moderate',
            strengthTraining: {
              frequencyDaysPerWeek: 3,
              durationMinutes: 50,
              intensity: 'moderate',
            },
            cardioTraining: {
              frequencyDaysPerWeek: 2,
              durationMinutes: 30,
              intensity: 'light',
            },
          },
        })
        .expect(200);

      // Nutrition
      const res = await request(server)
        .patch('/api/v1/assessments/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({
          section: 'nutrition',
          data: {
            mealsPerDay: 4,
            mealRegularity: 'regular',
            hasKitchenScale: true,
            sweetenedDrinksFrequency: 'rarely',
            alcoholFrequency: 'never',
            budgetConstrained: false,
            dietaryPreferences: ['omnivore'],
            allergies: [],
            intolerances: [],
            dietaryRestrictions: [],
            mealSources: ['home_cooked'],
            weightLossChallenges: [],
          },
        })
        .expect(200);

      expect(res.body.revision).toBe(4);
      expect(res.body.sections.routine.sittingHoursPerDay).toBe(7);
      expect(res.body.sections.nutrition.mealsPerDay).toBe(4);
    });
  });

  describe('POST /api/v1/assessments/me/evaluate & GET /me/results', () => {
    it('retorna 404 em GET results antes de avaliar', async () => {
      const server = app.getHttpServer();
      await request(server)
        .get('/api/v1/assessments/me/results')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(404);
    });

    it('calcula e consolida resultados com sucesso para avaliação completa', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .post('/api/v1/assessments/me/evaluate')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(201);

      expect(res.body.revision).toBe(4);
      expect(res.body.bmi.value).toBe(26.5);
      expect(res.body.bmi.category).toBe('overweight');
      expect(res.body.bmr.calculated).toBe(true);
      expect(res.body.bmr.bmrKcal).toBeGreaterThan(1600);
      expect(res.body.tdee.estimatedTdeeKcal).toBeGreaterThan(res.body.bmr.bmrKcal);
      expect(res.body.weightReference.minNormalWeightKg).toBeCloseTo(58.6, 1);
      expect(res.body.weightReference.maxNormalWeightKg).toBeCloseTo(78.9, 1);
      expect(res.body.weightReference.milestone5PercentWeightKg).toBe(79.8);
      expect(res.body.safety.status).toBe('cleared');
    });

    it('retorna resultado existente idempotente na chamada repetida', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .post('/api/v1/assessments/me/evaluate')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(201);

      expect(res.body.revision).toBe(4);
    });

    it('retorna 200 em GET results quando cálculo está atualizado', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/assessments/me/results')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(200);

      expect(res.body.revision).toBe(4);
      expect(res.body.bmi.value).toBe(26.5);
    });

    it('retorna 409 Conflict em GET results se o usuário alterar a avaliação após o cálculo', async () => {
      const server = app.getHttpServer();

      // Altera o peso
      await request(server)
        .patch('/api/v1/assessments/me')
        .set('Authorization', 'Bearer valid-verified-token')
        .send({
          section: 'body',
          data: { weightKg: 82 },
        })
        .expect(200);

      // GET results deve acusar conflito (revisão da avaliação > revisão dos resultados)
      const res = await request(server)
        .get('/api/v1/assessments/me/results')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(409);

      expect(res.body.message).toContain('modificada após o último cálculo');
    });

    it('recalcula e resolve o 409 quando evaluate é executado novamente', async () => {
      const server = app.getHttpServer();
      const evalRes = await request(server)
        .post('/api/v1/assessments/me/evaluate')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(201);

      expect(evalRes.body.revision).toBe(5);
      expect(evalRes.body.bmi.value).toBe(25.9); // 82kg / (1.78^2)

      const getRes = await request(server)
        .get('/api/v1/assessments/me/results')
        .set('Authorization', 'Bearer valid-verified-token')
        .expect(200);

      expect(getRes.body.revision).toBe(5);
      expect(getRes.body.bmi.value).toBe(25.9);
    });
  });
});
