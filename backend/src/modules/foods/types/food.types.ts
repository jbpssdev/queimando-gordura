export interface HouseholdMeasure {
  id: string;
  label: string;
  grams: number;
  source?: string;
}

export interface FoodNutrientsPer100g {
  energyKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
  fiberG: number | null;
}

export interface FoodItem {
  id: string;
  name: string;
  preparation?: string | null;
  category: string;
  source: string;
  sourceCode?: number | string | null;
  nutrientsPer100g: FoodNutrientsPer100g;
  householdMeasures: HouseholdMeasure[];
  isCustom: boolean;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface FoodSearchResponse {
  items: FoodItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}
