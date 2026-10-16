import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssessmentService } from '../assessment/assessment.service.js';
import type { AssessmentResponse } from '../assessment/types/assessment.types.js';
import type { AssessmentResultDocument } from '../assessment/types/metrics.types.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { FirebaseService } from '../firebase/firebase.service.js';
import { AdaptationEligibilityService } from './adaptation-eligibility.service.js';
import { AdaptationService } from './adaptation.service.js';
import { ClockService } from './clock.service.js';
import type { AdaptationDocument } from './types/adaptation.types.js';

describe('AdaptationService', () => {
  let adaptationService: AdaptationService;
  let eligibilityService: AdaptationEligibilityService;
  let clockService: ClockService;
  let mockFirebaseService: FirebaseService;
  let mockAssessmentService: AssessmentService;
  let mockFirestore: {
    collection: ReturnType<typeof vi.fn>;
    runTransaction: ReturnType<typeof vi.fn>;
  };

  const user: AuthenticatedUser = {
    uid: 'user-adaptation-1',
    email: 'user@example.com',
    emailVerified: true,
  };

  const validAssessment: AssessmentResponse = {
    status: 'completed',
    revision: 1,
    sections: {
      body: {
        dateOfBirth: '1990-05-15',
        sexForMetabolicFormula: 'male',
        heightCm: 180,
        weightKg: 80,
        scaleType: 'standard',
      },
      health: {
        conditions: [],
        hasNoKnownConditions: true,
        isConditionUnknown: false,
        symptoms: ['none'],
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
    updatedAt: '2026-10-16T12:00:00.000Z',
    completedAt: '2026-10-16T12:00:00.000Z',
  };

  const validResults: AssessmentResultDocument = {
    uid: user.uid,
    revision: 1,
    calculatedAt: '2026-10-16T12:00:00.000Z',
    age: 36,
    bmi: { value: 24.7, category: 'normal', classification: 'Peso normal' },
    bmr: { formula: 'mifflin_st_jeor', calculated: true, bmrKcal: 1780 },
    tdee: {
      estimatedTdeeKcal: 2350,
      minTdeeKcal: 2162,
      maxTdeeKcal: 2538,
      neatMultiplier: 1.25,
      exerciseAddonKcal: 125,
      explanation: 'GET conservador',
    },
    weightReference: {
      minNormalWeightKg: 59.9,
      maxNormalWeightKg: 80.7,
      milestone5PercentWeightKg: 76.0,
    },
    bodyComposition: { scaleType: 'standard' },
    safety: {
      status: 'cleared',
      alerts: [],
      requiresProfessionalClearance: false,
      isEmergency: false,
      allowsAutomaticCaloricDeficit: false,
      allowsIntensifiedAdaptation: false,
    },
  };

  beforeEach(() => {
    mockFirestore = {
      collection: vi.fn(),
      runTransaction: vi.fn(),
    };
    mockFirebaseService = {
      getFirestore: vi.fn().mockReturnValue(mockFirestore),
    } as unknown as FirebaseService;

    mockAssessmentService = {
      getAssessment: vi.fn().mockResolvedValue(validAssessment),
      getResults: vi.fn().mockResolvedValue(validResults),
    } as unknown as AssessmentService;

    eligibilityService = new AdaptationEligibilityService();
    clockService = new ClockService();
    vi.spyOn(clockService, 'now').mockReturnValue(new Date('2026-10-16T15:00:00.000Z'));

    adaptationService = new AdaptationService(
      mockFirebaseService,
      mockAssessmentService,
      eligibilityService,
      clockService,
    );
  });

  describe('getPreview', () => {
    it('lança 404 se a avaliação inicial não existir', async () => {
      vi.mocked(mockAssessmentService.getAssessment).mockRejectedValue(
        new NotFoundException('Avaliação não encontrada.'),
      );

      await expect(adaptationService.getPreview(user)).rejects.toMatchObject({
        status: 404,
        response: expect.objectContaining({ code: 'ASSESSMENT_NOT_FOUND' }),
      });
    });

    it('lança 422 se a avaliação estiver incompleta', async () => {
      vi.mocked(mockAssessmentService.getAssessment).mockResolvedValue({
        ...validAssessment,
        status: 'draft',
      });

      await expect(adaptationService.getPreview(user)).rejects.toMatchObject({
        status: 422,
        response: expect.objectContaining({ code: 'ASSESSMENT_INCOMPLETE' }),
      });
    });

    it('lança 409 se a avaliação foi alterada após o cálculo (revisão defasada)', async () => {
      vi.mocked(mockAssessmentService.getAssessment).mockResolvedValue({
        ...validAssessment,
        revision: 2,
      });
      vi.mocked(mockAssessmentService.getResults).mockResolvedValue({
        ...validResults,
        revision: 1,
      });

      await expect(adaptationService.getPreview(user)).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ code: 'ASSESSMENT_OUTDATED' }),
      });
    });

    it('retorna a prévia com recomendação e modos para avaliação válida', async () => {
      const preview = await adaptationService.getPreview(user);
      expect(preview.assessmentRevision).toBe(1);
      expect(preview.recommendedMode).toBe('standard');
      expect(preview.modes.standard.available).toBe(true);
      expect(preview.modes.intensified.available).toBe(false);
      expect(preview.calorieTargetAvailable).toBe(false);
    });
  });

  describe('startAdaptation', () => {
    it('recusa início na modalidade Intensificada com 422', async () => {
      await expect(
        adaptationService.startAdaptation(user, {
          mode: 'intensified',
          timeZone: 'America/Recife',
        }),
      ).rejects.toMatchObject({
        status: 422,
        response: expect.objectContaining({ code: 'MODE_NOT_AVAILABLE' }),
      });
    });

    it('recusa início se o usuário possuir contraindicação clínica (sintomas de emergência)', async () => {
      vi.mocked(mockAssessmentService.getAssessment).mockResolvedValue({
        ...validAssessment,
        sections: {
          ...validAssessment.sections,
          health: {
            conditions: [],
            hasNoKnownConditions: false,
            isConditionUnknown: false,
            symptoms: ['chest_pain'],
          },
        },
      });

      await expect(
        adaptationService.startAdaptation(user, {
          mode: 'standard',
          timeZone: 'America/Recife',
        }),
      ).rejects.toMatchObject({
        status: 422,
        response: expect.objectContaining({
          code: 'MODE_NOT_AVAILABLE',
          reasons: expect.arrayContaining(['EMERGENCY_SYMPTOMS_PRESENT']),
        }),
      });
    });

    it('cria plano com sucesso e status active no primeiro acionamento (isExisting = false)', async () => {
      const docRef = { id: 'initial' };
      const adaptationsColMock = { doc: vi.fn().mockReturnValue(docRef) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(adaptationsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      let savedDoc: unknown;
      mockFirestore.runTransaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            get: vi
              .fn()
              .mockResolvedValueOnce({ exists: false })
              .mockResolvedValue({ exists: true, data: () => validAssessment }),
            set: vi.fn((_ref, data) => {
              savedDoc = data;
            }),
          };
          return cb(tx);
        },
      );

      const result = await adaptationService.startAdaptation(user, {
        mode: 'standard',
        timeZone: 'America/Recife',
      });

      expect(result.isExisting).toBe(false);
      expect(result.plan.id).toBe('initial');
      expect(result.plan.mode).toBe('standard');
      expect(result.plan.status).toBe('active');
      expect(result.plan.startLocalDate).toBe('2026-10-16');
      expect(result.plan.day30LocalDate).toBe('2026-11-14');
      expect(result.plan.currentDay).toBe(1);
      expect(result.plan.calendar).toHaveLength(30);
      expect((savedDoc as AdaptationDocument).timeZone).toBe('America/Recife');
    });

    it('recusa alteração da avaliação entre elegibilidade e gravação transacional', async () => {
      const ref = { id: 'initial' };
      mockFirestore.collection.mockReturnValue({
        doc: () => ({ collection: () => ({ doc: () => ref }) }),
      });
      const set = vi.fn();
      mockFirestore.runTransaction.mockImplementation(async (callback) =>
        callback({
          get: vi
            .fn()
            .mockResolvedValueOnce({ exists: false })
            .mockResolvedValueOnce({
              exists: true,
              data: () => ({ ...validAssessment, revision: 2 }),
            }),
          set,
        }),
      );
      await expect(
        adaptationService.startAdaptation(user, { mode: 'standard', timeZone: 'UTC' }),
      ).rejects.toMatchObject({ status: 409 });
      expect(set).not.toHaveBeenCalled();
    });
    it('é idempotente na repetição exata da mesma solicitação (isExisting = true)', async () => {
      const existingDoc: AdaptationDocument = {
        uid: user.uid,
        id: 'initial',
        mode: 'standard',
        policyVersion: '1.0.0',
        status: 'active',
        assessmentRevision: 1,
        startedAt: '2026-10-16T15:00:00.000Z',
        timeZone: 'America/Recife',
        startLocalDate: '2026-10-16',
        day30LocalDate: '2026-11-14',
        createdAt: '2026-10-16T15:00:00.000Z',
        updatedAt: '2026-10-16T15:00:00.000Z',
        completedAt: null,
      };

      const docRef = { id: 'initial' };
      const adaptationsColMock = { doc: vi.fn().mockReturnValue(docRef) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(adaptationsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      mockFirestore.runTransaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            get: vi.fn().mockResolvedValue({ exists: true, data: () => existingDoc }),
            set: vi.fn(),
          };
          return cb(tx);
        },
      );

      const result = await adaptationService.startAdaptation(user, {
        mode: 'standard',
        timeZone: 'America/Recife',
      });

      expect(result.isExisting).toBe(true);
      expect(result.plan.startedAt).toBe('2026-10-16T15:00:00.000Z');
    });

    it('produz 409 Conflict se tentar reiniciar ou enviar fuso diferente', async () => {
      const existingDoc: AdaptationDocument = {
        uid: user.uid,
        id: 'initial',
        mode: 'standard',
        policyVersion: '1.0.0',
        status: 'active',
        assessmentRevision: 1,
        startedAt: '2026-10-16T15:00:00.000Z',
        timeZone: 'America/Recife',
        startLocalDate: '2026-10-16',
        day30LocalDate: '2026-11-14',
        createdAt: '2026-10-16T15:00:00.000Z',
        updatedAt: '2026-10-16T15:00:00.000Z',
      };

      const docRef = { id: 'initial' };
      const adaptationsColMock = { doc: vi.fn().mockReturnValue(docRef) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(adaptationsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      mockFirestore.runTransaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            get: vi.fn().mockResolvedValue({ exists: true, data: () => existingDoc }),
            set: vi.fn(),
          };
          return cb(tx);
        },
      );

      await expect(
        adaptationService.startAdaptation(user, {
          mode: 'standard',
          timeZone: 'Europe/London', // Fuso diferente do salvo
        }),
      ).rejects.toMatchObject({
        status: 409,
        response: expect.objectContaining({ code: 'ADAPTATION_ALREADY_STARTED' }),
      });
    });
  });

  describe('getPlan', () => {
    it('lança 404 se o usuário não possuir plano iniciado', async () => {
      const docMock = { get: vi.fn().mockResolvedValue({ exists: false }) };
      const adaptationsColMock = { doc: vi.fn().mockReturnValue(docMock) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(adaptationsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      await expect(adaptationService.getPlan(user)).rejects.toMatchObject({
        status: 404,
        response: expect.objectContaining({ code: 'ADAPTATION_NOT_FOUND' }),
      });
    });

    it('retorna plano ativo e calcula dia corrente corretamente com base no fuso e relógio', async () => {
      const existingDoc: AdaptationDocument = {
        uid: user.uid,
        id: 'initial',
        mode: 'standard',
        policyVersion: '1.0.0',
        status: 'active',
        assessmentRevision: 1,
        startedAt: '2026-10-16T15:00:00.000Z',
        timeZone: 'America/Recife',
        startLocalDate: '2026-10-16',
        day30LocalDate: '2026-11-14',
        createdAt: '2026-10-16T15:00:00.000Z',
        updatedAt: '2026-10-16T15:00:00.000Z',
      };

      const docMock = { get: vi.fn().mockResolvedValue({ exists: true, data: () => existingDoc }) };
      const adaptationsColMock = { doc: vi.fn().mockReturnValue(docMock) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(adaptationsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      // Simula que hoje é o Dia 10 (2026-10-25)
      vi.spyOn(clockService, 'now').mockReturnValue(new Date('2026-10-25T14:00:00.000Z'));

      const plan = await adaptationService.getPlan(user);

      expect(plan.currentDay).toBe(10);
      expect(plan.elapsedDays).toBe(9);
      expect(plan.remainingDays).toBe(21);
      expect(plan.status).toBe('active');
      expect(plan.calendar[9]?.temporalState).toBe('today');
      expect(plan.calendar[8]?.temporalState).toBe('past');
      expect(plan.calendar[10]?.temporalState).toBe('future');
    });

    it('deriva status completed e limita currentDay a 30 após o encerramento do Dia 30', async () => {
      const existingDoc: AdaptationDocument = {
        uid: user.uid,
        id: 'initial',
        mode: 'standard',
        policyVersion: '1.0.0',
        status: 'active',
        assessmentRevision: 1,
        startedAt: '2026-10-16T15:00:00.000Z',
        timeZone: 'America/Recife',
        startLocalDate: '2026-10-16',
        day30LocalDate: '2026-11-14',
        createdAt: '2026-10-16T15:00:00.000Z',
        updatedAt: '2026-10-16T15:00:00.000Z',
      };

      const docMock = { get: vi.fn().mockResolvedValue({ exists: true, data: () => existingDoc }) };
      const adaptationsColMock = { doc: vi.fn().mockReturnValue(docMock) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(adaptationsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      // Simula dia posterior ao Dia 30 (2026-11-15)
      vi.spyOn(clockService, 'now').mockReturnValue(new Date('2026-11-15T12:00:00.000Z'));

      const plan = await adaptationService.getPlan(user);

      expect(plan.status).toBe('completed');
      expect(plan.currentDay).toBe(30);
      expect(plan.elapsedDays).toBe(30);
      expect(plan.remainingDays).toBe(0);
      expect(plan.calendarProgressPercent).toBe(100.0);
      expect(plan.calendar.every((day) => day.temporalState === 'past')).toBe(true);
      expect(plan.notices.some((n) => n.code === 'ADAPTATION_CYCLE_COMPLETED')).toBe(true);
    });
  });
});
