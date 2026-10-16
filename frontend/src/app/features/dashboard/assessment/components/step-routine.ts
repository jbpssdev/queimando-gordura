import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmButton } from '@spartan-ng/helm/button';
import { parseBrazilianNumber } from '../../../../core/assessment/assessment-helpers';
import type {
  DailyMovementLevel,
  ExerciseIntensity,
  RoutineAssessmentDto,
  WorkRoutine,
} from '../../../../core/assessment/assessment.model';

@Component({
  selector: 'app-step-routine',
  imports: [ReactiveFormsModule, HlmCardImports, HlmInput, HlmLabel, HlmButton],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
      <div hlmCard class="p-6 sm:p-8">
        <div class="border-b border-border pb-4 mb-6">
          <span
            class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
          >
            Etapa 3 de 5
          </span>
          <h2 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl mt-2">
            Rotina e Atividade Física
          </h2>
          <p class="text-sm text-muted-foreground mt-1">
            Compreender seus níveis habituais de movimentação diária ajuda a estimar seu gasto
            calórico total com mais fidelidade.
          </p>
        </div>

        <div class="space-y-6">
          <!-- Tipo de Rotina Profissional -->
          <div class="space-y-3">
            <span class="block text-sm font-medium text-foreground">
              Como é sua rotina profissional habitual? <span class="text-destructive">*</span>
            </span>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                class="flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.workRoutine.value === 'sedentary'"
                [class.bg-primary/5]="form.controls.workRoutine.value === 'sedentary'"
                [class.border-border]="form.controls.workRoutine.value !== 'sedentary'"
              >
                <input
                  type="radio"
                  name="workRoutine"
                  value="sedentary"
                  formControlName="workRoutine"
                  class="size-4 text-primary mt-0.5"
                />
                <div>
                  <strong class="text-foreground block">Predominantemente sentado</strong>
                  <span class="text-xs text-muted-foreground mt-0.5 block">
                    Escritório, computador, motorista, estudos.
                  </span>
                </div>
              </label>

              <label
                class="flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.workRoutine.value === 'lightly_active'"
                [class.bg-primary/5]="form.controls.workRoutine.value === 'lightly_active'"
                [class.border-border]="form.controls.workRoutine.value !== 'lightly_active'"
              >
                <input
                  type="radio"
                  name="workRoutine"
                  value="lightly_active"
                  formControlName="workRoutine"
                  class="size-4 text-primary mt-0.5"
                />
                <div>
                  <strong class="text-foreground block">Em pé com movimentação leve</strong>
                  <span class="text-xs text-muted-foreground mt-0.5 block">
                    Comércio, atendimento, recepção, laboratório.
                  </span>
                </div>
              </label>

              <label
                class="flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.workRoutine.value === 'moderately_active'"
                [class.bg-primary/5]="form.controls.workRoutine.value === 'moderately_active'"
                [class.border-border]="form.controls.workRoutine.value !== 'moderately_active'"
              >
                <input
                  type="radio"
                  name="workRoutine"
                  value="moderately_active"
                  formControlName="workRoutine"
                  class="size-4 text-primary mt-0.5"
                />
                <div>
                  <strong class="text-foreground block">Movimentação ativa constante</strong>
                  <span class="text-xs text-muted-foreground mt-0.5 block">
                    Garçom, entregas a pé, enfermagem, estoquista.
                  </span>
                </div>
              </label>

              <label
                class="flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.workRoutine.value === 'intense'"
                [class.bg-primary/5]="form.controls.workRoutine.value === 'intense'"
                [class.border-border]="form.controls.workRoutine.value !== 'intense'"
              >
                <input
                  type="radio"
                  name="workRoutine"
                  value="intense"
                  formControlName="workRoutine"
                  class="size-4 text-primary mt-0.5"
                />
                <div>
                  <strong class="text-foreground block">Trabalho físico pesado</strong>
                  <span class="text-xs text-muted-foreground mt-0.5 block">
                    Construção civil, carga e descarga, agricultura.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <!-- Horas Sentado e Nível de Movimentação -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label hlmLabel for="sittingHoursPerDay" class="text-sm font-medium text-foreground">
                Horas por dia sentado (aproximado) <span class="text-destructive">*</span>
              </label>
              <input
                hlmInput
                id="sittingHoursPerDay"
                type="number"
                min="0"
                max="24"
                placeholder="Ex.: 8"
                formControlName="sittingHoursPerDay"
                class="w-full"
              />
              <p class="text-[11px] text-muted-foreground">
                Tempo total somando trabalho, estudos e descanso.
              </p>
            </div>

            <div class="space-y-2">
              <span class="block text-sm font-medium text-foreground">
                Movimentação fora dos exercícios <span class="text-destructive">*</span>
              </span>
              <div class="grid grid-cols-3 gap-2 pt-1">
                <label
                  class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.dailyMovementLevel.value === 'low'"
                  [class.bg-primary/5]="form.controls.dailyMovementLevel.value === 'low'"
                  [class.border-border]="form.controls.dailyMovementLevel.value !== 'low'"
                >
                  <input
                    type="radio"
                    name="dailyMovementLevel"
                    value="low"
                    formControlName="dailyMovementLevel"
                    class="sr-only"
                  />
                  <span>Baixa</span>
                </label>
                <label
                  class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.dailyMovementLevel.value === 'moderate'"
                  [class.bg-primary/5]="form.controls.dailyMovementLevel.value === 'moderate'"
                  [class.border-border]="form.controls.dailyMovementLevel.value !== 'moderate'"
                >
                  <input
                    type="radio"
                    name="dailyMovementLevel"
                    value="moderate"
                    formControlName="dailyMovementLevel"
                    class="sr-only"
                  />
                  <span>Moderada</span>
                </label>
                <label
                  class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.dailyMovementLevel.value === 'high'"
                  [class.bg-primary/5]="form.controls.dailyMovementLevel.value === 'high'"
                  [class.border-border]="form.controls.dailyMovementLevel.value !== 'high'"
                >
                  <input
                    type="radio"
                    name="dailyMovementLevel"
                    value="high"
                    formControlName="dailyMovementLevel"
                    class="sr-only"
                  />
                  <span>Alta</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Passos Diários (Opcional com dica de Google Fit) -->
          <div class="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
            <div>
              <h3 class="text-sm font-semibold text-foreground">
                Contagem Diária de Passos (Opcional)
              </h3>
              <p class="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Você pode registrar sua média caso use algum aplicativo como Google Fit, Apple Saúde
                ou relógio inteligente.
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div class="space-y-1.5">
                <label hlmLabel for="dailySteps" class="text-xs font-medium text-foreground">
                  Média diária de passos:
                </label>
                <input
                  hlmInput
                  id="dailySteps"
                  type="number"
                  placeholder="Ex.: 7500"
                  formControlName="dailySteps"
                  class="w-full bg-background"
                />
              </div>

              <div class="space-y-1.5">
                <label hlmLabel for="stepsSource" class="text-xs font-medium text-foreground">
                  Origem da medição:
                </label>
                <select
                  hlmInput
                  id="stepsSource"
                  formControlName="stepsSource"
                  class="w-full bg-background"
                >
                  <option value="">Não informado</option>
                  <option value="phone">Celular</option>
                  <option value="smartwatch">Relógio inteligente</option>
                  <option value="estimate">Estimativa</option>
                  <option value="unknown">Não sei</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Prática de Musculação / Treinamento Resistido -->
          <div class="rounded-xl border border-border p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <strong class="text-sm font-semibold text-foreground block">
                  Pratica musculação ou treinamento de força?
                </strong>
                <span class="text-xs text-muted-foreground">
                  Não é obrigatório praticar exercícios para participar.
                </span>
              </div>
              <div class="flex gap-3">
                <label class="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="practicesStrengthTraining"
                    [value]="false"
                    formControlName="practicesStrengthTraining"
                    class="size-4 text-primary"
                  />
                  <span>Não</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="practicesStrengthTraining"
                    [value]="true"
                    formControlName="practicesStrengthTraining"
                    class="size-4 text-primary"
                  />
                  <span>Sim</span>
                </label>
              </div>
            </div>

            @if (form.controls.practicesStrengthTraining.value) {
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
                <div class="space-y-1">
                  <label
                    hlmLabel
                    for="strengthDaysPerWeek"
                    class="text-xs font-medium text-foreground"
                  >
                    Dias por semana (1 a 7):
                  </label>
                  <input
                    hlmInput
                    id="strengthDaysPerWeek"
                    type="number"
                    min="1"
                    max="7"
                    placeholder="Ex.: 3"
                    formControlName="strengthDaysPerWeek"
                    class="w-full"
                  />
                </div>

                <div class="space-y-1">
                  <label
                    hlmLabel
                    for="strengthMinutesPerSession"
                    class="text-xs font-medium text-foreground"
                  >
                    Duração média (minutos):
                  </label>
                  <input
                    hlmInput
                    id="strengthMinutesPerSession"
                    type="number"
                    min="15"
                    max="180"
                    placeholder="Ex.: 50"
                    formControlName="strengthMinutesPerSession"
                    class="w-full"
                  />
                </div>

                <div class="space-y-1">
                  <span class="block text-xs font-medium text-foreground"
                    >Intensidade habitual:</span
                  >
                  <div class="grid grid-cols-3 gap-1 pt-1">
                    <label
                      class="flex items-center justify-center p-1.5 rounded border text-[11px] cursor-pointer text-center"
                      [class.border-primary]="form.controls.strengthIntensity.value === 'light'"
                      [class.bg-primary/5]="form.controls.strengthIntensity.value === 'light'"
                    >
                      <input
                        type="radio"
                        name="strengthIntensity"
                        value="light"
                        formControlName="strengthIntensity"
                        class="sr-only"
                      />
                      <span>Leve</span>
                    </label>
                    <label
                      class="flex items-center justify-center p-1.5 rounded border text-[11px] cursor-pointer text-center"
                      [class.border-primary]="form.controls.strengthIntensity.value === 'moderate'"
                      [class.bg-primary/5]="form.controls.strengthIntensity.value === 'moderate'"
                    >
                      <input
                        type="radio"
                        name="strengthIntensity"
                        value="moderate"
                        formControlName="strengthIntensity"
                        class="sr-only"
                      />
                      <span>Moderada</span>
                    </label>
                    <label
                      class="flex items-center justify-center p-1.5 rounded border text-[11px] cursor-pointer text-center"
                      [class.border-primary]="form.controls.strengthIntensity.value === 'intense'"
                      [class.bg-primary/5]="form.controls.strengthIntensity.value === 'intense'"
                    >
                      <input
                        type="radio"
                        name="strengthIntensity"
                        value="intense"
                        formControlName="strengthIntensity"
                        class="sr-only"
                      />
                      <span>Intensa</span>
                    </label>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Prática de Exercícios Aeróbicos / Cardio -->
          <div class="rounded-xl border border-border p-5 space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <strong class="text-sm font-semibold text-foreground block">
                  Pratica atividades aeróbicas / cardio?
                </strong>
                <span class="text-xs text-muted-foreground">
                  Caminhada rápida, corrida, ciclismo, natação ou dança.
                </span>
              </div>
              <div class="flex gap-3">
                <label class="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="practicesCardio"
                    [value]="false"
                    formControlName="practicesCardio"
                    class="size-4 text-primary"
                  />
                  <span>Não</span>
                </label>
                <label class="flex items-center gap-1.5 cursor-pointer text-xs font-medium">
                  <input
                    type="radio"
                    name="practicesCardio"
                    [value]="true"
                    formControlName="practicesCardio"
                    class="size-4 text-primary"
                  />
                  <span>Sim</span>
                </label>
              </div>
            </div>

            @if (form.controls.practicesCardio.value) {
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-border">
                <div class="space-y-1">
                  <label
                    hlmLabel
                    for="cardioDaysPerWeek"
                    class="text-xs font-medium text-foreground"
                  >
                    Dias por semana (1 a 7):
                  </label>
                  <input
                    hlmInput
                    id="cardioDaysPerWeek"
                    type="number"
                    min="1"
                    max="7"
                    placeholder="Ex.: 3"
                    formControlName="cardioDaysPerWeek"
                    class="w-full"
                  />
                </div>

                <div class="space-y-1">
                  <label
                    hlmLabel
                    for="cardioMinutesPerSession"
                    class="text-xs font-medium text-foreground"
                  >
                    Duração média (minutos):
                  </label>
                  <input
                    hlmInput
                    id="cardioMinutesPerSession"
                    type="number"
                    min="10"
                    max="180"
                    placeholder="Ex.: 30"
                    formControlName="cardioMinutesPerSession"
                    class="w-full"
                  />
                </div>

                <div class="space-y-1">
                  <span class="block text-xs font-medium text-foreground"
                    >Intensidade habitual:</span
                  >
                  <div class="grid grid-cols-3 gap-1 pt-1">
                    <label
                      class="flex items-center justify-center p-1.5 rounded border text-[11px] cursor-pointer text-center"
                      [class.border-primary]="form.controls.cardioIntensity.value === 'light'"
                      [class.bg-primary/5]="form.controls.cardioIntensity.value === 'light'"
                    >
                      <input
                        type="radio"
                        name="cardioIntensity"
                        value="light"
                        formControlName="cardioIntensity"
                        class="sr-only"
                      />
                      <span>Leve</span>
                    </label>
                    <label
                      class="flex items-center justify-center p-1.5 rounded border text-[11px] cursor-pointer text-center"
                      [class.border-primary]="form.controls.cardioIntensity.value === 'moderate'"
                      [class.bg-primary/5]="form.controls.cardioIntensity.value === 'moderate'"
                    >
                      <input
                        type="radio"
                        name="cardioIntensity"
                        value="moderate"
                        formControlName="cardioIntensity"
                        class="sr-only"
                      />
                      <span>Moderada</span>
                    </label>
                    <label
                      class="flex items-center justify-center p-1.5 rounded border text-[11px] cursor-pointer text-center"
                      [class.border-primary]="form.controls.cardioIntensity.value === 'intense'"
                      [class.bg-primary/5]="form.controls.cardioIntensity.value === 'intense'"
                    >
                      <input
                        type="radio"
                        name="cardioIntensity"
                        value="intense"
                        formControlName="cardioIntensity"
                        class="sr-only"
                      />
                      <span>Intensa</span>
                    </label>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Iniciante Recente -->
          <label
            class="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-muted/20 cursor-pointer text-xs"
          >
            <input
              type="checkbox"
              formControlName="recentStarter"
              class="size-4 rounded text-primary"
            />
            <span class="text-foreground">
              Comecei a me exercitar recentemente e ainda estou construindo uma rotina regular.
            </span>
          </label>
        </div>

        @if (form.hasError('invalidTraining')) {
          <p role="alert" class="text-sm text-destructive">
            Informe dias de treino (1 a 7), duração (1 a 360 minutos) e intensidade para os
            exercícios selecionados.
          </p>
        }
        <!-- Botões de Ação da Etapa -->
        <div
          class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-6"
        >
          <button
            hlmBtn
            type="button"
            variant="outline"
            (click)="previous.emit()"
            class="w-full sm:w-auto"
          >
            ← Voltar para Condições de Saúde
          </button>
          <button
            hlmBtn
            type="submit"
            variant="default"
            class="w-full sm:w-auto font-semibold"
            [disabled]="form.invalid || isSaving()"
          >
            @if (isSaving()) {
              Salvando...
            } @else {
              Salvar e Avançar para Alimentação →
            }
          </button>
        </div>
      </div>
    </form>
  `,
})
export class StepRoutine {
  public readonly initialData = input<RoutineAssessmentDto | null>(null);
  public readonly isSaving = input<boolean>(false);
  public readonly saveSection = output<RoutineAssessmentDto>();
  public readonly previous = output<void>();

  public readonly form = new FormGroup(
    {
      workRoutine: new FormControl<WorkRoutine>('sedentary', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      sittingHoursPerDay: new FormControl<number>(8, {
        nonNullable: true,
        validators: [Validators.required, Validators.min(0), Validators.max(24)],
      }),
      dailyMovementLevel: new FormControl<DailyMovementLevel>('moderate', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      dailySteps: new FormControl<string>(''),
      stepsSource: new FormControl<string>(''),
      practicesStrengthTraining: new FormControl<boolean>(false, {
        nonNullable: true,
      }),
      strengthDaysPerWeek: new FormControl<number | null>(null),
      strengthMinutesPerSession: new FormControl<number | null>(null),
      strengthIntensity: new FormControl<ExerciseIntensity | null>(null),
      practicesCardio: new FormControl<boolean>(false, {
        nonNullable: true,
      }),
      cardioDaysPerWeek: new FormControl<number | null>(null),
      cardioMinutesPerSession: new FormControl<number | null>(null),
      cardioIntensity: new FormControl<ExerciseIntensity | null>(null),
      recentStarter: new FormControl<boolean>(false, {
        nonNullable: true,
      }),
    },
    {
      validators: (control) => {
        const v = control.getRawValue();
        for (const prefix of ['strength', 'cardio']) {
          if (!(prefix === 'strength' ? v.practicesStrengthTraining : v.practicesCardio)) continue;
          const days = v[prefix + 'DaysPerWeek'];
          const minutes = v[prefix + 'MinutesPerSession'];
          if (
            !Number.isInteger(days) ||
            days < 1 ||
            days > 7 ||
            !Number.isInteger(minutes) ||
            minutes < 1 ||
            minutes > 360 ||
            !v[prefix + 'Intensity']
          )
            return { invalidTraining: true };
        }
        return null;
      },
    },
  );

  constructor() {
    effect(() => {
      const data = this.initialData();
      if (data) {
        this.form.patchValue(
          {
            workRoutine: data.workRoutine || 'sedentary',
            sittingHoursPerDay: data.sittingHoursPerDay ?? 8,
            dailyMovementLevel: data.dailyMovementLevel || 'moderate',
            dailySteps: data.dailySteps ? String(data.dailySteps) : '',
            stepsSource: data.stepsSource || '',
            practicesStrengthTraining: Boolean(data.practicesStrengthTraining),
            strengthDaysPerWeek: data.strengthDaysPerWeek ?? null,
            strengthMinutesPerSession: data.strengthMinutesPerSession ?? null,
            strengthIntensity: data.strengthIntensity ?? null,
            practicesCardio: Boolean(data.practicesCardio),
            cardioDaysPerWeek: data.cardioDaysPerWeek ?? null,
            cardioMinutesPerSession: data.cardioMinutesPerSession ?? null,
            cardioIntensity: data.cardioIntensity ?? null,
            recentStarter: Boolean(data.recentStarter),
          },
          { emitEvent: false },
        );
      }
    });
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const dto: RoutineAssessmentDto = {
      workRoutine: raw.workRoutine,
      sittingHoursPerDay: Number(raw.sittingHoursPerDay),
      dailyMovementLevel: raw.dailyMovementLevel,
      dailySteps: parseBrazilianNumber(raw.dailySteps),
      stepsSource: raw.stepsSource || null,
      practicesStrengthTraining: raw.practicesStrengthTraining,
      strengthDaysPerWeek: raw.practicesStrengthTraining ? raw.strengthDaysPerWeek : null,
      strengthMinutesPerSession: raw.practicesStrengthTraining
        ? raw.strengthMinutesPerSession
        : null,
      strengthIntensity: raw.practicesStrengthTraining ? raw.strengthIntensity : null,
      practicesCardio: raw.practicesCardio,
      cardioDaysPerWeek: raw.practicesCardio ? raw.cardioDaysPerWeek : null,
      cardioMinutesPerSession: raw.practicesCardio ? raw.cardioMinutesPerSession : null,
      cardioIntensity: raw.practicesCardio ? raw.cardioIntensity : null,
      recentStarter: raw.recentStarter,
    };

    this.saveSection.emit(dto);
  }
}
