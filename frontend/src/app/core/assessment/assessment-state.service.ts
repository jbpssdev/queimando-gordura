import { computed, inject, Injectable, signal } from '@angular/core';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AssessmentApiService } from './assessment-api.service';
import { calculateAge, computePendingItems } from './assessment-helpers';
import type {
  AssessmentDraftResponse,
  AssessmentResultsResponse,
  AssessmentSection,
  PendingAssessmentItem,
} from './assessment.model';

export type AssessmentLoadStatus = 'idle' | 'loading' | 'ready' | 'error';
export type AssessmentSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

@Injectable({ providedIn: 'root' })
export class AssessmentStateService {
  private readonly api = inject(AssessmentApiService);

  // Estado da etapa ativa (1: Corporal, 2: Saúde, 3: Rotina, 4: Alimentação, 5: Conclusão)
  public readonly currentStep = signal<number>(1);

  // Rascunho atual persistido
  public readonly draft = signal<AssessmentDraftResponse | null>(null);

  // Estados de carregamento inicial
  public readonly loadStatus = signal<AssessmentLoadStatus>('idle');
  public readonly loadError = signal<string | null>(null);

  // Estados de salvamento por seção
  public readonly saveStatus = signal<AssessmentSaveStatus>('idle');
  public readonly saveError = signal<string | null>(null);
  public readonly lastSavedAt = signal<Date | null>(null);

  // Resultados calculados
  public readonly results = signal<AssessmentResultsResponse | null>(null);
  public readonly isEvaluating = signal<boolean>(false);
  public readonly evaluateError = signal<string | null>(null);

  // Sinais computados
  public readonly pendingItems = computed<PendingAssessmentItem[]>(() =>
    computePendingItems(this.draft()),
  );

  public readonly essentialPending = computed<PendingAssessmentItem[]>(() =>
    this.pendingItems().filter((item) => item.priority === 'essential'),
  );

  public readonly importantPending = computed<PendingAssessmentItem[]>(() =>
    this.pendingItems().filter((item) => item.priority === 'important'),
  );

  public readonly optionalPending = computed<PendingAssessmentItem[]>(() =>
    this.pendingItems().filter((item) => item.priority === 'optional'),
  );

  public readonly canEvaluate = computed<boolean>(() => {
    // Permitir conclusão quando não houver pendências essenciais
    return this.essentialPending().length === 0;
  });

  public readonly calculatedAge = computed<number | null>(() => {
    const birthDate = this.draft()?.body?.birthDate;
    return calculateAge(birthDate);
  });

  /**
   * Carrega o rascunho de avaliação existente.
   * Se a API responder 404, inicializa um rascunho vazio sem gerar erro.
   */
  public loadDraft(): Observable<AssessmentDraftResponse | null> {
    this.loadStatus.set('loading');
    this.loadError.set(null);

    return this.api.getDraft().pipe(
      tap((res) => {
        this.draft.set(res);
        this.loadStatus.set('ready');
      }),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          // Usuário ainda não possui avaliação iniciada
          const emptyDraft: AssessmentDraftResponse = { status: 'draft' };
          this.draft.set(emptyDraft);
          this.loadStatus.set('ready');
          return of(emptyDraft);
        }

        const msg =
          err instanceof HttpErrorResponse && (err.status === 503 || err.status === 0)
            ? 'Não foi possível conectar ao servidor para carregar sua avaliação. Verifique sua conexão e tente novamente.'
            : 'Ocorreu uma falha ao consultar seu rascunho de avaliação.';

        this.loadError.set(msg);
        this.loadStatus.set('error');
        return throwError(() => err);
      }),
    );
  }

  /**
   * Salva uma seção do questionário de forma resiliente.
   */
  public saveSection<T = unknown>(
    section: AssessmentSection,
    data: T,
  ): Observable<AssessmentDraftResponse> {
    if (this.saveStatus() === 'saving') {
      // Previne requisições duplicadas simultâneas
      return of(this.draft() ?? { status: 'draft' });
    }

    this.saveStatus.set('saving');
    this.saveError.set(null);

    return this.api.saveSection(section, data).pipe(
      tap((res) => {
        // Mescla a seção salva ao estado atual
        const current = this.draft() ?? { status: 'draft' };
        const updated: AssessmentDraftResponse = {
          ...current,
          ...res,
          [section]: data,
          updatedAt: new Date().toISOString(),
        };
        this.draft.set(updated);
        this.saveStatus.set('saved');
        this.lastSavedAt.set(new Date());
      }),
      catchError((err: unknown) => {
        const msg =
          err instanceof HttpErrorResponse && (err.status === 503 || err.status === 0)
            ? 'Serviço temporariamente indisponível. Suas alterações foram mantidas em tela para nova tentativa.'
            : 'Não foi possível salvar esta seção. Tente novamente.';

        this.saveError.set(msg);
        this.saveStatus.set('error');
        return throwError(() => err);
      }),
    );
  }

  /**
   * Solicita validação final e cálculo dos resultados à API NestJS.
   */
  public evaluate(): Observable<AssessmentResultsResponse> {
    this.isEvaluating.set(true);
    this.evaluateError.set(null);

    return this.api.evaluate().pipe(
      tap((results) => {
        this.results.set(results);
        this.isEvaluating.set(false);
      }),
      catchError((err: unknown) => {
        this.isEvaluating.set(false);
        const msg =
          err instanceof HttpErrorResponse && err.status === 400
            ? err.error?.message || 'Verifique se todas as informações essenciais foram preenchidas.'
            : 'Não foi possível calcular seus resultados no momento. Tente novamente.';
        this.evaluateError.set(msg);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Consulta os últimos resultados vigentes.
   */
  public loadResults(): Observable<AssessmentResultsResponse> {
    return this.api.getResults().pipe(
      tap((results) => {
        this.results.set(results);
      }),
    );
  }

  /**
   * Navega para uma etapa específica (1 a 5).
   */
  public setStep(step: number): void {
    if (step >= 1 && step <= 5) {
      this.currentStep.set(step);
    }
  }

  public nextStep(): void {
    if (this.currentStep() < 5) {
      this.currentStep.update((s) => s + 1);
    }
  }

  public previousStep(): void {
    if (this.currentStep() > 1) {
      this.currentStep.update((s) => s - 1);
    }
  }
}
