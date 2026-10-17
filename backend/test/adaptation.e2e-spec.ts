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
import type {
  ActivityEntry,
  MealDocument,
  WaterEntry,
  WeightEntry,
} from '../src/modules/diary/types/diary.types.js';
import { FirebaseService } from '../src/modules/firebase/firebase.service.js';

describe('Adaptation Engine (e2e)', () => {
  let app: INestApplication;
  let testClock: ClockService;

  // In-memory Firestore simulation
  const assessmentDocs = new Map<string, AssessmentDocument>();
  const currentResults = new Map<string, AssessmentResultDocument>();
  const adaptationDocs = new Map<string, AdaptationDocument>();
  const diaryMeals = new Map<string, Partial<MealDocument>[]>();
  const diaryWater = new Map<string, Partial<WaterEntry>[]>();
  const diaryActivities = new Map<string, Partial<ActivityEntry>[]>();
  const diaryWeights = new Map<string, Partial<WeightEntry>[]>();
  const defaultNutrient = { value: 0, isComplete: true };
  const mockMealTotals = (kcal: number) => ({
    energyKcal: { value: kcal, isComplete: true },
    proteinG: defaultNutrient,
    carbohydrateG: defaultNutrient,
    fatG: defaultNutrient,
    fiberG: defaultNutrient,
  });

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
          get: vi.fn(async () => ({
            exists: true,
            data: () => ({ displayName: `Usuário ${uid}` }),
          })),
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
            if (subCol === 'diary_meals') {
              return {
                where: vi.fn().mockReturnThis(),
                get: vi.fn(async () => ({
                  docs: (diaryMeals.get(uid) || []).map((m) => ({
                    data: () => m as unknown as MealDocument,
                  })),
                })),
              };
            }
            if (subCol === 'diary_water') {
              return {
                where: vi.fn().mockReturnThis(),
                get: vi.fn(async () => ({
                  docs: (diaryWater.get(uid) || []).map((w) => ({
                    data: () => w as unknown as WaterEntry,
                  })),
                })),
              };
            }
            if (subCol === 'diary_activities') {
              return {
                where: vi.fn().mockReturnThis(),
                get: vi.fn(async () => ({
                  docs: (diaryActivities.get(uid) || []).map((a) => ({
                    data: () => a as unknown as ActivityEntry,
                  })),
                })),
              };
            }
            if (subCol === 'diary_weights') {
              return {
                where: vi.fn().mockReturnThis(),
                get: vi.fn(async () => ({
                  docs: (diaryWeights.get(uid) || []).map((wt) => ({
                    data: () => wt as unknown as WeightEntry,
                  })),
                })),
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

  describe('GET /adaptation/me/progress - Progresso, Evolução e Conquistas', () => {
    it('retorna 401 para requisição sem autenticação', async () => {
      const server = app.getHttpServer();
      await request(server).get('/api/v1/adaptation/me/progress').expect(401);
    });

    it('retorna 403 para usuário com e-mail não verificado', async () => {
      const server = app.getHttpServer();
      await request(server)
        .get('/api/v1/adaptation/me/progress')
        .set('Authorization', 'Bearer unverified-token')
        .expect(403);
    });

    it('retorna 404 quando o usuário não possui plano', async () => {
      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/progress')
        .set('Authorization', 'Bearer user-b-token')
        .expect(404);

      expect(res.body.code).toBe('ADAPTATION_NOT_FOUND');
    });

    it('retorna estrutura completa de progresso para plano ativo no Dia 1', async () => {
      vi.spyOn(testClock, 'now').mockReturnValue(new Date('2026-10-16T15:00:00.000Z'));

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/progress')
        .set('Authorization', 'Bearer user-1-token')
        .expect(200);

      expect(res.body.id).toBe('initial');
      expect(res.body.mode).toBe('standard');
      expect(res.body.status).toBe('active');
      expect(res.body.currentDay).toBe(1);
      expect(res.body.reportAvailable).toBe(false);

      // Participação
      expect(res.body.participation).toBeDefined();
      expect(res.body.participation.distinctDaysRecorded).toBe(0);

      // 5 períodos semanais
      expect(res.body.weeklyPeriods).toHaveLength(5);
      expect(res.body.weeklyPeriods[0].periodNumber).toBe(1);
      expect(res.body.weeklyPeriods[4].periodNumber).toBe(5);

      // Evolução do peso
      expect(res.body.weightEvolution).toBeDefined();
      expect(res.body.weightEvolution.initialDeclaredWeight).toBeDefined();
      expect(res.body.weightEvolution.initialDeclaredWeight.weightKg).toBe(75);
      expect(res.body.weightEvolution.initialDeclaredWeight.source).toBe('initial_assessment');
      expect(res.body.weightEvolution.weightDeltaKg).toBeNull();
      expect(res.body.weightEvolution.deltaReason).toBe('NO_MEASUREMENTS_RECORDED');

      // Indicadores derivados
      expect(res.body.derivedIndicators).toBeDefined();

      // Conquistas
      expect(res.body.achievements).toBeDefined();
      expect(res.body.achievements.locked).toHaveLength(7);
      expect(res.body.achievements.unlocked).toHaveLength(0);
    });

    it('agrega dados reais do diário, atualiza indicadores e desbloqueia conquistas', async () => {
      vi.spyOn(testClock, 'now').mockReturnValue(new Date('2026-10-25T15:00:00.000Z'));

      const uid = 'user-adaptation-1';
      // Refeições em dias distintos
      diaryMeals.set(uid, [
        {
          id: 'meal-1',
          date: '2026-10-16',
          mealType: 'breakfast',
          totals: mockMealTotals(450),
        },
        {
          id: 'meal-2',
          date: '2026-10-17',
          mealType: 'lunch',
          totals: mockMealTotals(650),
        },
      ]);
      // Água
      diaryWater.set(uid, [
        { id: 'w-1', date: '2026-10-16', amountMl: 500 },
        { id: 'w-2', date: '2026-10-18', amountMl: 750 },
      ]);
      // Atividades
      diaryActivities.set(uid, [
        { id: 'act-1', date: '2026-10-16', type: 'cardio', durationMinutes: 30 },
      ]);
      // Pesagens: duas medições para calcular variação
      diaryWeights.set(uid, [
        { date: '2026-10-16', weightKg: 75.0 },
        { date: '2026-10-23', weightKg: 73.8 },
      ]);

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/progress')
        .set('Authorization', 'Bearer user-1-token')
        .expect(200);

      // Datas distintas: 16, 17, 18, 23 -> 4 datas distintas
      expect(res.body.participation.distinctDaysRecorded).toBe(4);
      expect(res.body.participation.daysWithMeals).toBe(2);
      expect(res.body.participation.daysWithWater).toBe(2);
      expect(res.body.participation.daysWithActivities).toBe(1);
      expect(res.body.participation.daysWithWeight).toBe(2);

      // Variação de peso calculada entre 75.0 e 73.8 (-1.2 kg)
      expect(res.body.weightEvolution.measurements).toHaveLength(2);
      expect(res.body.weightEvolution.weightDeltaKg).toBe(-1.2);
      expect(res.body.weightEvolution.deltaReason).toBeNull();

      // IMC atualizado com 73.8 kg na altura de 175 cm (73.8 / 1.75^2 = 24.1)
      expect(res.body.derivedIndicators.currentBmi?.value).toBe(24.1);

      // Conquistas desbloqueadas
      const unlocked = res.body.achievements.unlocked.map((a: { code: string }) => a.code);
      expect(unlocked).toContain('FIRST_DIARY_ENTRY');
      expect(unlocked).toContain('FIRST_MEAL_ENTRY');
      expect(unlocked).toContain('FIRST_ACTIVITY_ENTRY');
      expect(unlocked).toContain('FIRST_WEIGHT_ENTRY');
      expect(unlocked).not.toContain('SEVEN_DISTINCT_DAYS_RECORDED');
    });

    it('reportAvailable se torna true após encerramento do Dia 30', async () => {
      // Simula Dia 31
      vi.spyOn(testClock, 'now').mockReturnValue(new Date('2026-11-15T15:00:00.000Z'));

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/progress')
        .set('Authorization', 'Bearer user-1-token')
        .expect(200);

      expect(res.body.status).toBe('completed');
      expect(res.body.reportAvailable).toBe(true);

      const unlocked = res.body.achievements.unlocked.map((a: { code: string }) => a.code);
      expect(unlocked).toContain('ADAPTATION_30_DAYS_COMPLETED');
    });
  });

  describe('GET /adaptation/me/report.pdf - Relatório PDF Oficial', () => {
    it('retorna 401 para requisição sem autenticação', async () => {
      const server = app.getHttpServer();
      await request(server).get('/api/v1/adaptation/me/report.pdf').expect(401);
    });

    it('retorna 403 para usuário com e-mail não verificado', async () => {
      const server = app.getHttpServer();
      await request(server)
        .get('/api/v1/adaptation/me/report.pdf')
        .set('Authorization', 'Bearer unverified-token')
        .expect(403);
    });

    it('retorna 400 Bad Request se includeHealthDetails for inválido', async () => {
      const server = app.getHttpServer();
      await request(server)
        .get('/api/v1/adaptation/me/report.pdf?includeHealthDetails=invalido')
        .set('Authorization', 'Bearer user-1-token')
        .expect(400);
    });

    it('retorna 422 REPORT_NOT_AVAILABLE se o plano ainda estiver em andamento (Dia 10)', async () => {
      vi.spyOn(testClock, 'now').mockReturnValue(new Date('2026-10-25T15:00:00.000Z'));

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/report.pdf')
        .set('Authorization', 'Bearer user-1-token')
        .expect(422);

      expect(res.body.code).toBe('REPORT_NOT_AVAILABLE');
      expect(res.body.message).toContain('30 dias');
    });

    it('retorna 200 com binário PDF legítimo após o encerramento dos 30 dias (Dia 31)', async () => {
      vi.spyOn(testClock, 'now').mockReturnValue(new Date('2026-11-15T15:00:00.000Z'));

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/report.pdf')
        .set('Authorization', 'Bearer user-1-token')
        .expect(200);

      expect(res.headers['content-type']).toBe('application/pdf');
      expect(res.headers['content-disposition']).toBe(
        'attachment; filename="relatorio-adaptacao-30-dias.pdf"',
      );
      expect(res.headers['cache-control']).toBe('no-store');

      expect(Buffer.isBuffer(res.body)).toBe(true);
      const pdfText = res.body.toString('latin1');
      expect(pdfText.startsWith('%PDF-1.4')).toBe(true);
      expect(pdfText).toContain('%%EOF');
      expect(pdfText).toContain('Queimando Gordura');
    });

    it('omite informações clínicas quando includeHealthDetails=false', async () => {
      vi.spyOn(testClock, 'now').mockReturnValue(new Date('2026-11-15T15:00:00.000Z'));

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/report.pdf?includeHealthDetails=false')
        .set('Authorization', 'Bearer user-1-token')
        .expect(200);

      const pdfText = res.body.toString('latin1');
      expect(pdfText).not.toContain('INFORMA\\307\\325ES AUTODECLARADAS PELO USU\\301RIO');
    });

    it('inclui informações clínicas autodeclaradas quando includeHealthDetails=true', async () => {
      vi.spyOn(testClock, 'now').mockReturnValue(new Date('2026-11-15T15:00:00.000Z'));

      const server = app.getHttpServer();
      const res = await request(server)
        .get('/api/v1/adaptation/me/report.pdf?includeHealthDetails=true')
        .set('Authorization', 'Bearer user-1-token')
        .expect(200);

      const pdfText = res.body.toString('latin1');
      expect(pdfText).toContain('INFORMA\\307\\325ES AUTODECLARADAS PELO USU\\301RIO');
    });
  });
});

