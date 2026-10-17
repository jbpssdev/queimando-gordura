import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentCalculatorService } from '../../assessment/assessment-calculator.service.js';
import type { AssessmentService } from '../../assessment/assessment.service.js';
import type { AuthenticatedUser } from '../../auth/auth.types.js';
import type {
  ActivityEntry,
  MealDocument,
  WaterEntry,
  WeightEntry,
} from '../../diary/types/diary.types.js';
import type { FirebaseService } from '../../firebase/firebase.service.js';
import { ClockService } from '../clock.service.js';
import type { AdaptationDocument } from '../types/adaptation.types.js';
import { AdaptationProgressService } from './adaptation-progress.service.js';

describe('AdaptationProgressService', () => {
  let service: AdaptationProgressService;
  let mockFirebaseService: unknown;
  let mockAssessmentService: unknown;
  let assessmentCalculatorService: AssessmentCalculatorService;
  let clockService: ClockService;

  const user: AuthenticatedUser = {
    uid: 'test-user-progress',
    email: 'user@example.com',
    emailVerified: true,
  };

  const defaultPlanDoc: AdaptationDocument = {
    id: 'initial',
    uid: user.uid,
    mode: 'standard',
    policyVersion: '1.0.0',
    status: 'active',
    assessmentRevision: 1,
    startedAt: '2026-10-01T12:00:00.000Z',
    timeZone: 'America/Recife',
    startLocalDate: '2026-10-01',
    day30LocalDate: '2026-10-30',
    createdAt: '2026-10-01T12:00:00.000Z',
    updatedAt: '2026-10-01T12:00:00.000Z',
    completedAt: null,
  };

  const defaultAssessment = {
    revision: 1,
    status: 'completed' as const,
    updatedAt: '2026-10-01T10:00:00.000Z',
    completedAt: '2026-10-01T10:00:00.000Z',
    sections: {
      body: {
        dateOfBirth: '1990-05-15',
        sexForMetabolicFormula: 'female' as const,
        heightCm: 165,
        weightKg: 78.5,
        scaleType: 'standard' as const,
      },
      health: {
        conditions: [],
        hasNoKnownConditions: true,
        isConditionUnknown: false,
        symptoms: [],
      },
      routine: {
        workPattern: 'sedentary' as const,
        sittingHoursPerDay: 8,
        dailyMovementLevel: 'low' as const,
        strengthTraining: {
          frequencyDaysPerWeek: 0,
          durationMinutes: 0,
          intensity: 'none' as const,
        },
        cardioTraining: { frequencyDaysPerWeek: 0, durationMinutes: 0, intensity: 'none' as const },
      },
      nutrition: {
        mealsPerDay: 3,
        mealRegularity: 'regular' as const,
        dietaryPreferences: [],
        allergies: [],
        intolerances: [],
        dietaryRestrictions: [],
        mealSources: [],
        hasKitchenScale: true,
        sweetenedDrinksFrequency: 'never' as const,
        alcoholFrequency: 'never' as const,
        weightLossChallenges: [],
        budgetConstrained: false,
      },
    },
  };

  const defaultNutrient = { value: 0, isComplete: true };
  const mockTotals = (kcal: number) => ({
    energyKcal: { value: kcal, isComplete: true },
    proteinG: defaultNutrient,
    carbohydrateG: defaultNutrient,
    fatG: defaultNutrient,
    fiberG: defaultNutrient,
  });

  let mockFirestoreData: {
    plan: AdaptationDocument | null;
    meals: Partial<MealDocument>[];
    water: Partial<WaterEntry>[];
    activities: Partial<ActivityEntry>[];
    weights: Partial<WeightEntry>[];
  };

  beforeEach(() => {
    clockService = new ClockService();
    // Inicia no dia 15 do plano (2026-10-15T12:00:00-03:00)
    vi.spyOn(clockService, 'now').mockReturnValue(new Date('2026-10-15T15:00:00.000Z'));
    assessmentCalculatorService = new AssessmentCalculatorService();

    mockFirestoreData = {
      plan: { ...defaultPlanDoc },
      meals: [],
      water: [],
      activities: [],
      weights: [],
    };

    mockFirebaseService = {
      getFirestore: vi.fn(() => ({
        collection: vi.fn((colName: string) => {
          if (colName === 'users') {
            return {
              doc: vi.fn(() => ({
                collection: vi.fn((subCol: string) => {
                  if (subCol === 'adaptations') {
                    return {
                      doc: vi.fn(() => ({
                        get: vi.fn(async () => ({
                          exists: mockFirestoreData.plan != null,
                          data: () => mockFirestoreData.plan,
                        })),
                      })),
                    };
                  }
                  if (subCol === 'diary_meals') {
                    return {
                      where: vi.fn().mockReturnThis(),
                      get: vi.fn(async () => ({
                        docs: mockFirestoreData.meals.map((m) => ({ data: () => m })),
                      })),
                    };
                  }
                  if (subCol === 'diary_water') {
                    return {
                      where: vi.fn().mockReturnThis(),
                      get: vi.fn(async () => ({
                        docs: mockFirestoreData.water.map((w) => ({ data: () => w })),
                      })),
                    };
                  }
                  if (subCol === 'diary_activities') {
                    return {
                      where: vi.fn().mockReturnThis(),
                      get: vi.fn(async () => ({
                        docs: mockFirestoreData.activities.map((a) => ({ data: () => a })),
                      })),
                    };
                  }
                  if (subCol === 'diary_weights') {
                    return {
                      where: vi.fn().mockReturnThis(),
                      get: vi.fn(async () => ({
                        docs: mockFirestoreData.weights.map((wt) => ({ data: () => wt })),
                      })),
                    };
                  }
                  return {};
                }),
              })),
            };
          }
          return {};
        }),
      })),
    };

    mockAssessmentService = {
      getAssessment: vi.fn().mockResolvedValue(defaultAssessment),
      getResults: vi.fn().mockResolvedValue({
        revision: 1,
        bmi: { value: 28.8, category: 'overweight', classification: 'Sobrepeso' },
        bmr: { bmrKcal: 1475.25, formula: 'mifflin_st_jeor', calculated: true },
      }),
    } as unknown as AssessmentService;

    service = new AdaptationProgressService(
      mockFirebaseService as unknown as FirebaseService,
      mockAssessmentService as unknown as AssessmentService,
      assessmentCalculatorService,
      clockService,
    );
  });

  it('lança NotFoundException quando o plano de adaptação não existe', async () => {
    mockFirestoreData.plan = null;

    await expect(service.getProgress(user)).rejects.toThrow(NotFoundException);
  });

  it('calcula progresso de plano ativo sem registros (nova conta)', async () => {
    const progress = await service.getProgress(user);

    expect(progress.id).toBe('initial');
    expect(progress.status).toBe('active');
    expect(progress.currentDay).toBe(15);
    expect(progress.elapsedDays).toBe(14);
    expect(progress.remainingDays).toBe(16);
    expect(progress.reportAvailable).toBe(false);

    expect(progress.participation.distinctDaysRecorded).toBe(0);
    expect(progress.participation.daysWithMeals).toBe(0);
    expect(progress.participation.daysWithWater).toBe(0);
    expect(progress.participation.daysWithActivities).toBe(0);
    expect(progress.participation.daysWithWeight).toBe(0);

    expect(progress.weightEvolution.initialDeclaredWeight?.weightKg).toBe(78.5);
    expect(progress.weightEvolution.initialDeclaredWeight?.source).toBe('initial_assessment');
    expect(progress.weightEvolution.measurements).toHaveLength(0);
    expect(progress.weightEvolution.weightDeltaKg).toBeNull();
    expect(progress.weightEvolution.deltaReason).toBe('NO_MEASUREMENTS_RECORDED');

    // Conquistas: todas bloqueadas em conta sem registros
    expect(progress.achievements.unlocked).toHaveLength(0);
    expect(progress.achievements.locked).toHaveLength(7);

    // 5 períodos semanais presentes
    expect(progress.weeklyPeriods).toHaveLength(5);
    expect(progress.weeklyPeriods[0]!.label).toBe('Dias 1 a 7');
    expect(progress.weeklyPeriods[4]!.label).toBe('Dias 29 a 30 (Fechamento)');
  });

  it('desbloqueia FIRST_DIARY_ENTRY e FIRST_MEAL_ENTRY ao ter apenas uma refeição', async () => {
    mockFirestoreData.meals.push({
      id: 'meal-1',
      date: '2026-10-02',
      mealType: 'breakfast',
      totals: mockTotals(350.5),
    });

    const progress = await service.getProgress(user);

    expect(progress.participation.distinctDaysRecorded).toBe(1);
    expect(progress.participation.daysWithMeals).toBe(1);
    expect(progress.participation.daysWithWater).toBe(0);

    const unlockedCodes = progress.achievements.unlocked.map((a) => a.code);
    expect(unlockedCodes).toContain('FIRST_DIARY_ENTRY');
    expect(unlockedCodes).toContain('FIRST_MEAL_ENTRY');
    expect(unlockedCodes).not.toContain('FIRST_ACTIVITY_ENTRY');
    expect(unlockedCodes).not.toContain('FIRST_WEIGHT_ENTRY');
    expect(unlockedCodes).not.toContain('SEVEN_DISTINCT_DAYS_RECORDED');
  });

  it('desbloqueia SEVEN_DISTINCT_DAYS_RECORDED ao registrar em 7 datas distintas', async () => {
    for (let day = 1; day <= 7; day++) {
      const date = `2026-10-0${day}`;
      mockFirestoreData.water.push({
        id: `water-${day}`,
        date,
        amountMl: 500,
      });
    }

    const progress = await service.getProgress(user);

    expect(progress.participation.distinctDaysRecorded).toBe(7);
    expect(progress.participation.daysWithWater).toBe(7);

    const unlockedCodes = progress.achievements.unlocked.map((a) => a.code);
    expect(unlockedCodes).toContain('FIRST_DIARY_ENTRY');
    expect(unlockedCodes).toContain('SEVEN_DISTINCT_DAYS_RECORDED');
    expect(unlockedCodes).not.toContain('FOURTEEN_DISTINCT_DAYS_RECORDED');
  });

  it('com 1 pesagem no diário, não calcula delta e reporta INSUFFICIENT_MEASUREMENTS', async () => {
    mockFirestoreData.weights.push({
      date: '2026-10-05',
      weightKg: 78.0,
    });

    const progress = await service.getProgress(user);

    expect(progress.participation.daysWithWeight).toBe(1);
    expect(progress.weightEvolution.measurements).toHaveLength(1);
    expect(progress.weightEvolution.weightDeltaKg).toBeNull();
    expect(progress.weightEvolution.deltaReason).toBe('INSUFFICIENT_MEASUREMENTS');

    // Indicador derivado reflete a pesagem do dia 05
    expect(progress.derivedIndicators.currentBmi?.value).toBe(28.7); // 78 / (1.65^2) = 28.65 -> 28.7
    expect(progress.derivedIndicators.currentBmi?.date).toBe('2026-10-05');
  });

  it('com 2 ou mais pesagens, calcula delta exato e atualiza IMC e TMB na última medição', async () => {
    mockFirestoreData.weights.push(
      { date: '2026-10-01', weightKg: 78.5 },
      { date: '2026-10-08', weightKg: 77.8 },
      { date: '2026-10-15', weightKg: 76.9 },
    );

    const progress = await service.getProgress(user);

    expect(progress.weightEvolution.measurements).toHaveLength(3);
    // Delta entre primeira (78.5) e última (76.9): 76.9 - 78.5 = -1.6 kg
    expect(progress.weightEvolution.weightDeltaKg).toBeCloseTo(-1.6, 12);
    expect(progress.weightEvolution.deltaReason).toBeNull();
    expect(progress.weightEvolution.firstMeasurement?.weightKg).toBe(78.5);
    expect(progress.weightEvolution.lastMeasurement?.weightKg).toBe(76.9);

    // IMC atualizado na última pesagem: 76.9 / (1.65^2) = 28.2
    expect(progress.derivedIndicators.currentBmi?.value).toBe(28.2);
    expect(progress.derivedIndicators.currentBmi?.date).toBe('2026-10-15');
    // TMB recalculada com peso atualizado 76.9 kg
    expect(progress.derivedIndicators.currentBmr?.calculated).toBe(true);
    expect(progress.derivedIndicators.currentBmr?.date).toBe('2026-10-15');
  });

  it('ao concluir 30 dias (dia 31 em diante), reportAvailable é true e ADAPTATION_30_DAYS_COMPLETED é concedido', async () => {
    // Simula dia 31 (2026-11-01)
    vi.spyOn(clockService, 'now').mockReturnValue(new Date('2026-11-01T15:00:00.000Z'));

    const progress = await service.getProgress(user);

    expect(progress.status).toBe('completed');
    expect(progress.currentDay).toBe(30);
    expect(progress.elapsedDays).toBe(30);
    expect(progress.remainingDays).toBe(0);
    expect(progress.calendarProgressPercent).toBe(100);
    expect(progress.reportAvailable).toBe(true);

    const unlockedCodes = progress.achievements.unlocked.map((a) => a.code);
    expect(unlockedCodes).toContain('ADAPTATION_30_DAYS_COMPLETED');
  });

  it('marca totais nutricionais como parciais quando nem todos os dias têm refeições', async () => {
    // Apenas 2 refeições no Período 1 (Dias 1 a 7)
    mockFirestoreData.meals.push(
      {
        id: 'm1',
        date: '2026-10-01',
        mealType: 'lunch',
        totals: mockTotals(600),
      },
      {
        id: 'm2',
        date: '2026-10-02',
        mealType: 'lunch',
        totals: mockTotals(550),
      },
    );

    const progress = await service.getProgress(user);
    const p1 = progress.weeklyPeriods[0]!;

    expect(p1.nutritionSummary.totalKcal).toBe(1150);
    expect(p1.nutritionSummary.daysWithRecords).toBe(2);
    expect(p1.nutritionSummary.isPartial).toBe(true);
    expect(p1.nutritionSummary.note).toContain('Totais nutricionais parciais');
  });
  it('preserva ausência nutricional e não transforma calorias desconhecidas em zero', async () => {
    mockFirestoreData.meals.push({
      date: '2026-10-01',
      totals: { ...mockTotals(0), energyKcal: { value: null, isComplete: false } },
    });
    const result = await service.getProgress(user);
    expect(result.weeklyPeriods[0]!.nutritionSummary.totalKcal).toBeNull();
    expect(result.weeklyPeriods[0]!.nutritionSummary.isPartial).toBe(true);
    expect(result.weeklyPeriods.flatMap((w) => w.days ?? [])).toHaveLength(30);
    expect(result.achievements.unlocked[0]!.unlockedAt).toBe('2026-10-01');
  });
});
