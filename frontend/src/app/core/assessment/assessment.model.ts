export type BiologicalSex = 'male' | 'female' | 'uninformed';

export type ScaleType = 'standard' | 'bioimpedance';

export type HealthDeclarationType = 'none' | 'unknown' | 'conditions';

export type HealthConditionCategory =
  | 'cardiovascular'
  | 'diabetesOrGlycemic'
  | 'respiratory'
  | 'renal'
  | 'hepatic'
  | 'otherConditions'
  | 'specificSituations';

export type WarningSymptom =
  | 'chestPain'
  | 'fainting'
  | 'disproportionateShortnessOfBreath'
  | 'palpitations'
  | 'none';

export type PregnancyOrLactation = 'none' | 'pregnant' | 'breastfeeding';

export type WorkRoutine = 'sedentary' | 'lightly_active' | 'moderately_active' | 'intense';

export type DailyMovementLevel = 'low' | 'moderate' | 'high';

export type ExerciseIntensity = 'light' | 'moderate' | 'intense';

export type MealScheduleRegularity = 'regular' | 'irregular' | 'variable';

export type CookingHabit = 'cooks_at_home' | 'restaurant' | 'delivery' | 'combination';

export type SugaryDrinksHabit = 'rarely' | 'sometimes' | 'daily' | 'multiple_daily';

export type AlcoholConsumption = 'none' | 'occasional' | 'weekly' | 'frequent';

export interface BodyAssessmentDto {
  birthDate: string; // YYYY-MM-DD
  biologicalSex: BiologicalSex;
  heightCm: number;
  currentWeightKg: number;
  scaleType: ScaleType;
  targetWeightKg?: number | null;
  waistCircumferenceCm?: number | null;
  neckCircumferenceCm?: number | null;
  hipCircumferenceCm?: number | null;
  bodyFatPercentage?: number | null;
  muscleMassKg?: number | null;
  bodyWaterPercentage?: number | null;
  visceralFatLevel?: number | null;
}

export interface HealthAssessmentDto {
  declarationType: HealthDeclarationType;
  conditions: HealthConditionCategory[];
  takesContinuousMedication: boolean;
  medicationsDetails?: string | null;
  warningSymptoms: WarningSymptom[];
  pregnancyOrLactation: PregnancyOrLactation;
  hasMedicalFollowUp: boolean;
}

export interface RoutineAssessmentDto {
  workRoutine: WorkRoutine;
  sittingHoursPerDay: number;
  dailyMovementLevel: DailyMovementLevel;
  dailySteps?: number | null;
  stepsSource?: string | null;
  practicesStrengthTraining: boolean;
  strengthDaysPerWeek?: number | null;
  strengthMinutesPerSession?: number | null;
  strengthIntensity?: ExerciseIntensity | null;
  practicesCardio: boolean;
  cardioDaysPerWeek?: number | null;
  cardioMinutesPerSession?: number | null;
  cardioIntensity?: ExerciseIntensity | null;
  recentStarter?: boolean;
}

export interface NutritionAssessmentDto {
  dailyMealsCount: number;
  mealScheduleRegularity: MealScheduleRegularity;
  prolongedFasting: boolean;
  eatsAtDawn: boolean;
  dietaryPreferences: string[];
  allergiesAndIntolerances: string[];
  dietaryRestrictions: string[];
  cookingHabit: CookingHabit;
  hasKitchenScale: boolean;
  sugaryDrinksHabit: SugaryDrinksHabit;
  alcoholConsumption: AlcoholConsumption;
  weightLossChallenges: string[];
  foodBudgetLimitation: boolean;
}

export type AssessmentSection = 'body' | 'health' | 'routine' | 'nutrition';

export interface SaveAssessmentSectionDto<T = unknown> {
  section: AssessmentSection;
  data: T;
}

export interface AssessmentDraftResponse {
  id?: string;
  userId?: string;
  status?: 'draft' | 'completed';
  body?: BodyAssessmentDto;
  health?: HealthAssessmentDto;
  routine?: RoutineAssessmentDto;
  nutrition?: NutritionAssessmentDto;
  updatedAt?: string;
}

export type SafetyOrientationLevel = 'clear' | 'medical_attention' | 'urgent';

export interface SafetyOrientation {
  level: SafetyOrientationLevel;
  message: string;
  details?: string[];
}

export interface PendingAssessmentItem {
  key: string;
  label: string;
  priority: 'essential' | 'important' | 'optional';
  message: string;
}

export interface AssessmentResultsResponse {
  calculatedAge?: number;
  currentWeightKg?: number;
  heightCm?: number;
  bmi?: {
    value: number;
    category: string;
    description: string;
  };
  bmrKcal?: {
    value: number;
    formula: string;
    description: string;
  } | null;
  tdeeKcalRange?: {
    min: number;
    max: number;
    description: string;
  } | null;
  target5PercentWeightKg?: number;
  bmiReferenceWeightRange?: {
    min: number;
    max: number;
    description: string;
  };
  desiredWeightKg?: number | null;
  safetyOrientations?: SafetyOrientation;
  pendingItems?: PendingAssessmentItem[];
  evaluatedAt?: string;
}
