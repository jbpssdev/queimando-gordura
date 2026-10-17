import type { FoodNutrientsPer100g } from '../../foods/types/food.types.js';

export type MealType =
  | 'breakfast'
  | 'morning_snack'
  | 'lunch'
  | 'afternoon_snack'
  | 'dinner'
  | 'snack'
  | 'supper'
  | 'other';

export type PortionUnit = 'g' | 'household';

export type ActivityType = 'cardio' | 'strength' | 'other';

export type ActivityIntensity = 'light' | 'moderate' | 'vigorous';

export interface NutrientValueSummary {
  value: number | null;
  isComplete: boolean;
}

export interface DayNutritionTotals {
  hasEntries: boolean;
  energyKcal: NutrientValueSummary;
  proteinG: NutrientValueSummary;
  carbohydrateG: NutrientValueSummary;
  fatG: NutrientValueSummary;
  fiberG: NutrientValueSummary;
}

export interface MealItemSnapshot {
  foodId: string;
  name: string;
  preparation?: string | null;
  category: string;
  source: string;
  nutrientsPer100g: FoodNutrientsPer100g;
  amount: number;
  unit: PortionUnit;
  householdMeasureId?: string | null;
  householdMeasureLabel?: string | null;
  weightG: number;
  householdMeasures?: import('../../foods/types/food.types.js').HouseholdMeasure[];
  calculatedNutrients: FoodNutrientsPer100g;
}

export interface MealDocument {
  version?: number;
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  mealType: MealType;
  title?: string | null;
  items: MealItemSnapshot[];
  totals: {
    energyKcal: NutrientValueSummary;
    proteinG: NutrientValueSummary;
    carbohydrateG: NutrientValueSummary;
    fatG: NutrientValueSummary;
    fiberG: NutrientValueSummary;
  };
  clientRequestId?: string | null;
  timeZone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WaterEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  amountMl: number;
  clientRequestId?: string | null;
  timeZone?: string | null;
  createdAt: string;
}

export interface ActivityEntry {
  version?: number;
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  type: ActivityType;
  description: string;
  durationMinutes: number;
  intensity: ActivityIntensity;
  clientRequestId?: string | null;
  timeZone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeightEntry {
  date: string; // YYYY-MM-DD (docId)
  userId: string;
  weightKg: number;
  notes?: string | null;
  timeZone?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DiaryDayResponse {
  date: string;
  meals: MealDocument[];
  nutritionTotals: DayNutritionTotals;
  water: {
    entries: WaterEntry[];
    totalMl: number;
  };
  activities: ActivityEntry[];
  weight: WeightEntry | null;
  hasAnyEntries: boolean;
}

export interface DiaryDaySummaryItem {
  date: string;
  hasMealEntries: boolean;
  totalKcal: number | null;
  nutritionIsComplete?: boolean;
  hasWaterEntries: boolean;
  totalWaterMl: number;
  hasActivities: boolean;
  hasWeightEntry: boolean;
  weightKg: number | null;
}

export interface DiarySummaryResponse {
  from: string;
  to: string;
  items: DiaryDaySummaryItem[];
}
