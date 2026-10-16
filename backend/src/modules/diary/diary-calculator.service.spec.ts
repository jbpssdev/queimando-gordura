import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import type { FoodItem } from '../foods/types/food.types.js';
import { DiaryCalculatorService } from './diary-calculator.service.js';
import type { MealDocument } from './types/diary.types.js';

describe('DiaryCalculatorService', () => {
  let service: DiaryCalculatorService;

  const mockRice: FoodItem = {
    id: 'taco_1',
    name: 'Arroz, integral, cozido',
    preparation: 'cozido',
    category: 'Cereais e derivados',
    source: 'TACO 4ª edição',
    nutrientsPer100g: {
      energyKcal: 123.53,
      proteinG: 2.59,
      carbohydrateG: 25.81,
      fatG: 1.0,
      fiberG: 2.75,
    },
    householdMeasures: [
      { id: 'colher_sopa', label: 'Colher de sopa cheia', grams: 25 },
      { id: 'concha_media', label: 'Concha média', grams: 130 },
    ],
    isCustom: false,
  };

  const mockOilWithNullFiber: FoodItem = {
    id: 'taco_260',
    name: 'Azeite, de oliva, extra virgem',
    preparation: 'in natura',
    category: 'Gorduras e óleos',
    source: 'TACO 4ª edição',
    nutrientsPer100g: {
      energyKcal: 884.0,
      proteinG: 0.0,
      carbohydrateG: 0.0,
      fatG: 100.0,
      fiberG: null, // Não analisado/determinado na TACO
    },
    householdMeasures: [{ id: 'colher_sopa', label: 'Colher de sopa', grams: 8 }],
    isCustom: false,
  };

  beforeEach(() => {
    service = new DiaryCalculatorService();
  });

  describe('calculatePortionWeightG', () => {
    it('calcula o peso direto em gramas quando unit for g', () => {
      const result = service.calculatePortionWeightG(
        { foodId: 'taco_1', amount: 150, unit: 'g' },
        mockRice,
      );
      expect(result.weightG).toBe(150);
      expect(result.householdMeasureLabel).toBeNull();
    });

    it('calcula o peso usando a medida caseira correspondente', () => {
      const result = service.calculatePortionWeightG(
        {
          foodId: 'taco_1',
          amount: 3,
          unit: 'household',
          householdMeasureId: 'colher_sopa',
        },
        mockRice,
      );
      expect(result.weightG).toBe(75); // 3 * 25g
      expect(result.householdMeasureLabel).toBe('Colher de sopa cheia');
    });

    it('rejeita quando householdMeasureId não for informado para unit=household', () => {
      expect(() =>
        service.calculatePortionWeightG(
          { foodId: 'taco_1', amount: 2, unit: 'household' },
          mockRice,
        ),
      ).toThrow(BadRequestException);
    });

    it('rejeita quando a medida caseira não existe no alimento', () => {
      expect(() =>
        service.calculatePortionWeightG(
          {
            foodId: 'taco_1',
            amount: 1,
            unit: 'household',
            householdMeasureId: 'fatia_inexistente',
          },
          mockRice,
        ),
      ).toThrow(BadRequestException);
    });
  });

  describe('calculateNutrientsForWeight', () => {
    it('calcula proporcionalmente a 100g', () => {
      const nutrients = service.calculateNutrientsForWeight(mockRice.nutrientsPer100g, 200);
      expect(nutrients.energyKcal).toBe(247.06);
      expect(nutrients.proteinG).toBe(5.18);
      expect(nutrients.carbohydrateG).toBe(51.62);
      expect(nutrients.fatG).toBe(2.0);
      expect(nutrients.fiberG).toBe(5.5);
    });

    it('preserva valor null para nutrientes não determinados (não transforma em 0)', () => {
      const nutrients = service.calculateNutrientsForWeight(
        mockOilWithNullFiber.nutrientsPer100g,
        10,
      );
      expect(nutrients.energyKcal).toBe(88.4);
      expect(nutrients.proteinG).toBe(0.0);
      expect(nutrients.fiberG).toBeNull(); // Fibra permanece null!
    });
  });

  describe('createItemSnapshot', () => {
    it('cria snapshot imutável com todos os campos necessários', () => {
      const snapshot = service.createItemSnapshot(
        {
          foodId: 'taco_1',
          amount: 2,
          unit: 'household',
          householdMeasureId: 'colher_sopa',
        },
        mockRice,
      );

      expect(snapshot.foodId).toBe('taco_1');
      expect(snapshot.name).toBe('Arroz, integral, cozido');
      expect(snapshot.weightG).toBe(50);
      expect(snapshot.householdMeasureLabel).toBe('Colher de sopa cheia');
      expect(snapshot.calculatedNutrients.energyKcal).toBe(61.77);
      expect(snapshot.calculatedNutrients.proteinG).toBe(1.3);
    });
  });

  describe('aggregateMealTotals', () => {
    it('calcula totais completos quando todos os itens possuem os nutrientes', () => {
      const item1 = service.createItemSnapshot(
        { foodId: 'taco_1', amount: 100, unit: 'g' },
        mockRice,
      );
      const totals = service.aggregateMealTotals([item1]);

      expect(totals.energyKcal.value).toBe(123.53);
      expect(totals.energyKcal.isComplete).toBe(true);
      expect(totals.fiberG.value).toBe(2.75);
      expect(totals.fiberG.isComplete).toBe(true);
    });

    it('marca isComplete=false para nutrientes onde algum item tem valor null', () => {
      const itemRice = service.createItemSnapshot(
        { foodId: 'taco_1', amount: 100, unit: 'g' },
        mockRice,
      );
      const itemOil = service.createItemSnapshot(
        { foodId: 'taco_260', amount: 10, unit: 'g' },
        mockOilWithNullFiber,
      );

      const totals = service.aggregateMealTotals([itemRice, itemOil]);

      // Energia: ambos possuem valor
      expect(totals.energyKcal.value).toBe(211.93); // 123.53 + 88.40
      expect(totals.energyKcal.isComplete).toBe(true);

      // Fibra: azeite possui null, total deve ser parcial
      expect(totals.fiberG.value).toBe(2.75);
      expect(totals.fiberG.isComplete).toBe(false);
    });
  });

  describe('calculateDayNutritionTotals', () => {
    it('retorna hasEntries=false e valores nulos quando não existem refeições', () => {
      const dayTotals = service.calculateDayNutritionTotals([]);

      expect(dayTotals.hasEntries).toBe(false);
      expect(dayTotals.energyKcal.value).toBeNull();
      expect(dayTotals.energyKcal.isComplete).toBe(false);
      expect(dayTotals.proteinG.value).toBeNull();
    });

    it('consolida múltiplos pratos do dia', () => {
      const meal1: MealDocument = {
        id: 'm1',
        userId: 'u1',
        date: '2026-10-16',
        mealType: 'lunch',
        items: [],
        totals: {
          energyKcal: { value: 500, isComplete: true },
          proteinG: { value: 30, isComplete: true },
          carbohydrateG: { value: 60, isComplete: true },
          fatG: { value: 15, isComplete: true },
          fiberG: { value: 8, isComplete: false },
        },
        createdAt: '2026-10-16T12:00:00Z',
        updatedAt: '2026-10-16T12:00:00Z',
      };

      const meal2: MealDocument = {
        id: 'm2',
        userId: 'u1',
        date: '2026-10-16',
        mealType: 'dinner',
        items: [],
        totals: {
          energyKcal: { value: 400, isComplete: true },
          proteinG: { value: 25, isComplete: true },
          carbohydrateG: { value: 45, isComplete: true },
          fatG: { value: 10, isComplete: true },
          fiberG: { value: 5, isComplete: true },
        },
        createdAt: '2026-10-16T19:00:00Z',
        updatedAt: '2026-10-16T19:00:00Z',
      };

      const dayTotals = service.calculateDayNutritionTotals([meal1, meal2]);

      expect(dayTotals.hasEntries).toBe(true);
      expect(dayTotals.energyKcal.value).toBe(900);
      expect(dayTotals.energyKcal.isComplete).toBe(true);
      expect(dayTotals.proteinG.value).toBe(55);
      expect(dayTotals.fiberG.value).toBe(13);
      expect(dayTotals.fiberG.isComplete).toBe(false); // Porque meal1 tinha fibra incompleta
    });
  });
});
