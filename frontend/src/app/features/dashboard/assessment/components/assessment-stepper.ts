import { Component, input, output } from '@angular/core';

export interface StepItem {
  number: number;
  title: string;
  shortTitle: string;
}

@Component({
  selector: 'app-assessment-stepper',
  template: `
    <nav aria-label="Progresso da avaliação" class="w-full">
      <!-- Barra de progresso visual percentual -->
      <div class="mb-4 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>Etapa {{ currentStep() }} de {{ totalSteps }}</span>
        <span>{{ progressPercentage() }}% concluído</span>
      </div>

      <div
        class="h-2 w-full overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        [attr.aria-valuenow]="progressPercentage()"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div
          class="h-full bg-primary transition-all duration-300 ease-out"
          [style.width.%]="progressPercentage()"
        ></div>
      </div>

      <!-- Lista de etapas (Desktop / Tablet) -->
      <ol class="mt-4 hidden sm:grid grid-cols-5 gap-2 text-center">
        @for (step of steps; track step.number) {
          <li>
            <button
              type="button"
              (click)="stepClick.emit(step.number)"
              [disabled]="step.number > maxVisitedStep()"
              class="w-full text-left p-2 rounded-lg transition-colors border text-xs"
              [class.border-primary]="step.number === currentStep()"
              [class.bg-primary/5]="step.number === currentStep()"
              [class.border-border]="step.number !== currentStep()"
              [class.opacity-50]="step.number > maxVisitedStep()"
              [class.cursor-not-allowed]="step.number > maxVisitedStep()"
            >
              <div
                class="flex items-center gap-1.5 font-semibold"
                [class.text-primary]="step.number === currentStep()"
                [class.text-foreground]="step.number < currentStep()"
                [class.text-muted-foreground]="step.number > currentStep()"
              >
                <span
                  class="flex size-5 items-center justify-center rounded-full text-[10px] font-bold"
                  [class.bg-primary]="step.number === currentStep()"
                  [class.text-primary-foreground]="step.number === currentStep()"
                  [class.bg-secondary]="step.number !== currentStep()"
                  [class.text-secondary-foreground]="step.number !== currentStep()"
                >
                  @if (step.number < currentStep()) {
                    ✓
                  } @else {
                    {{ step.number }}
                  }
                </span>
                <span class="truncate">{{ step.title }}</span>
              </div>
            </button>
          </li>
        }
      </ol>

      <!-- Indicador simplificado para mobile -->
      <div
        class="mt-3 flex sm:hidden items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-xs"
      >
        <span class="font-medium text-foreground">
          {{ getStepTitle(currentStep()) }}
        </span>
        <span class="text-muted-foreground font-semibold">
          Etapa {{ currentStep() }}/{{ totalSteps }}
        </span>
      </div>
    </nav>
  `,
})
export class AssessmentStepper {
  public readonly currentStep = input.required<number>();
  public readonly maxVisitedStep = input<number>(5);
  public readonly stepClick = output<number>();

  public readonly totalSteps = 5;

  public readonly steps: StepItem[] = [
    { number: 1, title: 'Corpo', shortTitle: 'Corpo' },
    { number: 2, title: 'Saúde', shortTitle: 'Saúde' },
    { number: 3, title: 'Rotina', shortTitle: 'Rotina' },
    { number: 4, title: 'Alimentação', shortTitle: 'Alimentação' },
    { number: 5, title: 'Conclusão', shortTitle: 'Conclusão' },
  ];

  public progressPercentage(): number {
    return Math.round(((this.currentStep() - 1) / (this.totalSteps - 1)) * 100);
  }

  public getStepTitle(stepNumber: number): string {
    const found = this.steps.find((s) => s.number === stepNumber);
    return found ? found.title : '';
  }
}
