import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { DiaryApiService } from './diary-api.service';
import {
  addDaysToDate,
  computeMealTotals,
  formatDatePtBrLong,
  formatDatePtBrShort,
  getTodayIsoString,
} from './diary-helpers';
import type {
  CreateActivityDto,
  CreateMealDto,
  DiaryActivity,
  DiaryDayResponse,
  DiaryMeal,
  DiaryWaterEntry,
  DiaryWeight,
  MealType,
  UpdateActivityDto,
  UpdateMealDto,
} from './diary.model';

export type DiaryLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class DiaryStateService {
  private readonly api = inject(DiaryApiService);

  // Data selecionada no diário (YYYY-MM-DD)
  public readonly selectedDate = signal<string>(getTodayIsoString());

  // Dados do dia atual
  public readonly dayData = signal<DiaryDayResponse | null>(null);

  // Status de carregamento do dia
  public readonly loadStatus = signal<DiaryLoadStatus>('idle');
  public readonly loadError = signal<string | null>(null);

  // Estado de envio / mutações
  public readonly isSaving = signal<boolean>(false);
  public readonly actionError = signal<string | null>(null);

  // Sinais computados
  public readonly isToday = computed<boolean>(
    () => this.selectedDate() === getTodayIsoString(),
  );

  public readonly formattedDateLong = computed<string>(() =>
    formatDatePtBrLong(this.selectedDate()),
  );

  public readonly formattedDateShort = computed<string>(() =>
    formatDatePtBrShort(this.selectedDate()),
  );

  public readonly meals = computed<DiaryMeal[]>(
    () => this.dayData()?.meals ?? [],
  );

  public readonly waterEntries = computed<DiaryWaterEntry[]>(
    () => this.dayData()?.waterEntries ?? [],
  );

  public readonly totalWaterMl = computed<number>(
    () => this.dayData()?.totalWaterMl ?? 0,
  );

  public readonly activities = computed<DiaryActivity[]>(
    () => this.dayData()?.activities ?? [],
  );

  public readonly weight = computed<DiaryWeight | null>(
    () => this.dayData()?.weight ?? null,
  );

  public readonly dayTotals = computed(() => {
    return (
      this.dayData()?.dayTotals ?? {
        energyKcal: null,
        proteinG: null,
        carbohydrateG: null,
        fatG: null,
        fiberG: null,
        isPartialNutrition: false,
      }
    );
  });

  public readonly hasAnyRecord = computed<boolean>(() => {
    const d = this.dayData();
    if (!d) return false;
    return (
      d.meals.length > 0 ||
      d.waterEntries.length > 0 ||
      d.activities.length > 0 ||
      Boolean(d.weight)
    );
  });

  public readonly mealsByType = computed<Record<MealType, DiaryMeal[]>>(() => {
    const list = this.meals();
    const grouped: Record<MealType, DiaryMeal[]> = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
      supper: [],
      other: [],
    };
    for (const m of list) {
      if (grouped[m.mealType]) {
        grouped[m.mealType].push(m);
      } else {
        grouped.other.push(m);
      }
    }
    return grouped;
  });

  /**
   * Constrói uma representação vazia e limpa para um dia sem registros prévios.
   */
  private createEmptyDay(date: string): DiaryDayResponse {
    return {
      date,
      meals: [],
      waterEntries: [],
      totalWaterMl: 0,
      activities: [],
      weight: null,
      dayTotals: {
        energyKcal: null,
        proteinG: null,
        carbohydrateG: null,
        fatG: null,
        fiberG: null,
        isPartialNutrition: false,
      },
    };
  }

  /**
   * Carrega os dados do dia especificado ou da data atualmente selecionada.
   */
  public loadDay(date?: string): Observable<DiaryDayResponse> {
    const targetDate = date || this.selectedDate();
    this.selectedDate.set(targetDate);
    this.loadStatus.set('loading');
    this.loadError.set(null);

    return this.api.getDay(targetDate).pipe(
      tap((res) => {
        this.dayData.set(res);
        this.loadStatus.set('ready');
      }),
      catchError((err: unknown) => {
        // Se a API retornar 404 para um dia virgem sem registros, trata como dia vazio válido
        if (err instanceof HttpErrorResponse && err.status === 404) {
          const empty = this.createEmptyDay(targetDate);
          this.dayData.set(empty);
          this.loadStatus.set('ready');
          return of(empty);
        }

        const msg =
          err instanceof Error
            ? err.message
            : 'Não foi possível carregar os registros do dia.';
        this.loadError.set(msg);
        this.loadStatus.set('error');
        return throwError(() => err);
      }),
    );
  }

  public setDate(date: string): Observable<DiaryDayResponse> {
    return this.loadDay(date);
  }

  public goToPreviousDay(): Observable<DiaryDayResponse> {
    const prev = addDaysToDate(this.selectedDate(), -1);
    return this.loadDay(prev);
  }

  public goToNextDay(): Observable<DiaryDayResponse> {
    const next = addDaysToDate(this.selectedDate(), 1);
    return this.loadDay(next);
  }

  public goToToday(): Observable<DiaryDayResponse> {
    return this.loadDay(getTodayIsoString());
  }

  // --- MUTAÇÕES REFEIÇÕES ---

  public addMeal(dto: CreateMealDto): Observable<DiaryMeal> {
    this.isSaving.set(true);
    this.actionError.set(null);

    return this.api.createMeal(dto).pipe(
      tap((created) => {
        const current = this.dayData() || this.createEmptyDay(dto.date);
        const updatedMeals = [...current.meals, created];
        const allItems = updatedMeals.flatMap((m) => m.items);
        const newTotals = computeMealTotals(allItems);

        this.dayData.set({
          ...current,
          meals: updatedMeals,
          dayTotals: newTotals,
        });
        this.isSaving.set(false);
      }),
      catchError((err) => {
        this.isSaving.set(false);
        this.actionError.set('Erro ao salvar refeição. Tente novamente.');
        return throwError(() => err);
      }),
    );
  }

  public updateMeal(id: string, dto: UpdateMealDto): Observable<DiaryMeal> {
    this.isSaving.set(true);
    this.actionError.set(null);

    return this.api.updateMeal(id, dto).pipe(
      tap((updated) => {
        const current = this.dayData();
        if (current) {
          const updatedMeals = current.meals.map((m) =>
            m.id === id ? updated : m,
          );
          const allItems = updatedMeals.flatMap((m) => m.items);
          const newTotals = computeMealTotals(allItems);

          this.dayData.set({
            ...current,
            meals: updatedMeals,
            dayTotals: newTotals,
          });
        }
        this.isSaving.set(false);
      }),
      catchError((err) => {
        this.isSaving.set(false);
        this.actionError.set('Erro ao atualizar refeição.');
        return throwError(() => err);
      }),
    );
  }

  public deleteMeal(id: string): Observable<void> {
    this.isSaving.set(true);
    this.actionError.set(null);

    return this.api.deleteMeal(id).pipe(
      tap(() => {
        const current = this.dayData();
        if (current) {
          const updatedMeals = current.meals.filter((m) => m.id !== id);
          const allItems = updatedMeals.flatMap((m) => m.items);
          const newTotals = computeMealTotals(allItems);

          this.dayData.set({
            ...current,
            meals: updatedMeals,
            dayTotals: newTotals,
          });
        }
        this.isSaving.set(false);
      }),
      catchError((err) => {
        this.isSaving.set(false);
        this.actionError.set('Erro ao excluir refeição.');
        return throwError(() => err);
      }),
    );
  }

  // --- MUTAÇÕES ÁGUA ---

  public addWater(amountMl: number): Observable<DiaryWaterEntry> {
    if (amountMl <= 0) {
      return throwError(() => new Error('Volume de água deve ser positivo.'));
    }

    this.isSaving.set(true);
    this.actionError.set(null);

    return this.api
      .addWater({ date: this.selectedDate(), amountMl })
      .pipe(
        tap((created) => {
          const current =
            this.dayData() || this.createEmptyDay(this.selectedDate());
          const updatedEntries = [...current.waterEntries, created];
          const newTotal = updatedEntries.reduce(
            (acc, curr) => acc + curr.amountMl,
            0,
          );

          this.dayData.set({
            ...current,
            waterEntries: updatedEntries,
            totalWaterMl: newTotal,
          });
          this.isSaving.set(false);
        }),
        catchError((err) => {
          this.isSaving.set(false);
          this.actionError.set('Erro ao registrar água.');
          return throwError(() => err);
        }),
      );
  }

  public deleteWater(id: string): Observable<void> {
    this.isSaving.set(true);
    this.actionError.set(null);

    return this.api.deleteWater(id).pipe(
      tap(() => {
        const current = this.dayData();
        if (current) {
          const updatedEntries = current.waterEntries.filter(
            (w) => w.id !== id,
          );
          const newTotal = updatedEntries.reduce(
            (acc, curr) => acc + curr.amountMl,
            0,
          );

          this.dayData.set({
            ...current,
            waterEntries: updatedEntries,
            totalWaterMl: newTotal,
          });
        }
        this.isSaving.set(false);
      }),
      catchError((err) => {
        this.isSaving.set(false);
        this.actionError.set('Erro ao excluir registro de água.');
        return throwError(() => err);
      }),
    );
  }

  // --- MUTAÇÕES ATIVIDADES ---

  public addActivity(
    dto: Omit<CreateActivityDto, 'date'>,
  ): Observable<DiaryActivity> {
    this.isSaving.set(true);
    this.actionError.set(null);

    const fullDto: CreateActivityDto = {
      ...dto,
      date: this.selectedDate(),
    };

    return this.api.createActivity(fullDto).pipe(
      tap((created) => {
        const current =
          this.dayData() || this.createEmptyDay(this.selectedDate());
        this.dayData.set({
          ...current,
          activities: [...current.activities, created],
        });
        this.isSaving.set(false);
      }),
      catchError((err) => {
        this.isSaving.set(false);
        this.actionError.set('Erro ao registrar atividade.');
        return throwError(() => err);
      }),
    );
  }

  public updateActivity(
    id: string,
    dto: UpdateActivityDto,
  ): Observable<DiaryActivity> {
    this.isSaving.set(true);
    this.actionError.set(null);

    return this.api.updateActivity(id, dto).pipe(
      tap((updated) => {
        const current = this.dayData();
        if (current) {
          this.dayData.set({
            ...current,
            activities: current.activities.map((a) =>
              a.id === id ? updated : a,
            ),
          });
        }
        this.isSaving.set(false);
      }),
      catchError((err) => {
        this.isSaving.set(false);
        this.actionError.set('Erro ao atualizar atividade.');
        return throwError(() => err);
      }),
    );
  }

  public deleteActivity(id: string): Observable<void> {
    this.isSaving.set(true);
    this.actionError.set(null);

    return this.api.deleteActivity(id).pipe(
      tap(() => {
        const current = this.dayData();
        if (current) {
          this.dayData.set({
            ...current,
            activities: current.activities.filter((a) => a.id !== id),
          });
        }
        this.isSaving.set(false);
      }),
      catchError((err) => {
        this.isSaving.set(false);
        this.actionError.set('Erro ao excluir atividade.');
        return throwError(() => err);
      }),
    );
  }

  // --- MUTAÇÕES PESO ---

  public upsertWeight(weightKg: number): Observable<DiaryWeight> {
    if (weightKg <= 0 || weightKg > 500) {
      return throwError(() => new Error('Informe um peso válido em kg.'));
    }

    this.isSaving.set(true);
    this.actionError.set(null);

    return this.api
      .upsertWeight({ date: this.selectedDate(), weightKg })
      .pipe(
        tap((saved) => {
          const current =
            this.dayData() || this.createEmptyDay(this.selectedDate());
          this.dayData.set({
            ...current,
            weight: saved,
          });
          this.isSaving.set(false);
        }),
        catchError((err) => {
          this.isSaving.set(false);
          this.actionError.set('Erro ao registrar peso.');
          return throwError(() => err);
        }),
      );
  }

  public deleteWeight(): Observable<void> {
    this.isSaving.set(true);
    this.actionError.set(null);

    return this.api.deleteWeight(this.selectedDate()).pipe(
      tap(() => {
        const current = this.dayData();
        if (current) {
          this.dayData.set({
            ...current,
            weight: null,
          });
        }
        this.isSaving.set(false);
      }),
      catchError((err) => {
        this.isSaving.set(false);
        this.actionError.set('Erro ao excluir peso.');
        return throwError(() => err);
      }),
    );
  }
}
