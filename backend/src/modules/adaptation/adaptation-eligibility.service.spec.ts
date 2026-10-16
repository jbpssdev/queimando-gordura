import { describe, expect, it } from 'vitest';
import type {
  AssessmentResponse,
  BodySection,
  HealthSection,
  NutritionSection,
  RoutineSection,
} from '../assessment/types/assessment.types.js';
import type { AssessmentResultDocument } from '../assessment/types/metrics.types.js';
import { AdaptationEligibilityService } from './adaptation-eligibility.service.js';

describe('AdaptationEligibilityService', () => {
  const service = new AdaptationEligibilityService();

  const baseBody: BodySection = {
    dateOfBirth: '1990-05-15',
    sexForMetabolicFormula: 'male',
    heightCm: 175,
    weightKg: 75,
    scaleType: 'standard',
  };

  const baseHealth: HealthSection = {
    conditions: [],
    hasNoKnownConditions: true,
    isConditionUnknown: false,
    symptoms: ['none'],
  };

  const baseRoutine: RoutineSection = {
    workPattern: 'sedentary',
    sittingHoursPerDay: 8,
    dailyMovementLevel: 'moderate',
    strengthTraining: { frequencyDaysPerWeek: 3, durationMinutes: 45, intensity: 'moderate' },
    cardioTraining: { frequencyDaysPerWeek: 2, durationMinutes: 30, intensity: 'light' },
  };

  const baseNutrition: NutritionSection = {
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
  };

  function createAssessment(healthOverride: Partial<HealthSection> = {}): AssessmentResponse {
    return {
      status: 'completed',
      revision: 1,
      sections: {
        body: baseBody,
        health: { ...baseHealth, ...healthOverride },
        routine: baseRoutine,
        nutrition: baseNutrition,
      },
      updatedAt: '2026-10-16T12:00:00.000Z',
      completedAt: '2026-10-16T12:00:00.000Z',
    };
  }

  function createResults(
    bmiCategory: 'normal' | 'overweight' | 'obesity_1' | 'obesity_2' | 'obesity_3' = 'normal',
    isEmergency = false,
  ): AssessmentResultDocument {
    return {
      uid: 'user-1',
      revision: 1,
      calculatedAt: '2026-10-16T12:00:00.000Z',
      age: 36,
      bmi: {
        value: bmiCategory === 'obesity_3' ? 42.5 : 24.5,
        category: bmiCategory,
        classification: bmiCategory === 'obesity_3' ? 'Obesidade grau 3' : 'Peso normal',
      },
      bmr: { formula: 'mifflin_st_jeor', calculated: true, bmrKcal: 1700 },
      tdee: {
        estimatedTdeeKcal: 2300,
        minTdeeKcal: 2116,
        maxTdeeKcal: 2484,
        neatMultiplier: 1.3,
        exerciseAddonKcal: 90,
        explanation: 'GET conservador',
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
  }

  it('libera modalidade Padrão para usuário sem contraindicações e IMC normal', () => {
    const assessment = createAssessment();
    const results = createResults('normal');

    const preview = service.evaluateEligibility(assessment, results);

    expect(preview.recommendedMode).toBe('standard');
    expect(preview.modes.standard.available).toBe(true);
    expect(preview.modes.standard.reasons).toHaveLength(0);
    expect(preview.modes.intensified.available).toBe(false);
    expect(preview.modes.intensified.reasons).toContain('CLINICAL_POLICY_PENDING');
    expect(preview.calorieTargetAvailable).toBe(false);
  });

  it('libera modalidade Padrão para obesidade grau 3 isolada (IMC >= 40) mantendo Intensificada restrita', () => {
    const assessment = createAssessment();
    const results = createResults('obesity_3');

    const preview = service.evaluateEligibility(assessment, results);

    expect(preview.recommendedMode).toBe('standard');
    expect(preview.modes.standard.available).toBe(true);
    expect(preview.modes.standard.reasons).toHaveLength(0);
    expect(preview.modes.intensified.available).toBe(false);
    expect(preview.modes.intensified.reasons).toContain(
      'OBESITY_CLASS_3_CLINICAL_EVALUATION_REQUIRED',
    );
    expect(preview.notices.some((n) => n.code === 'OBESITY_CLASS_3_GUIDANCE')).toBe(true);
  });

  it('bloqueia modalidade Padrão para obesidade grau 3 quando acompanhada de comorbidade crônica', () => {
    const assessment = createAssessment({
      conditions: ['type_2_diabetes'],
      hasNoKnownConditions: false,
    });
    const results = createResults('obesity_3');

    const preview = service.evaluateEligibility(assessment, results);

    expect(preview.recommendedMode).toBeNull();
    expect(preview.modes.standard.available).toBe(false);
    expect(preview.modes.standard.reasons).toContain('CLINICAL_CONDITION_RESTRICTION');
    expect(preview.modes.intensified.available).toBe(false);
  });

  it('bloqueia modalidade Padrão se houver sintomas de urgência médica', () => {
    const assessment = createAssessment({
      symptoms: ['chest_pain', 'fainting'],
    });
    const results = createResults('normal', true);

    const preview = service.evaluateEligibility(assessment, results);

    expect(preview.recommendedMode).toBeNull();
    expect(preview.modes.standard.available).toBe(false);
    expect(preview.modes.standard.reasons).toContain('EMERGENCY_SYMPTOMS_PRESENT');
    expect(preview.notices.some((n) => n.code === 'EMERGENCY_SYMPTOMS_ALERT')).toBe(true);
  });

  it('bloqueia modalidade Padrão para gestantes ou lactantes', () => {
    const assessment = createAssessment({
      pregnancyStatus: 'pregnant',
    });
    const results = createResults('normal');

    const preview = service.evaluateEligibility(assessment, results);

    expect(preview.recommendedMode).toBeNull();
    expect(preview.modes.standard.available).toBe(false);
    expect(preview.modes.standard.reasons).toContain('PREGNANCY_OR_LACTATION');
  });

  it('bloqueia modalidade Padrão quando condições de saúde são desconhecidas', () => {
    const assessment = createAssessment({
      isConditionUnknown: true,
      hasNoKnownConditions: false,
      conditions: [],
    });
    const results = createResults('normal');

    const preview = service.evaluateEligibility(assessment, results);

    expect(preview.recommendedMode).toBeNull();
    expect(preview.modes.standard.available).toBe(false);
    expect(preview.modes.standard.reasons).toContain('HEALTH_CONDITIONS_UNKNOWN');
    expect(preview.notices.some((n) => n.code === 'HEALTH_UNKNOWN_ALERT')).toBe(true);
  });

  it('mantém metas calóricas sempre indisponíveis com aviso explicativo', () => {
    const assessment = createAssessment();
    const results = createResults('normal');

    const preview = service.evaluateEligibility(assessment, results);

    expect(preview.calorieTargetAvailable).toBe(false);
    expect(preview.notices.some((n) => n.code === 'CALORIE_TARGET_POLICY_PENDING')).toBe(true);
  });
  it.each(['hypertension', 'other_condition', 'hipotireoidismo'])(
    'alinha qualquer condição declarada com cautela da avaliação: %s',
    (condition) => {
      const preview = service.evaluateEligibility(
        createAssessment({ conditions: [condition], hasNoKnownConditions: false }),
        createResults('obesity_3'),
      );
      expect(preview.modes.standard.available).toBe(false);
      expect(preview.notices.some((notice) => notice.code === 'NO_CLINICAL_CLEARANCE')).toBe(true);
    },
  );
  it('disponibilidade Padrão não constitui liberação clínica nem permite déficit', () => {
    const preview = service.evaluateEligibility(createAssessment(), createResults());
    expect(preview.notices.some((notice) => notice.code === 'NO_CLINICAL_CLEARANCE')).toBe(true);
    expect(preview.calorieTargetAvailable).toBe(false);
  });
});
