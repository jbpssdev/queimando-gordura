import type {
  AssessmentResponse,
  AssessmentResultDocument,
  BodySection,
  HealthSection,
  RoutineSection,
  NutritionSection,
} from './assessment-contract';
import type {
  AssessmentDraftResponse,
  AssessmentResultsResponse,
  AssessmentSection,
  BodyAssessmentDto,
  HealthAssessmentDto,
  RoutineAssessmentDto,
  NutritionAssessmentDto,
  ExerciseIntensity,
  HealthConditionCategory,
  WarningSymptom,
} from './assessment.model';

const work = {
  sedentary: 'sedentary',
  lightly_active: 'standing',
  moderately_active: 'light_active',
  intense: 'heavy_labor',
} as const;
const symptoms = {
  chestPain: 'chest_pain',
  fainting: 'fainting',
  disproportionateShortnessOfBreath: 'severe_shortness_of_breath',
  palpitations: 'severe_palpitations',
  none: 'none',
} as const;
const alcohol = {
  none: 'never',
  occasional: 'monthly_or_less',
  weekly: 'weekly',
  frequent: 'daily',
} as const;
const drinks = {
  rarely: 'rarely',
  sometimes: 'weekly',
  daily: 'daily',
  multiple_daily: 'multiple_daily',
} as const;
function reverse<T extends string>(values: Record<T, string>, value: string): T | undefined {
  return (Object.keys(values) as T[]).find((key) => values[key] === value);
}

// Only names/units/enums are translated. Metrics and safety always come from Nest.
export function toAssessmentSection(
  section: AssessmentSection,
  input: unknown,
): Record<string, unknown> {
  switch (section) {
    case 'body': {
      const v = input as BodyAssessmentDto;
      return {
        dateOfBirth: v.birthDate,
        sexForMetabolicFormula: v.biologicalSex === 'uninformed' ? 'unavailable' : v.biologicalSex,
        heightCm: v.heightCm,
        weightKg: v.currentWeightKg,
        targetWeightKg: v.targetWeightKg,
        scaleType: v.scaleType,
        waistCm: v.waistCircumferenceCm,
        neckCm: v.neckCircumferenceCm,
        hipCm: v.hipCircumferenceCm,
        bodyFatPercent: v.scaleType === 'bioimpedance' ? v.bodyFatPercentage : null,
        muscleMassKg: v.scaleType === 'bioimpedance' ? v.muscleMassKg : null,
        bodyWaterPercent: v.scaleType === 'bioimpedance' ? v.bodyWaterPercentage : null,
        visceralFatIndex: v.scaleType === 'bioimpedance' ? v.visceralFatLevel : null,
      };
    }
    case 'health': {
      const v = input as HealthAssessmentDto;
      return {
        conditions: v.declarationType === 'conditions' ? v.conditions : [],
        hasNoKnownConditions: v.declarationType === 'none',
        isConditionUnknown: v.declarationType === 'unknown',
        symptoms: v.warningSymptoms.filter((s) => s !== 'none').map((s) => symptoms[s]),
        takesContinuousMedication: v.takesContinuousMedication,
        continuousMedications:
          v.takesContinuousMedication && v.medicationsDetails ? [v.medicationsDetails] : [],
        pregnancyStatus: v.pregnancyOrLactation,
        professionalMonitoring: v.hasMedicalFollowUp,
      };
    }
    case 'routine': {
      const v = input as RoutineAssessmentDto;
      const training = (
        enabled: boolean,
        days?: number | null,
        minutes?: number | null,
        intensity?: ExerciseIntensity | null,
      ) =>
        enabled
          ? {
              frequencyDaysPerWeek: days,
              durationMinutes: minutes,
              intensity: intensity === 'intense' ? 'high' : intensity,
            }
          : { frequencyDaysPerWeek: 0, durationMinutes: 0, intensity: 'none' };
      return {
        workPattern: work[v.workRoutine],
        sittingHoursPerDay: v.sittingHoursPerDay,
        dailyMovementLevel: v.dailyMovementLevel,
        averageStepsPerDay: v.dailySteps,
        stepSource: v.stepsSource,
        strengthTraining: training(
          v.practicesStrengthTraining,
          v.strengthDaysPerWeek,
          v.strengthMinutesPerSession,
          v.strengthIntensity,
        ),
        cardioTraining: training(
          v.practicesCardio,
          v.cardioDaysPerWeek,
          v.cardioMinutesPerSession,
          v.cardioIntensity,
        ),
        recentlyStartedExercise: v.recentStarter,
      };
    }
    case 'nutrition': {
      const v = input as NutritionAssessmentDto;
      return {
        mealsPerDay: v.dailyMealsCount,
        mealRegularity: v.mealScheduleRegularity,
        prolongedFasting: v.prolongedFasting,
        nightEating: v.eatsAtDawn,
        dietaryPreferences: v.dietaryPreferences,
        allergies: v.allergiesAndIntolerances,
        dietaryRestrictions: v.dietaryRestrictions,
        mealSources: [v.cookingHabit],
        hasKitchenScale: v.hasKitchenScale,
        sweetenedDrinksFrequency: drinks[v.sugaryDrinksHabit],
        alcoholFrequency: alcohol[v.alcoholConsumption],
        weightLossChallenges: v.weightLossChallenges,
        budgetConstrained: v.foodBudgetLimitation,
      };
    }
  }
}

function bodyView(v: BodySection): BodyAssessmentDto {
  return {
    birthDate: v.dateOfBirth,
    biologicalSex:
      v.sexForMetabolicFormula === 'unavailable' ? 'uninformed' : v.sexForMetabolicFormula,
    heightCm: v.heightCm,
    currentWeightKg: v.weightKg,
    targetWeightKg: v.targetWeightKg,
    scaleType: v.scaleType,
    waistCircumferenceCm: v.waistCm,
    neckCircumferenceCm: v.neckCm,
    hipCircumferenceCm: v.hipCm,
    bodyFatPercentage: v.bodyFatPercent,
    muscleMassKg: v.muscleMassKg,
    bodyWaterPercentage: v.bodyWaterPercent,
    visceralFatLevel: v.visceralFatIndex,
  };
}
function healthView(v: HealthSection): HealthAssessmentDto {
  return {
    declarationType: v.isConditionUnknown
      ? 'unknown'
      : v.hasNoKnownConditions
        ? 'none'
        : 'conditions',
    conditions: v.conditions as HealthConditionCategory[],
    takesContinuousMedication:
      v.takesContinuousMedication ?? Boolean(v.continuousMedications?.length),
    medicationsDetails: v.continuousMedications?.join('; ') ?? null,
    warningSymptoms: v.symptoms.length
      ? v.symptoms.map((s) => reverse(symptoms, s) ?? (s as WarningSymptom))
      : ['none'],
    pregnancyOrLactation:
      v.pregnancyStatus === 'pregnant' || v.pregnancyStatus === 'breastfeeding'
        ? v.pregnancyStatus
        : 'none',
    hasMedicalFollowUp: Boolean(v.professionalMonitoring),
  };
}
function routineView(v: RoutineSection): RoutineAssessmentDto {
  return {
    workRoutine: reverse(work, v.workPattern) ?? 'sedentary',
    sittingHoursPerDay: v.sittingHoursPerDay,
    dailyMovementLevel: v.dailyMovementLevel === 'very_high' ? 'high' : v.dailyMovementLevel,
    dailySteps: v.averageStepsPerDay,
    stepsSource: v.stepSource,
    practicesStrengthTraining: (v.strengthTraining?.frequencyDaysPerWeek ?? 0) > 0,
    strengthDaysPerWeek: v.strengthTraining?.frequencyDaysPerWeek,
    strengthMinutesPerSession: v.strengthTraining?.durationMinutes,
    strengthIntensity:
      v.strengthTraining?.intensity === 'high'
        ? 'intense'
        : v.strengthTraining?.intensity === 'none'
          ? null
          : v.strengthTraining?.intensity,
    practicesCardio: (v.cardioTraining?.frequencyDaysPerWeek ?? 0) > 0,
    cardioDaysPerWeek: v.cardioTraining?.frequencyDaysPerWeek,
    cardioMinutesPerSession: v.cardioTraining?.durationMinutes,
    cardioIntensity:
      v.cardioTraining?.intensity === 'high'
        ? 'intense'
        : v.cardioTraining?.intensity === 'none'
          ? null
          : v.cardioTraining?.intensity,
    recentStarter: v.recentlyStartedExercise ?? false,
  };
}
function nutritionView(v: NutritionSection): NutritionAssessmentDto {
  return {
    dailyMealsCount: v.mealsPerDay,
    mealScheduleRegularity: v.mealRegularity,
    prolongedFasting: Boolean(v.prolongedFasting),
    eatsAtDawn: Boolean(v.nightEating),
    dietaryPreferences: v.dietaryPreferences ?? [],
    allergiesAndIntolerances: [...(v.allergies ?? []), ...(v.intolerances ?? [])],
    dietaryRestrictions: v.dietaryRestrictions ?? [],
    cookingHabit: (v.mealSources?.[0] as NutritionAssessmentDto['cookingHabit']) ?? 'combination',
    hasKitchenScale: v.hasKitchenScale,
    sugaryDrinksHabit: reverse(drinks, v.sweetenedDrinksFrequency) ?? 'rarely',
    alcoholConsumption: reverse(alcohol, v.alcoholFrequency) ?? 'none',
    weightLossChallenges: v.weightLossChallenges ?? [],
    foodBudgetLimitation: v.budgetConstrained,
  };
}
export function fromAssessment(v: AssessmentResponse): AssessmentDraftResponse {
  return {
    status: v.status,
    revision: v.revision,
    updatedAt: v.updatedAt,
    body: v.sections.body ? bodyView(v.sections.body) : undefined,
    health: v.sections.health ? healthView(v.sections.health) : undefined,
    routine: v.sections.routine ? routineView(v.sections.routine) : undefined,
    nutrition: v.sections.nutrition ? nutritionView(v.sections.nutrition) : undefined,
  };
}
export function fromAssessmentResults(v: AssessmentResultDocument): AssessmentResultsResponse {
  const body = v.body;
  return {
    revision: v.revision,
    calculatedAge: v.age,
    currentWeightKg: body?.weightKg,
    heightCm: body?.heightCm,
    bmi: {
      value: v.bmi.value,
      category: v.bmi.classification,
      description: 'Indicador populacional; não constitui diagnóstico individual.',
    },
    bmrKcal:
      v.bmr.calculated && v.bmr.bmrKcal !== null
        ? {
            value: v.bmr.bmrKcal,
            formula: 'Mifflin-St Jeor',
            description: 'Estimativa de repouso, não uma prescrição alimentar.',
          }
        : null,
    tdeeKcalRange:
      v.tdee.minTdeeKcal !== null && v.tdee.maxTdeeKcal !== null
        ? { min: v.tdee.minTdeeKcal, max: v.tdee.maxTdeeKcal, description: v.tdee.explanation }
        : null,
    target5PercentWeightKg: v.weightReference.milestone5PercentWeightKg,
    bmiReferenceWeightRange: {
      min: v.weightReference.minNormalWeightKg,
      max: v.weightReference.maxNormalWeightKg,
      description: 'Referência populacional, não peso ideal individual.',
    },
    desiredWeightKg: v.weightReference.targetWeightAnalysis?.targetWeightKg,
    safetyOrientations: {
      level: v.safety.isEmergency
        ? 'urgent'
        : v.safety.requiresProfessionalClearance
          ? 'medical_attention'
          : 'clear',
      message: v.safety.alerts[0]?.message ?? '',
      details: v.safety.alerts.slice(1).map((a) => a.message),
    },
    pendingItems: (v.pendingItems ?? []).map((p) => ({
      key: p.section + '.' + p.field,
      label: p.reason,
      priority: 'optional',
      message: p.reason,
    })),
    evaluatedAt: v.calculatedAt,
  };
}
