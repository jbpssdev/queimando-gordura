import { Component, inject, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { AssessmentStateService } from '../../../core/assessment/assessment-state.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AssessmentStepper } from './components/assessment-stepper';
import { AssessmentPending } from './components/assessment-pending';
import { StepBody } from './components/step-body';
import { StepHealth } from './components/step-health';
import { StepRoutine } from './components/step-routine';
import { StepNutrition } from './components/step-nutrition';
import type {
  AssessmentSection,
  BodyAssessmentDto,
  HealthAssessmentDto,
  NutritionAssessmentDto,
  RoutineAssessmentDto,
} from '../../../core/assessment/assessment.model';

@Component({
  selector: 'app-assessment',
  imports: [
    RouterLink,
    HlmButton,
    HlmCardImports,
    HlmAlertImports,
    AssessmentStepper,
    AssessmentPending,
    StepBody,
    StepHealth,
    StepRoutine,
    StepNutrition,
  ],
  template: `
    <div class="min-h-dvh bg-background text-foreground flex flex-col">
      <a class="skip-link" href="#assessment-content">Pular para o conteúdo da avaliação</a>

      <!-- Header de Navegação Protegido -->
      <header class="border-b border-border bg-card/80 backdrop-blur-xs sticky top-0 z-30">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-8">
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
              Avaliação Inicial
            </span>
          </div>

          <div class="flex items-center gap-3">
            <!-- Indicador visual de salvamento -->
            <div class="hidden sm:flex items-center text-xs">
              @if (state.saveStatus() === 'saving') {
                <span class="flex items-center gap-1.5 text-muted-foreground">
                  <span class="size-2 rounded-full bg-amber-500 animate-pulse"></span>
                  Salvando...
                </span>
              } @else if (state.saveStatus() === 'saved') {
                <span class="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <span class="size-2 rounded-full bg-emerald-500"></span>
                  Salvo
                </span>
              } @else if (state.saveStatus() === 'error') {
                <span class="flex items-center gap-1.5 text-destructive font-medium">
                  <span class="size-2 rounded-full bg-destructive"></span>
                  Erro ao salvar
                </span>
              }
            </div>

            <a routerLink="/painel" hlmBtn variant="outline" size="sm" class="text-xs"> Painel </a>
          </div>
        </div>
      </header>

      <!-- Conteúdo Principal da Avaliação -->
      <main id="assessment-content" class="flex-1 mx-auto max-w-4xl w-full px-4 py-8 sm:px-8">
        <!-- Banner de erro de carregamento ou conexão se houver -->
        @if (state.loadStatus() === 'error') {
          <div
            hlmAlert
            variant="destructive"
            class="mb-6 border-destructive/40 bg-destructive/10 text-destructive p-4"
          >
            <h4 hlmAlertTitle class="text-xs font-bold">Falha na Conexão com o Servidor</h4>
            <p hlmAlertDescription class="text-xs mt-1">
              {{ state.loadError() }}
            </p>
            <div class="mt-3">
              <button hlmBtn variant="outline" size="xs" (click)="retryLoad()">
                Tentar carregar novamente
              </button>
            </div>
          </div>
        }

        <!-- Se o rascunho anterior já estiver concluído, notifica o usuário -->
        @if (state.draft()?.status === 'completed') {
          <div
            class="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div>
              <h3 class="text-sm font-semibold text-foreground">Avaliação já calculada</h3>
              <p class="text-xs text-muted-foreground mt-0.5">
                Você já possui uma avaliação finalizada e resultados gerados no Queimando Gordura.
              </p>
            </div>
            <a
              routerLink="/avaliacao/resultados"
              hlmBtn
              variant="default"
              size="sm"
              class="text-xs font-semibold whitespace-nowrap"
            >
              Ver Meus Resultados →
            </a>
          </div>
        }

        @if (state.loadStatus() === 'loading') {
          <p role="status" class="py-8 text-sm text-muted-foreground">
            Carregando sua avaliação...
          </p>
        }
        @if (state.loadStatus() === 'ready') {
          <!-- Stepper Visual e Indicador de Progresso -->
          <div class="mb-8">
            <app-assessment-stepper
              [currentStep]="state.currentStep()"
              (stepClick)="onStepSelect($event)"
            />
          </div>

          <!-- Feedback de erro de salvamento de seção -->
          @if (state.saveStatus() === 'error') {
            <div
              hlmAlert
              variant="destructive"
              class="mb-6 border-destructive/40 bg-destructive/10 text-destructive p-4"
            >
              <h4 hlmAlertTitle class="text-xs font-bold">Não foi possível salvar a seção</h4>
              <p hlmAlertDescription class="text-xs mt-1">
                {{ state.saveError() }}
              </p>
            </div>
          }

          <!-- Etapa 1: Informações Corporais -->
          @if (state.currentStep() === 1) {
            <app-step-body
              [initialData]="state.draft()?.body ?? null"
              [isSaving]="state.saveStatus() === 'saving'"
              (saveSection)="onSaveSection('body', $event)"
            />
          }

          <!-- Etapa 2: Condições de Saúde -->
          @if (state.currentStep() === 2) {
            <app-step-health
              [initialData]="state.draft()?.health ?? null"
              [isSaving]="state.saveStatus() === 'saving'"
              (previous)="state.previousStep()"
              (saveSection)="onSaveSection('health', $event)"
            />
          }

          <!-- Etapa 3: Rotina e Atividade Física -->
          @if (state.currentStep() === 3) {
            <app-step-routine
              [initialData]="state.draft()?.routine ?? null"
              [isSaving]="state.saveStatus() === 'saving'"
              (previous)="state.previousStep()"
              (saveSection)="onSaveSection('routine', $event)"
            />
          }

          <!-- Etapa 4: Hábitos Alimentares -->
          @if (state.currentStep() === 4) {
            <app-step-nutrition
              [initialData]="state.draft()?.nutrition ?? null"
              [isSaving]="state.saveStatus() === 'saving'"
              (previous)="state.previousStep()"
              (saveSection)="onSaveSection('nutrition', $event)"
            />
          }

          <!-- Etapa 5: Revisão e Conclusão -->
          @if (state.currentStep() === 5) {
            <div class="space-y-6">
              <div hlmCard class="p-6 sm:p-8">
                <div class="border-b border-border pb-4 mb-6">
                  <span
                    class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
                  >
                    Etapa 5 de 5
                  </span>
                  <h2 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl mt-2">
                    Revisão e Conclusão da Avaliação
                  </h2>
                  <p class="text-sm text-muted-foreground mt-1">
                    Confira o resumo das suas respostas e o status das informações antes de gerar
                    seus resultados oficiais.
                  </p>
                </div>

                <!-- Cartão de Pendências Inteligentes -->
                <div class="mb-6">
                  <app-assessment-pending [pendingItems]="state.pendingItems()" />
                </div>

                <!-- Resumo das 4 Seções Preenchidas -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <!-- Seção 1 Resumo -->
                  <div class="rounded-lg border border-border p-4 space-y-2 bg-muted/10">
                    <div class="flex items-center justify-between">
                      <strong class="font-semibold text-foreground text-sm"
                        >1. Informações Corporais</strong
                      >
                      <button
                        type="button"
                        (click)="state.setStep(1)"
                        class="text-primary hover:underline text-xs"
                      >
                        Editar
                      </button>
                    </div>
                    <div class="text-muted-foreground space-y-1">
                      <p>Nascimento: {{ state.draft()?.body?.birthDate || 'Pendente' }}</p>
                      <p>
                        Peso atual:
                        {{
                          state.draft()?.body?.currentWeightKg
                            ? state.draft()?.body?.currentWeightKg + ' kg'
                            : 'Pendente'
                        }}
                      </p>
                      <p>
                        Altura:
                        {{
                          state.draft()?.body?.heightCm
                            ? state.draft()?.body?.heightCm + ' cm'
                            : 'Pendente'
                        }}
                      </p>
                      <p>
                        Balança:
                        {{
                          state.draft()?.body?.scaleType === 'bioimpedance'
                            ? 'Bioimpedância'
                            : 'Comum'
                        }}
                      </p>
                    </div>
                  </div>

                  <!-- Seção 2 Resumo -->
                  <div class="rounded-lg border border-border p-4 space-y-2 bg-muted/10">
                    <div class="flex items-center justify-between">
                      <strong class="font-semibold text-foreground text-sm"
                        >2. Saúde e Segurança</strong
                      >
                      <button
                        type="button"
                        (click)="state.setStep(2)"
                        class="text-primary hover:underline text-xs"
                      >
                        Editar
                      </button>
                    </div>
                    <div class="text-muted-foreground space-y-1">
                      <p>
                        Histórico:
                        {{ formatHealthDeclaration(state.draft()?.health?.declarationType) }}
                      </p>
                      <p>
                        Medicamentos contínuos:
                        {{ state.draft()?.health?.takesContinuousMedication ? 'Sim' : 'Não' }}
                      </p>
                      <p>
                        Acompanhamento médico:
                        {{ state.draft()?.health?.hasMedicalFollowUp ? 'Sim' : 'Não' }}
                      </p>
                    </div>
                  </div>

                  <!-- Seção 3 Resumo -->
                  <div class="rounded-lg border border-border p-4 space-y-2 bg-muted/10">
                    <div class="flex items-center justify-between">
                      <strong class="font-semibold text-foreground text-sm"
                        >3. Rotina e Atividade</strong
                      >
                      <button
                        type="button"
                        (click)="state.setStep(3)"
                        class="text-primary hover:underline text-xs"
                      >
                        Editar
                      </button>
                    </div>
                    <div class="text-muted-foreground space-y-1">
                      <p>Rotina: {{ formatWorkRoutine(state.draft()?.routine?.workRoutine) }}</p>
                      <p>
                        Horas sentado/dia:
                        {{ state.draft()?.routine?.sittingHoursPerDay ?? 'Pendente' }}h
                      </p>
                      <p>
                        Musculação:
                        {{
                          state.draft()?.routine?.practicesStrengthTraining
                            ? 'Sim (' + state.draft()?.routine?.strengthDaysPerWeek + 'x/sem)'
                            : 'Não'
                        }}
                      </p>
                      <p>
                        Cardio:
                        {{
                          state.draft()?.routine?.practicesCardio
                            ? 'Sim (' + state.draft()?.routine?.cardioDaysPerWeek + 'x/sem)'
                            : 'Não'
                        }}
                      </p>
                    </div>
                  </div>

                  <!-- Seção 4 Resumo -->
                  <div class="rounded-lg border border-border p-4 space-y-2 bg-muted/10">
                    <div class="flex items-center justify-between">
                      <strong class="font-semibold text-foreground text-sm"
                        >4. Hábitos Alimentares</strong
                      >
                      <button
                        type="button"
                        (click)="state.setStep(4)"
                        class="text-primary hover:underline text-xs"
                      >
                        Editar
                      </button>
                    </div>
                    <div class="text-muted-foreground space-y-1">
                      <p>
                        Refeições/dia: {{ state.draft()?.nutrition?.dailyMealsCount ?? 'Pendente' }}
                      </p>
                      <p>
                        Preparo: {{ formatCookingHabit(state.draft()?.nutrition?.cookingHabit) }}
                      </p>
                      <p>
                        Balança de precisão:
                        {{ state.draft()?.nutrition?.hasKitchenScale ? 'Sim' : 'Não' }}
                      </p>
                    </div>
                  </div>
                </div>

                <!-- Mensagem de erro ao solicitar avaliação final -->
                @if (state.evaluateError()) {
                  <div
                    hlmAlert
                    variant="destructive"
                    class="mt-6 border-destructive/40 bg-destructive/10 text-destructive p-4"
                  >
                    <h4 hlmAlertTitle class="text-xs font-bold">
                      Não foi possível calcular os resultados
                    </h4>
                    <p hlmAlertDescription class="text-xs mt-1">
                      {{ state.evaluateError() }}
                    </p>
                  </div>
                }

                <!-- Ações da Etapa 5 -->
                <div
                  class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-6"
                >
                  <button
                    hlmBtn
                    type="button"
                    variant="outline"
                    (click)="state.setStep(4)"
                    class="w-full sm:w-auto"
                  >
                    ← Voltar para Hábitos Alimentares
                  </button>

                  <div class="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                    @if (!state.canEvaluate()) {
                      <span
                        class="text-xs text-amber-600 dark:text-amber-400 text-center sm:text-right"
                      >
                        Preencha as informações essenciais pendentes para concluir.
                      </span>
                    }

                    <button
                      hlmBtn
                      type="button"
                      variant="default"
                      (click)="onEvaluate()"
                      class="w-full sm:w-auto font-semibold"
                      [disabled]="!state.canEvaluate() || state.isEvaluating()"
                    >
                      @if (state.isEvaluating()) {
                        Calculando resultados...
                      } @else {
                        Concluir Avaliação e Ver Resultados →
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        }
      </main>
    </div>
  `,
})
export class Assessment implements OnInit {
  protected readonly session = inject(AuthSessionService);
  protected readonly state = inject(AssessmentStateService);
  private readonly router = inject(Router);

  public ngOnInit(): void {
    this.state.loadDraft().subscribe({
      error: () => {
        // Erro já registrado de forma reativa no state
      },
    });
  }

  public retryLoad(): void {
    this.state.loadDraft().subscribe({ error: () => undefined });
  }

  public onStepSelect(step: number): void {
    this.state.setStep(step);
  }

  public onSaveSection(
    section: AssessmentSection,
    data: BodyAssessmentDto | HealthAssessmentDto | RoutineAssessmentDto | NutritionAssessmentDto,
  ): void {
    this.state.saveSection(section, data).subscribe({
      next: () => {
        this.state.nextStep();
      },
      error: () => undefined,
    });
  }

  public onEvaluate(): void {
    this.state.evaluate().subscribe({
      next: () => {
        this.router.navigate(['/avaliacao/resultados']);
      },
      error: () => undefined,
    });
  }

  public formatHealthDeclaration(type: string | undefined): string {
    switch (type) {
      case 'none':
        return 'Nenhuma condição conhecida';
      case 'unknown':
        return 'Não sei informar';
      case 'conditions':
        return 'Condições conhecidas selecionadas';
      default:
        return 'Não informado';
    }
  }

  public formatWorkRoutine(type: string | undefined): string {
    switch (type) {
      case 'sedentary':
        return 'Predominantemente sentado';
      case 'lightly_active':
        return 'Em pé / movimentação leve';
      case 'moderately_active':
        return 'Movimentação constante';
      case 'intense':
        return 'Trabalho pesado';
      default:
        return 'Não informado';
    }
  }

  public formatCookingHabit(type: string | undefined): string {
    switch (type) {
      case 'cooks_at_home':
        return 'Cozinha em casa';
      case 'restaurant':
        return 'Restaurante';
      case 'delivery':
        return 'Delivery';
      case 'combination':
        return 'Misto';
      default:
        return 'Não informado';
    }
  }
}
