import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import type {
  CreateActivityDto,
  CreateCustomFoodDto,
  CreateMealDto,
  CreateWaterDto,
  DiaryActivity,
  DiaryDayResponse,
  DiaryMeal,
  DiarySummaryResponse,
  DiaryWaterEntry,
  DiaryWeight,
  FoodCatalogResponse,
  FoodItem,
  UpdateActivityDto,
  UpdateMealDto,
  UpsertWeightDto,
} from './diary.model';

@Injectable({ providedIn: 'root' })
export class DiaryApiService {
  private readonly http = inject(HttpClient);
  private readonly foodsEndpoint = '/api/v1/foods';
  private readonly diaryEndpoint = '/api/v1/diary/me';

  // --- CATÁLOGO DE ALIMENTOS ---

  /**
   * Busca alimentos oficiais e cadastrados pelo usuário.
   */
  public searchFoods(
    query: string,
    limit = 20,
    cursor?: string | null,
  ): Observable<FoodCatalogResponse> {
    let params = new HttpParams()
      .set('query', query.trim())
      .set('limit', String(limit));

    if (cursor) {
      params = params.set('cursor', cursor);
    }

    return this.http
      .get<FoodCatalogResponse>(this.foodsEndpoint, { params })
      .pipe(timeout(10000));
  }

  /**
   * Obtém detalhes de um alimento pelo ID.
   */
  public getFoodById(id: string): Observable<FoodItem> {
    return this.http
      .get<FoodItem>(`${this.foodsEndpoint}/${encodeURIComponent(id)}`)
      .pipe(timeout(10000));
  }

  /**
   * Cadastra um alimento personalizado privado do usuário.
   */
  public createCustomFood(dto: CreateCustomFoodDto): Observable<FoodItem> {
    return this.http
      .post<FoodItem>(`${this.foodsEndpoint}/me`, dto)
      .pipe(timeout(10000));
  }

  // --- DIÁRIO DO USUÁRIO ---

  /**
   * Consulta os lançamentos completos de um dia específico.
   */
  public getDay(date: string): Observable<DiaryDayResponse> {
    const params = new HttpParams().set('date', date);
    return this.http
      .get<DiaryDayResponse>(this.diaryEndpoint, { params })
      .pipe(timeout(10000));
  }

  /**
   * Consulta os resumos diários de um intervalo de datas (para o calendário de adaptação).
   */
  public getSummary(from: string, to: string): Observable<DiarySummaryResponse> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http
      .get<DiarySummaryResponse>(`${this.diaryEndpoint}/summary`, { params })
      .pipe(timeout(10000));
  }

  // --- REFEIÇÕES ---

  /**
   * Registra uma nova refeição composta por um ou mais itens.
   */
  public createMeal(dto: CreateMealDto): Observable<DiaryMeal> {
    return this.http
      .post<DiaryMeal>(`${this.diaryEndpoint}/meals`, dto)
      .pipe(timeout(15000));
  }

  /**
   * Atualiza itens ou informações de uma refeição existente.
   */
  public updateMeal(id: string, dto: UpdateMealDto): Observable<DiaryMeal> {
    return this.http
      .patch<DiaryMeal>(`${this.diaryEndpoint}/meals/${encodeURIComponent(id)}`, dto)
      .pipe(timeout(15000));
  }

  /**
   * Exclui uma refeição pelo ID.
   */
  public deleteMeal(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.diaryEndpoint}/meals/${encodeURIComponent(id)}`)
      .pipe(timeout(10000));
  }

  // --- ÁGUA ---

  /**
   * Registra um lançamento de água em ml.
   */
  public addWater(dto: CreateWaterDto): Observable<DiaryWaterEntry> {
    return this.http
      .post<DiaryWaterEntry>(`${this.diaryEndpoint}/water`, dto)
      .pipe(timeout(10000));
  }

  /**
   * Exclui um lançamento de água pelo ID.
   */
  public deleteWater(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.diaryEndpoint}/water/${encodeURIComponent(id)}`)
      .pipe(timeout(10000));
  }

  // --- ATIVIDADES FÍSICAS ---

  /**
   * Registra uma atividade física realizada.
   */
  public createActivity(dto: CreateActivityDto): Observable<DiaryActivity> {
    return this.http
      .post<DiaryActivity>(`${this.diaryEndpoint}/activities`, dto)
      .pipe(timeout(15000));
  }

  /**
   * Atualiza uma atividade física.
   */
  public updateActivity(id: string, dto: UpdateActivityDto): Observable<DiaryActivity> {
    return this.http
      .patch<DiaryActivity>(`${this.diaryEndpoint}/activities/${encodeURIComponent(id)}`, dto)
      .pipe(timeout(15000));
  }

  /**
   * Exclui uma atividade física pelo ID.
   */
  public deleteActivity(id: string): Observable<void> {
    return this.http
      .delete<void>(`${this.diaryEndpoint}/activities/${encodeURIComponent(id)}`)
      .pipe(timeout(10000));
  }

  // --- PESO ---

  /**
   * Registra ou atualiza o peso corporal de uma data (operação idempotente).
   */
  public upsertWeight(dto: UpsertWeightDto): Observable<DiaryWeight> {
    return this.http
      .put<DiaryWeight>(`${this.diaryEndpoint}/weight`, dto)
      .pipe(timeout(10000));
  }

  /**
   * Remove o registro de peso de uma data.
   */
  public deleteWeight(date: string): Observable<void> {
    const params = new HttpParams().set('date', date);
    return this.http
      .delete<void>(`${this.diaryEndpoint}/weight`, { params })
      .pipe(timeout(10000));
  }
}
