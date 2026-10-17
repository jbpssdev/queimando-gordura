import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { AdaptationApiService } from '../../../core/adaptation/adaptation-api.service';
import {
  downloadBlob,
  formatWeightDelta,
  formatWeightKg,
} from '../../../core/adaptation/adaptation-progress-helpers';
import { formatDatePtBr, formatDateRange } from '../../../core/adaptation/adaptation-helpers';
import type { AdaptationProgressResponse } from '../../../core/adaptation/adaptation.model';

@Component({
  selector: 'app-adaptation-completion',
  imports: [RouterLink, FormsModule, HlmButton, HlmCardImports, HlmAlertImports],
  template: `
    <div class="min-h-dvh bg-background text-foreground flex flex-col">
      <a class="skip-link" href="#completion-content">Pular para o conteúdo da conclusão</a>

      <!-- Cabeçalho -->
      <header class="border-b border-border bg-card/80 backdrop-blur-xs sticky top-0 z-30">
        <div
          class="mx-auto flex max-w-5xl flex-wrap gap-2 items-center justify-between px-4 py-3 sm:px-8"
        >
          <div class="flex items-center gap-3">
            <a routerLink="/painel" class="flex items-center gap-2.5 font-bold text-foreground">
              <span
                aria-hidden="true"
                class="grid size-9 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-xs"
              >
                QG
              </span>
              <span class="tracking-tight text-base sm:text-lg">Queimando Gordura</span>
            </a>
            <span
              class="hidden sm:inline-block text-xs font-medium text-muted-foreground border-l border-border pl-3"
            >
              Encerramento da Adaptação
            </span>
          </div>

          <div class="flex items-center gap-2.5">
            <a routerLink="/adaptacao/progresso" hlmBtn variant="outline" size="sm" class="text-xs">
              Progresso
            </a>
            <a routerLink="/diario" hlmBtn variant="outline" size="sm" class="text-xs"> Diário </a>
            <a routerLink="/painel" hlmBtn variant="outline" size="sm" class="text-xs"> Painel </a>
          </div>
        </div>
      </header>

      <main
        id="completion-content"
        class="flex-1 mx-auto max-w-4xl w-full px-4 py-8 sm:px-8 space-y-8"
      >
        <!-- Estado de Carregamento -->
        @if (loading()) {
          <div class="rounded-xl border border-border bg-card p-12 text-center space-y-3">
            <div
              class="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
            ></div>
            <p class="text-sm text-muted-foreground">Consultando dados de encerramento...</p>
          </div>
        } @else if (errorMessage()) {
          <!-- Erro de Conexão -->
          <div hlmCard class="p-8 text-center space-y-4">
            <h2 class="text-lg font-bold text-foreground">Falha ao Carregar Conclusão</h2>
            <p class="text-xs text-muted-foreground max-w-md mx-auto">
              {{ errorMessage() }}
            </p>
            <div class="pt-2 flex justify-center gap-3">
              <button hlmBtn variant="default" (click)="loadProgress()">Tentar novamente</button>
              <a routerLink="/painel" hlmBtn variant="outline"> Voltar ao Painel </a>
            </div>
          </div>
        } @else if (!isCompleted()) {
          <!-- Plano Ainda Em Andamento ou Não Iniciado -->
          <div hlmCard class="p-8 sm:p-12 text-center space-y-5">
            <div
              class="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-500/10 text-2xl text-amber-600"
            >
              ⏳
            </div>
            <div class="space-y-2 max-w-lg mx-auto">
              <h1 class="text-2xl font-bold tracking-tight text-foreground">
                Adaptação em Andamento
              </h1>
              <p class="text-sm text-muted-foreground leading-relaxed">
                @if (progress()?.planStatus === 'not_started') {
                  Você ainda não iniciou a Adaptação de 30 dias.
                } @else {
                  Você está atualmente no <strong>Dia {{ progress()?.currentDay }} de 30</strong>. A
                  conclusão oficial e o relatório final estarão disponíveis ao término dos 30 dias.
                }
              </p>
            </div>
            <div class="pt-3 flex flex-wrap justify-center gap-3">
              <a
                routerLink="/adaptacao/progresso"
                hlmBtn
                variant="default"
                class="font-semibold text-xs"
              >
                Acompanhar Progresso Atual →
              </a>
              <a routerLink="/adaptacao" hlmBtn variant="outline" class="text-xs">
                Ver Calendário da Jornada
              </a>
              <a routerLink="/diario" hlmBtn variant="ghost" class="text-xs"> Ir para o Diário </a>
            </div>
          </div>
        } @else {
          <!-- Ciclo Concluído: Apresentação Positiva e Acolhedora -->

          <!-- Hero de Conclusão -->
          <div
            class="rounded-3xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 to-transparent p-6 sm:p-10 text-center space-y-4"
          >
            <div
              class="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-500/20 text-3xl shadow-xs"
            >
              🎉
            </div>
            <div class="space-y-2 max-w-xl mx-auto">
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300"
              >
                ✓ Ciclo Oficial Concluído
              </span>
              <h1 class="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                Parabéns pelos 30 Dias de Adaptação!
              </h1>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Você completou o período planejado de preparação. Cada dia de atenção à sua rotina
                contribui para construir hábitos sustentáveis e duradouros.
              </p>
              <p class="text-xs font-medium text-foreground">
                Período: <strong>{{ formattedDateRange() }}</strong> ({{
                  progress()?.timeZone || 'Horário Local'
                }})
              </p>
            </div>
          </div>

          <!-- Resumo Consolidado dos Hábitos -->
          <section aria-labelledby="summary-title" hlmCard class="p-6 sm:p-8 space-y-6">
            <div class="border-b border-border pb-4">
              <h2 id="summary-title" class="text-base font-bold text-foreground">
                Resumo dos Hábitos Durante os 30 Dias
              </h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                Total de dias com registros acompanhados no seu diário pessoal.
              </p>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="rounded-xl border border-border p-4 bg-muted/20 text-center space-y-1">
                <span class="text-2xl block">🍽️</span>
                <span class="text-2xl font-bold text-foreground block">
                  {{ progress()?.summary?.daysWithMeals ?? 0 }}
                </span>
                <span class="text-[11px] text-muted-foreground block">Dias com Refeições</span>
              </div>

              <div class="rounded-xl border border-border p-4 bg-muted/20 text-center space-y-1">
                <span class="text-2xl block">💧</span>
                <span class="text-2xl font-bold text-foreground block">
                  {{ progress()?.summary?.daysWithWater ?? 0 }}
                </span>
                <span class="text-[11px] text-muted-foreground block">Dias com Hidratação</span>
              </div>

              <div class="rounded-xl border border-border p-4 bg-muted/20 text-center space-y-1">
                <span class="text-2xl block">🏃</span>
                <span class="text-2xl font-bold text-foreground block">
                  {{ progress()?.summary?.daysWithActivities ?? 0 }}
                </span>
                <span class="text-[11px] text-muted-foreground block">Dias com Atividades</span>
              </div>

              <div class="rounded-xl border border-border p-4 bg-muted/20 text-center space-y-1">
                <span class="text-2xl block">⚖️</span>
                <span class="text-2xl font-bold text-foreground block">
                  {{ progress()?.summary?.daysWithWeight ?? 0 }}
                </span>
                <span class="text-[11px] text-muted-foreground block">Pesagens Registradas</span>
              </div>
            </div>

            <p class="text-[11px] text-muted-foreground leading-relaxed">
              * O Queimando Gordura registra os dados informados espontaneamente por você. Dias sem
              anotações representam ausência de registro e não significam inatividade ou quebra de
              compromisso.
            </p>
          </section>

          <!-- Evolução Corporal Registrada -->
          <section aria-labelledby="body-evolution-title" hlmCard class="p-6 sm:p-8 space-y-5">
            <div class="border-b border-border pb-4">
              <h2 id="body-evolution-title" class="text-base font-bold text-foreground">
                Evolução Corporal Registrada
              </h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                Comparativo entre a medição da Avaliação Inicial e as pesagens do Diário.
              </p>
            </div>

            @if (hasWeighIns()) {
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div class="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span class="text-[11px] text-muted-foreground block"
                    >Peso Inicial (Avaliação)</span
                  >
                  <span class="text-lg font-bold text-foreground">
                    {{ formatWeightKg(progress()?.weightEvolution?.initialWeightKg) }}
                  </span>
                  @if (progress()?.weightEvolution?.initialWeightDate; as date) {
                    <span class="text-[10px] text-muted-foreground block">{{
                      formatDatePtBr(date)
                    }}</span>
                  }
                </div>

                <div class="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span class="text-[11px] text-muted-foreground block">Peso Final Registrado</span>
                  <span class="text-lg font-bold text-foreground">
                    {{ formatWeightKg(progress()?.weightEvolution?.latestWeightKg) }}
                  </span>
                  @if (progress()?.weightEvolution?.latestWeightDate; as date) {
                    <span class="text-[10px] text-muted-foreground block">{{
                      formatDatePtBr(date)
                    }}</span>
                  }
                </div>

                <div class="p-4 rounded-xl border border-border bg-muted/20 space-y-1">
                  <span class="text-[11px] text-muted-foreground block">Variação no Período</span>
                  <span class="text-sm font-bold text-foreground block">
                    {{ weightDelta().text }}
                  </span>
                  <span class="text-[10px] text-muted-foreground block"
                    >Baseado em medições reais</span
                  >
                </div>
              </div>
            } @else {
              <div
                class="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground bg-muted/10 space-y-1"
              >
                <span>⚖️</span>
                <p class="font-medium text-foreground">Sem novas pesagens registradas no período</p>
                <p class="text-[11px]">
                  O encerramento do ciclo considera o tempo percorrido. Não afirmamos perda ou ganho
                  de peso sem medições.
                </p>
              </div>
            }

            <p
              class="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/50"
            >
              💡 <strong>Lembrete importante:</strong> Flutuações de peso são naturais ao longo da
              vida e não definem o sucesso ou o valor da sua jornada. A construção de uma relação
              saudável com a comida e o movimento continua todos os dias.
            </p>
          </section>

          <!-- Conquistas Efetivamente Desbloqueadas -->
          <section
            aria-labelledby="achievements-unlocked-title"
            hlmCard
            class="p-6 sm:p-8 space-y-5"
          >
            <div class="border-b border-border pb-4">
              <h2 id="achievements-unlocked-title" class="text-base font-bold text-foreground">
                Conquistas Desbloqueadas
              </h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                Marcos validados pelo backend que você alcançou durante estes 30 dias.
              </p>
            </div>

            @if (unlockedAchievements().length > 0) {
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                @for (ach of unlockedAchievements(); track ach.id) {
                  <div
                    class="flex items-start gap-3 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5"
                  >
                    <span class="text-2xl shrink-0">{{ ach.icon || '🏆' }}</span>
                    <div>
                      <h3 class="text-xs font-bold text-foreground">{{ ach.title }}</h3>
                      <p class="text-[11px] text-muted-foreground mt-0.5">{{ ach.description }}</p>
                      @if (ach.unlockedAt) {
                        <span
                          class="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium block mt-1"
                        >
                          Referência: {{ formatDatePtBr(ach.unlockedAt.slice(0, 10)) }}
                        </span>
                      }
                    </div>
                  </div>
                }
              </div>
            } @else {
              <p class="text-xs text-muted-foreground italic">
                Nenhuma conquista específica foi vinculada neste ciclo.
              </p>
            }
          </section>

          <!-- Download do Relatório PDF Oficial -->
          <section aria-labelledby="completion-report-title" hlmCard class="p-6 sm:p-8 space-y-5">
            <div class="border-b border-border pb-4">
              <h2 id="completion-report-title" class="text-base font-bold text-foreground">
                Relatório Consolidado dos 30 Dias (PDF)
              </h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                Guarde uma cópia oficial do seu histórico de adaptação para seu acompanhamento
                pessoal ou profissional.
              </p>
            </div>

            <div class="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-xs">
              <div class="flex items-center gap-2 text-foreground font-semibold">
                <span>🔒</span>
                <span>Privacidade e Segurança dos seus Dados</span>
              </div>
              <p class="text-muted-foreground leading-relaxed">
                O arquivo PDF é emitido sob demanda pelo servidor oficial. Não é salvo em
                armazenamento local do navegador e não é enviado para terceiros.
              </p>
            </div>

            <div class="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-card">
              <input
                id="completion-include-health"
                type="checkbox"
                [(ngModel)]="includeHealthDetails"
                class="size-4 mt-0.5 rounded border-border text-primary focus:ring-primary"
              />
              <label
                for="completion-include-health"
                class="text-xs text-foreground cursor-pointer leading-relaxed"
              >
                Incluir condições de saúde e medicamentos informados na avaliação inicial
                <span class="block text-[11px] text-muted-foreground mt-0.5">
                  (Inicia desmarcado. Selecione caso deseje compartilhar o documento com seu médico
                  ou nutricionista).
                </span>
              </label>
            </div>

            @if (downloadError()) {
              <div hlmAlert variant="destructive" class="text-xs">
                <p>{{ downloadError() }}</p>
              </div>
            }

            <div class="pt-1 flex flex-wrap items-center gap-3">
              <button
                hlmBtn
                variant="default"
                (click)="onDownloadReport()"
                [disabled]="isDownloadingPdf()"
                class="text-xs font-semibold"
              >
                @if (isDownloadingPdf()) {
                  <span
                    class="inline-block size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"
                  ></span>
                  Gerando Relatório...
                } @else {
                  📄 Baixar Relatório dos 30 Dias (PDF)
                }
              </button>
            </div>
          </section>

          <!-- Próximos Passos (Sem segundo ciclo automático nem prescrições clínicas) -->
          <section aria-labelledby="next-steps-title" hlmCard class="p-6 sm:p-8 space-y-4">
            <h2 id="next-steps-title" class="text-base font-bold text-foreground">
              Próximos Passos
            </h2>
            <p class="text-xs text-muted-foreground leading-relaxed">
              O encerramento deste ciclo de 30 dias não interrompe o seu uso do aplicativo. Você
              pode continuar registrando sua alimentação, hidratação, atividades e pesagens
              semanalmente no Diário.
            </p>

            <div class="flex flex-wrap gap-3 pt-2">
              <a routerLink="/diario" hlmBtn variant="default" class="text-xs font-semibold">
                Continuar Registrando no Diário →
              </a>
              <a routerLink="/adaptacao/progresso" hlmBtn variant="outline" class="text-xs">
                Rever Painel de Progresso
              </a>
              <a routerLink="/avaliacao/resultados" hlmBtn variant="ghost" class="text-xs">
                Consultar Avaliação Inicial
              </a>
              <a routerLink="/painel" hlmBtn variant="outline" class="text-xs">
                Voltar ao Painel
              </a>
            </div>
          </section>
        }
      </main>
    </div>
  `,
})
export class AdaptationCompletion implements OnInit {
  private readonly adaptationApi = inject(AdaptationApiService);

  public readonly loading = signal(true);
  public readonly errorMessage = signal<string | null>(null);
  public readonly progress = signal<AdaptationProgressResponse | null>(null);

  public readonly includeHealthDetails = signal(false);
  public readonly isDownloadingPdf = signal(false);
  public readonly downloadError = signal<string | null>(null);

  public readonly isCompleted = computed(() => this.progress()?.planStatus === 'completed');

  public readonly unlockedAchievements = computed(() => {
    return (this.progress()?.achievements ?? []).filter((a) => a.unlocked);
  });

  public readonly hasWeighIns = computed(() => {
    return (this.progress()?.weightEvolution?.weighIns?.length ?? 0) > 0;
  });

  public readonly weightDelta = computed(() =>
    formatWeightDelta(this.progress()?.weightEvolution?.weightDeltaKg),
  );

  public ngOnInit(): void {
    this.loadProgress();
  }

  public loadProgress(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    this.adaptationApi.getProgress().subscribe({
      next: (data) => {
        this.progress.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        if (err?.status === 404 && err?.error?.code === 'ADAPTATION_NOT_FOUND') {
          this.progress.set({
            planStatus: 'not_started',
            mode: null,
            currentDay: 0,
            totalDays: 30,
            startDate: '',
            endDate: '',
            timeZone: '',
            reportAvailable: false,
            calorieTargetKcal: null,
            summary: {
              totalDaysMonitored: 0,
              daysWithMeals: 0,
              daysWithWater: 0,
              daysWithActivities: 0,
              daysWithWeight: 0,
            },
            weightEvolution: {
              initialWeightKg: null,
              initialWeightDate: null,
              latestWeightKg: null,
              latestWeightDate: null,
              weightDeltaKg: null,
              weighIns: [],
              currentBmi: null,
              initialBmi: null,
              updatedMetabolicEstimates: null,
            },
            weeklyPeriods: [],
            achievements: [],
            notices: [],
          });
          this.loading.set(false);
          return;
        }

        this.errorMessage.set('Não foi possível consultar os dados de conclusão da adaptação.');
        this.loading.set(false);
      },
    });
  }

  public onDownloadReport(): void {
    this.isDownloadingPdf.set(true);
    this.downloadError.set(null);

    this.adaptationApi.getReportPdf(this.includeHealthDetails()).subscribe({
      next: (blob) => {
        downloadBlob(blob, 'relatorio-adaptacao-30-dias.pdf');
        this.isDownloadingPdf.set(false);
      },
      error: () => {
        this.downloadError.set(
          'Não foi possível baixar o relatório PDF no momento. Tente novamente mais tarde.',
        );
        this.isDownloadingPdf.set(false);
      },
    });
  }

  public formattedDateRange(): string {
    const p = this.progress();
    if (!p?.startDate || !p?.endDate) return 'Período dos 30 dias';
    return formatDateRange(p.startDate, p.endDate);
  }

  public formatWeightKg(kg: number | null | undefined): string {
    return formatWeightKg(kg);
  }

  public formatDatePtBr(date: string | null | undefined): string {
    return formatDatePtBr(date);
  }
}
