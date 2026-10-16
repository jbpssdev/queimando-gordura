import { Component, effect, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import type {
  HealthAssessmentDto,
  HealthConditionCategory,
  HealthDeclarationType,
  PregnancyOrLactation,
  WarningSymptom,
} from '../../../../core/assessment/assessment.model';

@Component({
  selector: 'app-step-health',
  imports: [ReactiveFormsModule, HlmCardImports, HlmInput, HlmLabel, HlmButton, HlmAlertImports],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
      <div hlmCard class="p-6 sm:p-8">
        <div class="border-b border-border pb-4 mb-6">
          <span
            class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
          >
            Etapa 2 de 5
          </span>
          <h2 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl mt-2">
            Condições de Saúde e Segurança
          </h2>
          <p class="text-sm text-muted-foreground mt-1">
            Mapeamento preventivo para sua proteção. O Queimando Gordura não realiza diagnósticos
            médicos e preza pela sua integridade física.
          </p>
        </div>

        <div class="space-y-6">
          <!-- Declaração Geral de Condições -->
          <div class="space-y-3">
            <span class="block text-sm font-medium text-foreground">
              Como você descreve seu histórico de saúde conhecido?
              <span class="text-destructive">*</span>
            </span>

            <div class="space-y-2">
              <label
                class="flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.declarationType.value === 'none'"
                [class.bg-primary/5]="form.controls.declarationType.value === 'none'"
                [class.border-border]="form.controls.declarationType.value !== 'none'"
              >
                <input
                  type="radio"
                  name="declarationType"
                  value="none"
                  formControlName="declarationType"
                  (change)="onDeclarationChange('none')"
                  class="size-4 text-primary"
                />
                <span class="font-medium text-foreground">
                  Nenhuma condição crônica ou relevante conhecida
                </span>
              </label>

              <label
                class="flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.declarationType.value === 'unknown'"
                [class.bg-primary/5]="form.controls.declarationType.value === 'unknown'"
                [class.border-border]="form.controls.declarationType.value !== 'unknown'"
              >
                <input
                  type="radio"
                  name="declarationType"
                  value="unknown"
                  formControlName="declarationType"
                  (change)="onDeclarationChange('unknown')"
                  class="size-4 text-primary"
                />
                <span class="font-medium text-foreground"> Não sei informar no momento </span>
              </label>

              <label
                class="flex items-center gap-3 rounded-lg border p-3.5 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.declarationType.value === 'conditions'"
                [class.bg-primary/5]="form.controls.declarationType.value === 'conditions'"
                [class.border-border]="form.controls.declarationType.value !== 'conditions'"
              >
                <input
                  type="radio"
                  name="declarationType"
                  value="conditions"
                  formControlName="declarationType"
                  (change)="onDeclarationChange('conditions')"
                  class="size-4 text-primary"
                />
                <span class="font-medium text-foreground">
                  Possuo uma ou mais condições de saúde diagnosticadas
                </span>
              </label>
            </div>
          </div>

          <!-- Seleção de Categorias de Condições Conhecidas -->
          @if (form.controls.declarationType.value === 'conditions') {
            <div class="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-3">
              <span class="block text-xs font-semibold text-primary uppercase tracking-wide">
                Selecione as categorias que se aplicam a você:
              </span>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                @for (cond of conditionOptions; track cond.id) {
                  <label
                    class="flex items-start gap-2.5 rounded-lg border border-border/80 bg-background p-3 cursor-pointer text-xs transition-colors hover:border-primary/50"
                  >
                    <input
                      type="checkbox"
                      [checked]="hasCondition(cond.id)"
                      (change)="toggleCondition(cond.id)"
                      class="size-4 rounded text-primary mt-0.5"
                    />
                    <div>
                      <strong class="font-semibold text-foreground block">{{ cond.label }}</strong>
                      <span class="text-muted-foreground block text-[11px] mt-0.5">{{
                        cond.description
                      }}</span>
                    </div>
                  </label>
                }
              </div>
            </div>
          }

          <!-- Sintomas de Alerta Cardiovasculares/Urgentes -->
          <div class="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
            <div>
              <h3 class="text-sm font-semibold text-foreground">
                Sintomas de Alerta ao Esforço Físico
              </h3>
              <p class="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                Você já sentiu algum destes sintomas sem causa aparente ou durante atividades
                físicas?
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              @for (sym of symptomOptions; track sym.id) {
                <label
                  class="flex items-start gap-2.5 rounded-lg border border-border bg-background p-3 cursor-pointer text-xs transition-colors hover:border-primary/50"
                >
                  <input
                    type="checkbox"
                    [checked]="hasSymptom(sym.id)"
                    (change)="toggleSymptom(sym.id)"
                    class="size-4 rounded text-primary mt-0.5"
                  />
                  <div>
                    <strong class="font-semibold text-foreground block">{{ sym.label }}</strong>
                    <span class="text-muted-foreground block text-[11px] mt-0.5">{{
                      sym.description
                    }}</span>
                  </div>
                </label>
              }
            </div>

            <!-- Banner urgente se dor no peito ou desmaios forem marcados -->
            @if (hasUrgentSymptoms()) {
              <div
                hlmAlert
                variant="destructive"
                class="border-destructive/40 bg-destructive/10 text-destructive p-4 mt-2"
              >
                <h4 hlmAlertTitle class="text-xs font-bold flex items-center gap-1.5">
                  Atenção Médica Recomendada
                </h4>
                <p hlmAlertDescription class="text-xs leading-relaxed mt-1">
                  Sintomas como dor no peito ou desmaios exigem avaliação médica presencial imediata
                  antes de iniciar qualquer plano de exercícios ou mudanças importantes de rotina.
                  Sua integridade é prioridade absoluta.
                </p>
              </div>
            }
          </div>

          <!-- Medicamentos Contínuos -->
          <div class="space-y-3 pt-1">
            <span class="block text-sm font-medium text-foreground">
              Faz uso contínuo de algum medicamento prescrito?
            </span>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="takesContinuousMedication"
                  [value]="false"
                  formControlName="takesContinuousMedication"
                  class="size-4 text-primary"
                />
                <span class="text-foreground">Não</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="takesContinuousMedication"
                  [value]="true"
                  formControlName="takesContinuousMedication"
                  class="size-4 text-primary"
                />
                <span class="text-foreground">Sim</span>
              </label>
            </div>

            @if (form.controls.takesContinuousMedication.value) {
              <div class="space-y-1.5 pt-1">
                <label
                  hlmLabel
                  for="medicationsDetails"
                  class="text-xs font-medium text-foreground"
                >
                  Nome e finalidade dos medicamentos (opcional):
                </label>
                <input
                  hlmInput
                  id="medicationsDetails"
                  type="text"
                  placeholder="Ex.: Anti-hipertensivo, Levotiroxina..."
                  formControlName="medicationsDetails"
                  class="w-full"
                />
                <p class="text-[11px] text-muted-foreground">
                  Informação estritamente confidencial para seu histórico pessoal.
                </p>
              </div>
            }
          </div>

          <!-- Gravidez / Amamentação -->
          <div class="space-y-3 pt-1">
            <span class="block text-sm font-medium text-foreground">
              Situação atual de gestação ou amamentação:
            </span>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label
                class="flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer text-xs transition-colors"
                [class.border-primary]="form.controls.pregnancyOrLactation.value === 'none'"
                [class.bg-primary/5]="form.controls.pregnancyOrLactation.value === 'none'"
                [class.border-border]="form.controls.pregnancyOrLactation.value !== 'none'"
              >
                <input
                  type="radio"
                  name="pregnancyOrLactation"
                  value="none"
                  formControlName="pregnancyOrLactation"
                  class="size-4 text-primary"
                />
                <span class="text-foreground font-medium">Não se aplica</span>
              </label>

              <label
                class="flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer text-xs transition-colors"
                [class.border-primary]="form.controls.pregnancyOrLactation.value === 'pregnant'"
                [class.bg-primary/5]="form.controls.pregnancyOrLactation.value === 'pregnant'"
                [class.border-border]="form.controls.pregnancyOrLactation.value !== 'pregnant'"
              >
                <input
                  type="radio"
                  name="pregnancyOrLactation"
                  value="pregnant"
                  formControlName="pregnancyOrLactation"
                  class="size-4 text-primary"
                />
                <span class="text-foreground font-medium">Gestante</span>
              </label>

              <label
                class="flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer text-xs transition-colors"
                [class.border-primary]="
                  form.controls.pregnancyOrLactation.value === 'breastfeeding'
                "
                [class.bg-primary/5]="form.controls.pregnancyOrLactation.value === 'breastfeeding'"
                [class.border-border]="form.controls.pregnancyOrLactation.value !== 'breastfeeding'"
              >
                <input
                  type="radio"
                  name="pregnancyOrLactation"
                  value="breastfeeding"
                  formControlName="pregnancyOrLactation"
                  class="size-4 text-primary"
                />
                <span class="text-foreground font-medium">Lactante (amamentando)</span>
              </label>
            </div>
          </div>

          <!-- Acompanhamento Médico Atual -->
          <div class="space-y-3 pt-1">
            <span class="block text-sm font-medium text-foreground">
              Possui acompanhamento regular com médico ou nutricionista atualmente?
            </span>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="hasMedicalFollowUp"
                  [value]="false"
                  formControlName="hasMedicalFollowUp"
                  class="size-4 text-primary"
                />
                <span class="text-foreground">Não</span>
              </label>

              <label class="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="hasMedicalFollowUp"
                  [value]="true"
                  formControlName="hasMedicalFollowUp"
                  class="size-4 text-primary"
                />
                <span class="text-foreground">Sim</span>
              </label>
            </div>
          </div>
        </div>

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
            ← Voltar para Informações Corporais
          </button>
          <button
            hlmBtn
            type="submit"
            variant="default"
            class="w-full sm:w-auto font-semibold"
            [disabled]="isSaving()"
          >
            @if (isSaving()) {
              Salvando...
            } @else {
              Salvar e Avançar para Rotina →
            }
          </button>
        </div>
      </div>
    </form>
  `,
})
export class StepHealth {
  public readonly initialData = input<HealthAssessmentDto | null>(null);
  public readonly isSaving = input<boolean>(false);
  public readonly saveSection = output<HealthAssessmentDto>();
  public readonly previous = output<void>();

  public readonly selectedConditions = signal<HealthConditionCategory[]>([]);
  public readonly selectedSymptoms = signal<WarningSymptom[]>(['none']);

  public readonly conditionOptions: {
    id: HealthConditionCategory;
    label: string;
    description: string;
  }[] = [
    {
      id: 'cardiovascular',
      label: 'Cardiovascular',
      description: 'Hipertensão, arritmias, histórico cardíaco.',
    },
    {
      id: 'diabetesOrGlycemic',
      label: 'Glicemia / Diabetes',
      description: 'Diabetes tipo 1 ou 2, pré-diabetes, resistência insulínica.',
    },
    {
      id: 'respiratory',
      label: 'Respiratória',
      description: 'Asma importante, bronquite crônica, DPOC.',
    },
    {
      id: 'renal',
      label: 'Renal',
      description: 'Insuficiência renal, cálculo renal recorrente.',
    },
    {
      id: 'hepatic',
      label: 'Hepática',
      description: 'Esteatose hepática, alterações no fígado.',
    },
    {
      id: 'otherConditions',
      label: 'Outras Condições',
      description: 'Condições osteomoleculares, tireoide, etc.',
    },
    {
      id: 'specificSituations',
      label: 'Situação Específica',
      description: 'Casos que necessitam de avaliação individualizada.',
    },
  ];

  public readonly symptomOptions: {
    id: WarningSymptom;
    label: string;
    description: string;
  }[] = [
    {
      id: 'chestPain',
      label: 'Dor ou aperto no peito',
      description: 'Sensação de aperto ou dor torácica durante ou após esforço.',
    },
    {
      id: 'fainting',
      label: 'Desmaios ou perda de sentidos',
      description: 'Tonturas graves com perda temporária de consciência.',
    },
    {
      id: 'disproportionateShortnessOfBreath',
      label: 'Falta de ar desproporcional',
      description: 'Dificuldade para respirar muito acima do esforço realizado.',
    },
    {
      id: 'palpitations',
      label: 'Palpitações cardíacas',
      description: 'Sensação de batimentos descompassados ou acelerados.',
    },
    {
      id: 'none',
      label: 'Nenhum sintoma de alerta',
      description: 'Não apresento desconfortos ou sintomas anormais.',
    },
  ];

  public readonly form = new FormGroup({
    declarationType: new FormControl<HealthDeclarationType>('none', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    takesContinuousMedication: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    medicationsDetails: new FormControl<string>(''),
    pregnancyOrLactation: new FormControl<PregnancyOrLactation>('none', {
      nonNullable: true,
    }),
    hasMedicalFollowUp: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
  });

  constructor() {
    effect(() => {
      const data = this.initialData();
      if (data) {
        this.form.patchValue(
          {
            declarationType: data.declarationType || 'none',
            takesContinuousMedication: Boolean(data.takesContinuousMedication),
            medicationsDetails: data.medicationsDetails || '',
            pregnancyOrLactation: data.pregnancyOrLactation || 'none',
            hasMedicalFollowUp: Boolean(data.hasMedicalFollowUp),
          },
          { emitEvent: false },
        );
        this.selectedConditions.set(data.conditions || []);
        this.selectedSymptoms.set(
          data.warningSymptoms && data.warningSymptoms.length > 0 ? data.warningSymptoms : ['none'],
        );
      }
    });
  }

  public onDeclarationChange(type: HealthDeclarationType): void {
    if (type === 'none' || type === 'unknown') {
      // Limpa condições marcadas para manter exclusividade
      this.selectedConditions.set([]);
    }
  }

  public hasCondition(id: HealthConditionCategory): boolean {
    return this.selectedConditions().includes(id);
  }

  public toggleCondition(id: HealthConditionCategory): void {
    const current = this.selectedConditions();
    if (current.includes(id)) {
      this.selectedConditions.set(current.filter((c) => c !== id));
    } else {
      this.selectedConditions.set([...current, id]);
    }
  }

  public hasSymptom(id: WarningSymptom): boolean {
    return this.selectedSymptoms().includes(id);
  }

  public toggleSymptom(id: WarningSymptom): void {
    if (id === 'none') {
      this.selectedSymptoms.set(['none']);
      return;
    }

    let current = this.selectedSymptoms().filter((s) => s !== 'none');
    if (current.includes(id)) {
      current = current.filter((s) => s !== id);
    } else {
      current.push(id);
    }

    if (current.length === 0) {
      this.selectedSymptoms.set(['none']);
    } else {
      this.selectedSymptoms.set(current);
    }
  }

  public hasUrgentSymptoms(): boolean {
    const symptoms = this.selectedSymptoms();
    return symptoms.includes('chestPain') || symptoms.includes('fainting');
  }

  public onSubmit(): void {
    const raw = this.form.getRawValue();
    const dto: HealthAssessmentDto = {
      declarationType: raw.declarationType,
      conditions: raw.declarationType === 'conditions' ? this.selectedConditions() : [],
      takesContinuousMedication: raw.takesContinuousMedication,
      medicationsDetails: raw.takesContinuousMedication ? raw.medicationsDetails || null : null,
      warningSymptoms: this.selectedSymptoms(),
      pregnancyOrLactation: raw.pregnancyOrLactation,
      hasMedicalFollowUp: raw.hasMedicalFollowUp,
    };

    this.saveSection.emit(dto);
  }
}
