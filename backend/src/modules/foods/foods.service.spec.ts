import { runReferenceTransaction } from '../../../test/firestore-transaction.stub.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { FirebaseService } from '../firebase/firebase.service.js';
import { FoodsService } from './foods.service.js';

describe('FoodsService', () => {
  let service: FoodsService;
  let mockFirebaseService: FirebaseService;
  let mockFirestoreData: Record<string, unknown>;

  const userA: AuthenticatedUser = {
    uid: 'user-a',
    email: 'usera@example.com',
    emailVerified: true,
  };

  const userB: AuthenticatedUser = {
    uid: 'user-b',
    email: 'userb@example.com',
    emailVerified: true,
  };

  beforeEach(() => {
    mockFirestoreData = {};

    const mockFirestore = {
      runTransaction: runReferenceTransaction,
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
              update: async (patch: Record<string, unknown>) => {
                const key = `${collName}/${docId}/${subColl}/${subDocId}`;
                const current = mockFirestoreData[key];
                if (current && typeof current === 'object') {
                  mockFirestoreData[key] = { ...current, ...patch };
                }
              },
            }),
            where: (field: string, _op: string, val: unknown) => ({
              get: async () => {
                const prefix = `${collName}/${docId}/${subColl}/`;
                const docs = Object.entries(mockFirestoreData)
                  .filter(
                    ([k, v]) =>
                      k.startsWith(prefix) && (v as Record<string, unknown>)[field] === val,
                  )
                  .map(([, v]) => ({ data: () => v }));
                return { docs };
              },
            }),
          }),
        }),
      }),
    };

    mockFirebaseService = {
      getFirestore: vi.fn().mockReturnValue(mockFirestore),
    } as unknown as FirebaseService;

    service = new FoodsService(mockFirebaseService);
  });

  describe('Catálogo Oficial TACO 4ª edição', () => {
    it('carrega os 597 alimentos oficiais na inicialização', () => {
      expect(service.getOfficialFoodsCount()).toBe(597);
    });

    it('busca alimentos com normalização de acentos (ex: feijao encontra Feijão)', async () => {
      const result = await service.searchFoods(userA, { query: 'feijao' });
      expect(result.items.length).toBeGreaterThan(0);
      const hasFeijao = result.items.some((item) => item.name.toLowerCase().includes('feijão'));
      expect(hasFeijao).toBe(true);
    });

    it('busca case-insensitive (ex: ARROZ)', async () => {
      const result = await service.searchFoods(userA, { query: 'ARROZ' });
      expect(result.items.length).toBeGreaterThan(0);
      const allHaveArroz = result.items.every((item) => item.name.toLowerCase().includes('arroz'));
      expect(allHaveArroz).toBe(true);
    });

    it('distingue alimento cru de alimento cozido com valores nutricionais distintos', async () => {
      const cookedRice = await service.getFoodById('taco_1', userA);
      const rawRice = await service.getFoodById('taco_2', userA);

      expect(cookedRice.name).toBe('Arroz, integral, cozido');
      expect(rawRice.name).toBe('Arroz, integral, cru');

      expect(cookedRice.preparation).toBe('cozido');
      expect(rawRice.preparation).toBe('cru');

      // 100g de arroz cozido possui ~123 kcal; cru possui ~359 kcal
      expect(cookedRice.nutrientsPer100g.energyKcal).toBeLessThan(150);
      expect(rawRice.nutrientsPer100g.energyKcal).toBeGreaterThan(300);
    });

    it('preserva valor null em nutrientes não determinados, sem transformar em zero', async () => {
      const oil = await service.getFoodById('taco_260', userA);
      expect(oil.name).toContain('Azeite');
      expect(oil.nutrientsPer100g.fiberG).toBeNull(); // Fibra não determinada na TACO
    });

    it('impede alteração ou exclusão de alimentos oficiais', async () => {
      await expect(
        service.updateCustomFood('taco_1', userA, { name: 'Tentativa de Hack' }),
      ).rejects.toThrow(ForbiddenException);

      await expect(service.deleteCustomFood('taco_1', userA)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Alimentos Personalizados do Usuário', () => {
    it('cria alimento personalizado e permite recuperá-lo por ID', async () => {
      const created = await service.createCustomFood(userA, {
        name: 'Whey Protein Isolado Caseiro',
        preparation: 'em pó',
        category: 'Suplementos',
        nutrientsPer100g: {
          energyKcal: 380,
          proteinG: 85,
          carbohydrateG: 3,
          fatG: 2,
          fiberG: 0,
        },
        householdMeasures: [{ id: 'scoop', label: '1 scoop medidor', grams: 30 }],
      });

      expect(created.id).toMatch(/^custom_/);
      expect(created.isCustom).toBe(true);
      expect(created.userId).toBe(userA.uid);

      const fetched = await service.getFoodById(created.id, userA);
      expect(fetched.name).toBe('Whey Protein Isolado Caseiro');
      expect(fetched.nutrientsPer100g.proteinG).toBe(85);
    });

    it('isola alimentos personalizados entre usuários diferentes', async () => {
      const createdA = await service.createCustomFood(userA, {
        name: 'Receita Secreta do Usuário A',
        nutrientsPer100g: {
          energyKcal: 200,
          proteinG: 10,
          carbohydrateG: 20,
          fatG: 5,
          fiberG: 2,
        },
      });

      // Usuário B tenta buscar o alimento criado pelo Usuário A
      await expect(service.getFoodById(createdA.id, userB)).rejects.toThrow(NotFoundException);
    });

    it('atualiza alimento personalizado próprio', async () => {
      const created = await service.createCustomFood(userA, {
        name: 'Pão de aveia',
        nutrientsPer100g: {
          energyKcal: 220,
          proteinG: 8,
          carbohydrateG: 35,
          fatG: 4,
          fiberG: 4,
        },
      });

      const updated = await service.updateCustomFood(created.id, userA, {
        name: 'Pão de aveia com chia',
        nutrientsPer100g: {
          energyKcal: 240,
          proteinG: 9,
          carbohydrateG: 35,
          fatG: 5,
          fiberG: 6,
        },
      });

      expect(updated.name).toBe('Pão de aveia com chia');
      expect(updated.nutrientsPer100g.energyKcal).toBe(240);
    });

    it('exclui logicamente (soft delete) alimento personalizado', async () => {
      const created = await service.createCustomFood(userA, {
        name: 'Alimento a ser excluído',
        nutrientsPer100g: {
          energyKcal: 100,
          proteinG: 2,
          carbohydrateG: 10,
          fatG: 1,
          fiberG: 1,
        },
      });

      const deleteRes = await service.deleteCustomFood(created.id, userA);
      expect(deleteRes.success).toBe(true);
      expect(deleteRes.deletedAt).toBeDefined();

      // Após exclusão lógica, consulta por ID deve retornar 404
      await expect(service.getFoodById(created.id, userA)).rejects.toThrow(NotFoundException);
    });
  });
});
