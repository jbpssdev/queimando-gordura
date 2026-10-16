import { IsArray, IsBoolean, IsIn, IsInt, IsString, Max, Min, ValidateIf } from 'class-validator';
import type {
  AlcoholFrequency,
  MealRegularity,
  SweetenedDrinksFrequency,
} from '../types/assessment.types.js';

export class NutritionSectionDto {
  @ValidateIf((o: NutritionSectionDto) => o.mealsPerDay !== undefined)
  @IsInt({ message: 'mealsPerDay deve ser um número inteiro.' })
  @Min(1, { message: 'mealsPerDay deve ser no mínimo 1.' })
  @Max(12, { message: 'mealsPerDay deve ser no máximo 12.' })
  mealsPerDay?: number;

  @ValidateIf((o: NutritionSectionDto) => o.mealRegularity !== undefined)
  @IsIn(['regular', 'variable', 'irregular'], {
    message: 'mealRegularity deve ser regular, variable ou irregular.',
  })
  mealRegularity?: MealRegularity;

  @ValidateIf(
    (o: NutritionSectionDto) => o.prolongedFasting !== undefined && o.prolongedFasting !== null,
  )
  @IsBoolean({ message: 'prolongedFasting deve ser um booleano ou null.' })
  prolongedFasting?: boolean | null;

  @ValidateIf((o: NutritionSectionDto) => o.nightEating !== undefined && o.nightEating !== null)
  @IsBoolean({ message: 'nightEating deve ser um booleano ou null.' })
  nightEating?: boolean | null;

  @ValidateIf((o: NutritionSectionDto) => o.dietaryPreferences !== undefined)
  @IsArray({ message: 'dietaryPreferences deve ser um array de strings.' })
  @IsString({ each: true, message: 'Cada item de dietaryPreferences deve ser uma string.' })
  dietaryPreferences?: string[];

  @ValidateIf((o: NutritionSectionDto) => o.allergies !== undefined)
  @IsArray({ message: 'allergies deve ser um array de strings.' })
  @IsString({ each: true, message: 'Cada item de allergies deve ser uma string.' })
  allergies?: string[];

  @ValidateIf((o: NutritionSectionDto) => o.intolerances !== undefined)
  @IsArray({ message: 'intolerances deve ser um array de strings.' })
  @IsString({ each: true, message: 'Cada item de intolerances deve ser uma string.' })
  intolerances?: string[];

  @ValidateIf((o: NutritionSectionDto) => o.dietaryRestrictions !== undefined)
  @IsArray({ message: 'dietaryRestrictions deve ser um array de strings.' })
  @IsString({ each: true, message: 'Cada item de dietaryRestrictions deve ser uma string.' })
  dietaryRestrictions?: string[];

  @ValidateIf((o: NutritionSectionDto) => o.mealSources !== undefined)
  @IsArray({ message: 'mealSources deve ser um array de strings.' })
  @IsString({ each: true, message: 'Cada item de mealSources deve ser uma string.' })
  mealSources?: string[];

  @ValidateIf((o: NutritionSectionDto) => o.hasKitchenScale !== undefined)
  @IsBoolean({ message: 'hasKitchenScale deve ser um booleano.' })
  hasKitchenScale?: boolean;

  @ValidateIf((o: NutritionSectionDto) => o.sweetenedDrinksFrequency !== undefined)
  @IsIn(['never', 'rarely', 'weekly', 'daily', 'multiple_daily'], {
    message: 'sweetenedDrinksFrequency deve ser never, rarely, weekly, daily ou multiple_daily.',
  })
  sweetenedDrinksFrequency?: SweetenedDrinksFrequency;

  @ValidateIf((o: NutritionSectionDto) => o.alcoholFrequency !== undefined)
  @IsIn(['never', 'monthly_or_less', 'weekly', 'daily'], {
    message: 'alcoholFrequency deve ser never, monthly_or_less, weekly ou daily.',
  })
  alcoholFrequency?: AlcoholFrequency;

  @ValidateIf((o: NutritionSectionDto) => o.weightLossChallenges !== undefined)
  @IsArray({ message: 'weightLossChallenges deve ser um array de strings.' })
  @IsString({ each: true, message: 'Cada item de weightLossChallenges deve ser uma string.' })
  weightLossChallenges?: string[];

  @ValidateIf((o: NutritionSectionDto) => o.budgetConstrained !== undefined)
  @IsBoolean({ message: 'budgetConstrained deve ser um booleano.' })
  budgetConstrained?: boolean;
}
