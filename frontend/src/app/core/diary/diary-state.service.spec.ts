import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { DiaryStateService } from './diary-state.service';
import { DiaryApiService } from './diary-api.service';
import type {
  DiaryActivity,
  DiaryDayResponse,
  DiaryMeal,
  DiaryWaterEntry,
  DiaryWeight,
} from './diary.model';

describe('DiaryStateService', () => {
  let service: DiaryStateService;
  let api: DiaryApiService;

  const mockDayData: DiaryDayResponse = {
    date: '2026-10-16',
    meals: [
      {
        id: 'meal-1',
        date: '2026-10-16',
        mealType: 'breakfast',
        title: 'Café da manhã',
        items: [
          {
            foodId: 'f1',
            foodName: 'Ovo cozido',
            amount: 100,
            unit: 'g',
            calculatedGrams: 100,
            energyKcal: 155,
            proteinG: 13,
            carbohydrateG: 1.1,
            fatG: 11,
            fiberG: 0,
          },
        ],
        totalKcal: 155,
        totalProteinG: 13,
        totalCarbG: 1.1,
        totalFatG: 11,
        totalFiberG: 0,
        isPartialNutrition: false,
      },
    ],
    waterEntries: [{ id: 'w1', date: '2026-10-16', amountMl: 500, createdAt: '' }],
    totalWaterMl: 500,
    activities: [
      {
        id: 'act-1',
        date: '2026-10-16',
        type: 'cardio',
        title: 'Caminhada',
        durationMinutes: 40,
        perceivedIntensity: 'moderate',
      },
    ],
    weight: { date: '2026-10-16', weightKg: 80.5 },
    dayTotals: {
      energyKcal: 155,
      proteinG: 13,
      carbohydrateG: 1.1,
      fatG: 11,
      fiberG: 0,
      isPartialNutrition: false,
    },
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DiaryStateService,
        {
          provide: DiaryApiService,
          useValue: {
            getDay: vi.fn().mockReturnValue(of(mockDayData)),
            createMeal: vi.fn(),
            updateMeal: vi.fn(),
            deleteMeal: vi.fn().mockReturnValue(of(undefined)),
            addWater: vi.fn(),
            deleteWater: vi.fn().mockReturnValue(of(undefined)),
            createActivity: vi.fn(),
            updateActivity: vi.fn(),
            deleteActivity: vi.fn().mockReturnValue(of(undefined)),
            upsertWeight: vi.fn(),
            deleteWeight: vi.fn().mockReturnValue(of(undefined)),
          },
        },
      ],
    });

    service = TestBed.inject(DiaryStateService);
    api = TestBed.inject(DiaryApiService);
  });

  it('inicializa com a data de hoje e status idle', () => {
    expect(service.selectedDate()).toBeDefined();
    expect(service.loadStatus()).toBe('idle');
    expect(service.isToday()).toBe(true);
  });

  it('carrega dados do dia com sucesso', () => {
    service.loadDay('2026-10-16').subscribe((res) => {
      expect(res.date).toBe('2026-10-16');
    });

    expect(api.getDay).toHaveBeenCalledWith('2026-10-16');
    expect(service.loadStatus()).toBe('ready');
    expect(service.meals().length).toBe(1);
    expect(service.totalWaterMl()).toBe(500);
    expect(service.hasAnyRecord()).toBe(true);
    expect(service.mealsByType().breakfast.length).toBe(1);
  });

  it('cria dia vazio limpo ao receber 404 da API para data sem registros', () => {
    vi.spyOn(api, 'getDay').mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 })),
    );

    service.loadDay('2026-10-20').subscribe((res) => {
      expect(res.date).toBe('2026-10-20');
      expect(res.meals).toEqual([]);
      expect(res.totalWaterMl).toBe(0);
    });

    expect(service.loadStatus()).toBe('ready');
    expect(service.hasAnyRecord()).toBe(false);
  });

  it('navega entre dias anterior, próximo e hoje', () => {
    service.selectedDate.set('2026-10-16');

    service.goToPreviousDay();
    expect(service.selectedDate()).toBe('2026-10-15');

    service.goToNextDay();
    expect(service.selectedDate()).toBe('2026-10-16');
  });

  it('adiciona refeição e atualiza lista e totais', () => {
    service.dayData.set(mockDayData);

    const newMeal: DiaryMeal = {
      id: 'meal-2',
      date: '2026-10-16',
      mealType: 'lunch',
      items: [
        {
          foodId: 'f2',
          foodName: 'Feijão',
          amount: 100,
          unit: 'g',
          calculatedGrams: 100,
          energyKcal: 80,
          proteinG: 5,
          carbohydrateG: 14,
          fatG: 0.5,
          fiberG: 8,
        },
      ],
      totalKcal: 80,
      totalProteinG: 5,
      totalCarbG: 14,
      totalFatG: 0.5,
      totalFiberG: 8,
    };

    vi.spyOn(api, 'createMeal').mockReturnValue(of(newMeal));

    service.addMeal({
      date: '2026-10-16',
      mealType: 'lunch',
      items: [{ foodId: 'f2', amount: 100, unit: 'g' }],
    }).subscribe();

    expect(service.meals().length).toBe(2);
    expect(service.mealsByType().lunch.length).toBe(1);
  });

  it('exclui refeição com sucesso', () => {
    service.dayData.set(mockDayData);
    service.deleteMeal('meal-1').subscribe();
    expect(service.meals().length).toBe(0);
  });

  it('adiciona e exclui registro de água', () => {
    service.dayData.set(mockDayData);
    const newWater: DiaryWaterEntry = {
      id: 'w2',
      date: '2026-10-16',
      amountMl: 250,
      createdAt: '',
    };
    vi.spyOn(api, 'addWater').mockReturnValue(of(newWater));

    service.addWater(250).subscribe();
    expect(service.totalWaterMl()).toBe(750);

    service.deleteWater('w1').subscribe();
    expect(service.totalWaterMl()).toBe(250);
  });

  it('adiciona e exclui atividade física', () => {
    service.dayData.set(mockDayData);
    const newAct: DiaryActivity = {
      id: 'act-2',
      date: '2026-10-16',
      type: 'strength',
      title: 'Musculação',
      durationMinutes: 45,
      perceivedIntensity: 'vigorous',
    };
    vi.spyOn(api, 'createActivity').mockReturnValue(of(newAct));

    service.addActivity({
      type: 'strength',
      title: 'Musculação',
      durationMinutes: 45,
      perceivedIntensity: 'vigorous',
    }).subscribe();

    expect(service.activities().length).toBe(2);

    service.deleteActivity('act-1').subscribe();
    expect(service.activities().length).toBe(1);
  });

  it('registra e exclui peso corporal', () => {
    service.dayData.set(mockDayData);
    const newWeight: DiaryWeight = { date: '2026-10-16', weightKg: 79.8 };
    vi.spyOn(api, 'upsertWeight').mockReturnValue(of(newWeight));

    service.upsertWeight(79.8).subscribe();
    expect(service.weight()?.weightKg).toBe(79.8);

    service.deleteWeight().subscribe();
    expect(service.weight()).toBeNull();
  });
});
