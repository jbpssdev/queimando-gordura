import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { AdaptationApiService } from '../../../core/adaptation/adaptation-api.service';
import {
  calculateWeightChart,
  downloadBlob,
  formatHabitFrequency,
  formatWeightDelta,
  formatWeightKg,
  type WeightChartData,
} from '../../../core/adaptation/adaptation-progress-helpers';
import { formatDatePtBr, formatDateRange } from '../../../core/adaptation/adaptation-helpers';
import type { AdaptationProgressResponse } from '../../../core/adaptation/adaptation.model';

@Component({
  selector: 'app-adaptation-progress',
  imports: [RouterLink, FormsModule, HlmButton, HlmCardImports, HlmAlertImports],
  template: `
    <div class="min-h-dvh bg-background text-foreground flex flex-col">
      <a class="skip-link" href="#progress-content">Pular para o conteúdo do progresso</a>

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
              Progresso e Conquistas
            </span>
          </div>

          <div class="flex items-center gap-2.5">
            <a routerLink="/diario" hlmBtn variant="outline" size="sm" class="text-xs"> Diário </a>
            <a routerLink="/adaptacao" hlmBtn variant="outline" size="sm" class="text-xs">
              Jornada
            </a>
            <a routerLink="/painel" hlmBtn variant="outline" size="sm" class="text-xs"> Painel </a>
          </div>
        </div>
      </header>

      <main id="progress-content" class="flex-1 mx-auto max-w-5xl w-full px-4 py-8 sm:px-8 space-y-8">
        <!-- Estado de Carregamento -->
        @if (loading()) {
          <div class="rounded-xl border border-border bg-card p-12 text-center space-y-3">
            <div
              class="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
            ></div>
            <p class="text-sm text-muted-foreground">Carregando seu progresso e conquistas...</p>
          </div>
        } @else if (errorMessage()) {
          <!-- Erro de Conexão -->
          <div hlmCard class="p-8 text-center space-y-4">
            <h2 class="text-lg font-bold text-foreground">Falha ao Consultar Progresso</h2>
            <p class="text-xs text-muted-foreground max-w-md mx-auto">
              {{ errorMessage() }}
            </p>
            <div class="pt-2 flex justify-center gap-3">
              <button hlmBtn variant="default" (click)="loadProgress()">Tentar novamente</button>
              <a routerLink="/painel" hlmBtn variant="outline"> Voltar ao Painel </a>
            </div>
          </div>
        } @else if (isNotStarted()) {
          <!-- Plano Inexistente ou Não Iniciado -->
          <div hlmCard class="p-8 sm:p-12 text-center space-y-5">
            <div
              class="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/10 text-2xl text-primary"
            >
              📋
            </div>
            <div class="space-y-2 max-w-lg mx-auto">
              <h1 class="text-2xl font-bold tracking-tight text-foreground">
                Plano de Adaptação Não Iniciado
              </h1>
              <p class="text-sm text-muted-foreground leading-relaxed">
                Você ainda não iniciou seus 30 dias de preparação. Complete sua Avaliação Inicial e
                ative seu programa para acompanhar gráficos de peso, frequência de hábitos e conquistas
                reais.
              </p>
            </div>
            <div class="pt-3 flex flex-wrap justify-center gap-3">
              <a routerLink="/adaptacao" hlmBtn variant="default" class="font-semibold text-xs">
                Iniciar Programa Adaptação →
              </a>
              <a routerLink="/diario" hlmBtn variant="outline" class="text-xs">
                Acessar Diário de Hábitos
              </a>
              <a routerLink="/avaliacao" hlmBtn variant="ghost" class="text-xs">
                Ver Avaliação Inicial
              </a>
            </div>
          </div>
        } @else {
          <!-- Conteúdo Principal do Progresso -->

          <!-- Banner de Ciclo Concluído se aplicável -->
          @if (isCompleted()) {
            <div
              class="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div class="flex items-center gap-3.5">
                <span class="text-3xl">🎉</span>
                <div>
                  <h2 class="text-base font-bold text-emerald-950 dark:text-emerald-100">
                    Período dos 30 Dias Concluído!
                  </h2>
                  <p class="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                    Você completou o tempo da Adaptação. Consulte o resumo de encerramento e baixe
                    seu relatório em PDF.
                  </p>
                </div>
              </div>
              <a
                routerLink="/adaptacao/conclusao"
                hlmBtn
                variant="default"
                class="shrink-0 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Ver Encerramento dos 30 Dias →
              </a>
            </div>
          }

          <!-- Card Superior: Visão Geral da Jornada -->
          <div hlmCard class="p-6 sm:p-8 bg-card border-border shadow-xs">
            <div
              class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-6"
            >
              <div>
                <div class="flex flex-wrap items-center gap-2 mb-2">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"
                  >
                    {{ isCompleted() ? 'Ciclo Concluído' : 'Dia ' + progress()?.currentDay + ' de 30' }}
                  </span>
                  @if (progress()?.mode; as mode) {
                    <span
                      class="rounded-full bg-secondary border border-border px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                    >
                      Modalidade {{ mode === 'standard' ? 'Padrão' : 'Intensificada' }}
                    </span>
                  }
                </div>
                <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Painel de Evolução e Consistência
                </h1>
                <p class="text-xs text-muted-foreground mt-1.5">
                  Intervalo oficial:
                  <strong class="text-foreground">{{ formattedDateRange() }}</strong> (Fuso:
                  {{ progress()?.timeZone || 'Local' }})
                </p>
              </div>

              <!-- Atalhos rápidos -->
              <div class="flex flex-wrap gap-2">
                <a routerLink="/diario" hlmBtn variant="default" size="sm" class="text-xs font-semibold">
                  + Novo Registro no Diário
                </a>
                <a routerLink="/adaptacao" hlmBtn variant="outline" size="sm" class="text-xs">
                  Ver Calendário dos 30 Dias
                </a>
              </div>
            </div>

            <!-- Resumo de Hábitos Registrados -->
            <div class="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div class="rounded-xl border border-border p-4 bg-muted/20 space-y-1">
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Refeições</span>
                  <span>🍽️</span>
                </div>
                <div class="text-xl font-bold text-foreground">
                  {{ progress()?.summary?.daysWithMeals ?? 0 }}
                </div>
                <p class="text-[11px] text-muted-foreground">
                  {{ formatHabitFrequency(progress()?.summary?.daysWithMeals ?? 0, progress()?.summary?.totalDaysMonitored ?? 0) }}
                </p>
              </div>

              <div class="rounded-xl border border-border p-4 bg-muted/20 space-y-1">
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Água</span>
                  <span>💧</span>
                </div>
                <div class="text-xl font-bold text-foreground">
                  {{ progress()?.summary?.daysWithWater ?? 0 }}
                </div>
                <p class="text-[11px] text-muted-foreground">
                  {{ formatHabitFrequency(progress()?.summary?.daysWithWater ?? 0, progress()?.summary?.totalDaysMonitored ?? 0) }}
                </p>
              </div>

              <div class="rounded-xl border border-border p-4 bg-muted/20 space-y-1">
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Atividades</span>
                  <span>🏃</span>
                </div>
                <div class="text-xl font-bold text-foreground">
                  {{ progress()?.summary?.daysWithActivities ?? 0 }}
                </div>
                <p class="text-[11px] text-muted-foreground">
                  {{ formatHabitFrequency(progress()?.summary?.daysWithActivities ?? 0, progress()?.summary?.totalDaysMonitored ?? 0) }}
                </p>
              </div>

              <div class="rounded-xl border border-border p-4 bg-muted/20 space-y-1">
                <div class="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Pesagens</span>
                  <span>⚖️</span>
                </div>
                <div class="text-xl font-bold text-foreground">
                  {{ progress()?.summary?.daysWithWeight ?? 0 }}
                </div>
                <p class="text-[11px] text-muted-foreground">
                  {{ (progress()?.summary?.daysWithWeight ?? 0) === 1 ? '1 medição registrada' : (progress()?.summary?.daysWithWeight ?? 0) + ' medições registradas' }}
                </p>
              </div>
            </div>

            <p class="text-[11px] text-muted-foreground mt-4 leading-relaxed">
              * A contagem reflete exclusivamente os registros efetuados por você no Diário. Dias
              sem anotações representam ausência de registro e nunca são interpretados como falha ou
              desrespeito a metas.
            </p>
          </div>

          <!-- Seção de Evolução do Peso Corporal -->
          <section aria-labelledby="weight-section-title" hlmCard class="p-6 sm:p-8 space-y-6">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
              <div>
                <h2 id="weight-section-title" class="text-lg font-bold text-foreground">
                  Evolução do Peso Corporal
                </h2>
                <p class="text-xs text-muted-foreground mt-0.5">
                  Apenas pesagens efetivamente registradas na Avaliação e no Diário. Sem estimativas inventadas.
                </p>
              </div>

              <!-- Indicadores Rápidos -->
              <div class="flex items-center gap-3">
                <div class="text-right">
                  <span class="text-[11px] text-muted-foreground block">Peso mais recente</span>
                  <span class="text-base font-bold text-foreground">
                    {{ formatWeightKg(progress()?.weightEvolution?.latestWeightKg) }}
                  </span>
                </div>
                @if (weightDelta().direction !== 'none') {
                  <span
                    class="rounded-full px-2.5 py-1 text-xs font-semibold"
                    [class.bg-emerald-500/10]="weightDelta().direction === 'down'"
                    [class.text-emerald-700]="weightDelta().direction === 'down'"
                    [class.dark:text-emerald-300]="weightDelta().direction === 'down'"
                    [class.bg-secondary]="weightDelta().direction === 'up' || weightDelta().direction === 'neutral'"
                    [class.text-foreground]="weightDelta().direction === 'up' || weightDelta().direction === 'neutral'"
                  >
                    {{ weightDelta().text }}
                  </span>
                }
              </div>
            </div>

            <!-- Gráfico SVG Responsivo e Acessível -->
            @if (!chartData().hasData) {
              <!-- Estado Vazio -->
              <div class="rounded-xl border border-dashed border-border p-8 text-center space-y-3 bg-muted/10">
                <span class="text-3xl">⚖️</span>
                <p class="text-xs font-medium text-foreground">Nenhuma pesagem registrada no período</p>
                <p class="text-[11px] text-muted-foreground max-w-sm mx-auto">
                  A pesagem semanal é recomendada nos marcos dos dias 7, 14, 21 e 30 para acompanhar
                  sua rotina sem ansiedade.
                </p>
                <div class="pt-2">
                  <a routerLink="/diario" hlmBtn variant="outline" size="sm" class="text-xs">
                    Registrar Peso no Diário
                  </a>
                </div>
              </div>
            } @else if (chartData().hasSinglePoint) {
              <!-- Apenas 1 Pesagem Registrada -->
              <div class="rounded-xl border border-border p-6 bg-muted/10 space-y-4 text-center">
                <div class="flex justify-center">
                  <svg
                    viewBox="0 0 500 140"
                    class="w-full max-w-md h-28"
                    role="img"
                    [attr.aria-label]="chartData().accessibleSummary"
                  >
                    <line x1="40" y1="70" x2="460" y2="70" stroke="currentColor" stroke-dasharray="4" class="text-border" stroke-width="1" />
                    <!-- Ponto Único -->
                    <circle cx="250" cy="70" r="8" class="fill-primary" />
                    <text x="250" y="50" text-anchor="middle" class="fill-foreground text-[12px] font-bold">
                      {{ chartData().points[0]?.weightKg }} kg
                    </text>
                    <text x="250" y="95" text-anchor="middle" class="fill-muted-foreground text-[10px]">
                      {{ chartData().points[0]?.formattedDate }} ({{ chartData().points[0]?.source === 'assessment' ? 'Avaliação Inicial' : 'Diário' }})
                    </text>
                  </svg>
                </div>
                <div class="rounded-lg bg-card border border-border p-3.5 max-w-md mx-auto text-xs text-muted-foreground">
                  ℹ️ <strong>Uma única pesagem registrada:</strong> Ainda não há histórico suficiente para traçar
                  uma linha de evolução ou tendência. Registre novas pesagens nos marcos semanais no seu Diário.
                </div>
              </div>
            } @else {
              <!-- Múltiplas Pesagens: Gráfico de Linha Conectada -->
              <div class="space-y-4">
                <div class="overflow-x-auto">
                  <svg
                    viewBox="0 0 500 220"
                    class="w-full min-w-[320px] h-48 sm:h-56 select-none"
                    role="img"
                    [attr.aria-label]="chartData().accessibleSummary"
                  >
                    <!-- Linhas Guia Horizontais -->
                    <line x1="40" y1="40" x2="460" y2="40" stroke="currentColor" stroke-dasharray="3" class="text-border/60" stroke-width="1" />
                    <line x1="40" y1="110" x2="460" y2="110" stroke="currentColor" stroke-dasharray="3" class="text-border/60" stroke-width="1" />
                    <line x1="40" y1="180" x2="460" y2="180" stroke="currentColor" stroke-dasharray="3" class="text-border/60" stroke-width="1" />

                    <!-- Labels no Eixo Y -->
                    <text x="35" y="44" text-anchor="end" class="fill-muted-foreground text-[10px]">
                      {{ chartData().maxWeight.toFixed(1) }}kg
                    </text>
                    <text x="35" y="184" text-anchor="end" class="fill-muted-foreground text-[10px]">
                      {{ chartData().minWeight.toFixed(1) }}kg
                    </text>

                    <!-- Linha Conectora dos Pontos Reais -->
                    <polyline
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2.5"
                      class="text-primary"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      [attr.points]="chartData().polylinePoints"
                    />

                    <!-- Pontos de Medição -->
                    @for (point of chartData().points; track point.date) {
                      <g>
                        <!-- Círculo externo diferenciando Avaliação de Diário -->
                        @if (point.source === 'assessment') {
                          <circle
                            [attr.cx]="point.x"
                            [attr.cy]="point.y"
                            r="8"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-dasharray="2"
                            class="text-amber-500"
                          />
                          <circle [attr.cx]="point.x" [attr.cy]="point.y" r="4" class="fill-amber-500" />
                        } @else {
                          <circle [attr.cx]="point.x" [attr.cy]="point.y" r="6" class="fill-primary" />
                          <circle [attr.cx]="point.x" [attr.cy]="point.y" r="2" class="fill-primary-foreground" />
                        }

                        <!-- Rótulo de Peso -->
                        <text
                          [attr.x]="point.x"
                          [attr.y]="point.y - 12"
                          text-anchor="middle"
                          class="fill-foreground text-[11px] font-bold"
                        >
                          {{ point.weightKg.toFixed(1) }}
                        </text>

                        <!-- Data abreviada no Eixo X -->
                        <text
                          [attr.x]="point.x"
                          y="205"
                          text-anchor="middle"
                          class="fill-muted-foreground text-[9px]"
                        >
                          {{ formatShortDate(point.date) }}
                        </text>
                      </g>
                    }
                  </svg>
                </div>

                <!-- Legenda do Gráfico -->
                <div class="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground pt-1 border-t border-border/60">
                  <div class="flex items-center gap-4">
                    <span class="inline-flex items-center gap-1.5">
                      <span class="size-2.5 rounded-full border border-amber-500 bg-amber-500"></span>
                      Peso inicial (Avaliação)
                    </span>
                    <span class="inline-flex items-center gap-1.5">
                      <span class="size-2.5 rounded-full bg-primary"></span>
                      Pesagem no Diário
                    </span>
                  </div>

                  <button
                    type="button"
                    (click)="toggleAccessibleTable()"
                    class="text-primary hover:underline font-medium text-[11px]"
                  >
                    {{ showAccessibleTable() ? 'Ocultar tabela de pesagens' : 'Ver pesagens em tabela acessível' }}
                  </button>
                </div>

                <!-- Tabela Acessível Opcional -->
                @if (showAccessibleTable()) {
                  <div class="overflow-x-auto rounded-lg border border-border mt-3">
                    <table class="w-full text-xs text-left">
                      <caption class="sr-only">Tabela detalhada com as medições de peso corporal</caption>
                      <thead class="bg-muted/40 border-b border-border text-muted-foreground">
                        <tr>
                          <th scope="col" class="p-2.5">Data</th>
                          <th scope="col" class="p-2.5">Peso (kg)</th>
                          <th scope="col" class="p-2.5">Origem</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border">
                        @for (p of chartData().points; track p.date) {
                          <tr>
                            <td class="p-2.5 font-medium text-foreground">{{ p.formattedDate }}</td>
                            <td class="p-2.5 font-bold text-foreground">{{ p.weightKg.toFixed(1) }} kg</td>
                            <td class="p-2.5 text-muted-foreground">
                              {{ p.source === 'assessment' ? 'Avaliação Inicial' : 'Diário da Adaptação' }}
                            </td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </div>
            }

            <!-- Reavaliação Corporal e Indicadores da API -->
            <div class="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
              <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Indicadores Corporais da API
              </h3>
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span class="text-[11px] text-muted-foreground block">Peso Inicial vs Atual</span>
                  <span class="text-sm font-semibold text-foreground">
                    {{ formatWeightKg(progress()?.weightEvolution?.initialWeightKg) }} →
                    {{ formatWeightKg(progress()?.weightEvolution?.latestWeightKg) }}
                  </span>
                </div>

                @if (progress()?.weightEvolution?.currentBmi; as bmi) {
                  <div>
                    <span class="text-[11px] text-muted-foreground block">IMC Estimado</span>
                    <span class="text-sm font-semibold text-foreground">
                      {{ bmi.toFixed(1) }} kg/m²
                    </span>
                    <span class="text-[10px] text-muted-foreground block">Calculado pela API</span>
                  </div>
                }

                @if (progress()?.weightEvolution?.updatedMetabolicEstimates; as meta) {
                  @if (meta.tmbKcal) {
                    <div>
                      <span class="text-[11px] text-muted-foreground block">TMB Referência API</span>
                      <span class="text-sm font-semibold text-foreground">
                        {{ meta.tmbKcal }} kcal
                      </span>
                    </div>
                  }
                }
              </div>
              <p class="text-[11px] text-muted-foreground leading-relaxed pt-1 border-t border-border/50">
                ⚠️ Estes valores são estimativas de referência fornecidas pela API com base nos dados
                que você registrou. Não constituem laudo médico, diagnóstico nutricional ou prescrição clínica.
              </p>
            </div>
          </section>

          <!-- Seção de Evolução Semanal (5 Períodos) -->
          <section aria-labelledby="periods-title" hlmCard class="p-6 sm:p-8 space-y-6">
            <div>
              <h2 id="periods-title" class="text-lg font-bold text-foreground">
                Evolução por Períodos Semanais
              </h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                Acompanhe a distribuição dos seus hábitos registrados nos 5 períodos da Adaptação.
              </p>
            </div>

            <div class="space-y-4">
              @for (period of progress()?.weeklyPeriods; track period.periodNumber) {
                <div class="rounded-xl border border-border p-4 bg-card shadow-2xs space-y-3">
                  <div class="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-2.5">
                    <div class="flex items-center gap-2">
                      <span class="text-xs font-bold text-foreground">
                        {{ period.title }}
                      </span>
                      @if (period.milestoneDay) {
                        <span class="rounded-full bg-amber-500/10 border border-amber-500/30 px-2 py-0.2 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                          ★ Marco Dia {{ period.milestoneDay }}
                        </span>
                      }
                    </div>
                    <span class="text-[11px] text-muted-foreground font-medium">
                      Dias {{ period.startDay }} a {{ period.endDay }}
                    </span>
                  </div>

                  <!-- Chips de Cada Dia do Período -->
                  <div class="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                    @for (day of period.days; track day.dayNumber) {
                      <div
                        class="p-2.5 rounded-lg border text-left text-xs transition-all space-y-1"
                        [class.border-primary]="day.isToday"
                        [class.bg-primary/10]="day.isToday"
                        [class.border-border]="!day.isToday"
                        [class.bg-muted/40]="day.isPast"
                        [class.opacity-60]="day.isFuture"
                      >
                        <div class="flex items-center justify-between">
                          <span class="font-bold text-[11px]" [class.text-primary]="day.isToday">
                            Dia {{ day.dayNumber }}
                          </span>
                          @if (day.isToday) {
                            <span class="rounded bg-primary px-1 py-0.2 text-[9px] font-bold text-primary-foreground">
                              Hoje
                            </span>
                          }
                        </div>

                        <span class="text-[10px] text-muted-foreground block truncate">
                          {{ formatShortDate(day.date) }}
                        </span>

                        <!-- Ícones de Hábitos Registrados no Dia -->
                        <div class="flex items-center gap-1 pt-1 min-h-4 text-[11px]">
                          @if (day.hasMeals) {
                            <span title="Refeição registrada">🍽️</span>
                          }
                          @if (day.hasWater) {
                            <span title="Água registrada">💧</span>
                          }
                          @if (day.hasActivities) {
                            <span title="Atividade registrada">🏃</span>
                          }
                          @if (day.hasWeight) {
                            <span title="Peso registrado">⚖️</span>
                          }
                          @if (!day.hasMeals && !day.hasWater && !day.hasActivities && !day.hasWeight) {
                            <span class="text-[9px] text-muted-foreground/60 italic">--</span>
                          }
                        </div>

                        <!-- Link para abrir o Diário nessa data -->
                        @if (!day.isFuture) {
                          <a
                            [routerLink]="['/diario']"
                            [queryParams]="{ date: day.date }"
                            class="text-[9px] text-primary hover:underline block pt-0.5 font-medium"
                          >
                            Abrir →
                          </a>
                        }
                      </div>
                    }
                  </div>
                </div>
              }
            </div>
          </section>

          <!-- Seção de Conquistas Reais (Gamificação Leve) -->
          <section aria-labelledby="achievements-title" hlmCard class="p-6 sm:p-8 space-y-6">
            <div>
              <h2 id="achievements-title" class="text-lg font-bold text-foreground">
                Conquistas por Consistência
              </h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                Marcos atribuídos exclusivamente pelo backend com base nos seus registros reais. Sem
                penalidades ou contadores de perda.
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              @for (ach of progress()?.achievements; track ach.id) {
                <div
                  class="rounded-xl border p-4.5 transition-all text-left space-y-2.5 shadow-2xs"
                  [class.border-emerald-500/40]="ach.unlocked"
                  [class.bg-emerald-500/5]="ach.unlocked"
                  [class.border-border]="!ach.unlocked"
                  [class.bg-card]="!ach.unlocked"
                  [class.opacity-75]="!ach.unlocked"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="text-2xl">{{ ach.icon || (ach.unlocked ? '🏆' : '🔒') }}</span>
                    @if (ach.unlocked) {
                      <span class="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:text-emerald-300">
                        Conquistada
                      </span>
                    } @else {
                      <span class="rounded-full bg-muted border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        Em progresso
                      </span>
                    }
                  </div>

                  <div>
                    <h3 class="text-xs font-bold text-foreground">
                      {{ ach.title }}
                    </h3>
                    <p class="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {{ ach.description }}
                    </p>
                  </div>

                  @if (ach.unlocked && ach.unlockedAt) {
                    <p class="text-[10px] text-emerald-700 dark:text-emerald-300 font-medium pt-1 border-t border-emerald-500/20">
                      Conquistada em {{ formatDatePtBr(ach.unlockedAt.slice(0, 10)) }}
                    </p>
                  } @else if (ach.target && ach.progress !== undefined) {
                    <div class="pt-1 space-y-1">
                      <div class="flex justify-between text-[10px] text-muted-foreground font-medium">
                        <span>Progresso</span>
                        <span>{{ ach.progress }} / {{ ach.target }}</span>
                      </div>
                      <div class="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                        <div
                          class="h-full bg-primary"
                          [style.width.%]="calcPercentage(ach.progress, ach.target)"
                        ></div>
                      </div>
                    </div>
                  }
                </div>
              }
            </div>

            <div class="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground space-y-1">
              <span class="font-bold text-foreground block">🌱 Compromisso com a Saúde Integral:</span>
              <p class="leading-relaxed">
                O Queimando Gordura nunca pontua restrições calóricas severas, jejuns forçados,
                pesagens diárias obsessivas ou esforço físico extenuante. A jornada celebra a
                regularidade de hábitos sustentáveis.
              </p>
            </div>
          </section>

          <!-- Seção de Download do Relatório PDF Oficial -->
          <section aria-labelledby="report-section-title" hlmCard class="p-6 sm:p-8 space-y-5 bg-card">
            <div class="border-b border-border pb-4">
              <h2 id="report-section-title" class="text-lg font-bold text-foreground">
                Relatório Oficial dos 30 Dias (PDF)
              </h2>
              <p class="text-xs text-muted-foreground mt-0.5">
                Gere um documento completo com o histórico consolidado de hábitos, pesagens e marcos.
              </p>
            </div>

            <!-- Aviso sobre Dados Pessoais de Saúde -->
            <div class="rounded-xl border border-border bg-muted/20 p-4 space-y-2 text-xs">
              <div class="flex items-center gap-2 text-foreground font-semibold">
                <span>🔒</span>
                <span>Documento com Informações Pessoais de Saúde</span>
              </div>
              <p class="text-muted-foreground leading-relaxed">
                Este relatório é gerado sob demanda e contém dados de saúde informados por você.
                Ele não é armazenado em cache no navegador e não é compartilhado externamente.
                Faça o download exclusivamente em um dispositivo pessoal e de sua confiança.
              </p>
            </div>

            <!-- Opção Opcional de Inclusão de Condições de Saúde (inicia desmarcada) -->
            <div class="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-card">
              <input
                id="include-health-details"
                type="checkbox"
                [(ngModel)]="includeHealthDetails"
                class="size-4 mt-0.5 rounded border-border text-primary focus:ring-primary"
              />
              <label for="include-health-details" class="text-xs text-foreground cursor-pointer leading-relaxed">
                Incluir condições de saúde e medicamentos que informei na avaliação
                <span class="block text-[11px] text-muted-foreground mt-0.5">
                  (Opcional. Útil para levar a consultas médicas ou acompanhamento nutricional).
                </span>
              </label>
            </div>

            <!-- Feedback de Erro de Download se houver -->
            @if (downloadError()) {
              <div hlmAlert variant="destructive" class="text-xs">
                <p>{{ downloadError() }}</p>
              </div>
            }

            <!-- Botão de Ação -->
            <div class="pt-1 flex flex-wrap items-center gap-3">
              <button
                hlmBtn
                variant="default"
                (click)="onDownloadReport()"
                [disabled]="isDownloadingPdf()"
                class="text-xs font-semibold"
              >
                @if (isDownloadingPdf()) {
                  <span class="inline-block size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></span>
                  Gerando Relatório...
                } @else {
                  📄 Baixar Relatório dos 30 Dias (PDF)
                }
              </button>

              <span class="text-[11px] text-muted-foreground">
                Arquivo .pdf seguro gerado pelo servidor
              </span>
            </div>
          </section>
        }
      </main>
    </div>
  `,
})
export class AdaptationProgress implements OnInit {
  private readonly adaptationApi = inject(AdaptationApiService);

  public readonly loading = signal(true);
  public readonly errorMessage = signal<string | null>(null);
  public readonly progress = signal<AdaptationProgressResponse | null>(null);

  public readonly includeHealthDetails = signal(false);
  public readonly isDownloadingPdf = signal(false);
  public readonly downloadError = signal<string | null>(null);
  public readonly showAccessibleTable = signal(false);

  public readonly chartData = computed<WeightChartData>(() =>
    calculateWeightChart(this.progress()?.weightEvolution?.weighIns ?? []),
  );

  public readonly weightDelta = computed(() =>
    formatWeightDelta(this.progress()?.weightEvolution?.weightDeltaKg),
  );

  public readonly isCompleted = computed(
    () => this.progress()?.planStatus === 'completed',
  );

  public readonly isNotStarted = computed(
    () => !this.progress() || this.progress()?.planStatus === 'not_started',
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
        // Se a API retornar 404 (plano ainda não iniciado), tratamos amigavelmente
        if (err?.status === 404) {
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

        this.errorMessage.set(
          'Não foi possível consultar seu progresso e conquistas. Verifique sua conexão e tente novamente.',
        );
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

  public toggleAccessibleTable(): void {
    this.showAccessibleTable.update((v) => !v);
  }

  public formattedDateRange(): string {
    const p = this.progress();
    if (!p?.startDate || !p?.endDate) return 'Período não definido';
    return formatDateRange(p.startDate, p.endDate);
  }

  public formatShortDate(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}`;
  }

  public calcPercentage(val: number | undefined, target: number | undefined): number {
    if (!val || !target || target === 0) return 0;
    return Math.min(100, Math.round((val / target) * 100));
  }

  public formatWeightKg(kg: number | null | undefined): string {
    return formatWeightKg(kg);
  }

  public formatHabitFrequency(recorded: number, total: number): string {
    return formatHabitFrequency(recorded, total);
  }

  public formatDatePtBr(date: string | null | undefined): string {
    return formatDatePtBr(date);
  }
}
