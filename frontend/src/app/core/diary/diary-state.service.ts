import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  finalize,
  map,
  Observable,
  Subject,
  switchMap,
  takeUntil,
  tap,
  throwError,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthSessionService } from '../auth/auth-session.service';
import { DiaryApiService } from './diary-api.service';
import {
  addDaysToDate,
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

  private readonly session = inject(AuthSessionService);
  private readonly identityChanged = new Subject<void>();
  private readonly dayChanged = new Subject<void>();
  constructor() {
    let uid = this.session.currentUser()?.uid;
    effect(() => {
      const next = this.session.currentUser()?.uid;
      if (next !== uid) {
        uid = next;
        this.identityChanged.next();
        this.dayChanged.next();
        this.dayData.set(null);
        this.loadStatus.set('idle');
        this.loadError.set(null);
        this.actionError.set(null);
        this.isSaving.set(false);
        this.selectedDate.set(getTodayIsoString());
      }
    });
  }
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
  public readonly isToday = computed<boolean>(() => this.selectedDate() === getTodayIsoString());

  public readonly formattedDateLong = computed<string>(() =>
    formatDatePtBrLong(this.selectedDate()),
  );

  public readonly formattedDateShort = computed<string>(() =>
    formatDatePtBrShort(this.selectedDate()),
  );

  public readonly meals = computed<DiaryMeal[]>(() => this.dayData()?.meals ?? []);

  public readonly waterEntries = computed<DiaryWaterEntry[]>(
    () => this.dayData()?.waterEntries ?? [],
  );

  public readonly totalWaterMl = computed<number>(() => this.dayData()?.totalWaterMl ?? 0);

  public readonly activities = computed<DiaryActivity[]>(() => this.dayData()?.activities ?? []);

  public readonly weight = computed<DiaryWeight | null>(() => this.dayData()?.weight ?? null);

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
      morning_snack: [],
      afternoon_snack: [],
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
   * Carrega os dados do dia especificado ou da data atualmente selecionada.
   */
  public loadDay(date?: string): Observable<DiaryDayResponse> {
    const targetDate = date || this.selectedDate();
    this.dayChanged.next();
    this.dayData.set(null);
    this.selectedDate.set(targetDate);
    this.loadStatus.set('loading');
    this.loadError.set(null);

    return this.api.getDay(targetDate).pipe(
      takeUntil(this.identityChanged),
      takeUntil(this.dayChanged),
      tap((res) => {
        this.dayData.set(res);
        this.loadStatus.set('ready');
      }),
      catchError((err: unknown) => {
        const msg =
          err instanceof Error ? err.message : 'Não foi possível carregar os registros do dia.';
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

  private mutate<T>(date: string, operation: Observable<T>): Observable<T> {
    this.isSaving.set(true);
    this.actionError.set(null);
    return operation.pipe(
      switchMap((result) =>
        this.api.getDay(date).pipe(
          map((day) => {
            if (this.selectedDate() === date) this.dayData.set(day);
            return result;
          }),
        ),
      ),
      takeUntil(this.identityChanged),
      finalize(() => this.isSaving.set(false)),
      catchError((error) => {
        this.actionError.set(
          error instanceof HttpErrorResponse && error.status === 409
            ? 'Registro alterado ou envio já utilizado. Recarregue antes de editar.'
            : 'Falha ao salvar ou atualizar a consulta. Recarregue o dia antes de repetir.',
        );
        return throwError(() => error);
      }),
    );
  }
  public addMeal(dto: CreateMealDto): Observable<DiaryMeal> {
    return this.mutate(
      dto.date,
      this.api.createMeal({ ...dto, clientRequestId: dto.clientRequestId ?? crypto.randomUUID() }),
    );
  }
  public updateMeal(id: string, dto: UpdateMealDto): Observable<DiaryMeal> {
    return this.mutate(this.selectedDate(), this.api.updateMeal(id, dto));
  }
  public deleteMeal(id: string): Observable<void> {
    return this.mutate(this.selectedDate(), this.api.deleteMeal(id));
  }
  public addWater(amountMl: number): Observable<DiaryWaterEntry> {
    return this.mutate(
      this.selectedDate(),
      this.api.addWater({ date: this.selectedDate(), amountMl }),
    );
  }
  public deleteWater(id: string): Observable<void> {
    return this.mutate(this.selectedDate(), this.api.deleteWater(id));
  }
  public addActivity(dto: Omit<CreateActivityDto, 'date'>): Observable<DiaryActivity> {
    return this.mutate(
      this.selectedDate(),
      this.api.createActivity({ ...dto, date: this.selectedDate() }),
    );
  }
  public updateActivity(id: string, dto: UpdateActivityDto): Observable<DiaryActivity> {
    return this.mutate(this.selectedDate(), this.api.updateActivity(id, dto));
  }
  public deleteActivity(id: string): Observable<void> {
    return this.mutate(this.selectedDate(), this.api.deleteActivity(id));
  }
  public upsertWeight(weightKg: number): Observable<DiaryWeight> {
    return this.mutate(
      this.selectedDate(),
      this.api.upsertWeight({ date: this.selectedDate(), weightKg }),
    );
  }
  public deleteWeight(): Observable<void> {
    return this.mutate(this.selectedDate(), this.api.deleteWeight(this.selectedDate()));
  }
}
