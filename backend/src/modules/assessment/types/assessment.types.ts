export type SexForMetabolicFormula = 'male' | 'female' | 'unavailable';
export type ScaleType = 'standard' | 'bioimpedance';
export type AssessmentStatus = 'draft' | 'completed';
export type AssessmentSectionName = 'body' | 'health' | 'routine' | 'nutrition';

export type WorkPattern = 'sedentary' | 'standing' | 'light_active' | 'heavy_labor';
export type DailyMovementLevel = 'low' | 'moderate' | 'high' | 'very_high';
export type StepSource = 'phone' | 'smartwatch' | 'estimate' | 'unknown';
export type ExerciseIntensity = 'none' | 'light' | 'moderate' | 'high';

export type MealRegularity = 'regular' | 'variable' | 'irregular';
export type SweetenedDrinksFrequency = 'never' | 'rarely' | 'weekly' | 'daily' | 'multiple_daily';
export type AlcoholFrequency = 'never' | 'monthly_or_less' | 'weekly' | 'daily';
export type PregnancyStatus =
  | 'not_applicable'
  | 'pregnant'
  | 'breastfeeding'
  | 'trying_to_conceive'
  | 'none';

export interface TrainingFrequency {
  readonly frequencyDaysPerWeek: number;
  readonly durationMinutes: number;
  readonly intensity: ExerciseIntensity;
}

export interface BodySection {
  readonly dateOfBirth: string; // YYYY-MM-DD
  readonly sexForMetabolicFormula: SexForMetabolicFormula;
  readonly heightCm: number;
  readonly weightKg: number;
  readonly targetWeightKg?: number | null;
  readonly scaleType: ScaleType;
  readonly waistCm?: number | null;
  readonly neckCm?: number | null;
  readonly hipCm?: number | null;
  readonly bodyFatPercent?: number | null;
  readonly muscleMassKg?: number | null;
  readonly bodyWaterPercent?: number | null;
  readonly visceralFatIndex?: number | null;
}

export interface HealthSection {
  readonly takesContinuousMedication?: boolean;
  readonly conditions: string[];
  readonly hasNoKnownConditions: boolean;
  readonly isConditionUnknown: boolean;
  readonly symptoms: string[];
  readonly continuousMedications?: string[] | null;
  readonly medicationPurposes?: string[] | null;
  readonly pregnancyStatus?: PregnancyStatus | null;
  readonly professionalMonitoring?: boolean | null;
}

export interface RoutineSection {
  readonly workPattern: WorkPattern;
  readonly sittingHoursPerDay: number;
  readonly dailyMovementLevel: DailyMovementLevel;
  readonly averageStepsPerDay?: number | null;
  readonly stepSource?: StepSource | null;
  readonly strengthTraining: TrainingFrequency;
  readonly cardioTraining: TrainingFrequency;
  readonly recentlyStartedExercise?: boolean | null;
}

export interface NutritionSection {
  readonly mealsPerDay: number;
  readonly mealRegularity: MealRegularity;
  readonly prolongedFasting?: boolean | null;
  readonly nightEating?: boolean | null;
  readonly dietaryPreferences: string[];
  readonly allergies: string[];
  readonly intolerances: string[];
  readonly dietaryRestrictions: string[];
  readonly mealSources: string[];
  readonly hasKitchenScale: boolean;
  readonly sweetenedDrinksFrequency: SweetenedDrinksFrequency;
  readonly alcoholFrequency: AlcoholFrequency;
  readonly weightLossChallenges: string[];
  readonly budgetConstrained: boolean;
}

export interface AssessmentSections {
  readonly body: BodySection | null;
  readonly health: HealthSection | null;
  readonly routine: RoutineSection | null;
  readonly nutrition: NutritionSection | null;
}

export interface AssessmentDocument {
  readonly uid: string;
  readonly status: AssessmentStatus;
  readonly revision: number;
  readonly sections: AssessmentSections;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string | null;
}

export interface AssessmentResponse {
  readonly status: AssessmentStatus;
  readonly sections: AssessmentSections;
  readonly revision: number;
  readonly updatedAt: string;
  readonly completedAt?: string | null;
}
