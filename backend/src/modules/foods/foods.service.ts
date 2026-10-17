import {
  ForbiddenException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { FirebaseService } from '../firebase/firebase.service.js';
import type { CreateCustomFoodDto } from './dto/create-custom-food.dto.js';
import type { SearchFoodsDto } from './dto/search-foods.dto.js';
import type { UpdateCustomFoodDto } from './dto/update-custom-food.dto.js';
import type { FoodItem, FoodNutrientsPer100g, FoodSearchResponse } from './types/food.types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function normalizeSearchText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

@Injectable()
export class FoodsService {
  private readonly logger = new Logger(FoodsService.name);
  private readonly officialFoods: FoodItem[] = [];
  private readonly officialFoodsMap = new Map<string, FoodItem>();

  constructor(@Inject(FirebaseService) private readonly firebaseService: FirebaseService) {
    this.loadOfficialFoods();
  }

  private loadOfficialFoods(): void {
    try {
      const dataPath = join(__dirname, 'data/taco-data.json');
      const content = readFileSync(dataPath, 'utf8');
      const items: FoodItem[] = JSON.parse(content);
      for (const item of items) {
        this.officialFoods.push(item);
        this.officialFoodsMap.set(item.id, item);
      }
      this.logger.log(
        `Catálogo TACO carregado com sucesso (${this.officialFoods.length} alimentos).`,
      );
    } catch (error) {
      this.logger.error('Falha ao carregar catálogo oficial TACO.');
      throw error;
    }
  }

  getOfficialFoodsCount(): number {
    return this.officialFoods.length;
  }

  async searchFoods(user: AuthenticatedUser, dto: SearchFoodsDto): Promise<FoodSearchResponse> {
    const limit = dto.limit ?? 20;
    const offset = dto.offset ?? 0;
    const query = dto.query ? normalizeSearchText(dto.query) : '';
    const category = dto.category?.trim();

    // 1. Carrega alimentos personalizados do usuário autenticado
    const userCustomFoods = await this.getUserCustomFoods(user.uid);

    // 2. Combina alimentos personalizados primeiro, depois catálogo oficial
    const allAvailable = [...userCustomFoods, ...this.officialFoods];

    // 3. Aplica filtros
    const filtered = allAvailable.filter((food) => {
      if (category && food.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }

      if (!query) {
        return true;
      }

      const normalizedName = normalizeSearchText(food.name);
      const queryTokens = query.split(/\s+/).filter(Boolean);
      return queryTokens.every((token) => normalizedName.includes(token));
    });

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      items: paginated,
      total,
      limit,
      offset,
      hasMore,
    };
  }

  async getFoodById(id: string, user: AuthenticatedUser): Promise<FoodItem> {
    // Alimento oficial do catálogo TACO
    if (this.officialFoodsMap.has(id)) {
      return this.officialFoodsMap.get(id)!;
    }

    // Busca alimento personalizado do usuário
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection('users').doc(user.uid).collection('customFoods').doc(id);

    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'FOOD_NOT_FOUND',
        message: 'Alimento não encontrado.',
      });
    }

    const food = snapshot.data() as FoodItem;
    if (food.deletedAt) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'FOOD_NOT_FOUND',
        message: 'Alimento não encontrado.',
      });
    }

    return food;
  }

  async createCustomFood(user: AuthenticatedUser, dto: CreateCustomFoodDto): Promise<FoodItem> {
    const firestore = this.firebaseService.getFirestore();
    const foodId = `custom_${randomUUID()}`;
    const now = new Date().toISOString();

    const nutrients: FoodNutrientsPer100g = {
      energyKcal: dto.nutrientsPer100g?.energyKcal ?? null,
      proteinG: dto.nutrientsPer100g?.proteinG ?? null,
      carbohydrateG: dto.nutrientsPer100g?.carbohydrateG ?? null,
      fatG: dto.nutrientsPer100g?.fatG ?? null,
      fiberG: dto.nutrientsPer100g?.fiberG ?? null,
    };

    const measures = (dto.householdMeasures ?? []).map((m) => ({
      id: m.id,
      label: m.label,
      grams: m.grams,
      ...(m.source ? { source: m.source } : {}),
    }));

    const newFood: FoodItem = {
      id: foodId,
      name: dto.name.trim(),
      preparation: dto.preparation?.trim() ?? null,
      category: dto.category?.trim() ?? 'Personalizado',
      source: dto.source?.trim() ?? 'Usuário',
      sourceCode: null,
      nutrientsPer100g: nutrients,
      householdMeasures: measures,
      version: 1,
      isCustom: true,
      userId: user.uid,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    await firestore
      .collection('users')
      .doc(user.uid)
      .collection('customFoods')
      .doc(foodId)
      .set(newFood);

    return newFood;
  }

  async updateCustomFood(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateCustomFoodDto,
  ): Promise<FoodItem> {
    if (this.officialFoodsMap.has(id) || id.startsWith('taco_')) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'OFFICIAL_FOOD_IMMUTABLE',
        message: 'Alimentos oficiais do catálogo não podem ser alterados.',
      });
    }

    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection('users').doc(user.uid).collection('customFoods').doc(id);

    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      if (!snapshot.exists) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'FOOD_NOT_FOUND',
          message: 'Alimento não encontrado.',
        });
      }

      const existing = snapshot.data() as FoodItem;
      if (existing.deletedAt) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'FOOD_NOT_FOUND',
          message: 'Alimento não encontrado.',
        });
      }

      if (dto.version !== undefined && dto.version !== (existing.version ?? 1))
        throw new ConflictException({
          code: 'REVISION_CONFLICT',
          message: 'Alimento alterado. Recarregue antes de editar.',
        });
      const now = new Date().toISOString();
      const updatedNutrients: FoodNutrientsPer100g = {
        energyKcal:
          dto.nutrientsPer100g?.energyKcal !== undefined
            ? dto.nutrientsPer100g.energyKcal
            : existing.nutrientsPer100g.energyKcal,
        proteinG:
          dto.nutrientsPer100g?.proteinG !== undefined
            ? dto.nutrientsPer100g.proteinG
            : existing.nutrientsPer100g.proteinG,
        carbohydrateG:
          dto.nutrientsPer100g?.carbohydrateG !== undefined
            ? dto.nutrientsPer100g.carbohydrateG
            : existing.nutrientsPer100g.carbohydrateG,
        fatG:
          dto.nutrientsPer100g?.fatG !== undefined
            ? dto.nutrientsPer100g.fatG
            : existing.nutrientsPer100g.fatG,
        fiberG:
          dto.nutrientsPer100g?.fiberG !== undefined
            ? dto.nutrientsPer100g.fiberG
            : existing.nutrientsPer100g.fiberG,
      };

      const updatedFood: FoodItem = {
        ...existing,
        version: (existing.version ?? 1) + 1,
        name: dto.name !== undefined ? dto.name.trim() : existing.name,
        preparation:
          dto.preparation !== undefined ? (dto.preparation?.trim() ?? null) : existing.preparation,
        category: dto.category !== undefined ? dto.category.trim() : existing.category,
        source: dto.source !== undefined ? dto.source.trim() : existing.source,
        nutrientsPer100g: updatedNutrients,
        householdMeasures:
          dto.householdMeasures !== undefined
            ? (dto.householdMeasures ?? []).map((m) => ({
                id: m.id,
                label: m.label,
                grams: m.grams,
                ...(m.source ? { source: m.source } : {}),
              }))
            : existing.householdMeasures,
        updatedAt: now,
      };

      transaction.set(docRef, updatedFood);
      return updatedFood;
    });
  }

  async deleteCustomFood(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean; deletedAt: string }> {
    if (this.officialFoodsMap.has(id) || id.startsWith('taco_')) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'OFFICIAL_FOOD_IMMUTABLE',
        message: 'Alimentos oficiais do catálogo não podem ser excluídos.',
      });
    }

    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection('users').doc(user.uid).collection('customFoods').doc(id);

    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      if (!snapshot.exists) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'FOOD_NOT_FOUND',
          message: 'Alimento não encontrado.',
        });
      }

      const existing = snapshot.data() as FoodItem;
      if (existing.deletedAt) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'FOOD_NOT_FOUND',
          message: 'Alimento não encontrado.',
        });
      }

      const now = new Date().toISOString();
      transaction.update(docRef, {
        deletedAt: now,
        updatedAt: now,
      });

      return { success: true, deletedAt: now };
    });
  }

  private async getUserCustomFoods(uid: string): Promise<FoodItem[]> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const snapshot = await firestore
        .collection('users')
        .doc(uid)
        .collection('customFoods')
        .where('deletedAt', '==', null)
        .get();

      return snapshot.docs.map((doc) => doc.data() as FoodItem);
    } catch {
      throw new ServiceUnavailableException({
        code: 'CATALOG_UNAVAILABLE',
        message: 'Catálogo temporariamente indisponível.',
      });
    }
  }
}
