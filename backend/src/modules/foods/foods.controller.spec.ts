import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { FoodsController } from './foods.controller.js';
import type { FoodsService } from './foods.service.js';
import type { CreateCustomFoodDto } from './dto/create-custom-food.dto.js';

describe('FoodsController', () => {
  let controller: FoodsController;
  let mockFoodsService: FoodsService;

  const user: AuthenticatedUser = {
    uid: 'test-user',
    email: 'test@example.com',
    emailVerified: true,
  };

  beforeEach(() => {
    mockFoodsService = {
      searchFoods: vi.fn().mockResolvedValue({
        items: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasMore: false,
      }),
      createCustomFood: vi.fn().mockResolvedValue({ id: 'custom_123' }),
      updateCustomFood: vi.fn().mockResolvedValue({ id: 'custom_123' }),
      deleteCustomFood: vi.fn().mockResolvedValue({ success: true, deletedAt: '2026-10-16T12:00:00Z' }),
      getFoodById: vi.fn().mockResolvedValue({ id: 'taco_1', name: 'Arroz' }),
    } as unknown as FoodsService;

    controller = new FoodsController(mockFoodsService);
  });

  it('deve delegar searchFoods para o serviço', async () => {
    const res = await controller.searchFoods(user, { query: 'arroz' });
    expect(mockFoodsService.searchFoods).toHaveBeenCalledWith(user, { query: 'arroz' });
    expect(res.items).toEqual([]);
  });

  it('deve delegar createCustomFood para o serviço', async () => {
    const dto = { name: 'Alimento Teste' };
    const res = await controller.createCustomFood(user, dto as unknown as CreateCustomFoodDto);
    expect(mockFoodsService.createCustomFood).toHaveBeenCalledWith(user, dto);
    expect(res.id).toBe('custom_123');
  });

  it('deve delegar updateCustomFood para o serviço', async () => {
    const dto = { name: 'Alimento Alterado' };
    const res = await controller.updateCustomFood(user, 'custom_123', dto);
    expect(mockFoodsService.updateCustomFood).toHaveBeenCalledWith('custom_123', user, dto);
    expect(res.id).toBe('custom_123');
  });

  it('deve delegar deleteCustomFood para o serviço', async () => {
    const res = await controller.deleteCustomFood(user, 'custom_123');
    expect(mockFoodsService.deleteCustomFood).toHaveBeenCalledWith('custom_123', user);
    expect(res.success).toBe(true);
  });

  it('deve delegar getFoodById para o serviço', async () => {
    const res = await controller.getFoodById(user, 'taco_1');
    expect(mockFoodsService.getFoodById).toHaveBeenCalledWith('taco_1', user);
    expect(res.id).toBe('taco_1');
  });
});
