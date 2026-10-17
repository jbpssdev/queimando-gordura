import { computed, effect, inject, Injectable, signal } from '@angular/core';
import {
  catchError,
  EMPTY,
  finalize,
  Observable,
  of,
  Subject,
  takeUntil,
  tap,
  throwError,
} from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AdaptationApiService } from './adaptation-api.service';
import { DiaryApiService } from '../diary/diary-api.service';
import { AuthSessionService } from '../auth/auth-session.service';
import { detectBrowserTimeZone } from './adaptation-helpers';
import type {
  AdaptationDay,
  AdaptationMode,
  AdaptationPlanResponse,
  AdaptationPreviewResponse,
  StartAdaptationDto,
} from './adaptation.model';
import type { DiaryDaySummaryItem } from '../diary/diary.model';

export type AdaptationLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

@Injectable({ providedIn: 'root' })
export class AdaptationStateService {
  private readonly api = inject(AdaptationApiService);
  private readonly diaryApi = inject(DiaryApiService);

  private readonly session = inject(AuthSessionService);
  private readonly identityChanged = new Subject<void>();
  constructor() {
    let uid = this.session.currentUser()?.uid;
    effect(() => {
      const next = this.session.currentUser()?.uid;
      if (next !== uid) {
        uid = next;
        this.identityChanged.next();
        this.diarySummaries.set({});
        this.plan.set(null);
        this.preview.set(null);
        this.diarySummaries.set({});
        this.loadStatus.set('idle');
        this.loadError.set(null);
        this.startError.set(null);
        this.isStarting.set(false);
        this.selectedMode.set('standard');
      }
    });
  }
  // Plano ativo ou concluído
  public readonly plan = signal<AdaptationPlanResponse | null>(null);

  // Resumos diários do diário de hábitos para os 30 dias da adaptação
  public readonly diarySummaries = signal<Record<string, DiaryDaySummaryItem>>({});

  // Prévia de elegibilidade para planos ainda não iniciados
  public readonly preview = signal<AdaptationPreviewResponse | null>(null);

  // Status de carregamento
  public readonly loadStatus = signal<AdaptationLoadStatus>('idle');
  public readonly loadError = signal<string | null>(null);

  // Modalidade selecionada pelo usuário antes de iniciar
  public readonly selectedMode = signal<AdaptationMode>('standard');

  // Estado de início do plano
  public readonly isStarting = signal<boolean>(false);
  public readonly startError = signal<string | null>(null);

  // Sinais computados
  public readonly hasActivePlan = computed<boolean>(() => this.plan() !== null);

  public readonly isPlanCompleted = computed<boolean>(() => {
    const p = this.plan();
    return p?.status === 'completed' || (p?.currentDay !== undefined && p.currentDay > 30);
  });

  public readonly hasAssessment = computed<boolean>(() => {
    if (this.hasActivePlan()) return true;
    return this.preview()?.hasAssessment ?? false;
  });

  public readonly isAssessmentCompleted = computed<boolean>(() => {
    if (this.hasActivePlan()) return true;
    return this.preview()?.assessmentCompleted ?? false;
  });

  public readonly standardOption = computed(() => this.preview()?.modes.standard ?? null);
  public readonly intensifiedOption = computed(() => this.preview()?.modes.intensified ?? null);

  public readonly isSelectedModeAvailable = computed<boolean>(() => {
    const mode = this.selectedMode();
    const opt = mode === 'standard' ? this.standardOption() : this.intensifiedOption();
    return opt?.available ?? false;
  });

  public readonly timelineDays = computed<readonly AdaptationDay[]>(() => {
    const p = this.plan();
    if (!p) return [];
    return p.days;
  });

  /**
   * Carrega o estado da adaptação:
   * 1. Consulta se já existe plano ativo via GET /api/v1/adaptation/me.
   * 2. Se responder 404, consulta a prévia de modalidades via GET /api/v1/adaptation/me/preview.
   */
  public loadState(): Observable<AdaptationPlanResponse | AdaptationPreviewResponse | null> {
    this.plan.set(null);
    this.preview.set(null);
    this.loadStatus.set('loading');
    this.loadError.set(null);

    return this.api.getPlan().pipe(
      takeUntil(this.identityChanged),
      tap((plan) => {
        this.plan.set(plan);
        this.loadStatus.set('ready');
        if (plan?.startDate && plan?.endDate) {
          this.loadDiarySummaries(plan.startDate, plan.endDate);
        }
      }),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && err.status === 404) {
          // Nenhum plano ativo; carregar prévia
          this.plan.set(null);
          return this.loadPreview();
        }

        const msg =
          err instanceof HttpErrorResponse && err.status === 409
            ? 'Sua avaliação foi alterada. Recalcule os resultados antes de iniciar a Adaptação.'
            : err instanceof HttpErrorResponse && (err.status === 503 || err.status === 0)
              ? 'Não foi possível conectar ao servidor para carregar o Programa Adaptação. Verifique sua conexão e tente novamente.'
              : 'Ocorreu uma falha ao consultar o Programa Adaptação.';

        this.loadError.set(msg);
        this.loadStatus.set('error');
        return throwError(() => err);
      }),
    );
  }

  /**
   * Consulta a prévia para seleção de modalidade.
   */
  public loadPreview(): Observable<AdaptationPreviewResponse> {
    return this.api.getPreview().pipe(
      takeUntil(this.identityChanged),
      tap((preview) => {
        this.preview.set(preview);
        // Predefine a modalidade recomendada se estiver disponível
        if (preview.recommendedMode && preview.modes[preview.recommendedMode]?.available) {
          this.selectedMode.set(preview.recommendedMode);
        } else if (preview.modes.standard.available) {
          this.selectedMode.set('standard');
        } else if (preview.modes.intensified.available) {
          this.selectedMode.set('intensified');
        }
        this.loadStatus.set('ready');
      }),
      catchError((err: unknown) => {
        if (err instanceof HttpErrorResponse && (err.status === 404 || err.status === 422)) {
          // Avaliação inexistente ou não concluída
          this.preview.set({
            hasAssessment: false,
            assessmentCompleted: false,
            recommendedMode: 'standard',
            modes: {
              standard: {
                mode: 'standard',
                title: 'Modalidade Padrão',
                description: 'Acompanhamento gradual e sustentável.',
                available: false,
                restrictionReasons: [
                  'É necessário realizar sua Avaliação Inicial antes de iniciar o plano.',
                ],
                recommended: true,
              },
              intensified: {
                mode: 'intensified',
                title: 'Modalidade Intensificada',
                description: 'Acompanhamento sujeito a validação clínica.',
                available: false,
                restrictionReasons: [
                  'É necessário realizar sua Avaliação Inicial antes de iniciar o plano.',
                ],
                recommended: false,
              },
            },
          });
          this.loadStatus.set('ready');
          return of(this.preview()!);
        }

        const msg =
          err instanceof HttpErrorResponse && err.status === 409
            ? 'Sua avaliação foi alterada. Recalcule os resultados antes de iniciar a Adaptação.'
            : err instanceof HttpErrorResponse && (err.status === 503 || err.status === 0)
              ? 'Servidor temporariamente indisponível para carregar as modalidades da adaptação.'
              : 'Não foi possível consultar as opções de adaptação.';

        this.loadError.set(msg);
        this.loadStatus.set('error');
        return throwError(() => err);
      }),
    );
  }

  /**
   * Seleciona a modalidade se ela estiver disponível.
   */
  public selectMode(mode: AdaptationMode): void {
    const opt = mode === 'standard' ? this.standardOption() : this.intensifiedOption();
    if (opt?.available) {
      this.selectedMode.set(mode);
    }
  }

  /**
   * Inicia formalmente os 30 dias de adaptação após confirmação do usuário.
   */
  public startPlan(): Observable<AdaptationPlanResponse> {
    if (this.isStarting()) {
      return EMPTY;
    }

    if (!this.isSelectedModeAvailable()) {
      this.startError.set(
        'A modalidade selecionada não está disponível para o seu perfil no momento.',
      );
      return throwError(() => new Error('Mode not available'));
    }

    this.isStarting.set(true);
    this.startError.set(null);

    const timeZone = detectBrowserTimeZone();
    const dto: StartAdaptationDto = {
      mode: this.selectedMode(),
      timeZone,
    };

    return this.api.startPlan(dto).pipe(
      takeUntil(this.identityChanged),
      finalize(() => this.isStarting.set(false)),
      tap((newPlan) => {
        this.plan.set(newPlan);
        this.isStarting.set(false);
        if (newPlan?.startDate && newPlan?.endDate) {
          this.loadDiarySummaries(newPlan.startDate, newPlan.endDate);
        }
      }),
      catchError((err: unknown) => {
        this.isStarting.set(false);

        let msg = 'Não foi possível iniciar sua adaptação de 30 dias. Tente novamente.';
        if (err instanceof HttpErrorResponse) {
          if (err.status === 409) {
            msg = 'Seu plano de adaptação já foi iniciado anteriormente.';
            // Recarrega o plano atual
            this.loadState().subscribe({ error: () => undefined });
          } else if (err.status === 422) {
            msg =
              err.error?.message || 'Seu perfil atual não atende aos requisitos desta modalidade.';
          } else if (err.status === 503 || err.status === 0) {
            msg =
              'Não foi possível conectar ao servidor para registrar o início. Verifique sua conexão e tente novamente.';
          }
        }

        this.startError.set(msg);
        return throwError(() => err);
      }),
    );
  }

  /**
   * Consulta os resumos diários de hábitos (alimentação, água, atividade, peso)
   * para o intervalo dos 30 dias de adaptação.
   */
  public loadDiarySummaries(from: string, to: string): void {
    this.diaryApi
      .getSummary(from, to)
      .pipe(
        takeUntil(this.identityChanged),
        catchError(() => of({ summaries: [] })),
      )
      .subscribe((res) => {
        const dict: Record<string, DiaryDaySummaryItem> = {};
        for (const item of res.summaries || []) {
          dict[item.date] = item;
        }
        this.diarySummaries.set(dict);
      });
  }
}
