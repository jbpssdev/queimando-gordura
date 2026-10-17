import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButton } from '@spartan-ng/helm/button';
import { formatDatePtBr, formatDateRange } from '../../../../core/adaptation/adaptation-helpers';
import type {
  AdaptationDay,
  AdaptationPlanResponse,
} from '../../../../core/adaptation/adaptation.model';
import type { DiaryDaySummaryItem } from '../../../../core/diary/diary.model';

@Component({
  selector: 'app-adaptation-journey',
  imports: [RouterLink, HlmCardImports, HlmButton],
  template: `
    <div class="space-y-8">
      <!-- Card Superior: Resumo e Progresso Temporal -->
      <div hlmCard class="p-6 sm:p-8 bg-card border-border shadow-xs">
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6"
        >
          <div>
            <div class="flex flex-wrap items-center gap-2 mb-2">
              <span
                class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
              >
                {{ isCompleted() ? 'Jornada Concluída' : 'Jornada em Andamento' }}
              </span>
              <span
                class="rounded-full bg-secondary border border-border px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
              >
                Modalidade {{ plan()?.mode === 'standard' ? 'Padrão' : 'Intensificada' }}
              </span>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {{ isCompleted() ? '30 Dias Concluídos' : 'Dia ' + currentDay() + ' de 30' }}
            </h1>
            <p class="text-xs text-muted-foreground mt-1.5">
              Período oficial:
              <strong class="text-foreground">{{ formattedDateRange() }}</strong> (Fuso:
              {{ plan()?.timeZone || 'Local' }})
            </p>
          </div>

          <div class="flex flex-col items-start sm:items-end">
            <span class="text-3xl font-extrabold text-primary"> {{ progressPercentage() }}% </span>
            <span class="text-xs font-medium text-muted-foreground"> do tempo transcorrido </span>
          </div>
        </div>

        <!-- Barra de Progresso Temporal -->
        <div class="mt-6 space-y-2">
          <div
            class="flex flex-wrap gap-2 justify-between text-xs text-muted-foreground font-medium"
          >
            <span>Início: {{ formatStartDate() }}</span>
            <span>Término: {{ formatEndDate() }}</span>
          </div>
          <div
            class="h-3 w-full overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="Progresso temporal da jornada"
            [attr.aria-valuenow]="progressPercentage()"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="h-full bg-primary transition-all duration-500 ease-out"
              [style.width.%]="progressPercentage()"
            ></div>
          </div>
        </div>

        <!-- Mensagem Motivadora Discreta Baseada na Fase -->
        <div
          class="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3"
        >
          <span class="text-lg">🌱</span>
          <p class="text-xs text-foreground font-medium leading-relaxed">
            {{ currentPhaseMessage() }}
          </p>
        </div>
      </div>

      <!-- Informação sobre Meta Calórica (quando disponível pela API) -->
      @if (plan()?.calorieTargetKcal; as target) {
        <div hlmCard class="p-5 border-border bg-muted/10">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Meta Calórica Diária da API
          </h3>
          <div class="mt-1 flex items-baseline gap-2">
            <span class="text-2xl font-bold text-foreground">{{ target }}</span>
            <span class="text-xs text-muted-foreground">kcal/dia</span>
          </div>
          <p class="text-xs text-muted-foreground mt-1">
            {{
              plan()?.calorieTargetExplanation ||
                'Parâmetro calculado de referência para acompanhamento durante a adaptação.'
            }}
          </p>
        </div>
      }

      <!-- Calendário Visual dos 30 Dias -->
      <section aria-labelledby="calendar-title" class="space-y-4">
        <div class="flex items-center justify-between">
          <div>
            <h2 id="calendar-title" class="text-lg font-bold text-foreground">
              Calendário dos 30 Dias Consecutivos
            </h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Dias passados representam o tempo percorrido. Os hábitos registrados em cada data são
              integrados ao seu Diário.
            </p>
          </div>
        </div>

        <!-- Grid de 30 Dias -->
        <div class="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-6 gap-3">
          @for (day of days(); track day.dayNumber) {
            <div
              class="relative flex flex-col justify-between p-3.5 rounded-xl border transition-all text-left shadow-2xs"
              [class.border-primary]="day.isToday"
              [class.ring-2]="day.isToday"
              [class.ring-primary/40]="day.isToday"
              [class.bg-primary/10]="day.isToday"
              [class.border-border]="!day.isToday"
              [class.bg-card]="!day.isToday && !day.isPast"
              [class.bg-muted/40]="day.isPast"
              [class.opacity-85]="day.isPast"
            >
              <!-- Cabeçalho do Card do Dia -->
              <div class="flex items-center justify-between gap-1 mb-2">
                <span
                  class="text-xs font-bold"
                  [class.text-primary]="day.isToday"
                  [class.text-foreground]="!day.isToday"
                >
                  Dia {{ day.dayNumber }}
                </span>

                @if (day.isToday) {
                  <span
                    class="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground"
                  >
                    Hoje
                  </span>
                } @else if (day.isMilestone) {
                  <span class="text-amber-500 text-xs font-bold" title="Marco"> ★ </span>
                }
              </div>

              <!-- Data do Dia -->
              <div class="text-[11px] text-muted-foreground">
                {{ formatDayDate(day.date) }}
              </div>

              <!-- Indicadores Discretos de Hábitos Persistidos -->
              <div class="mt-2 pt-1.5 border-t border-border/50 min-h-6">
                @if (getSummaryForDay(day.date); as sum) {
                  @if (sum.hasMeals || sum.hasWater || sum.hasActivities || sum.hasWeight) {
                    <div
                      class="flex flex-wrap items-center gap-1 text-[11px]"
                      title="Hábitos registrados nesta data"
                    >
                      @if (sum.hasMeals) {
                        <span
                          role="img"
                          aria-label="Alimentação registrada"
                          title="Alimentação registrada"
                          >🍽️</span
                        >
                      }
                      @if (sum.hasWater) {
                        <span role="img" aria-label="Água registrada" title="Água registrada"
                          >💧</span
                        >
                      }
                      @if (sum.hasActivities) {
                        <span
                          role="img"
                          aria-label="Atividade física registrada"
                          title="Atividade física registrada"
                          >🏃</span
                        >
                      }
                      @if (sum.hasWeight) {
                        <span role="img" aria-label="Peso registrado" title="Peso registrado"
                          >⚖️</span
                        >
                      }
                    </div>
                  } @else {
                    <span class="text-[10px] text-muted-foreground/70 italic">Sem registros</span>
                  }
                } @else {
                  <span class="text-[10px] text-muted-foreground/70 italic">Sem registros</span>
                }
              </div>

              <!-- Link para o Diário -->
              <a
                [routerLink]="['/diario']"
                [queryParams]="{ date: day.date }"
                class="mt-1 text-[10px] text-primary hover:underline font-medium block"
              >
                Abrir no Diário →
              </a>

              <!-- Título de Marco se houver -->
              @if (day.isMilestone) {
                <div
                  class="mt-1.5 pt-1.5 border-t border-border/60 text-[10px] font-semibold text-amber-700 dark:text-amber-300"
                >
                  {{ day.milestoneTitle }}
                </div>
              }
            </div>
          }
        </div>
      </section>

      <!-- Marcos da Jornada: Dias 7, 14, 21 e 30 -->
      <section aria-labelledby="milestones-title" hlmCard class="p-6 sm:p-8 space-y-4">
        <h2 id="milestones-title" class="text-base font-bold text-foreground">
          Marcos Temporais da Adaptação
        </h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-1">
          <div class="rounded-xl border border-border p-4 bg-muted/20 space-y-1">
            <span class="text-xs font-bold text-primary block">Dia 7 • 1ª Semana</span>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Primeira semana de contato e ajuste inicial de rotina.
            </p>
          </div>

          <div class="rounded-xl border border-border p-4 bg-muted/20 space-y-1">
            <span class="text-xs font-bold text-primary block">Dia 14 • 2ª Semana</span>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Segunda semana do calendário; não representa adesão comprovada.
            </p>
          </div>

          <div class="rounded-xl border border-border p-4 bg-muted/20 space-y-1">
            <span class="text-xs font-bold text-primary block">Dia 21 • Consolidação</span>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Consistência de hábitos e sustentabilidade do processo.
            </p>
          </div>

          <div class="rounded-xl border border-border p-4 bg-muted/20 space-y-1">
            <span class="text-xs font-bold text-primary block">Dia 30 • Conclusão</span>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Fechamento do ciclo de 30 dias de preparação.
            </p>
          </div>
        </div>

        <div
          class="p-3.5 rounded-xl border border-primary/20 bg-primary/5 text-xs text-muted-foreground"
        >
          ⚖️ <strong>Pesagem semanal recomendada:</strong> Os marcos semanais dos Dias 7, 14, 21 e
          30 são os momentos ideais para registrar uma nova aferição de peso no seu
          <a routerLink="/diario" class="text-primary font-semibold underline">Diário</a>.
        </div>
      </section>

      <!-- Ações de Navegação -->
      <div class="flex flex-col sm:flex-row gap-3 pt-2">
        <a routerLink="/painel" hlmBtn variant="default" class="font-semibold">
          Voltar ao Painel
        </a>
        <a routerLink="/avaliacao/resultados" hlmBtn variant="outline">
          Consultar Minha Avaliação Inicial
        </a>
      </div>
    </div>
  `,
})
export class AdaptationJourney {
  public readonly plan = input.required<AdaptationPlanResponse | null>();
  public readonly days = input.required<readonly AdaptationDay[]>();
  public readonly diarySummaries = input<Record<string, DiaryDaySummaryItem>>({});

  public getSummaryForDay(date: string): DiaryDaySummaryItem | null {
    return this.diarySummaries()[date] ?? null;
  }

  public readonly currentDay = computed(() => this.plan()?.currentDay ?? 1);

  public readonly isCompleted = computed(() => {
    const p = this.plan();
    return p?.status === 'completed' || (p?.currentDay !== undefined && p.currentDay > 30);
  });

  public readonly progressPercentage = computed(() => {
    return this.plan()?.calendarProgressPercent ?? 0;
  });

  public formattedDateRange(): string {
    const p = this.plan();
    if (!p) return '';
    return formatDateRange(p.startDate, p.endDate);
  }

  public formatStartDate(): string {
    return formatDatePtBr(this.plan()?.startDate);
  }

  public formatEndDate(): string {
    return formatDatePtBr(this.plan()?.endDate);
  }

  public formatDayDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  }

  public currentPhaseMessage(): string {
    if (this.isCompleted())
      return 'Período de 30 dias encerrado. O calendário não comprova adesão a hábitos ou resultado clínico.';
    const day = this.currentDay();
    if (day <= 7) {
      return 'Fase 1: Dias 1 a 7 — Foco na adaptação inicial, hidratação e primeiras percepções de rotina.';
    }
    if (day <= 14) {
      return 'Fase 2: Dias 8 a 14 — Construindo seu ritmo próprio e estabilizando a alimentação com tranquilidade.';
    }
    if (day <= 21) {
      return 'Fase 3: Dias 15 a 21 — Observe sua rotina e as dificuldades percebidas, sem presumir adesão.';
    }
    if (day <= 30) {
      return 'Fase 4: Dias 22 a 30 — Reta final da adaptação. Mantenha o foco em um dia de cada vez.';
    }
    return 'Jornada de 30 dias completada no calendário. Seus dados estão salvos para os próximos passos!';
  }
}
