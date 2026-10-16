import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, timeout } from 'rxjs';
import type { AssessmentResponse, AssessmentResultDocument } from './assessment-contract';
import { fromAssessment, fromAssessmentResults, toAssessmentSection } from './assessment-adapter';
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
    return this.http
      .get<AssessmentResponse>(this.baseEndpoint)
      .pipe(timeout(10000), map(fromAssessment));
  }

  /**
   * Salva uma seção específica do questionário de avaliação.
   * Envia somente os campos válidos da seção indicada.
   */
  public saveSection<T = unknown>(
    section: AssessmentSection,
    data: T,
  ): Observable<AssessmentDraftResponse> {
    const payload: SaveAssessmentSectionDto = { section, data: toAssessmentSection(section, data) };
    return this.http
      .patch<AssessmentResponse>(this.baseEndpoint, payload)
      .pipe(timeout(10000), map(fromAssessment));
  }

  /**
   * Solicita a validação final e o cálculo dos resultados a partir dos dados persistidos no backend.
   */
  public evaluate(): Observable<AssessmentResultsResponse> {
    return this.http
      .post<AssessmentResultDocument>(`${this.baseEndpoint}/evaluate`, {})
      .pipe(timeout(15000), map(fromAssessmentResults));
  }

  /**
   * Consulta a última avaliação calculada e vigente do usuário.
   */
  public getResults(): Observable<AssessmentResultsResponse> {
    return this.http
      .get<AssessmentResultDocument>(`${this.baseEndpoint}/results`)
      .pipe(timeout(10000), map(fromAssessmentResults));
  }
}
