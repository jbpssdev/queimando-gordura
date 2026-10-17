import { describe, it, expect } from 'vitest';
import { DiaryCalculatorService } from './diary-calculator.service.js';
import type { FoodItem } from '../foods/types/food.types.js';
const calculator = new DiaryCalculatorService();
const food: FoodItem = {
  id: 'reference',
  name: 'Referência numérica isolada',
  category: 'Teste unitário',
  source: 'Fixture explícita, não é catálogo',
  isCustom: true,
  householdMeasures: [{ id: 'label', label: 'Porção informada', grams: 30.25 }],
  nutrientsPer100g: {
    energyKcal: 123.4567,
    proteinG: 0,
    carbohydrateG: 25.1234,
    fatG: 2,
    fiberG: null,
  },
};
describe('Referências nutricionais independentes (aritmética decimal)', () => {
  it('preserva 1.5 × 30.25 = 45.375 g e a multiplicação por 100 sem arredondar', () => {
    const item = calculator.createItemSnapshot(
      { foodId: food.id, amount: 1.5, unit: 'household', householdMeasureId: 'label' },
      food,
    );
    expect(item.weightG).toBe(45.375);
    expect(item.calculatedNutrients.energyKcal).toBeCloseTo(56.018477625, 12);
    expect(item.calculatedNutrients.carbohydrateG).toBeCloseTo(11.39974275, 12);
    expect(item.calculatedNutrients.proteinG).toBe(0);
    expect(item.calculatedNutrients.fiberG).toBeNull();
  });
  it('agrega refeições e distingue soma conhecida, informação parcial e dia vazio', () => {
    const known = calculator.createItemSnapshot({ foodId: food.id, amount: 100, unit: 'g' }, food);
    const unknown = {
      ...known,
      calculatedNutrients: { ...known.calculatedNutrients, energyKcal: null },
    };
    expect(calculator.aggregateMealTotals([known, unknown]).energyKcal).toEqual({
      value: 123.4567,
      isComplete: false,
    });
    expect(calculator.calculateDayNutritionTotals([]).energyKcal).toEqual({
      value: null,
      isComplete: false,
    });
  });
  it('impede equivalência ausente e quantidade convertida excessiva', () => {
    expect(() =>
      calculator.createItemSnapshot(
        { foodId: food.id, amount: 1, unit: 'household', householdMeasureId: 'missing' },
        food,
      ),
    ).toThrow();
    expect(() =>
      calculator.createItemSnapshot(
        { foodId: food.id, amount: 1000, unit: 'household', householdMeasureId: 'label' },
        food,
      ),
    ).toThrow();
  });
});
