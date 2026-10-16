import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { FirebaseService } from '../firebase/firebase.service.js';
import type { FoodItem } from '../foods/types/food.types.js';
import type { FoodsService } from '../foods/foods.service.js';
import { DiaryCalculatorService } from './diary-calculator.service.js';
import { DiaryService } from './diary.service.js';

describe('DiaryService', () => {
  let service: DiaryService;
  let calculator: DiaryCalculatorService;
  let mockFirebaseService: FirebaseService;
  let mockFirestoreData: Record<string, unknown>;
  let mockFoodsService: unknown;

  const user: AuthenticatedUser = {
    uid: 'user-diary-1',
    email: 'user@diary.com',
    emailVerified: true,
  };

  const mockChicken: FoodItem = {
    id: 'taco_320',
    name: 'Frango, peito, sem pele, grelhado',
    preparation: 'grelhado',
    category: 'Carnes e derivados',
    source: 'TACO 4ª edição',
    nutrientsPer100g: {
      energyKcal: 159.0,
      proteinG: 32.0,
      carbohydrateG: 0.0,
      fatG: 2.5,
      fiberG: null, // Não determinado
    },
    householdMeasures: [
      { id: 'file_medio', label: 'Filé médio', grams: 100 },
    ],
    isCustom: false,
  };

  beforeEach(() => {
    mockFirestoreData = {};
    calculator = new DiaryCalculatorService();

    mockFoodsService = {
      getFoodById: vi.fn().mockImplementation(async (id: string) => {
        if (id === 'taco_320') return mockChicken;
        throw new NotFoundException('Food not found');
      }),
    };

    const mockFirestore = {
      collection: (collName: string) => ({
        doc: (docId: string) => ({
          collection: (subColl: string) => ({
            doc: (subDocId: string) => ({
              get: async () => {
                const key = `${collName}/${docId}/${subColl}/${subDocId}`;
                const data = mockFirestoreData[key];
                return {
                  exists: !!data,
                  data: () => data,
                };
              },
              set: async (val: unknown) => {
                const key = `${collName}/${docId}/${subColl}/${subDocId}`;
                mockFirestoreData[key] = val;
              },
              delete: async () => {
                const key = `${collName}/${docId}/${subColl}/${subDocId}`;
                delete mockFirestoreData[key];
              },
            }),
            where: (field: string, op: string, val: unknown) => {
              const prefix = `${collName}/${docId}/${subColl}/`;
              let results = Object.entries(mockFirestoreData)
                .filter(([k]) => k.startsWith(prefix))
                .map(([, v]) => v as Record<string, unknown>);

              const applyFilter = (f: string, operator: string, v: unknown) => {
                if (operator === '==') {
                  results = results.filter((item) => item[f] === v);
                } else if (operator === '>=') {
                  results = results.filter((item) => (item[f] as string) >= (v as string));
                } else if (operator === '<=') {
                  results = results.filter((item) => (item[f] as string) <= (v as string));
                }
              };

              applyFilter(field, op, val);

              const chain = {
                where: (f2: string, op2: string, v2: unknown) => {
                  applyFilter(f2, op2, v2);
                  return chain;
                },
                limit: (lim: number) => ({
                  get: async () => {
                    const limited = results.slice(0, lim);
                    return {
                      empty: limited.length === 0,
                      docs: limited.map((item) => ({ data: () => item })),
                    };
                  },
                }),
                get: async () => ({
                  empty: results.length === 0,
                  docs: results.map((item) => ({ data: () => item })),
                }),
              };

              return chain;
            },
          }),
        }),
      }),
    };

    mockFirebaseService = {
      getFirestore: vi.fn().mockReturnValue(mockFirestore),
    } as unknown as FirebaseService;

    service = new DiaryService(
      mockFirebaseService,
      mockFoodsService as unknown as FoodsService,
      calculator,
    );
  });

  describe('Refeições e Snapshots Nutricionais', () => {
    it('cria refeição com snapshot completo dos alimentos e cálculos proporcionais', async () => {
      const meal = await service.createMeal(user, {
        date: '2026-10-16',
        mealType: 'lunch',
        title: 'Almoço Saudável',
        items: [
          {
            foodId: 'taco_320',
            amount: 1,
            unit: 'household',
            householdMeasureId: 'file_medio',
          },
        ],
        clientRequestId: 'req-meal-1',
      });

      expect(meal.id).toMatch(/^meal_/);
      expect(meal.date).toBe('2026-10-16');
      expect(meal.mealType).toBe('lunch');
      expect(meal.items.length).toBe(1);

      const itemSnapshot = meal.items[0]!;
      expect(itemSnapshot.name).toBe('Frango, peito, sem pele, grelhado');
      expect(itemSnapshot.weightG).toBe(100);
      expect(itemSnapshot.calculatedNutrients.energyKcal).toBe(159.0);
      expect(itemSnapshot.calculatedNutrients.proteinG).toBe(32.0);

      // Fibra do frango na TACO é null -> total de fibra deve ser marcado como incompleto
      expect(meal.totals.fiberG.isComplete).toBe(false);
      expect(meal.totals.energyKcal.isComplete).toBe(true);
      expect(meal.totals.energyKcal.value).toBe(159.0);
    });

    it('mantém idempotência quando o mesmo clientRequestId for enviado novamente', async () => {
      const meal1 = await service.createMeal(user, {
        date: '2026-10-16',
        mealType: 'lunch',
        items: [{ foodId: 'taco_320', amount: 100, unit: 'g' }],
        clientRequestId: 'unique-idempotent-key',
      });

      const meal2 = await service.createMeal(user, {
        date: '2026-10-16',
        mealType: 'lunch',
        items: [{ foodId: 'taco_320', amount: 100, unit: 'g' }],
        clientRequestId: 'unique-idempotent-key',
      });

      expect(meal2.id).toBe(meal1.id);
    });

    it('exclui refeição com sucesso', async () => {
      const meal = await service.createMeal(user, {
        date: '2026-10-16',
        mealType: 'snack',
        items: [{ foodId: 'taco_320', amount: 50, unit: 'g' }],
      });

      const res = await service.deleteMeal(meal.id, user);
      expect(res.success).toBe(true);

      await expect(service.deleteMeal(meal.id, user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Hidratação (Água)', () => {
    it('registra ingestão de água e suporta múltiplos registros por dia', async () => {
      const w1 = await service.logWater(user, {
        date: '2026-10-16',
        amountMl: 300,
        clientRequestId: 'water-1',
      });
      const w2 = await service.logWater(user, {
        date: '2026-10-16',
        amountMl: 500,
        clientRequestId: 'water-2',
      });

      expect(w1.id).toBeDefined();
      expect(w2.id).toBeDefined();

      const day = await service.getDayDiary(user, '2026-10-16');
      expect(day.water.entries.length).toBe(2);
      expect(day.water.totalMl).toBe(800);
    });

    it('mantém idempotência por clientRequestId em água', async () => {
      const w1 = await service.logWater(user, {
        date: '2026-10-16',
        amountMl: 250,
        clientRequestId: 'water-idempotent',
      });

      const w2 = await service.logWater(user, {
        date: '2026-10-16',
        amountMl: 250,
        clientRequestId: 'water-idempotent',
      });

      expect(w2.id).toBe(w1.id);
    });
  });

  describe('Atividades Físicas (Sem queima calórica inventada)', () => {
    it('registra atividade física e preserva tipo, intensidade e duração sem fabricar calorias', async () => {
      const activity = await service.logActivity(user, {
        date: '2026-10-16',
        type: 'cardio',
        description: 'Caminhada moderada no parque',
        durationMinutes: 45,
        intensity: 'moderate',
      });

      expect(activity.id).toBeDefined();
      expect(activity.durationMinutes).toBe(45);
      expect(activity.intensity).toBe('moderate');

      // Garante que nenhum gasto calórico fictício é anexado ou subtraído
      expect((activity as unknown as Record<string, unknown>)['caloriesBurned']).toBeUndefined();
      expect((activity as unknown as Record<string, unknown>)['calories']).toBeUndefined();
    });

    it('atualiza atividade física existente', async () => {
      const activity = await service.logActivity(user, {
        date: '2026-10-16',
        type: 'strength',
        description: 'Treino de pernas',
        durationMinutes: 40,
        intensity: 'moderate',
      });

      const updated = await service.updateActivity(activity.id, user, {
        durationMinutes: 50,
        intensity: 'vigorous',
      });

      expect(updated.durationMinutes).toBe(50);
      expect(updated.intensity).toBe('vigorous');
    });
  });

  describe('Peso Semanal', () => {
    it('registra peso e atualiza de forma idempotente para a mesma data civil', async () => {
      const w1 = await service.logWeight(user, {
        date: '2026-10-16',
        weightKg: 85.2,
      });

      expect(w1.weightKg).toBe(85.2);

      const w2 = await service.logWeight(user, {
        date: '2026-10-16',
        weightKg: 84.9,
      });

      expect(w2.weightKg).toBe(84.9);
      expect(w2.date).toBe('2026-10-16');
    });

    it('exclui peso da data', async () => {
      await service.logWeight(user, {
        date: '2026-10-16',
        weightKg: 84.0,
      });

      const res = await service.deleteWeight('2026-10-16', user);
      expect(res.success).toBe(true);

      await expect(service.deleteWeight('2026-10-16', user)).rejects.toThrow(NotFoundException);
    });
  });

  describe('Consulta Diária e Resumo Semanal/Mensal', () => {
    it('retorna estado sem informação quando o dia não possui refeições (sem afirmar 0 kcal)', async () => {
      const day = await service.getDayDiary(user, '2026-10-15');

      expect(day.hasAnyEntries).toBe(false);
      expect(day.nutritionTotals.hasEntries).toBe(false);
      expect(day.nutritionTotals.energyKcal.value).toBeNull(); // Não afirma consumo de zero calorias!
    });

    it('retorna resumo de intervalo com indicadores para o calendário', async () => {
      await service.createMeal(user, {
        date: '2026-10-10',
        mealType: 'lunch',
        items: [{ foodId: 'taco_320', amount: 100, unit: 'g' }],
      });

      await service.logWater(user, {
        date: '2026-10-10',
        amountMl: 600,
      });

      await service.logWeight(user, {
        date: '2026-10-10',
        weightKg: 82.5,
      });

      const summary = await service.getSummary(user, '2026-10-10', '2026-10-12');

      expect(summary.items.length).toBe(3);

      const day10 = summary.items.find((i) => i.date === '2026-10-10')!;
      expect(day10.hasMealEntries).toBe(true);
      expect(day10.totalKcal).toBe(159.0);
      expect(day10.hasWaterEntries).toBe(true);
      expect(day10.totalWaterMl).toBe(600);
      expect(day10.hasWeightEntry).toBe(true);
      expect(day10.weightKg).toBe(82.5);

      const day11 = summary.items.find((i) => i.date === '2026-10-11')!;
      expect(day11.hasMealEntries).toBe(false);
      expect(day11.totalKcal).toBeNull();
      expect(day11.hasWaterEntries).toBe(false);
    });

    it('rejeita resumo se from for maior que to', async () => {
      await expect(service.getSummary(user, '2026-10-15', '2026-10-10')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejeita resumo se o intervalo for maior que 62 dias', async () => {
      await expect(service.getSummary(user, '2026-01-01', '2026-04-01')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
