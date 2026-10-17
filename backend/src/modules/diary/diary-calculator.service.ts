import { BadRequestException, Injectable } from '@nestjs/common';
import type { FoodItem, FoodNutrientsPer100g } from '../foods/types/food.types.js';
import type { MealItemDto } from './dto/create-meal.dto.js';
import type {
  DayNutritionTotals,
  MealDocument,
  MealItemSnapshot,
  NutrientValueSummary,
} from './types/diary.types.js';

@Injectable()
export class DiaryCalculatorService {
  /**
   * Converte a quantidade informada para peso em gramas.
   */
  calculatePortionWeightG(
    itemDto: MealItemDto,
    food: FoodItem,
  ): {
    weightG: number;
    householdMeasureLabel?: string | null;
  } {
    if (itemDto.unit === 'g') {
      return {
        weightG: itemDto.amount,
        householdMeasureLabel: null,
      };
    }

    if (itemDto.unit === 'household') {
      if (!itemDto.householdMeasureId) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'HOUSEHOLD_MEASURE_REQUIRED',
          message: 'householdMeasureId é obrigatório quando a unidade for household.',
        });
      }

      const measure = food.householdMeasures?.find((m) => m.id === itemDto.householdMeasureId);
      if (!measure) {
        throw new BadRequestException({
          statusCode: 400,
          code: 'INVALID_HOUSEHOLD_MEASURE',
          message: `Medida caseira '${itemDto.householdMeasureId}' não disponível para o alimento '${food.name}'.`,
        });
      }

      const weightG = itemDto.amount * measure.grams;
      return {
        weightG,
        householdMeasureLabel: measure.label,
      };
    }

    throw new BadRequestException({
      statusCode: 400,
      code: 'INVALID_PORTION_UNIT',
      message: 'Unidade deve ser g ou household.',
    });
  }

  /**
   * Calcula os nutrientes da porção proporcionalmente a 100g do alimento.
   */
  calculateNutrientsForWeight(
    nutrientsPer100g: FoodNutrientsPer100g,
    weightG: number,
  ): FoodNutrientsPer100g {
    const calc = (per100g: number | null): number | null => {
      if (per100g === null || per100g === undefined) {
        return null;
      }
      return (per100g * weightG) / 100;
    };

    return {
      energyKcal: calc(nutrientsPer100g.energyKcal),
      proteinG: calc(nutrientsPer100g.proteinG),
      carbohydrateG: calc(nutrientsPer100g.carbohydrateG),
      fatG: calc(nutrientsPer100g.fatG),
      fiberG: calc(nutrientsPer100g.fiberG),
    };
  }

  /**
   * Cria o snapshot completo do item de refeição, preservando o estado no momento do registro.
   */
  createItemSnapshot(itemDto: MealItemDto, food: FoodItem): MealItemSnapshot {
    const { weightG, householdMeasureLabel } = this.calculatePortionWeightG(itemDto, food);
    if (!Number.isFinite(weightG) || weightG <= 0 || weightG > 10000)
      throw new BadRequestException({
        code: 'INVALID_PORTION_WEIGHT',
        message: 'A porção deve conter até 10000 g e ser positiva.',
      });
    const calculatedNutrients = this.calculateNutrientsForWeight(food.nutrientsPer100g, weightG);

    return {
      foodId: food.id,
      name: food.name,
      preparation: food.preparation ?? null,
      category: food.category,
      source: food.source,
      nutrientsPer100g: { ...food.nutrientsPer100g },
      amount: itemDto.amount,
      unit: itemDto.unit,
      householdMeasureId: itemDto.householdMeasureId ?? null,
      householdMeasureLabel: householdMeasureLabel ?? null,
      weightG,
      householdMeasures: structuredClone(food.householdMeasures ?? []),
      calculatedNutrients,
    };
  }

  /**
   * Agrega os totais nutricionais de uma refeição a partir dos snapshots dos seus itens.
   */
  aggregateMealTotals(items: MealItemSnapshot[]): {
    energyKcal: NutrientValueSummary;
    proteinG: NutrientValueSummary;
    carbohydrateG: NutrientValueSummary;
    fatG: NutrientValueSummary;
    fiberG: NutrientValueSummary;
  } {
    const aggregateNutrient = (key: keyof FoodNutrientsPer100g): NutrientValueSummary => {
      let knownSum = 0;
      let hasAnyKnown = false;
      let isComplete = true;

      for (const item of items) {
        const val = item.calculatedNutrients[key];
        if (val !== null && val !== undefined) {
          knownSum += val;
          hasAnyKnown = true;
        } else {
          isComplete = false;
        }
      }

      if (!hasAnyKnown && !isComplete) {
        return { value: null, isComplete: false };
      }

      return {
        value: knownSum,
        isComplete,
      };
    };

    return {
      energyKcal: aggregateNutrient('energyKcal'),
      proteinG: aggregateNutrient('proteinG'),
      carbohydrateG: aggregateNutrient('carbohydrateG'),
      fatG: aggregateNutrient('fatG'),
      fiberG: aggregateNutrient('fiberG'),
    };
  }

  /**
   * Calcula os totais diários consolidados a partir de todas as refeições do dia.
   * Se não existirem refeições registradas, retorna hasEntries: false e valores nulos.
   */
  calculateDayNutritionTotals(meals: MealDocument[]): DayNutritionTotals {
    if (!meals || meals.length === 0) {
      return {
        hasEntries: false,
        energyKcal: { value: null, isComplete: false },
        proteinG: { value: null, isComplete: false },
        carbohydrateG: { value: null, isComplete: false },
        fatG: { value: null, isComplete: false },
        fiberG: { value: null, isComplete: false },
      };
    }

    const aggregateDayNutrient = (key: keyof MealDocument['totals']): NutrientValueSummary => {
      let knownSum = 0;
      let hasAnyKnown = false;
      let isComplete = true;

      for (const meal of meals) {
        const nutrient = meal.totals[key];
        if (nutrient.value !== null && nutrient.value !== undefined) {
          knownSum += nutrient.value;
          hasAnyKnown = true;
        }
        if (!nutrient.isComplete) {
          isComplete = false;
        }
      }

      return {
        value: hasAnyKnown ? knownSum : null,
        isComplete,
      };
    };

    return {
      hasEntries: true,
      energyKcal: aggregateDayNutrient('energyKcal'),
      proteinG: aggregateDayNutrient('proteinG'),
      carbohydrateG: aggregateDayNutrient('carbohydrateG'),
      fatG: aggregateDayNutrient('fatG'),
      fiberG: aggregateDayNutrient('fiberG'),
    };
  }
}
