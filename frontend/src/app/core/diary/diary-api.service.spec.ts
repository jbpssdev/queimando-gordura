import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { DiaryApiService } from './diary-api.service';
import type {
  CreateActivityDto,
  CreateCustomFoodDto,
  CreateMealDto,
  CreateWaterDto,
  UpsertWeightDto,
} from './diary.model';

describe('DiaryApiService', () => {
  let service: DiaryApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DiaryApiService],
    });

    service = TestBed.inject(DiaryApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('busca alimentos no catálogo com parâmetros de busca', () => {
    service.searchFoods('arroz', 15).subscribe((res) => {
      expect(res.items.length).toBe(1);
    });

    const req = httpTesting.expectOne((r) => r.url === '/api/v1/foods');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('query')).toBe('arroz');
    expect(req.request.params.get('limit')).toBe('15');
    req.flush({ items: [{ id: '1', name: 'Arroz' }] });
  });

  it('obtém detalhes de alimento pelo id', () => {
    service.getFoodById('food-123').subscribe((res) => {
      expect(res.id).toBe('food-123');
    });

    const req = httpTesting.expectOne('/api/v1/foods/food-123');
    expect(req.request.method).toBe('GET');
    req.flush({ id: 'food-123', name: 'Frango grelhado' });
  });

  it('cadastra alimento personalizado', () => {
    const dto: CreateCustomFoodDto = {
      name: 'Pão Caseiro',
      source: 'Receita de família',
      nutrientsPer100g: {
        energyKcal: 250,
        proteinG: 8,
        carbohydrateG: 45,
        fatG: 3,
        fiberG: 2,
      },
    };

    service.createCustomFood(dto).subscribe((res) => {
      expect(res.id).toBe('custom-1');
    });

    const req = httpTesting.expectOne('/api/v1/foods/me');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ ...dto, householdMeasures: [] });
    req.flush({ id: 'custom-1', ...dto });
  });

  it('consulta os dados do diário para uma data específica', () => {
    service.getDay('2026-10-16').subscribe((res) => {
      expect(res.date).toBe('2026-10-16');
    });

    const req = httpTesting.expectOne('/api/v1/diary/me?date=2026-10-16');
    expect(req.request.method).toBe('GET');
    req.flush({
      date: '2026-10-16',
      meals: [],
      water: { entries: [], totalMl: 0 },
      activities: [],
      nutritionTotals: {
        hasEntries: false,
        ...Object.fromEntries(
          ['energyKcal', 'proteinG', 'carbohydrateG', 'fatG', 'fiberG'].map((key) => [
            key,
            { value: null, isComplete: false },
          ]),
        ),
      },
    });
  });

  it('consulta o resumo de intervalo para o calendário', () => {
    service.getSummary('2026-10-01', '2026-10-30').subscribe((res) => {
      expect(res.summaries.length).toBe(1);
    });

    const req = httpTesting.expectOne('/api/v1/diary/me/summary?from=2026-10-01&to=2026-10-30');
    expect(req.request.method).toBe('GET');
    req.flush({
      from: '2026-10-01',
      to: '2026-10-30',
      items: [
        {
          date: '2026-10-16',
          hasMealEntries: true,
          hasActivities: false,
          hasWaterEntries: false,
          hasWeightEntry: false,
          totalKcal: 100,
        },
      ],
    });
  });

  it('cria, atualiza e exclui refeição', () => {
    const createDto: CreateMealDto = {
      date: '2026-10-16',
      mealType: 'lunch',
      items: [{ foodId: '1', amount: 100, unit: 'g' }],
    };

    service.createMeal(createDto).subscribe((res) => {
      expect(res.id).toBe('meal-1');
    });
    const reqCreate = httpTesting.expectOne('/api/v1/diary/me/meals');
    expect(reqCreate.request.method).toBe('POST');
    reqCreate.flush({
      id: 'meal-1',
      ...createDto,
      items: [],
      totals: Object.fromEntries(
        ['energyKcal', 'proteinG', 'carbohydrateG', 'fatG', 'fiberG'].map((key) => [
          key,
          { value: 100, isComplete: true },
        ]),
      ),
    });

    service.updateMeal('meal-1', { title: 'Almoço leve' }).subscribe((res) => {
      expect(res.title).toBe('Almoço leve');
    });
    const reqUpdate = httpTesting.expectOne('/api/v1/diary/me/meals/meal-1');
    expect(reqUpdate.request.method).toBe('PATCH');
    reqUpdate.flush({
      id: 'meal-1',
      title: 'Almoço leve',
      items: [],
      totals: Object.fromEntries(
        ['energyKcal', 'proteinG', 'carbohydrateG', 'fatG', 'fiberG'].map((key) => [
          key,
          { value: 100, isComplete: true },
        ]),
      ),
    });

    service.deleteMeal('meal-1').subscribe();
    const reqDelete = httpTesting.expectOne('/api/v1/diary/me/meals/meal-1');
    expect(reqDelete.request.method).toBe('DELETE');
    reqDelete.flush(null);
  });

  it('adiciona e exclui registro de água', () => {
    const dto: CreateWaterDto = { date: '2026-10-16', amountMl: 250 };
    service.addWater(dto).subscribe((res) => {
      expect(res.id).toBe('w-1');
    });
    const reqPost = httpTesting.expectOne('/api/v1/diary/me/water');
    expect(reqPost.request.method).toBe('POST');
    reqPost.flush({ id: 'w-1', ...dto });

    service.deleteWater('w-1').subscribe();
    const reqDelete = httpTesting.expectOne('/api/v1/diary/me/water/w-1');
    expect(reqDelete.request.method).toBe('DELETE');
    reqDelete.flush(null);
  });

  it('cria, atualiza e exclui atividade física', () => {
    const dto: CreateActivityDto = {
      date: '2026-10-16',
      type: 'cardio',
      title: 'Caminhada matinal',
      durationMinutes: 30,
      perceivedIntensity: 'moderate',
    };
    service.createActivity(dto).subscribe((res) => {
      expect(res.id).toBe('act-1');
    });
    const reqCreate = httpTesting.expectOne('/api/v1/diary/me/activities');
    expect(reqCreate.request.method).toBe('POST');
    reqCreate.flush({
      id: 'act-1',
      ...dto,
      description: dto.title,
      intensity: dto.perceivedIntensity,
    });

    service.deleteActivity('act-1').subscribe();
    const reqDelete = httpTesting.expectOne('/api/v1/diary/me/activities/act-1');
    expect(reqDelete.request.method).toBe('DELETE');
    reqDelete.flush(null);
  });

  it('registra peso e exclui peso', () => {
    const dto: UpsertWeightDto = { date: '2026-10-16', weightKg: 82.5 };
    service.upsertWeight(dto).subscribe((res) => {
      expect(res.weightKg).toBe(82.5);
    });
    const reqPut = httpTesting.expectOne('/api/v1/diary/me/weight');
    expect(reqPut.request.method).toBe('PUT');
    reqPut.flush(dto);

    service.deleteWeight('2026-10-16').subscribe();
    const reqDel = httpTesting.expectOne('/api/v1/diary/me/weight?date=2026-10-16');
    expect(reqDel.request.method).toBe('DELETE');
    reqDel.flush(null);
  });
});
