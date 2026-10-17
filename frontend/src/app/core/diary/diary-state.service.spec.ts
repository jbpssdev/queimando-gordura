import type { User } from 'firebase/auth';
import { AuthSessionService } from '../auth/auth-session.service';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { DiaryStateService } from './diary-state.service';
import { DiaryApiService } from './diary-api.service';
import type { DiaryDayResponse, DiaryMeal } from './diary.model';

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

  it('404 de contrato não é apresentado como dia vazio confirmado', () => {
    vi.mocked(api.getDay).mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    service.loadDay('2026-10-20').subscribe({ error: () => undefined });
    expect(service.loadStatus()).toBe('error');
    expect(service.dayData()).toBeNull();
  });
  it('navega entre dias anterior, próximo e hoje', () => {
    service.selectedDate.set('2026-10-16');

    service.goToPreviousDay();
    expect(service.selectedDate()).toBe('2026-10-15');

    service.goToNextDay();
    expect(service.selectedDate()).toBe('2026-10-16');
  });

  it('reconsulta os totais oficiais depois de salvar, sem somar valores locais', () => {
    const meal = { id: 'new', date: '2026-10-16' } as DiaryMeal;
    vi.mocked(api.createMeal).mockReturnValue(of(meal));
    const official = {
      ...mockDayData,
      dayTotals: { ...mockDayData.dayTotals, energyKcal: 123.456 },
    };
    vi.mocked(api.getDay).mockReturnValue(of(official));
    service.selectedDate.set('2026-10-16');
    service.addMeal({ date: '2026-10-16', mealType: 'lunch', items: [] }).subscribe();
    expect(service.dayTotals().energyKcal).toBe(123.456);
    expect(api.getDay).toHaveBeenCalledWith('2026-10-16');
  });
  it('exclusão usa o estado confirmado pelo servidor e preserva ausência nutricional', () => {
    const empty = {
      ...mockDayData,
      meals: [],
      dayTotals: {
        energyKcal: null,
        proteinG: null,
        carbohydrateG: null,
        fatG: null,
        fiberG: null,
      },
    };
    vi.mocked(api.getDay).mockReturnValue(of(empty));
    service.selectedDate.set('2026-10-16');
    service.deleteMeal('meal-1').subscribe();
    expect(service.meals()).toEqual([]);
    expect(service.dayTotals().energyKcal).toBeNull();
  });
  it('cancela consulta tardia e limpa o diário ao trocar de identidade', () => {
    const session = TestBed.inject(AuthSessionService);
    session.currentUser.set({ uid: 'first' } as User);
    TestBed.tick();
    const pending = new Subject<DiaryDayResponse>();
    vi.mocked(api.getDay).mockReturnValue(pending);
    service.loadDay('2026-10-16').subscribe();
    session.currentUser.set({ uid: 'second' } as User);
    TestBed.tick();
    pending.next(mockDayData);
    expect(service.dayData()).toBeNull();
    expect(service.loadStatus()).toBe('idle');
    expect(service.meals()).toEqual([]);
  });
});
