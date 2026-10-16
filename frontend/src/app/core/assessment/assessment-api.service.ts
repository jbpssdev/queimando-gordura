import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import type {
  AssessmentDraftResponse,
  AssessmentResultsResponse,
  AssessmentSection,
  SaveAssessmentSectionDto,
} from './assessment.model';

@Injectable({ providedIn: 'root' })
export class AssessmentApiService {
  private readonly http = inject(HttpClient);
  private readonly baseEndpoint = '/api/v1/assessments/me';

  /**
   * Consulta a avaliação existente ou rascunho do usuário autenticado.
   * Retorna 404 quando o usuário ainda não iniciou a avaliação.
   */
  public getDraft(): Observable<AssessmentDraftResponse> {
    return this.http.get<AssessmentDraftResponse>(this.baseEndpoint).pipe(timeout(10000));
  }

  /**
   * Salva uma seção específica do questionário de avaliação.
   * Envia somente os campos válidos da seção indicada.
   */
  public saveSection<T = unknown>(
    section: AssessmentSection,
    data: T,
  ): Observable<AssessmentDraftResponse> {
    const payload: SaveAssessmentSectionDto<T> = { section, data };
    return this.http.patch<AssessmentDraftResponse>(this.baseEndpoint, payload).pipe(timeout(10000));
  }

  /**
   * Solicita a validação final e o cálculo dos resultados a partir dos dados persistidos no backend.
   */
  public evaluate(): Observable<AssessmentResultsResponse> {
    return this.http
      .post<AssessmentResultsResponse>(`${this.baseEndpoint}/evaluate`, {})
      .pipe(timeout(15000));
  }

  /**
   * Consulta a última avaliação calculada e vigente do usuário.
   */
  public getResults(): Observable<AssessmentResultsResponse> {
    return this.http
      .get<AssessmentResultsResponse>(`${this.baseEndpoint}/results`)
      .pipe(timeout(10000));
  }
}
