export interface NutrientsPer100g {
  energyKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
  fiberG: number | null;
}

export interface HouseholdMeasure {
  id: string;
  label: string; // e.g. "Colher de sopa", "Xícara", "Fatia", "Unidade"
  grams: number;
  source?: string;
}

export interface FoodItem {
  id: string;
  name: string;
  preparation?: string | null;
  source: string; // e.g. "TACO", "IBGE", "Rótulo", "Personalizado"
  sourceCode?: string | number | null;
  category?: string;
  sourceReference?: string;
  sourceUrl?: string;
  version?: number;
  isCustom?: boolean;
  nutrientsPer100g: NutrientsPer100g;
  householdMeasures: HouseholdMeasure[];
}

export interface FoodCatalogResponse {
  items: FoodItem[];
  nextCursor?: string | null;
  total?: number;
}

export interface CreateCustomFoodDto {
  name: string;
  source: string; // e.g. "Rótulo do produto"
  nutrientsPer100g: NutrientsPer100g;
  householdMeasure?: {
    label: string;
    grams: number;
  } | null;
}

export type MealType =
  | 'morning_snack'
  | 'afternoon_snack'
  | 'breakfast'
  | 'lunch'
  | 'dinner'
  | 'snack'
  | 'supper'
  | 'other';

export const MEAL_TYPES: readonly MealType[] = [
  'breakfast',
  'morning_snack',
  'afternoon_snack',
  'lunch',
  'dinner',
  'snack',
  'supper',
  'other',
] as const;

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Café da manhã',
  morning_snack: 'Lanche da manhã',
  afternoon_snack: 'Lanche da tarde',
  lunch: 'Almoço',
  dinner: 'Jantar',
  snack: 'Lanches',
  supper: 'Ceia',
  other: 'Outros',
};

export interface MealItemInput {
  foodId: string;
  amount: number;
  unit: 'g' | 'household';
  householdMeasureId?: string | null;
}

export interface CreateMealDto {
  date: string; // YYYY-MM-DD
  mealType: MealType;
  title?: string;
  items: MealItemInput[];
  clientRequestId?: string;
  timeZone?: string;
}

export interface UpdateMealDto {
  mealType?: MealType;
  title?: string;
  items?: MealItemInput[];
  version?: number;
}

export interface DiaryMealItem {
  foodId: string;
  foodName: string;
  foodPreparation?: string | null;
  foodSource?: string | null;
  isCustom?: boolean;
  amount: number;
  unit: 'g' | 'household';
  householdMeasureId?: string | null;
  householdMeasureLabel?: string | null;
  calculatedGrams: number;
  energyKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
  fiberG: number | null;
}

export interface DiaryMeal {
  id: string;
  date: string;
  mealType: MealType;
  title?: string;
  items: DiaryMealItem[];
  totalKcal: number | null;
  totalProteinG: number | null;
  totalCarbG: number | null;
  totalFatG: number | null;
  totalFiberG: number | null;
  isPartialNutrition?: boolean;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWaterDto {
  date: string; // YYYY-MM-DD
  amountMl: number;
}

export interface DiaryWaterEntry {
  id: string;
  date: string;
  amountMl: number;
  createdAt: string;
}

export type ActivityType = 'cardio' | 'strength' | 'other';

export const ACTIVITY_TYPES: readonly ActivityType[] = ['cardio', 'strength', 'other'] as const;

export const ACTIVITY_TYPE_LABELS: Record<ActivityType, string> = {
  cardio: 'Cardio / Aeróbico',
  strength: 'Musculação / Força',
  other: 'Outra atividade',
};

export type ActivityIntensity = 'light' | 'moderate' | 'vigorous';

export const ACTIVITY_INTENSITIES: readonly ActivityIntensity[] = [
  'light',
  'moderate',
  'vigorous',
] as const;

export const ACTIVITY_INTENSITY_LABELS: Record<ActivityIntensity, string> = {
  light: 'Leve (consegue conversar facilmente)',
  moderate: 'Moderada (respiração acelerada, conversa com pausas)',
  vigorous: 'Intensa (respiração ofegante, esforço contínuo)',
};

export interface CreateActivityDto {
  date: string; // YYYY-MM-DD
  type: ActivityType;
  title: string;
  durationMinutes: number;
  perceivedIntensity: ActivityIntensity;
}

export interface UpdateActivityDto {
  type?: ActivityType;
  title?: string;
  durationMinutes?: number;
  perceivedIntensity?: ActivityIntensity;
  version?: number;
}

export interface DiaryActivity {
  id: string;
  date: string;
  type: ActivityType;
  title: string;
  durationMinutes: number;
  perceivedIntensity: ActivityIntensity;
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertWeightDto {
  date: string; // YYYY-MM-DD
  weightKg: number;
}

export interface DiaryWeight {
  date: string; // YYYY-MM-DD
  weightKg: number;
  updatedAt?: string;
}

export interface DiaryNutritionTotals {
  energyKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
  fiberG: number | null;
  isPartialNutrition?: boolean;
}

export interface DiaryDayResponse {
  date: string;
  meals: DiaryMeal[];
  waterEntries: DiaryWaterEntry[];
  totalWaterMl: number;
  activities: DiaryActivity[];
  weight?: DiaryWeight | null;
  dayTotals: DiaryNutritionTotals;
}

export interface DiaryDaySummaryItem {
  date: string;
  hasMeals: boolean;
  hasActivities: boolean;
  hasWater: boolean;
  hasWeight: boolean;
  totalKcal?: number | null;
  totalWaterMl?: number;
  weightKg?: number | null;
}

export interface DiarySummaryResponse {
  summaries: DiaryDaySummaryItem[];
}
