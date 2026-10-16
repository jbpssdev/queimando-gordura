import 'reflect-metadata';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/config/configure-app.js';
import { ClockService } from '../src/modules/adaptation/clock.service.js';
import type { AdaptationDocument } from '../src/modules/adaptation/types/adaptation.types.js';
import type { AssessmentDocument } from '../src/modules/assessment/types/assessment.types.js';
import type { AssessmentResultDocument } from '../src/modules/assessment/types/metrics.types.js';
import { FirebaseService } from '../src/modules/firebase/firebase.service.js';

describe('Adaptation Engine (e2e)', () => {
  let app: INestApplication;
  let testClock: ClockService;

  // In-memory Firestore simulation
  const assessmentDocs = new Map<string, AssessmentDocument>();
  const currentResults = new Map<string, AssessmentResultDocument>();
  const adaptationDocs = new Map<string, AdaptationDocument>();

  const mockAuth = {
    verifyIdToken: vi.fn(async (token: string) => {
      if (token === 'user-1-token') {
        return { uid: 'user-adaptation-1', email: 'user1@example.com', email_verified: true };
      }
      if (token === 'user-obese3-token') {
        return { uid: 'user-obese3', email: 'obese3@example.com', email_verified: true };
      }
      if (token === 'user-emergency-token') {
        return { uid: 'user-emergency', email: 'emergency@example.com', email_verified: true };
      }
      if (token === 'user-comorbid-token') {
        return { uid: 'user-comorbid', email: 'comorbid@example.com', email_verified: true };
      }
      if (token === 'user-unknown-token') {
        return { uid: 'user-unknown', email: 'unknown@example.com', email_verified: true };
      }
      if (token === 'user-b-token') {
        return { uid: 'user-adaptation-2', email: 'user2@example.com', email_verified: true };
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
            if (subCol === 'assessments') {
              return {
                doc: vi.fn((docId: string) => {
                  const assessKey = `${uid}/${docId}`;
                  return {
                    id: docId,
                    kind: 'assessment',
                    uid,
                    get: vi.fn(async () => {
                      const data = assessmentDocs.get(assessKey);
                      return { exists: Boolean(data), data: () => data };
                    }),
                    collection: vi.fn((nestedCol: string) => {
                      if (nestedCol !== 'results') throw new Error(`Unexpected ${nestedCol}`);
                      return {
                        doc: vi.fn((resId: string) => ({
                          id: resId,
                          get: vi.fn(async () => {
                            const data = currentResults.get(assessKey);
                            return { exists: Boolean(data), data: () => data };
                          }),
                        })),
                      };
                    }),
                  };
                }),
              };
            }
            if (subCol === 'adaptations') {
              return {
                doc: vi.fn((docId: string) => {
                  const adaptKey = `${uid}/${docId}`;
                  return {
                    id: docId,
                    kind: 'adaptation',
                    uid,
                    get: vi.fn(async () => {
                      const data = adaptationDocs.get(adaptKey);
                      return { exists: Boolean(data), data: () => data };
                    }),
                  };
                }),
              };
            }
            throw new Error(`Unexpected subcollection ${subCol}`);
          }),
        })),
      };
    }),
    runTransaction: vi.fn(async (cb: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        get: vi.fn(async (docRef: { id: string; kind: string; uid: string }) => {
          const map = docRef.kind === 'assessment' ? assessmentDocs : adaptationDocs;
          const data = map.get(`${docRef.uid}/${docRef.id}`);
          return { exists: Boolean(data), data: () => data };
        }),
        set: vi.fn((docRef: { id: string }, data: unknown) => {
          const doc = data as AdaptationDocument;
          adaptationDocs.set(`${doc.uid}/${docRef.id}`, doc);
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

  function setupAssessment(
    uid: string,
    revision: number,
    status: 'draft' | 'completed',
    bmiCategory: 'normal' | 'obesity_3' = 'normal',
    healthOverride: Partial<AssessmentDocument['sections']['health']> = {},
  ) {
    const assessDoc: AssessmentDocument = {
      uid,
      status,
      revision,
      sections: {
        body: {
          dateOfBirth: '1992-05-10',
          sexForMetabolicFormula: 'male',
          heightCm: 175,
          weightKg: bmiCategory === 'obesity_3' ? 130 : 75,
          scaleType: 'standard',
        },
        health: {
          conditions: [],
          hasNoKnownConditions: true,
          isConditionUnknown: false,
          symptoms: ['none'],
          ...healthOverride,
        },
        routine: {
          workPattern: 'sedentary',
          sittingHoursPerDay: 8,
          dailyMovementLevel: 'low',
          strengthTraining: { frequencyDaysPerWeek: 3, durationMinutes: 45, intensity: 'moderate' },
          cardioTraining: { frequencyDaysPerWeek: 2, durationMinutes: 30, intensity: 'light' },
        },
        nutrition: {
          mealsPerDay: 3,
          mealRegularity: 'regular',
          hasKitchenScale: true,
          sweetenedDrinksFrequency: 'never',
          alcoholFrequency: 'never',
          budgetConstrained: false,
          dietaryPreferences: ['omnivore'],
          allergies: [],
          intolerances: [],
          dietaryRestrictions: [],
          mealSources: ['home_cooked'],
          weightLossChallenges: [],
        },
      },
      createdAt: '2026-10-16T10:00:00.000Z',
      updatedAt: '2026-10-16T12:00:00.000Z',
      completedAt: status === 'completed' ? '2026-10-16T12:00:00.000Z' : null,
    };

    assessmentDocs.set(`${uid}/initial`, assessDoc);

    const isEmergency = Boolean(healthOverride?.symptoms?.includes('chest_pain'));

    const resultDoc: AssessmentResultDocument = {
      uid,
      revision,
      calculatedAt: '2026-10-16T12:00:00.000Z',
      age: 34,
      bmi: {
        value: bmiCategory === 'obesity_3' ? 42.4 : 24.5,
        category: bmiCategory,
        classification: bmiCategory === 'obesity_3' ? 'Obesidade grau 3' : 'Peso normal',
      },
      bmr: { formula: 'mifflin_st_jeor', calculated: true, bmrKcal: 1750 },
      tdee: {
        estimatedTdeeKcal: 2300,
        minTdeeKcal: 2116,
        maxTdeeKcal: 2484,
        neatMultiplier: 1.25,
        exerciseAddonKcal: 110,
        explanation: 'GET',
      },
      weightReference: {
        minNormalWeightKg: 56.7,
        maxNormalWeightKg: 76.3,
        milestone5PercentWeightKg: 71.3,
      },
      bodyComposition: { scaleType: 'standard' },
      safety: {
        status: isEmergency ? 'emergency' : 'cleared',
        alerts: [],
        requiresProfessionalClearance: isEmergency,
        isEmergency,
        allowsAutomaticCaloricDeficit: false,
        allowsIntensifiedAdaptation: false,
      },
    };

    currentResults.set(`${uid}/initial`, resultDoc);
  }

  beforeAll(async () => {
    testClock = new ClockService();
    vi.spyOn(testClock, 'now').mockReturnValue(new Date('2026-10-16T15:00:00.000Z'));

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(FirebaseService)
      .useValue(mockFirebaseService)
      .overrideProvider(ClockService)
      .useValue(testClock)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Autenticação e Permissões', () => {
    it('retorna 401 Unauthorized sem token válido', async () => {
      const server = app.getHttpServer();
      await request(server).get('/api/v1/adaptation/me/preview').expect(401);
      await request(server).post('/api/v1/adaptation/me/start').send({}).expect(401);
      await request(server).get('/api/v1/adaptation/me').expect(401);
    });

    it('retorna 403 Forbidden para e-mail não confirmado', async () => {
      const server = app.getHttpServer();
      await request(server)
        .get('/api/v1/adaptation/me/preview')
        .set('Authorization', 'Bearer unverified-token')
        .expect(403);
    });
  });

  describe('Validações de Avaliação Prévia', () => {
    it('retorna 404 quando o usuário ainda não possui avaliação inicial', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/preview')
        .set('Authorization', 'Bearer user-b-token')
        .expect(404);

      expect(res.body.code).toBe('ASSESSMENT_NOT_FOUND');
    });

    it('retorna 422 quando a avaliação inicial está em rascunho (incompleta)', async () => {
      setupAssessment('user-adaptation-1', 1, 'draft');

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/preview')
        .set('Authorization', 'Bearer user-1-token')
        .expect(422);

      expect(res.body.code).toBe('ASSESSMENT_INCOMPLETE');
    });

    it('retorna 409 quando a avaliação foi modificada após o cálculo (revisão defasada)', async () => {
      setupAssessment('user-adaptation-1', 2, 'completed');
      const current = currentResults.get('user-adaptation-1/initial')!;
      currentResults.set('user-adaptation-1/initial', { ...current, revision: 1 });

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/preview')
        .set('Authorization', 'Bearer user-1-token')
        .expect(409);

      expect(res.body.code).toBe('ASSESSMENT_OUTDATED');
    });
  });

  describe('GET /adaptation/me/preview - Elegibilidade e Separação de Riscos', () => {
    it('bloqueia modalidade Padrão se houver sintomas de urgência', async () => {
      setupAssessment('user-emergency', 1, 'completed', 'normal', {
        symptoms: ['chest_pain', 'fainting'],
      });

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/preview')
        .set('Authorization', 'Bearer user-emergency-token')
        .expect(200);

      expect(res.body.recommendedMode).toBeNull();
      expect(res.body.modes.standard.available).toBe(false);
      expect(res.body.modes.standard.reasons).toContain('EMERGENCY_SYMPTOMS_PRESENT');
      expect(res.body.calorieTargetAvailable).toBe(false);
    });

    it('bloqueia modalidade Padrão se condições de saúde forem desconhecidas', async () => {
      setupAssessment('user-unknown', 1, 'completed', 'normal', {
        isConditionUnknown: true,
        hasNoKnownConditions: false,
        conditions: [],
      });

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/preview')
        .set('Authorization', 'Bearer user-unknown-token')
        .expect(200);

      expect(res.body.recommendedMode).toBeNull();
      expect(res.body.modes.standard.available).toBe(false);
      expect(res.body.modes.standard.reasons).toContain('HEALTH_CONDITIONS_UNKNOWN');
    });

    it('bloqueia modalidade Padrão se houver comorbidade crônica restritiva', async () => {
      setupAssessment('user-comorbid', 1, 'completed', 'normal', {
        conditions: ['type_2_diabetes'],
        hasNoKnownConditions: false,
      });

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/preview')
        .set('Authorization', 'Bearer user-comorbid-token')
        .expect(200);

      expect(res.body.recommendedMode).toBeNull();
      expect(res.body.modes.standard.available).toBe(false);
      expect(res.body.modes.standard.reasons).toContain('CLINICAL_CONDITION_RESTRICTION');
    });

    it('libera modalidade Padrão para obesidade grau 3 isolada mantendo Intensificada restrita', async () => {
      setupAssessment('user-obese3', 1, 'completed', 'obesity_3');

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/preview')
        .set('Authorization', 'Bearer user-obese3-token')
        .expect(200);

      expect(res.body.recommendedMode).toBe('standard');
      expect(res.body.modes.standard.available).toBe(true);
      expect(res.body.modes.standard.reasons).toHaveLength(0);
      expect(res.body.modes.intensified.available).toBe(false);
      expect(res.body.modes.intensified.reasons).toContain(
        'OBESITY_CLASS_3_CLINICAL_EVALUATION_REQUIRED',
      );
      expect(res.body.calorieTargetAvailable).toBe(false);
    });

    it('libera modalidade Padrão para usuário sem contraindicações e IMC normal', async () => {
      setupAssessment('user-adaptation-1', 1, 'completed', 'normal');

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/preview')
        .set('Authorization', 'Bearer user-1-token')
        .expect(200);

      expect(res.body.recommendedMode).toBe('standard');
      expect(res.body.modes.standard.available).toBe(true);
      expect(res.body.modes.intensified.available).toBe(false);
      expect(res.body.modes.intensified.reasons).toContain('CLINICAL_POLICY_PENDING');
      expect(res.body.calorieTargetAvailable).toBe(false);
    });
  });

  describe('POST /adaptation/me/start - Início e Idempotência', () => {
    it('rejeita fuso horário IANA inválido com 400', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .post('/api/v1/adaptation/me/start')
        .set('Authorization', 'Bearer user-1-token')
        .send({
          mode: 'standard',
          timeZone: 'Fuso/Invalido',
        })
        .expect(400);

      expect(JSON.stringify(res.body)).toContain('fuso horário');
    });

    it('recusa modalidade Intensificada com 422', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .post('/api/v1/adaptation/me/start')
        .set('Authorization', 'Bearer user-1-token')
        .send({
          mode: 'intensified',
          timeZone: 'America/Recife',
        })
        .expect(422);

      expect(res.body.code).toBe('MODE_NOT_AVAILABLE');
    });

    it('inicia o plano com sucesso e responde 201 Created na primeira criação', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .post('/api/v1/adaptation/me/start')
        .set('Authorization', 'Bearer user-1-token')
        .send({
          mode: 'standard',
          timeZone: 'America/Recife',
        })
        .expect(201);

      expect(res.body.id).toBe('initial');
      expect(res.body.mode).toBe('standard');
      expect(res.body.status).toBe('active');
      expect(res.body.timeZone).toBe('America/Recife');
      expect(res.body.startLocalDate).toBe('2026-10-16');
      expect(res.body.day30LocalDate).toBe('2026-11-14');
      expect(res.body.currentDay).toBe(1);
      expect(res.body.elapsedDays).toBe(0);
      expect(res.body.remainingDays).toBe(30);
      expect(res.body.calendarProgressPercent).toBe(0);
      expect(res.body.calendar).toHaveLength(30);
      expect(res.body.calorieTarget).toBeNull();
    });

    it('responde 200 OK sem criar outro plano na repetição da mesma solicitação (idempotência)', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .post('/api/v1/adaptation/me/start')
        .set('Authorization', 'Bearer user-1-token')
        .send({
          mode: 'standard',
          timeZone: 'America/Recife',
        })
        .expect(200);

      expect(res.body.id).toBe('initial');
      expect(res.body.startLocalDate).toBe('2026-10-16');
    });

    it('produz 409 Conflict se tentar iniciar com fuso horário diferente', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .post('/api/v1/adaptation/me/start')
        .set('Authorization', 'Bearer user-1-token')
        .send({
          mode: 'standard',
          timeZone: 'Europe/London',
        })
        .expect(409);

      expect(res.body.code).toBe('ADAPTATION_ALREADY_STARTED');
    });
  });

  describe('GET /adaptation/me - Consulta do Plano e Ciclo de 30 Dias', () => {
    it('retorna 404 quando o usuário não possui plano', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me')
        .set('Authorization', 'Bearer user-b-token')
        .expect(404);

      expect(res.body.code).toBe('ADAPTATION_NOT_FOUND');
    });

    it('retorna o plano ativo com métricas e calendário no Dia 1', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me')
        .set('Authorization', 'Bearer user-1-token')
        .expect(200);

      expect(res.body.id).toBe('initial');
      expect(res.body.currentDay).toBe(1);
      expect(res.body.calendar[0].temporalState).toBe('today');
      expect(res.body.calendar[1].temporalState).toBe('future');
    });

    it('deriva status completed e conclui o plano após o encerramento do Dia 30', async () => {
      // Simula relógio no Dia 31 (2026-11-15)
      vi.spyOn(testClock, 'now').mockReturnValue(new Date('2026-11-15T10:00:00.000Z'));

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me')
        .set('Authorization', 'Bearer user-1-token')
        .expect(200);

      expect(res.body.status).toBe('completed');
      expect(res.body.currentDay).toBe(30);
      expect(res.body.elapsedDays).toBe(30);
      expect(res.body.remainingDays).toBe(0);
      expect(res.body.calendarProgressPercent).toBe(100.0);
      expect(
        res.body.calendar.every((d: { temporalState: string }) => d.temporalState === 'past'),
      ).toBe(true);
    });
  });
});
