import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { addCivilDays, diffCivilDays } from '../adaptation/utils/date-calendar.utils.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { FirebaseService } from '../firebase/firebase.service.js';
import { FoodsService } from '../foods/foods.service.js';
import { DiaryCalculatorService } from './diary-calculator.service.js';
import type { CreateMealDto } from './dto/create-meal.dto.js';
import type { LogActivityDto } from './dto/log-activity.dto.js';
import type { LogWaterDto } from './dto/log-water.dto.js';
import type { LogWeightDto } from './dto/log-weight.dto.js';
import type { UpdateActivityDto } from './dto/update-activity.dto.js';
import type { UpdateMealDto } from './dto/update-meal.dto.js';
import type {
  ActivityEntry,
  DiaryDayResponse,
  DiaryDaySummaryItem,
  DiarySummaryResponse,
  MealDocument,
  WaterEntry,
  WeightEntry,
} from './types/diary.types.js';

@Injectable()
export class DiaryService {
  private readonly logger = new Logger(DiaryService.name);

  constructor(
    @Inject(FirebaseService) private readonly firebaseService: FirebaseService,
    @Inject(FoodsService) private readonly foodsService: FoodsService,
    @Inject(DiaryCalculatorService)
    private readonly diaryCalculatorService: DiaryCalculatorService,
  ) {}

  /* ========================================================================
   * REFEIÇÕES (MEALS)
   * ======================================================================== */

  async createMeal(user: AuthenticatedUser, dto: CreateMealDto): Promise<MealDocument> {
    return this.createOnce(user.uid, 'diary_meals', 'meal', dto, async (mealId, now) => {
      // 1. Resolve cada alimento e cria snapshot nutricional
      const itemsSnapshots = await Promise.all(
        dto.items.map(async (itemDto) => {
          const food = await this.foodsService.getFoodById(itemDto.foodId, user);
          return this.diaryCalculatorService.createItemSnapshot(itemDto, food);
        }),
      );

      // 2. Calcula totais da refeição
      const totals = this.diaryCalculatorService.aggregateMealTotals(itemsSnapshots);

      const mealDoc: MealDocument = {
        id: mealId,
        userId: user.uid,
        date: dto.date,
        mealType: dto.mealType,
        title: dto.title?.trim() ?? null,
        items: itemsSnapshots,
        totals,
        clientRequestId: dto.clientRequestId ?? null,
        timeZone: dto.timeZone ?? null,
        createdAt: now,
        updatedAt: now,
      };

      return mealDoc;
    });
  }

  async updateMeal(id: string, user: AuthenticatedUser, dto: UpdateMealDto): Promise<MealDocument> {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection('users').doc(user.uid).collection('diary_meals').doc(id);

    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      if (!snapshot.exists) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'MEAL_NOT_FOUND',
          message: 'Refeição não encontrada.',
        });
      }

      const existing = snapshot.data() as MealDocument;
      this.assertVersion(dto.version, existing);
      const now = new Date().toISOString();

      let itemsSnapshots = existing.items;
      let totals = existing.totals;

      if (dto.items && dto.items.length > 0) {
        itemsSnapshots = await Promise.all(
          dto.items.map(async (itemDto) => {
            const previous = existing.items.find((item) => item.foodId === itemDto.foodId);
            const food = previous
              ? {
                  id: previous.foodId,
                  name: previous.name,
                  preparation: previous.preparation,
                  category: previous.category,
                  source: previous.source,
                  nutrientsPer100g: previous.nutrientsPer100g,
                  householdMeasures:
                    previous.householdMeasures ??
                    (previous.householdMeasureId
                      ? [
                          {
                            id: previous.householdMeasureId,
                            label: previous.householdMeasureLabel ?? '',
                            grams: previous.weightG / previous.amount,
                          },
                        ]
                      : []),
                  isCustom: previous.foodId.startsWith('custom_'),
                }
              : await this.foodsService.getFoodById(itemDto.foodId, user);
            return this.diaryCalculatorService.createItemSnapshot(itemDto, food);
          }),
        );
        totals = this.diaryCalculatorService.aggregateMealTotals(itemsSnapshots);
      }

      const updatedMeal: MealDocument = {
        ...existing,
        mealType: dto.mealType ?? existing.mealType,
        title: dto.title !== undefined ? dto.title.trim() : existing.title,
        items: itemsSnapshots,
        totals,
        updatedAt: now,
        version: (existing.version ?? 1) + 1,
      };

      transaction.set(docRef, updatedMeal);
      return updatedMeal;
    });
  }

  async deleteMeal(id: string, user: AuthenticatedUser): Promise<{ success: boolean; id: string }> {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection('users').doc(user.uid).collection('diary_meals').doc(id);

    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'MEAL_NOT_FOUND',
        message: 'Refeição não encontrada.',
      });
    }

    await docRef.delete();
    return { success: true, id };
  }

  /* ========================================================================
   * HIDRATAÇÃO (WATER)
   * ======================================================================== */

  async logWater(user: AuthenticatedUser, dto: LogWaterDto): Promise<WaterEntry> {
    return this.createOnce(user.uid, 'diary_water', 'water', dto, async (waterId, now) => {
      const entry: WaterEntry = {
        id: waterId,
        userId: user.uid,
        date: dto.date,
        amountMl: dto.amountMl,
        clientRequestId: dto.clientRequestId ?? null,
        timeZone: dto.timeZone ?? null,
        createdAt: now,
      };

      return entry;
    });
  }

  async deleteWater(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean; id: string }> {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore.collection('users').doc(user.uid).collection('diary_water').doc(id);

    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'WATER_ENTRY_NOT_FOUND',
        message: 'Registro de água não encontrado.',
      });
    }

    await docRef.delete();
    return { success: true, id };
  }

  /* ========================================================================
   * ATIVIDADES FÍSICAS (ACTIVITIES)
   * ======================================================================== */

  async logActivity(user: AuthenticatedUser, dto: LogActivityDto): Promise<ActivityEntry> {
    return this.createOnce(
      user.uid,
      'diary_activities',
      'activity',
      dto,
      async (activityId, now) => {
        const entry: ActivityEntry = {
          id: activityId,
          userId: user.uid,
          date: dto.date,
          type: dto.type,
          description: dto.description.trim(),
          durationMinutes: dto.durationMinutes,
          intensity: dto.intensity,
          clientRequestId: dto.clientRequestId ?? null,
          timeZone: dto.timeZone ?? null,
          createdAt: now,
          updatedAt: now,
        };

        return entry;
      },
    );
  }

  async updateActivity(
    id: string,
    user: AuthenticatedUser,
    dto: UpdateActivityDto,
  ): Promise<ActivityEntry> {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore
      .collection('users')
      .doc(user.uid)
      .collection('diary_activities')
      .doc(id);

    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      if (!snapshot.exists) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'ACTIVITY_NOT_FOUND',
          message: 'Atividade não encontrada.',
        });
      }

      const existing = snapshot.data() as ActivityEntry;
      this.assertVersion(dto.version, existing);
      const now = new Date().toISOString();

      const updated: ActivityEntry = {
        ...existing,
        type: dto.type ?? existing.type,
        description: dto.description !== undefined ? dto.description.trim() : existing.description,
        durationMinutes:
          dto.durationMinutes !== undefined ? dto.durationMinutes : existing.durationMinutes,
        intensity: dto.intensity ?? existing.intensity,
        updatedAt: now,
        version: (existing.version ?? 1) + 1,
      };

      transaction.set(docRef, updated);
      return updated;
    });
  }

  async deleteActivity(
    id: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean; id: string }> {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore
      .collection('users')
      .doc(user.uid)
      .collection('diary_activities')
      .doc(id);

    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'ACTIVITY_NOT_FOUND',
        message: 'Atividade não encontrada.',
      });
    }

    await docRef.delete();
    return { success: true, id };
  }

  /* ========================================================================
   * PESO SEMANAL (WEEKLY WEIGHT)
   * ======================================================================== */

  async logWeight(user: AuthenticatedUser, dto: LogWeightDto): Promise<WeightEntry> {
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore
      .collection('users')
      .doc(user.uid)
      .collection('diary_weights')
      .doc(dto.date);

    return firestore.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(docRef);
      const now = new Date().toISOString();

      if (snapshot.exists) {
        const existing = snapshot.data() as WeightEntry;
        const updated: WeightEntry = {
          ...existing,
          weightKg: dto.weightKg,
          notes: dto.notes !== undefined ? dto.notes.trim() : existing.notes,
          timeZone: dto.timeZone ?? existing.timeZone,
          updatedAt: now,
        };
        transaction.set(docRef, updated);
        return updated;
      }

      const entry: WeightEntry = {
        date: dto.date,
        userId: user.uid,
        weightKg: dto.weightKg,
        notes: dto.notes?.trim() ?? null,
        timeZone: dto.timeZone ?? null,
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(docRef, entry);
      return entry;
    });
  }

  async deleteWeight(
    date: string,
    user: AuthenticatedUser,
  ): Promise<{ success: boolean; date: string }> {
    const instant = Date.parse(date + 'T00:00:00Z');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(instant) ||
      new Date(instant).toISOString().slice(0, 10) !== date
    )
      throw new BadRequestException({ code: 'INVALID_DATE', message: 'Data civil inválida.' });
    const firestore = this.firebaseService.getFirestore();
    const docRef = firestore
      .collection('users')
      .doc(user.uid)
      .collection('diary_weights')
      .doc(date);

    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new NotFoundException({
        statusCode: 404,
        code: 'WEIGHT_NOT_FOUND',
        message: 'Registro de peso não encontrado para a data informada.',
      });
    }

    await docRef.delete();
    return { success: true, date };
  }

  /* ========================================================================
   * CONSULTA DO DIA (DAY VIEW)
   * ======================================================================== */

  async getDayDiary(user: AuthenticatedUser, date: string): Promise<DiaryDayResponse> {
    const firestore = this.firebaseService.getFirestore();
    const userRef = firestore.collection('users').doc(user.uid);

    const [mealsSnap, waterSnap, activitiesSnap, weightSnap] = await Promise.all([
      userRef.collection('diary_meals').where('date', '==', date).get(),
      userRef.collection('diary_water').where('date', '==', date).get(),
      userRef.collection('diary_activities').where('date', '==', date).get(),
      userRef.collection('diary_weights').doc(date).get(),
    ]);

    const meals = mealsSnap.docs.map((doc) => doc.data() as MealDocument);
    const waterEntries = waterSnap.docs.map((doc) => doc.data() as WaterEntry);
    const activities = activitiesSnap.docs.map((doc) => doc.data() as ActivityEntry);
    const weight = weightSnap.exists ? (weightSnap.data() as WeightEntry) : null;

    const totalWaterMl = waterEntries.reduce((sum, w) => sum + w.amountMl, 0);
    const nutritionTotals = this.diaryCalculatorService.calculateDayNutritionTotals(meals);

    const hasAnyEntries =
      meals.length > 0 || waterEntries.length > 0 || activities.length > 0 || weight !== null;

    return {
      date,
      meals,
      nutritionTotals,
      water: {
        entries: waterEntries,
        totalMl: totalWaterMl,
      },
      activities,
      weight,
      hasAnyEntries,
    };
  }

  /* ========================================================================
   * RESUMO COMPACTO DE INTERVALO (SUMMARY)
   * ======================================================================== */

  async getSummary(
    user: AuthenticatedUser,
    from: string,
    to: string,
  ): Promise<DiarySummaryResponse> {
    if (from > to) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'INVALID_DATE_RANGE',
        message: "'from' não pode ser posterior a 'to'.",
      });
    }

    const rangeDays = diffCivilDays(from, to) + 1;
    if (rangeDays > 62) {
      throw new BadRequestException({
        statusCode: 400,
        code: 'DATE_RANGE_TOO_LARGE',
        message: 'O intervalo máximo para consulta de resumo é de 62 dias.',
      });
    }

    const firestore = this.firebaseService.getFirestore();
    const userRef = firestore.collection('users').doc(user.uid);

    const [mealsSnap, waterSnap, activitiesSnap, weightsSnap] = await Promise.all([
      userRef.collection('diary_meals').where('date', '>=', from).where('date', '<=', to).get(),
      userRef.collection('diary_water').where('date', '>=', from).where('date', '<=', to).get(),
      userRef
        .collection('diary_activities')
        .where('date', '>=', from)
        .where('date', '<=', to)
        .get(),
      userRef.collection('diary_weights').where('date', '>=', from).where('date', '<=', to).get(),
    ]);

    const mealsByDate = new Map<string, MealDocument[]>();
    for (const doc of mealsSnap.docs) {
      const meal = doc.data() as MealDocument;
      if (!mealsByDate.has(meal.date)) {
        mealsByDate.set(meal.date, []);
      }
      mealsByDate.get(meal.date)!.push(meal);
    }

    const waterByDate = new Map<string, number>();
    for (const doc of waterSnap.docs) {
      const w = doc.data() as WaterEntry;
      waterByDate.set(w.date, (waterByDate.get(w.date) ?? 0) + w.amountMl);
    }

    const activitiesByDate = new Set<string>();
    for (const doc of activitiesSnap.docs) {
      const a = doc.data() as ActivityEntry;
      activitiesByDate.add(a.date);
    }

    const weightsByDate = new Map<string, number>();
    for (const doc of weightsSnap.docs) {
      const wt = doc.data() as WeightEntry;
      weightsByDate.set(wt.date, wt.weightKg);
    }

    const items: DiaryDaySummaryItem[] = [];

    for (let i = 0; i < rangeDays; i += 1) {
      const currentDate = addCivilDays(from, i);
      const dayMeals = mealsByDate.get(currentDate) ?? [];
      const hasMealEntries = dayMeals.length > 0;

      let totalKcal: number | null = null;
      if (hasMealEntries) {
        let kcalSum = 0;
        let hasAnyKcal = false;
        for (const meal of dayMeals) {
          if (meal.totals.energyKcal.value !== null) {
            kcalSum += meal.totals.energyKcal.value;
            hasAnyKcal = true;
          }
        }
        totalKcal = hasAnyKcal ? kcalSum : null;
      }

      const totalWaterMl = waterByDate.get(currentDate) ?? 0;
      const hasWaterEntries = totalWaterMl > 0;
      const hasActivities = activitiesByDate.has(currentDate);
      const weightVal = weightsByDate.get(currentDate) ?? null;
      const hasWeightEntry = weightVal !== null;

      items.push({
        date: currentDate,
        hasMealEntries,
        totalKcal,
        nutritionIsComplete:
          dayMeals.length > 0 && dayMeals.every((meal) => meal.totals.energyKcal.isComplete),
        hasWaterEntries,
        totalWaterMl,
        hasActivities,
        hasWeightEntry,
        weightKg: weightVal,
      });
    }

    return {
      from,
      to,
      items,
    };
  }
  private assertVersion(version: number | undefined, existing: { version?: number }) {
    if (version !== undefined && version !== (existing.version ?? 1))
      throw new ConflictException({
        code: 'REVISION_CONFLICT',
        message: 'O registro foi alterado. Recarregue antes de editar.',
      });
  }
  private async createOnce<T extends object>(
    uid: string,
    collection: string,
    prefix: string,
    dto: { date: string; clientRequestId?: string },
    build: (id: string, now: string) => Promise<T>,
  ): Promise<T> {
    const canonical = (value: unknown): unknown =>
      Array.isArray(value)
        ? value.map(canonical)
        : value && typeof value === 'object'
          ? Object.fromEntries(
              Object.entries(value)
                .filter(([, v]) => v !== undefined)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => [k, canonical(v)]),
            )
          : value;
    const hash = (value: string) => createHash('sha256').update(value).digest('hex');
    const id = `${prefix}_${dto.clientRequestId ? hash(dto.date + ':' + dto.clientRequestId) : randomUUID()}`;
    const fingerprint = hash(JSON.stringify(canonical(dto)));
    const store = this.firebaseService.getFirestore();
    const ref = store.collection('users').doc(uid).collection(collection).doc(id);
    return store.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) {
        const previous = snapshot.data()!;
        if (previous['requestFingerprint'] !== fingerprint)
          throw new ConflictException({
            code: 'IDEMPOTENCY_CONFLICT',
            message: 'Identificador de envio já usado com outros dados.',
          });
        return previous as T;
      }
      const record = await build(id, new Date().toISOString());
      const saved = { ...record, version: 1, requestFingerprint: fingerprint };
      transaction.set(ref, saved);
      return saved;
    });
  }
}
