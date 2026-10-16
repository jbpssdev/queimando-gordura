import { Component, effect, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { calculateAge, parseBrazilianNumber } from '../../../../core/assessment/assessment-helpers';
import type {
  BiologicalSex,
  BodyAssessmentDto,
  ScaleType,
} from '../../../../core/assessment/assessment.model';

@Component({
  selector: 'app-step-body',
  imports: [ReactiveFormsModule, HlmCardImports, HlmInput, HlmLabel, HlmButton, HlmAlertImports],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
      <div hlmCard class="p-6 sm:p-8">
        <div class="border-b border-border pb-4 mb-6">
          <span
            class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary"
          >
            Etapa 1 de 5
          </span>
          <h2 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl mt-2">
            Informações Corporais
          </h2>
          <p class="text-sm text-muted-foreground mt-1">
            Preencha seus dados físicos fundamentais. O Queimando Gordura utiliza essas informações
            para estimativas de gasto energético de forma individualizada.
          </p>
        </div>

        <div class="space-y-6">
          <!-- Data de Nascimento & Idade mínima -->
          <div class="space-y-2">
            <label hlmLabel for="birthDate" class="text-sm font-medium text-foreground">
              Data de nascimento <span class="text-destructive">*</span>
            </label>
            <input
              hlmInput
              id="birthDate"
              type="date"
              formControlName="birthDate"
              class="w-full sm:max-w-xs"
              (input)="onBirthDateChange()"
            />

            @if (calculatedAge() !== null) {
              <div
                class="flex items-center gap-2 text-xs font-medium"
                [class.text-emerald-700]="calculatedAge()! >= 18"
                [class.dark:text-emerald-400]="calculatedAge()! >= 18"
                [class.text-destructive]="calculatedAge()! < 18"
              >
                @if (calculatedAge()! >= 18) {
                  <span>✓ Idade calculada: {{ calculatedAge() }} anos.</span>
                } @else {
                  <span
                    >A idade mínima para participar é de 18 anos (idade calculada:
                    {{ calculatedAge() }} anos).</span
                  >
                }
              </div>
            }

            @if (form.controls.birthDate.touched && form.controls.birthDate.invalid) {
              <p class="text-xs text-destructive">
                Informe uma data de nascimento válida indicando 18 anos ou mais.
              </p>
            }
          </div>

          <!-- Sexo Biológico para Equação Metabólica -->
          <div class="space-y-2">
            <span class="block text-sm font-medium text-foreground">
              Informação biológica para fórmula metabólica
            </span>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Equações científicas consolidadas (Harris-Benedict / Mifflin-St Jeor) utilizam o sexo
              biológico atribuído ao nascer para estimar a taxa metabólica basal. Você tem a opção
              de não informar; nesse caso, cálculos metabólicos específicos não serão gerados.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <label
                class="flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.biologicalSex.value === 'female'"
                [class.bg-primary/5]="form.controls.biologicalSex.value === 'female'"
                [class.border-border]="form.controls.biologicalSex.value !== 'female'"
              >
                <input
                  type="radio"
                  name="biologicalSex"
                  value="female"
                  formControlName="biologicalSex"
                  class="size-4 text-primary"
                />
                <span class="font-medium text-foreground">Feminino</span>
              </label>

              <label
                class="flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.biologicalSex.value === 'male'"
                [class.bg-primary/5]="form.controls.biologicalSex.value === 'male'"
                [class.border-border]="form.controls.biologicalSex.value !== 'male'"
              >
                <input
                  type="radio"
                  name="biologicalSex"
                  value="male"
                  formControlName="biologicalSex"
                  class="size-4 text-primary"
                />
                <span class="font-medium text-foreground">Masculino</span>
              </label>

              <label
                class="flex items-center gap-2.5 rounded-lg border p-3 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.biologicalSex.value === 'uninformed'"
                [class.bg-primary/5]="form.controls.biologicalSex.value === 'uninformed'"
                [class.border-border]="form.controls.biologicalSex.value !== 'uninformed'"
              >
                <input
                  type="radio"
                  name="biologicalSex"
                  value="uninformed"
                  formControlName="biologicalSex"
                  class="size-4 text-primary"
                />
                <span class="font-medium text-foreground">Prefiro não informar</span>
              </label>
            </div>

            @if (form.controls.biologicalSex.value === 'uninformed') {
              <p class="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Nota: com essa escolha, a Taxa Metabólica Basal (TMB) não será estimada.
              </p>
            }
          </div>

          <!-- Altura e Peso Atual (Campos Essenciais com suporte a formato BR) -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label hlmLabel for="heightCm" class="text-sm font-medium text-foreground">
                Altura (em cm) <span class="text-destructive">*</span>
              </label>
              <input
                hlmInput
                id="heightCm"
                type="text"
                placeholder="Ex.: 175"
                formControlName="heightCm"
                class="w-full"
              />
              <p class="text-[11px] text-muted-foreground">Exemplo: 175 para 1 metro e 75 cm.</p>
              @if (form.controls.heightCm.touched && form.controls.heightCm.invalid) {
                <p class="text-xs text-destructive">
                  Informe uma altura válida em centímetros (ex.: 170).
                </p>
              }
            </div>

            <div class="space-y-2">
              <label hlmLabel for="currentWeightKg" class="text-sm font-medium text-foreground">
                Peso atual (em kg) <span class="text-destructive">*</span>
              </label>
              <input
                hlmInput
                id="currentWeightKg"
                type="text"
                placeholder="Ex.: 82,5"
                formControlName="currentWeightKg"
                class="w-full"
              />
              <p class="text-[11px] text-muted-foreground">Suporta vírgula decimal (ex.: 82,5).</p>
              @if (form.controls.currentWeightKg.touched && form.controls.currentWeightKg.invalid) {
                <p class="text-xs text-destructive">
                  Informe um peso atual válido em kg (ex.: 80,5).
                </p>
              }
            </div>
          </div>

          <!-- Tipo de Balança -->
          <div class="space-y-3 pt-2">
            <span class="block text-sm font-medium text-foreground">
              Qual tipo de balança você utiliza? <span class="text-destructive">*</span>
            </span>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                class="flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.scaleType.value === 'standard'"
                [class.bg-primary/5]="form.controls.scaleType.value === 'standard'"
                [class.border-border]="form.controls.scaleType.value !== 'standard'"
              >
                <input
                  type="radio"
                  name="scaleType"
                  value="standard"
                  formControlName="scaleType"
                  class="size-4 text-primary mt-0.5"
                />
                <div>
                  <span class="font-semibold text-foreground block">Balança comum</span>
                  <span class="text-xs text-muted-foreground mt-0.5 block">
                    Mede apenas o peso corporal total.
                  </span>
                </div>
              </label>

              <label
                class="flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer text-sm transition-colors"
                [class.border-primary]="form.controls.scaleType.value === 'bioimpedance'"
                [class.bg-primary/5]="form.controls.scaleType.value === 'bioimpedance'"
                [class.border-border]="form.controls.scaleType.value !== 'bioimpedance'"
              >
                <input
                  type="radio"
                  name="scaleType"
                  value="bioimpedance"
                  formControlName="scaleType"
                  class="size-4 text-primary mt-0.5"
                />
                <div>
                  <span class="font-semibold text-foreground block">Balança de bioimpedância</span>
                  <span class="text-xs text-muted-foreground mt-0.5 block">
                    Informa estimativas de gordura, massa muscular e água.
                  </span>
                </div>
              </label>
            </div>
          </div>

          <!-- Campos condicionais da Bioimpedância -->
          @if (form.controls.scaleType.value === 'bioimpedance') {
            <div class="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-4">
              <div class="flex items-center gap-2">
                <span class="text-xs font-semibold text-primary uppercase tracking-wide">
                  Medições da Balança de Bioimpedância (Opcionais)
                </span>
              </div>
              <p class="text-xs text-muted-foreground leading-relaxed">
                Diferentes aparelhos utilizam métodos e escalas variados. Estas medidas são
                estimativas complementares de acompanhamento e não diagnósticos clínicos exatos.
              </p>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div class="space-y-1.5">
                  <label
                    hlmLabel
                    for="bodyFatPercentage"
                    class="text-xs font-medium text-foreground"
                  >
                    Gordura corporal (%):
                  </label>
                  <input
                    hlmInput
                    id="bodyFatPercentage"
                    type="text"
                    placeholder="Ex.: 24,5"
                    formControlName="bodyFatPercentage"
                    class="w-full bg-background"
                  />
                </div>

                <div class="space-y-1.5">
                  <label hlmLabel for="muscleMassKg" class="text-xs font-medium text-foreground">
                    Massa muscular (em kg):
                  </label>
                  <input
                    hlmInput
                    id="muscleMassKg"
                    type="text"
                    placeholder="Ex.: 32,0"
                    formControlName="muscleMassKg"
                    class="w-full bg-background"
                  />
                </div>

                <div class="space-y-1.5">
                  <label
                    hlmLabel
                    for="bodyWaterPercentage"
                    class="text-xs font-medium text-foreground"
                  >
                    Água corporal (%):
                  </label>
                  <input
                    hlmInput
                    id="bodyWaterPercentage"
                    type="text"
                    placeholder="Ex.: 55,0"
                    formControlName="bodyWaterPercentage"
                    class="w-full bg-background"
                  />
                </div>

                <div class="space-y-1.5">
                  <label
                    hlmLabel
                    for="visceralFatLevel"
                    class="text-xs font-medium text-foreground"
                  >
                    Gordura visceral (escala do aparelho):
                  </label>
                  <input
                    hlmInput
                    id="visceralFatLevel"
                    type="text"
                    placeholder="Ex.: 7"
                    formControlName="visceralFatLevel"
                    class="w-full bg-background"
                  />
                </div>
              </div>
            </div>
          }

          <!-- Medidas Opcionais e Peso Desejado -->
          <div class="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
            <h3 class="text-sm font-semibold text-foreground">Medidas Opcionais e Meta Pessoal</h3>
            <p class="text-xs text-muted-foreground leading-relaxed">
              Você pode preencher essas medidas agora ou adicioná-las posteriormente. O peso
              desejado é uma referência pessoal definida por você, sem imposições clínicas de peso
              ideal.
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-1.5">
                <label hlmLabel for="targetWeightKg" class="text-xs font-medium text-foreground">
                  Peso desejado (kg - opcional):
                </label>
                <input
                  hlmInput
                  id="targetWeightKg"
                  type="text"
                  placeholder="Ex.: 75,0"
                  formControlName="targetWeightKg"
                  class="w-full bg-background"
                />
              </div>

              <div class="space-y-1.5">
                <label
                  hlmLabel
                  for="waistCircumferenceCm"
                  class="text-xs font-medium text-foreground"
                >
                  Circunferência abdominal (cm - opcional):
                </label>
                <input
                  hlmInput
                  id="waistCircumferenceCm"
                  type="text"
                  placeholder="Ex.: 88"
                  formControlName="waistCircumferenceCm"
                  class="w-full bg-background"
                />
              </div>

              <div class="space-y-1.5">
                <label
                  hlmLabel
                  for="neckCircumferenceCm"
                  class="text-xs font-medium text-foreground"
                >
                  Circunferência do pescoço (cm - opcional):
                </label>
                <input
                  hlmInput
                  id="neckCircumferenceCm"
                  type="text"
                  placeholder="Ex.: 38"
                  formControlName="neckCircumferenceCm"
                  class="w-full bg-background"
                />
              </div>

              <div class="space-y-1.5">
                <label
                  hlmLabel
                  for="hipCircumferenceCm"
                  class="text-xs font-medium text-foreground"
                >
                  Circunferência do quadril (cm - opcional):
                </label>
                <input
                  hlmInput
                  id="hipCircumferenceCm"
                  type="text"
                  placeholder="Ex.: 102"
                  formControlName="hipCircumferenceCm"
                  class="w-full bg-background"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Botões de Ação da Etapa -->
        @if (form.hasError('invalidOptional')) {
          <p role="alert" class="text-sm text-destructive">
            Revise as medidas opcionais: informe valores numéricos nas unidades indicadas ou deixe o
            campo vazio.
          </p>
        }
        <div
          class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-6"
        >
          <span class="text-xs text-muted-foreground"> * Campos obrigatórios para a Etapa 1 </span>
          <div class="flex gap-3 w-full sm:w-auto">
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
                Salvar e Avançar para Saúde →
              }
            </button>
          </div>
        </div>
      </div>
    </form>
  `,
})
export class StepBody {
  public readonly initialData = input<BodyAssessmentDto | null>(null);
  public readonly isSaving = input<boolean>(false);
  public readonly saveSection = output<BodyAssessmentDto>();

  public readonly calculatedAge = signal<number | null>(null);

  public readonly form = new FormGroup(
    {
      birthDate: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          (control) => {
            const age = calculateAge(control.value);
            if (age === null || age < 18 || age > 120) {
              return { minimumAge: true };
            }
            return null;
          },
        ],
      }),
      biologicalSex: new FormControl<BiologicalSex>('female', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      heightCm: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          (control) => {
            const num = parseBrazilianNumber(control.value);
            if (num === null || num < 50 || num > 250) {
              return { invalidHeight: true };
            }
            return null;
          },
        ],
      }),
      currentWeightKg: new FormControl<string>('', {
        nonNullable: true,
        validators: [
          Validators.required,
          (control) => {
            const num = parseBrazilianNumber(control.value);
            if (num === null || num < 20 || num > 400) {
              return { invalidWeight: true };
            }
            return null;
          },
        ],
      }),
      scaleType: new FormControl<ScaleType>('standard', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      targetWeightKg: new FormControl<string>(''),
      waistCircumferenceCm: new FormControl<string>(''),
      neckCircumferenceCm: new FormControl<string>(''),
      hipCircumferenceCm: new FormControl<string>(''),
      bodyFatPercentage: new FormControl<string>(''),
      muscleMassKg: new FormControl<string>(''),
      bodyWaterPercentage: new FormControl<string>(''),
      visceralFatLevel: new FormControl<string>(''),
    },
    {
      validators: (control) => {
        const values = control.getRawValue();
        const ranges: [string, number, number][] = [
          ['targetWeightKg', 20, 400],
          ['waistCircumferenceCm', 30, 250],
          ['neckCircumferenceCm', 15, 80],
          ['hipCircumferenceCm', 30, 250],
        ];
        if (values.scaleType === 'bioimpedance')
          ranges.push(
            ['bodyFatPercentage', 3, 70],
            ['muscleMassKg', 5, 300],
            ['bodyWaterPercentage', 20, 85],
            ['visceralFatLevel', 1, 30],
          );
        for (const [key, min, max] of ranges) {
          const value = values[key];
          if (value === '' || value === null || value === undefined) continue;
          const number = parseBrazilianNumber(value);
          if (
            number === null ||
            number < min ||
            number > max ||
            (key === 'visceralFatLevel' && !Number.isInteger(number)) ||
            (key === 'muscleMassKg' &&
              number >= (parseBrazilianNumber(values.currentWeightKg) ?? 0))
          )
            return { invalidOptional: true };
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
            birthDate: data.birthDate || '',
            biologicalSex: data.biologicalSex || 'female',
            heightCm: data.heightCm ? String(data.heightCm) : '',
            currentWeightKg: data.currentWeightKg
              ? String(data.currentWeightKg).replace('.', ',')
              : '',
            scaleType: data.scaleType || 'standard',
            targetWeightKg: data.targetWeightKg
              ? String(data.targetWeightKg).replace('.', ',')
              : '',
            waistCircumferenceCm: data.waistCircumferenceCm
              ? String(data.waistCircumferenceCm).replace('.', ',')
              : '',
            neckCircumferenceCm: data.neckCircumferenceCm
              ? String(data.neckCircumferenceCm).replace('.', ',')
              : '',
            hipCircumferenceCm: data.hipCircumferenceCm
              ? String(data.hipCircumferenceCm).replace('.', ',')
              : '',
            bodyFatPercentage: data.bodyFatPercentage
              ? String(data.bodyFatPercentage).replace('.', ',')
              : '',
            muscleMassKg: data.muscleMassKg ? String(data.muscleMassKg).replace('.', ',') : '',
            bodyWaterPercentage: data.bodyWaterPercentage
              ? String(data.bodyWaterPercentage).replace('.', ',')
              : '',
            visceralFatLevel: data.visceralFatLevel ? String(data.visceralFatLevel) : '',
          },
          { emitEvent: false },
        );
        this.onBirthDateChange();
      }
    });
  }

  public onBirthDateChange(): void {
    const val = this.form.controls.birthDate.value;
    this.calculatedAge.set(calculateAge(val));
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const dto: BodyAssessmentDto = {
      birthDate: raw.birthDate,
      biologicalSex: raw.biologicalSex,
      heightCm: parseBrazilianNumber(raw.heightCm) ?? 0,
      currentWeightKg: parseBrazilianNumber(raw.currentWeightKg) ?? 0,
      scaleType: raw.scaleType,
      targetWeightKg: parseBrazilianNumber(raw.targetWeightKg),
      waistCircumferenceCm: parseBrazilianNumber(raw.waistCircumferenceCm),
      neckCircumferenceCm: parseBrazilianNumber(raw.neckCircumferenceCm),
      hipCircumferenceCm: parseBrazilianNumber(raw.hipCircumferenceCm),
      bodyFatPercentage: parseBrazilianNumber(raw.bodyFatPercentage),
      muscleMassKg: parseBrazilianNumber(raw.muscleMassKg),
      bodyWaterPercentage: parseBrazilianNumber(raw.bodyWaterPercentage),
      visceralFatLevel: parseBrazilianNumber(raw.visceralFatLevel),
    };

    this.saveSection.emit(dto);
  }
}
