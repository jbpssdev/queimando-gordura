import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import type {
  AdaptationPlanResponse,
  AdaptationPreviewResponse,
  StartAdaptationDto,
} from './adaptation.model';

@Injectable({ providedIn: 'root' })
export class AdaptationApiService {
  private readonly http = inject(HttpClient);
  private readonly baseEndpoint = '/api/v1/adaptation/me';

  /**
   * Consulta a prévia da adaptação para avaliação de elegibilidade e recomendações.
   * Retorna os detalhes das modalidades Padrão e Intensificada, restrições e meta calórica oficial se disponível.
   */
  public getPreview(): Observable<AdaptationPreviewResponse> {
    return this.http
      .get<AdaptationPreviewResponse>(`${this.baseEndpoint}/preview`)
      .pipe(timeout(10000));
  }

  /**
   * Consulta o plano de adaptação ativo do usuário autenticado.
   * Retorna 404 quando o usuário ainda não iniciou seus 30 dias.
   */
  public getPlan(): Observable<AdaptationPlanResponse> {
    return this.http.get<AdaptationPlanResponse>(this.baseEndpoint).pipe(timeout(10000));
  }

  /**
   * Inicia formalmente a jornada de 30 dias de adaptação.
   * Envia a modalidade escolhida e o fuso horário IANA detectado no navegador.
   */
  public startPlan(dto: StartAdaptationDto): Observable<AdaptationPlanResponse> {
    return this.http
      .post<AdaptationPlanResponse>(`${this.baseEndpoint}/start`, dto)
      .pipe(timeout(15000));
  }
}
