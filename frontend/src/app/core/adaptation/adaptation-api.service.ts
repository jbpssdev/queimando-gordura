import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, timeout } from 'rxjs';
import { presentPlan, presentPreview, presentProgress } from './adaptation-adapter';
import type {
  AdaptationPlanResponse as WirePlan,
  AdaptationPreviewResponse as WirePreview,
  WireAdaptationProgressResponse as WireProgress,
} from './adaptation-contract';
import type {
  AdaptationPlanResponse,
  AdaptationPreviewResponse,
  AdaptationProgressResponse,
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
      .get<WirePreview>(`${this.baseEndpoint}/preview`)
      .pipe(timeout(10000), map(presentPreview));
  }

  /**
   * Consulta o plano de adaptação ativo do usuário autenticado.
   * Retorna 404 quando o usuário ainda não iniciou seus 30 dias.
   */
  public getPlan(): Observable<AdaptationPlanResponse> {
    return this.http.get<WirePlan>(this.baseEndpoint).pipe(timeout(10000), map(presentPlan));
  }

  /**
   * Inicia formalmente a jornada de 30 dias de adaptação.
   * Envia a modalidade escolhida e o fuso horário IANA detectado no navegador.
   */
  public startPlan(dto: StartAdaptationDto): Observable<AdaptationPlanResponse> {
    return this.http
      .post<WirePlan>(`${this.baseEndpoint}/start`, dto)
      .pipe(timeout(15000), map(presentPlan));
  }

  /**
   * Consulta o progresso, evolução do peso, hábitos por período e conquistas da adaptação.
   */
  public getProgress(): Observable<AdaptationProgressResponse> {
    return this.http
      .get<WireProgress>(`${this.baseEndpoint}/progress`)
      .pipe(timeout(10000), map(presentProgress));
  }

  /**
   * Solicita o relatório dos 30 dias em PDF gerado pelo backend.
   * includeHealthDetails controla inclusão de histórico clínico e medicamentos.
   */
  public getReportPdf(includeHealthDetails = false): Observable<Blob> {
    return this.http
      .get(`${this.baseEndpoint}/report.pdf`, {
        params: { includeHealthDetails: String(includeHealthDetails) },
        responseType: 'blob',
      })
      .pipe(timeout(20000));
  }
}
