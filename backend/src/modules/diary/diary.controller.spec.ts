import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { DiaryController } from './diary.controller.js';
import type { DiaryService } from './diary.service.js';
import type { CreateMealDto } from './dto/create-meal.dto.js';
import type { UpdateMealDto } from './dto/update-meal.dto.js';

describe('DiaryController', () => {
  let controller: DiaryController;
  let mockDiaryService: DiaryService;

  const user: AuthenticatedUser = {
    uid: 'user-ctrl-1',
    email: 'user@ctrl.com',
    emailVerified: true,
  };

  beforeEach(() => {
    mockDiaryService = {
      createMeal: vi.fn().mockResolvedValue({ id: 'meal_1' }),
      updateMeal: vi.fn().mockResolvedValue({ id: 'meal_1' }),
      deleteMeal: vi.fn().mockResolvedValue({ success: true, id: 'meal_1' }),
      logWater: vi.fn().mockResolvedValue({ id: 'water_1' }),
      deleteWater: vi.fn().mockResolvedValue({ success: true, id: 'water_1' }),
      logActivity: vi.fn().mockResolvedValue({ id: 'activity_1' }),
      updateActivity: vi.fn().mockResolvedValue({ id: 'activity_1' }),
      deleteActivity: vi.fn().mockResolvedValue({ success: true, id: 'activity_1' }),
      logWeight: vi.fn().mockResolvedValue({ date: '2026-10-16', weightKg: 80 }),
      deleteWeight: vi.fn().mockResolvedValue({ success: true, date: '2026-10-16' }),
      getDayDiary: vi.fn().mockResolvedValue({ date: '2026-10-16', meals: [] }),
      getSummary: vi.fn().mockResolvedValue({ from: '2026-10-01', to: '2026-10-15', items: [] }),
    } as unknown as DiaryService;

    controller = new DiaryController(mockDiaryService);
  });

  it('deve delegar createMeal para o serviço', async () => {
    const dto = { date: '2026-10-16', mealType: 'lunch' as const, items: [] };
    const res = await controller.createMeal(user, dto as unknown as CreateMealDto);
    expect(mockDiaryService.createMeal).toHaveBeenCalledWith(user, dto);
    expect(res.id).toBe('meal_1');
  });

  it('deve delegar updateMeal para o serviço', async () => {
    const dto = { mealType: 'dinner' as const };
    const res = await controller.updateMeal(user, 'meal_1', dto as unknown as UpdateMealDto);
    expect(mockDiaryService.updateMeal).toHaveBeenCalledWith('meal_1', user, dto);
    expect(res.id).toBe('meal_1');
  });

  it('deve delegar deleteMeal para o serviço', async () => {
    const res = await controller.deleteMeal(user, 'meal_1');
    expect(mockDiaryService.deleteMeal).toHaveBeenCalledWith('meal_1', user);
    expect(res.success).toBe(true);
  });

  it('deve delegar logWater e deleteWater', async () => {
    const dto = { date: '2026-10-16', amountMl: 500 };
    const res = await controller.logWater(user, dto);
    expect(mockDiaryService.logWater).toHaveBeenCalledWith(user, dto);
    expect(res.id).toBe('water_1');

    const delRes = await controller.deleteWater(user, 'water_1');
    expect(mockDiaryService.deleteWater).toHaveBeenCalledWith('water_1', user);
    expect(delRes.success).toBe(true);
  });

  it('deve delegar logActivity e updateActivity', async () => {
    const dto = {
      date: '2026-10-16',
      type: 'cardio' as const,
      description: 'Corrida',
      durationMinutes: 30,
      intensity: 'vigorous' as const,
    };
    const res = await controller.logActivity(user, dto);
    expect(mockDiaryService.logActivity).toHaveBeenCalledWith(user, dto);
    expect(res.id).toBe('activity_1');

    const updateRes = await controller.updateActivity(user, 'activity_1', { durationMinutes: 40 });
    expect(mockDiaryService.updateActivity).toHaveBeenCalledWith('activity_1', user, {
      durationMinutes: 40,
    });
    expect(updateRes.id).toBe('activity_1');
  });

  it('deve delegar logWeight e deleteWeight (param e query)', async () => {
    const dto = { date: '2026-10-16', weightKg: 80 };
    const res = await controller.logWeight(user, dto);
    expect(mockDiaryService.logWeight).toHaveBeenCalledWith(user, dto);
    expect(res.weightKg).toBe(80);

    await controller.deleteWeightParam(user, '2026-10-16');
    expect(mockDiaryService.deleteWeight).toHaveBeenCalledWith('2026-10-16', user);

    await controller.deleteWeightQuery(user, '2026-10-16');
    expect(mockDiaryService.deleteWeight).toHaveBeenCalledWith('2026-10-16', user);
  });

  it('deve delegar getDayDiary e getSummary', async () => {
    await controller.getDayDiary(user, { date: '2026-10-16' });
    expect(mockDiaryService.getDayDiary).toHaveBeenCalledWith(user, '2026-10-16');

    await controller.getSummary(user, { from: '2026-10-01', to: '2026-10-15' });
    expect(mockDiaryService.getSummary).toHaveBeenCalledWith(user, '2026-10-01', '2026-10-15');
  });
});
