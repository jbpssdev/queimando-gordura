import { describe, expect, it } from 'vitest';
import {
  addDaysToDate,
  computeMealTotals,
  computeNutrientsForAmount,
  formatDatePtBrLong,
  formatDatePtBrShort,
  formatPtBrCalories,
  formatPtBrNumber,
  formatPtBrWater,
  formatPtBrWeight,
  getTodayIsoString,
  isValidIsoDate,
} from './diary-helpers';
import type { DiaryMealItem, FoodItem } from './diary.model';

describe('diary-helpers', () => {
  const mockFood: FoodItem = {
    id: 'food-1',
    name: 'Arroz branco cozido',
    preparation: 'Cozido',
    source: 'TACO',
    nutrientsPer100g: {
      energyKcal: 128,
      proteinG: 2.5,
      carbohydrateG: 28.1,
      fatG: 0.2,
      fiberG: 1.6,
    },
    householdMeasures: [
      { id: 'm-colher', label: 'Colher de sopa', grams: 25 },
      { id: 'm-xicara', label: 'Xícara de chá', grams: 150 },
    ],
  };

  const mockIncompleteFood: FoodItem = {
    id: 'food-2',
    name: 'Alimento artesanal',
    source: 'Rótulo',
    nutrientsPer100g: {
      energyKcal: 200,
      proteinG: null, // não informado
      carbohydrateG: 30,
      fatG: null,
      fiberG: 2,
    },
    householdMeasures: [],
  };

  describe('datas', () => {
    it('retorna data ISO válida para hoje', () => {
      const today = getTodayIsoString();
      expect(isValidIsoDate(today)).toBe(true);
    });

    it('valida formatos corretos e incorretos de data ISO', () => {
      expect(isValidIsoDate('2026-10-16')).toBe(true);
      expect(isValidIsoDate('2026-02-29')).toBe(false); // 2026 não é bissexto
      expect(isValidIsoDate('invalid')).toBe(false);
      expect(isValidIsoDate('16/10/2026')).toBe(false);
    });

    it('adiciona e subtrai dias de uma data ISO', () => {
      expect(addDaysToDate('2026-10-16', 1)).toBe('2026-10-17');
      expect(addDaysToDate('2026-10-16', -1)).toBe('2026-10-15');
      expect(addDaysToDate('2026-10-31', 1)).toBe('2026-11-01');
    });

    it('formata data em pt-BR curto e longo', () => {
      expect(formatDatePtBrShort('2026-10-16')).toBe('16/10/2026');
      const longDate = formatDatePtBrLong('2026-10-16');
      expect(longDate).toContain('2026');
      expect(longDate).toContain('outubro');
    });
  });

  describe('computeNutrientsForAmount', () => {
    it('calcula nutrientes proporcionalmente em gramas', () => {
      // 200 g = 2x o valor por 100g
      const result = computeNutrientsForAmount(mockFood, 200, 'g');
      expect(result.calculatedGrams).toBe(200);
      expect(result.energyKcal).toBe(256);
      expect(result.proteinG).toBe(5);
      expect(result.carbohydrateG).toBe(56.2);
      expect(result.fatG).toBe(0.4);
      expect(result.fiberG).toBe(3.2);
      expect(result.isPartial).toBe(false);
    });

    it('calcula nutrientes a partir de medida caseira cadastrada', () => {
      // 2 colheres de sopa (2 x 25g = 50g) -> 0.5x o valor por 100g
      const result = computeNutrientsForAmount(mockFood, 2, 'household', 'm-colher');
      expect(result.calculatedGrams).toBe(50);
      expect(result.selectedMeasureLabel).toBe('Colher de sopa');
      expect(result.energyKcal).toBe(64);
      expect(result.proteinG).toBe(1.3);
      expect(result.carbohydrateG).toBe(14.1);
    });

    it('preserva valores null em nutrientes desconhecidos e marca como parcial', () => {
      const result = computeNutrientsForAmount(mockIncompleteFood, 100, 'g');
      expect(result.energyKcal).toBe(200);
      expect(result.proteinG).toBeNull();
      expect(result.fatG).toBeNull();
      expect(result.carbohydrateG).toBe(30);
      expect(result.isPartial).toBe(true);
    });

    it('retorna zeros/nulls para quantidades nulas ou negativas', () => {
      const result = computeNutrientsForAmount(mockFood, 0, 'g');
      expect(result.calculatedGrams).toBe(0);
      expect(result.energyKcal).toBeNull();
    });
  });

  describe('computeMealTotals', () => {
    it('calcula a soma dos nutrientes para lista completa', () => {
      const items: DiaryMealItem[] = [
        {
          foodId: '1',
          foodName: 'Arroz',
          amount: 100,
          unit: 'g',
          calculatedGrams: 100,
          energyKcal: 128,
          proteinG: 2.5,
          carbohydrateG: 28.1,
          fatG: 0.2,
          fiberG: 1.6,
        },
        {
          foodId: '2',
          foodName: 'Feijão',
          amount: 100,
          unit: 'g',
          calculatedGrams: 100,
          energyKcal: 76,
          proteinG: 4.8,
          carbohydrateG: 13.6,
          fatG: 0.5,
          fiberG: 8.5,
        },
      ];

      const totals = computeMealTotals(items);
      expect(totals.energyKcal).toBe(204);
      expect(totals.proteinG).toBe(7.3);
      expect(totals.carbohydrateG).toBe(41.7);
      expect(totals.isPartialNutrition).toBe(false);
    });

    it('marca isPartialNutrition e define nutriente como null quando houver dado ausente', () => {
      const items: DiaryMealItem[] = [
        {
          foodId: '1',
          foodName: 'Arroz',
          amount: 100,
          unit: 'g',
          calculatedGrams: 100,
          energyKcal: 128,
          proteinG: null, // proteína desconhecida
          carbohydrateG: 28,
          fatG: 0.2,
          fiberG: 1.6,
        },
      ];

      const totals = computeMealTotals(items);
      expect(totals.energyKcal).toBe(128);
      expect(totals.proteinG).toBeNull();
      expect(totals.isPartialNutrition).toBe(true);
    });
  });

  describe('formatadores pt-BR', () => {
    it('formata calorias, peso, água e números', () => {
      expect(formatPtBrCalories(520.4)).toBe('520 kcal');
      expect(formatPtBrCalories(null)).toBe('Não informado');

      expect(formatPtBrWeight(74.5)).toBe('74,5 kg');
      expect(formatPtBrWeight(null)).toBe('Não informado');

      expect(formatPtBrWater(1500)).toBe('1.500 ml');
      expect(formatPtBrWater(null)).toBe('0 ml');

      expect(formatPtBrNumber(12.345, 1)).toBe('12,3');
      expect(formatPtBrNumber(null)).toBe('Não informado');
    });
  });
});
