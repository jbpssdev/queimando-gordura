import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { AssessmentStateService } from '../../../core/assessment/assessment-state.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AssessmentPending } from './components/assessment-pending';
import { formatBrazilianNumber } from '../../../core/assessment/assessment-helpers';

@Component({
  selector: 'app-assessment-results',
  imports: [RouterLink, HlmButton, HlmCardImports, HlmAlertImports, AssessmentPending],
  template: `
    <div class="min-h-dvh bg-background text-foreground flex flex-col">
      <a class="skip-link" href="#results-content">Pular para os resultados da avaliação</a>

      <!-- Header Protegido -->
      <header class="border-b border-border bg-card/80 backdrop-blur-xs sticky top-0 z-30">
        <div
          class="mx-auto flex flex-wrap gap-3 max-w-5xl items-center justify-between px-4 py-3 sm:px-8"
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
              Resultados da Avaliação
            </span>
          </div>

          <div class="flex items-center gap-3">
            <a routerLink="/avaliacao" hlmBtn variant="outline" size="sm" class="text-xs">
              Revisar Respostas
            </a>
            <a
              routerLink="/painel"
              hlmBtn
              variant="default"
              size="sm"
              class="text-xs font-semibold"
            >
              Painel
            </a>
          </div>
        </div>
      </header>

      <main
        id="results-content"
        class="flex-1 mx-auto max-w-4xl w-full px-4 py-8 sm:px-8 space-y-8"
      >
        <!-- Estado de Carregamento -->
        @if (isLoading()) {
          <div class="rounded-xl border border-border bg-card p-12 text-center space-y-3">
            <div
              class="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
            ></div>
            <p class="text-sm text-muted-foreground">Consultando seus resultados calculados...</p>
          </div>
        } @else if (loadError()) {
          <!-- Erro ou Ausência de Resultados -->
          <div hlmCard class="p-8 text-center space-y-4">
            <h2 class="text-xl font-bold text-foreground">Resultados ainda não disponíveis</h2>
            <p class="text-sm text-muted-foreground max-w-md mx-auto">
              {{ loadError() }}
            </p>
            <div class="pt-2 flex justify-center gap-3">
              <a routerLink="/avaliacao" hlmBtn variant="default">
                Ir para o Questionário de Avaliação
              </a>
              <button hlmBtn variant="outline" (click)="loadResults()">Tentar novamente</button>
            </div>
          </div>
        } @else if (results()) {
          <!-- Banner de Orientações de Segurança Médica (se indicado pela API) -->
          @if (results()?.safetyOrientations; as safety) {
            @if (safety.level === 'urgent' || safety.level === 'medical_attention') {
              <div
                hlmAlert
                variant="destructive"
                class="border-destructive/40 bg-destructive/10 text-destructive p-5"
              >
                <h4 hlmAlertTitle class="text-sm font-bold flex items-center gap-2">
                  Orientação de Segurança e Atenção Individualizada
                </h4>
                <p hlmAlertDescription class="text-xs leading-relaxed mt-1">
                  {{ safety.message }}
                </p>
                @if (safety.details && safety.details.length > 0) {
                  <ul class="list-disc list-inside mt-2 text-xs space-y-0.5 opacity-90">
                    @for (det of safety.details; track det) {
                      <li>{{ det }}</li>
                    }
                  </ul>
                }
              </div>
            }
          }

          <!-- Cabeçalho dos Resultados -->
          <div class="border-b border-border pb-4">
            <div
              class="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
            >
              ✓ Avaliação Concluída
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl mt-3">
              Suas Estimativas Metabólicas e Corporais
            </h1>
            <p class="text-sm text-muted-foreground mt-1.5">
              Parabéns por concluir esta etapa. Abaixo estão suas referências estimadas com base nas
              informações compartilhadas.
            </p>
            <p class="mt-2 text-xs text-muted-foreground">
              Revisão {{ results()?.revision }} · {{ results()?.evaluatedAt }}
            </p>
          </div>

          <!-- Cards de Métricas Corporais Principais -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <!-- Peso Atual -->
            <div hlmCard class="p-5 bg-card">
              <span
                class="text-xs font-medium text-muted-foreground uppercase tracking-wider block"
              >
                Peso Atual
              </span>
              <div class="mt-2 flex items-baseline gap-1">
                <span class="text-3xl font-extrabold text-foreground">
                  {{ formatNumber(results()?.currentWeightKg) || '--' }}
                </span>
                <span class="text-sm font-semibold text-muted-foreground">kg</span>
              </div>
              <p class="mt-2 text-xs text-muted-foreground">
                Altura registrada: {{ results()?.heightCm ? results()?.heightCm + ' cm' : '--' }}
              </p>
            </div>

            <!-- IMC e Categoria -->
            <div hlmCard class="p-5 bg-card">
              <span
                class="text-xs font-medium text-muted-foreground uppercase tracking-wider block"
              >
                IMC Estimado
              </span>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-3xl font-extrabold text-primary">
                  {{ formatNumber(results()?.bmi?.value) || '--' }}
                </span>
                <span
                  class="text-xs font-semibold px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground"
                >
                  {{ results()?.bmi?.category || 'Calculado' }}
                </span>
              </div>
              <p class="mt-2 text-xs text-muted-foreground">
                Referência populacional com limitações individuais.
              </p>
            </div>

            <!-- Idade Calculada -->
            <div hlmCard class="p-5 bg-card">
              <span
                class="text-xs font-medium text-muted-foreground uppercase tracking-wider block"
              >
                Idade Calculada
              </span>
              <div class="mt-2 flex items-baseline gap-1">
                <span class="text-3xl font-extrabold text-foreground">
                  {{ results()?.calculatedAge ?? '--' }}
                </span>
                <span class="text-sm font-semibold text-muted-foreground">anos</span>
              </div>
              <p class="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
                Idade mínima de 18 anos confirmada.
              </p>
            </div>
          </div>

          <!-- Seção de Parâmetros Metabólicos (TMB e Gasto Total) -->
          <div hlmCard class="p-6 sm:p-8 space-y-6">
            <h2 class="text-lg font-bold text-foreground">Estimativas de Gasto Energético</h2>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Taxa Metabólica Basal (TMB) -->
              <div class="rounded-xl border border-border p-5 bg-muted/10 space-y-2">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-foreground uppercase tracking-wide">
                    Taxa Metabólica Basal (TMB)
                  </span>
                  @if (results()?.bmrKcal?.formula; as formula) {
                    <span
                      class="text-[10px] rounded bg-secondary px-1.5 py-0.5 text-secondary-foreground font-mono"
                    >
                      {{ formula }}
                    </span>
                  }
                </div>

                @if (results()?.bmrKcal; as bmr) {
                  <div class="flex items-baseline gap-1.5 py-1">
                    <span class="text-2xl font-bold text-foreground">
                      {{ formatNumber(bmr.value, 0) }}
                    </span>
                    <span class="text-xs text-muted-foreground font-medium"
                      >kcal/dia em repouso</span
                    >
                  </div>
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    {{
                      bmr.description ||
                        'Gasto calórico estimado para manter suas funções vitais básicas.'
                    }}
                  </p>
                } @else {
                  <p class="text-xs text-amber-600 dark:text-amber-400 py-2 leading-relaxed">
                    TMB não estimada (variável necessária à equação metabólica não foi informada ou
                    cálculo pendente).
                  </p>
                }

                <div
                  class="rounded-lg border border-border/80 bg-background/50 p-2.5 text-[11px] text-muted-foreground"
                >
                  ⚠️ <strong>Atenção:</strong> A TMB estima o gasto em repouso e
                  <strong>NÃO</strong> deve ser confundida com sua meta de calorias diárias.
                </div>
              </div>

              <!-- Faixa de Gasto Total Diário (TDEE/GET) -->
              <div class="rounded-xl border border-border p-5 bg-muted/10 space-y-2">
                <span class="text-xs font-semibold text-foreground uppercase tracking-wide block">
                  Gasto Energético Total Estimado (GET)
                </span>

                @if (results()?.tdeeKcalRange; as tdee) {
                  <div class="flex items-baseline gap-1.5 py-1">
                    <span class="text-2xl font-bold text-foreground">
                      {{ formatNumber(tdee.min, 0) }} a {{ formatNumber(tdee.max, 0) }}
                    </span>
                    <span class="text-xs text-muted-foreground font-medium">kcal/dia</span>
                  </div>
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    {{
                      tdee.description ||
                        'Faixa aproximada considerando sua rotina profissional e níveis de movimentação informados.'
                    }}
                  </p>
                } @else {
                  <p class="text-xs text-muted-foreground py-2 leading-relaxed">
                    Gasto total em cálculo de referência pelo backend.
                  </p>
                }

                <div
                  class="rounded-lg border border-border/80 bg-background/50 p-2.5 text-[11px] text-muted-foreground"
                >
                  💡 Considera sua movimentação cotidiana somada à prática eventual de exercícios.
                </div>
              </div>
            </div>
          </div>

          <!-- Metas e Referências de Peso (Sem imposição de peso ideal) -->
          <div hlmCard class="p-6 sm:p-8 space-y-6">
            <h2 class="text-lg font-bold text-foreground">
              Referências de Peso e Metas Conscientes
            </h2>
            <p class="text-xs text-muted-foreground -mt-4 leading-relaxed">
              O Queimando Gordura não impõe um "peso ideal" único. Trabalhamos com marcos
              intermediários viáveis e respeitamos o objetivo definido por você.
            </p>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
              <!-- Primeira Referência: Redução de 5% -->
              <div class="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1.5">
                <span class="text-[11px] font-semibold text-primary uppercase tracking-wide block">
                  1º Marco: Redução de 5%
                </span>
                <div class="flex items-baseline gap-1">
                  <span class="text-2xl font-bold text-foreground">
                    {{ formatNumber(results()?.target5PercentWeightKg) || '--' }}
                  </span>
                  <span class="text-xs text-muted-foreground">kg</span>
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  Referência intermediária de redução de peso,
                  <strong>sem prazo obrigatório</strong>, sujeita a orientação individualizada.
                </p>
              </div>

              <!-- Faixa Populacional IMC -->
              <div class="rounded-xl border border-border p-4 bg-muted/10 space-y-1.5">
                <span
                  class="text-[11px] font-semibold text-foreground uppercase tracking-wide block"
                >
                  Faixa Populacional (IMC)
                </span>
                <div class="flex items-baseline gap-1">
                  <span class="text-2xl font-bold text-foreground">
                    @if (results()?.bmiReferenceWeightRange; as range) {
                      {{ formatNumber(range.min) }} - {{ formatNumber(range.max) }}
                    } @else {
                      --
                    }
                  </span>
                  <span class="text-xs text-muted-foreground">kg</span>
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  Intervalo estatístico de referência demográfica, não uma obrigação médica
                  individual.
                </p>
              </div>

              <!-- Peso Desejado pelo Usuário -->
              <div class="rounded-xl border border-border p-4 bg-muted/10 space-y-1.5">
                <span
                  class="text-[11px] font-semibold text-foreground uppercase tracking-wide block"
                >
                  Seu Peso Desejado
                </span>
                <div class="flex items-baseline gap-1">
                  <span class="text-2xl font-bold text-foreground">
                    {{ formatNumber(results()?.desiredWeightKg) || 'Não informado' }}
                  </span>
                  @if (results()?.desiredWeightKg) {
                    <span class="text-xs text-muted-foreground">kg</span>
                  }
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  Objetivo pessoal definido por você no questionário.
                </p>
              </div>
            </div>
          </div>

          <!-- Pendências Complementares Inteligentes -->
          @if (results()?.pendingItems && results()!.pendingItems!.length > 0) {
            <app-assessment-pending [pendingItems]="results()!.pendingItems!" />
          }

          <!-- Apresentação da Adaptação: Sua Jornada de 30 Dias -->
          <div hlmCard class="p-6 sm:p-8 border-primary/30 bg-primary/5 space-y-6">
            <div class="flex items-center gap-2">
              <span
                class="rounded-full bg-primary text-primary-foreground text-xs font-bold px-3 py-1"
              >
                Próximo Passo
              </span>
              <span class="text-xs font-semibold text-primary uppercase tracking-wide">
                Programa Adaptação
              </span>
            </div>

            <div>
              <h2 class="text-xl font-bold text-foreground sm:text-2xl">
                Adaptação — sua jornada de 30 dias
              </h2>
              <p class="text-sm text-muted-foreground mt-2 leading-relaxed">
                Com sua avaliação registrada, o próximo módulo do produto será o
                <strong>Programa Adaptação</strong>, estruturado para consolidar hábitos e organizar
                sua alimentação em 30 dias.
              </p>
            </div>

            <!-- Estrutura Visual das Modalidades (Sem regras duplicadas) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div class="rounded-xl border border-border bg-background p-5 space-y-2 shadow-xs">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-bold text-foreground">Modalidade Padrão</h3>
                  <span class="text-[11px] text-muted-foreground font-medium">30 dias</span>
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  Transição suave com foco em adesão gradual, organização das refeições e ajustes
                  simples na rotina, com menor impacto inicial.
                </p>
              </div>

              <div class="rounded-xl border border-border bg-background p-5 space-y-2 shadow-xs">
                <div class="flex items-center justify-between">
                  <h3 class="text-sm font-bold text-foreground">Modalidade Intensificada</h3>
                  <span class="text-[11px] text-muted-foreground font-medium">30 dias</span>
                </div>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  Planejamento mais direto para pessoas com rotina mais estruturada e que já possuem
                  familiaridade com monitoramento de hábitos.
                </p>
              </div>
            </div>

            <!-- Aviso Honesto e Transparente sobre Próximo Checkpoint -->
            <div
              class="rounded-lg border border-border bg-background/80 p-4 text-xs text-muted-foreground space-y-1.5"
            >
              <p class="font-semibold text-foreground">ℹ️ Estado do desenvolvimento do produto:</p>
              <p>
                A criação detalhada e a ativação do plano de 30 dias serão implementadas no próximo
                checkpoint. Seus dados e cálculos estão salvos com segurança para quando a jornada
                começar.
              </p>
            </div>

            <!-- Ações -->
            <div class="flex flex-col sm:flex-row gap-3 pt-2">
              <a routerLink="/painel" hlmBtn variant="default" class="font-semibold">
                Voltar ao Painel
              </a>
              <a routerLink="/avaliacao" hlmBtn variant="outline">
                Revisar Respostas da Avaliação
              </a>
            </div>
          </div>
        }
      </main>
    </div>
  `,
})
export class AssessmentResults implements OnInit {
  protected readonly session = inject(AuthSessionService);
  protected readonly state = inject(AssessmentStateService);

  public readonly results = this.state.results;
  public readonly isLoading = this.state.isEvaluating;
  public readonly loadError = this.state.evaluateError;

  public ngOnInit(): void {
    this.loadResults();
  }

  public loadResults(): void {
    this.state.loadResults().subscribe({
      error: () => {
        // Tratado no template através dos signals
      },
    });
  }

  public formatNumber(value: number | null | undefined, fractionDigits = 1): string {
    return formatBrazilianNumber(value, fractionDigits);
  }
}
