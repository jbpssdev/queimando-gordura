import { Component, effect, input, output, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmButton } from '@spartan-ng/helm/button';
import type {
  AlcoholConsumption,
  CookingHabit,
  MealScheduleRegularity,
  NutritionAssessmentDto,
  SugaryDrinksHabit,
} from '../../../../core/assessment/assessment.model';

@Component({
  selector: 'app-step-nutrition',
  imports: [
    ReactiveFormsModule,
    HlmCardImports,
    HlmInput,
    HlmLabel,
    HlmButton,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-6">
      <div hlmCard class="p-6 sm:p-8">
        <div class="border-b border-border pb-4 mb-6">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
            Etapa 4 de 5
          </span>
          <h2 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl mt-2">
            Hábitos Alimentares e Preferências
          </h2>
          <p class="text-sm text-muted-foreground mt-1">
            Conhecer sua dinâmica diária de alimentação nos permite desenhar estratégias sustentáveis e realistas, sem dietas restritivas artificiais.
          </p>
        </div>

        <div class="space-y-6">
          <!-- Refeições Diárias e Regularidade -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <label hlmLabel for="dailyMealsCount" class="text-sm font-medium text-foreground">
                Quantidade habitual de refeições por dia <span class="text-destructive">*</span>
              </label>
              <input
                hlmInput
                id="dailyMealsCount"
                type="number"
                min="1"
                max="10"
                placeholder="Ex.: 3 ou 4"
                formControlName="dailyMealsCount"
                class="w-full"
              />
              <p class="text-[11px] text-muted-foreground">Somando refeições principais e pequenos lanches.</p>
            </div>

            <div class="space-y-2">
              <span class="block text-sm font-medium text-foreground">
                Regularidade dos horários das refeições <span class="text-destructive">*</span>
              </span>
              <div class="grid grid-cols-3 gap-2 pt-1">
                <label class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.mealScheduleRegularity.value === 'regular'"
                  [class.bg-primary/5]="form.controls.mealScheduleRegularity.value === 'regular'"
                  [class.border-border]="form.controls.mealScheduleRegularity.value !== 'regular'"
                >
                  <input type="radio" name="mealScheduleRegularity" value="regular" formControlName="mealScheduleRegularity" class="sr-only" />
                  <span>Regulares</span>
                </label>
                <label class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.mealScheduleRegularity.value === 'irregular'"
                  [class.bg-primary/5]="form.controls.mealScheduleRegularity.value === 'irregular'"
                  [class.border-border]="form.controls.mealScheduleRegularity.value !== 'irregular'"
                >
                  <input type="radio" name="mealScheduleRegularity" value="irregular" formControlName="mealScheduleRegularity" class="sr-only" />
                  <span>Irregulares</span>
                </label>
                <label class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.mealScheduleRegularity.value === 'variable'"
                  [class.bg-primary/5]="form.controls.mealScheduleRegularity.value === 'variable'"
                  [class.border-border]="form.controls.mealScheduleRegularity.value !== 'variable'"
                >
                  <input type="radio" name="mealScheduleRegularity" value="variable" formControlName="mealScheduleRegularity" class="sr-only" />
                  <span>Variáveis</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Comportamentos e Dinâmica de Horários -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <label class="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-muted/20 cursor-pointer text-xs">
              <input
                type="checkbox"
                formControlName="prolongedFasting"
                class="size-4 rounded text-primary mt-0.5"
              />
              <div>
                <strong class="font-semibold text-foreground block">Longos períodos sem comer</strong>
                <span class="text-muted-foreground block text-[11px] mt-0.5">
                  Costuma passar mais de 6 a 8 horas acordado(a) sem se alimentar.
                </span>
              </div>
            </label>

            <label class="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-muted/20 cursor-pointer text-xs">
              <input
                type="checkbox"
                formControlName="eatsAtDawn"
                class="size-4 rounded text-primary mt-0.5"
              />
              <div>
                <strong class="font-semibold text-foreground block">Alimentação na madrugada</strong>
                <span class="text-muted-foreground block text-[11px] mt-0.5">
                  Costuma acordar para comer ou fazer lanches tarde da noite.
                </span>
              </div>
            </label>
          </div>

          <!-- Como prepara as refeições -->
          <div class="space-y-3 pt-1">
            <span class="block text-sm font-medium text-foreground">
              Como costuma ser a origem e o preparo das suas refeições? <span class="text-destructive">*</span>
            </span>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label class="flex items-start gap-3 rounded-lg border p-3 cursor-pointer text-xs transition-colors"
                [class.border-primary]="form.controls.cookingHabit.value === 'cooks_at_home'"
                [class.bg-primary/5]="form.controls.cookingHabit.value === 'cooks_at_home'"
                [class.border-border]="form.controls.cookingHabit.value !== 'cooks_at_home'"
              >
                <input type="radio" name="cookingHabit" value="cooks_at_home" formControlName="cookingHabit" class="size-4 text-primary mt-0.5" />
                <div>
                  <strong class="text-foreground block font-semibold">Cozinho em casa</strong>
                  <span class="text-muted-foreground text-[11px]">Preparo a maior parte da própria comida.</span>
                </div>
              </label>

              <label class="flex items-start gap-3 rounded-lg border p-3 cursor-pointer text-xs transition-colors"
                [class.border-primary]="form.controls.cookingHabit.value === 'restaurant'"
                [class.bg-primary/5]="form.controls.cookingHabit.value === 'restaurant'"
                [class.border-border]="form.controls.cookingHabit.value !== 'restaurant'"
              >
                <input type="radio" name="cookingHabit" value="restaurant" formControlName="cookingHabit" class="size-4 text-primary mt-0.5" />
                <div>
                  <strong class="text-foreground block font-semibold">Restaurantes / Self-service</strong>
                  <span class="text-muted-foreground text-[11px]">Almoço ou janto fora com frequência.</span>
                </div>
              </label>

              <label class="flex items-start gap-3 rounded-lg border p-3 cursor-pointer text-xs transition-colors"
                [class.border-primary]="form.controls.cookingHabit.value === 'delivery'"
                [class.bg-primary/5]="form.controls.cookingHabit.value === 'delivery'"
                [class.border-border]="form.controls.cookingHabit.value !== 'delivery'"
              >
                <input type="radio" name="cookingHabit" value="delivery" formControlName="cookingHabit" class="size-4 text-primary mt-0.5" />
                <div>
                  <strong class="text-foreground block font-semibold">Delivery / Aplicativos</strong>
                  <span class="text-muted-foreground text-[11px]">Peço comida pronta com regularidade.</span>
                </div>
              </label>

              <label class="flex items-start gap-3 rounded-lg border p-3 cursor-pointer text-xs transition-colors"
                [class.border-primary]="form.controls.cookingHabit.value === 'combination'"
                [class.bg-primary/5]="form.controls.cookingHabit.value === 'combination'"
                [class.border-border]="form.controls.cookingHabit.value !== 'combination'"
              >
                <input type="radio" name="cookingHabit" value="combination" formControlName="cookingHabit" class="size-4 text-primary mt-0.5" />
                <div>
                  <strong class="text-foreground block font-semibold">Combinação de hábitos</strong>
                  <span class="text-muted-foreground text-[11px]">Mistura equilibrada de preparo caseiro e refeições fora.</span>
                </div>
              </label>
            </div>
          </div>

          <!-- Balança Culinária de Cozinha -->
          <label class="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-muted/20 cursor-pointer text-xs">
            <input
              type="checkbox"
              formControlName="hasKitchenScale"
              class="size-4 rounded text-primary mt-0.5"
            />
            <div>
              <strong class="font-semibold text-foreground block">Possuo balança culinária de precisão</strong>
              <span class="text-muted-foreground block text-[11px] mt-0.5">
                Não é obrigatória. Na fase de Adaptação ensinaremos como estimar porções tanto com balança quanto por medidas caseiras visuais.
              </span>
            </div>
          </label>

          <!-- Bebidas Açucaradas e Consumo de Álcool -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div class="space-y-2">
              <span class="block text-sm font-medium text-foreground">
                Consumo de bebidas açucaradas:
              </span>
              <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.sugaryDrinksHabit.value === 'rarely'"
                  [class.bg-primary/5]="form.controls.sugaryDrinksHabit.value === 'rarely'"
                >
                  <input type="radio" name="sugaryDrinksHabit" value="rarely" formControlName="sugaryDrinksHabit" class="sr-only" />
                  <span>Raramente/Nunca</span>
                </label>
                <label class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.sugaryDrinksHabit.value === 'sometimes'"
                  [class.bg-primary/5]="form.controls.sugaryDrinksHabit.value === 'sometimes'"
                >
                  <input type="radio" name="sugaryDrinksHabit" value="sometimes" formControlName="sugaryDrinksHabit" class="sr-only" />
                  <span>Ocasional</span>
                </label>
                <label class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.sugaryDrinksHabit.value === 'daily'"
                  [class.bg-primary/5]="form.controls.sugaryDrinksHabit.value === 'daily'"
                >
                  <input type="radio" name="sugaryDrinksHabit" value="daily" formControlName="sugaryDrinksHabit" class="sr-only" />
                  <span>Quase diário</span>
                </label>
                <label class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.sugaryDrinksHabit.value === 'multiple_daily'"
                  [class.bg-primary/5]="form.controls.sugaryDrinksHabit.value === 'multiple_daily'"
                >
                  <input type="radio" name="sugaryDrinksHabit" value="multiple_daily" formControlName="sugaryDrinksHabit" class="sr-only" />
                  <span>Várias vezes/dia</span>
                </label>
              </div>
            </div>

            <div class="space-y-2">
              <span class="block text-sm font-medium text-foreground">
                Consumo habitual de bebidas alcoólicas:
              </span>
              <div class="grid grid-cols-2 gap-2">
                <label class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.alcoholConsumption.value === 'none'"
                  [class.bg-primary/5]="form.controls.alcoholConsumption.value === 'none'"
                >
                  <input type="radio" name="alcoholConsumption" value="none" formControlName="alcoholConsumption" class="sr-only" />
                  <span>Não consumo</span>
                </label>
                <label class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.alcoholConsumption.value === 'occasional'"
                  [class.bg-primary/5]="form.controls.alcoholConsumption.value === 'occasional'"
                >
                  <input type="radio" name="alcoholConsumption" value="occasional" formControlName="alcoholConsumption" class="sr-only" />
                  <span>Ocasional</span>
                </label>
                <label class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.alcoholConsumption.value === 'weekly'"
                  [class.bg-primary/5]="form.controls.alcoholConsumption.value === 'weekly'"
                >
                  <input type="radio" name="alcoholConsumption" value="weekly" formControlName="alcoholConsumption" class="sr-only" />
                  <span>Semanal (fds)</span>
                </label>
                <label class="flex items-center justify-center p-2 rounded-lg border text-xs cursor-pointer text-center font-medium"
                  [class.border-primary]="form.controls.alcoholConsumption.value === 'frequent'"
                  [class.bg-primary/5]="form.controls.alcoholConsumption.value === 'frequent'"
                >
                  <input type="radio" name="alcoholConsumption" value="frequent" formControlName="alcoholConsumption" class="sr-only" />
                  <span>Frequente (3+ dias)</span>
                </label>
              </div>
            </div>
          </div>

          <!-- Principais Dificuldades no Emagrecimento (Múltipla Escolha) -->
          <div class="rounded-xl border border-border bg-muted/20 p-5 space-y-3">
            <div>
              <h3 class="text-sm font-semibold text-foreground">
                Principais Dificuldades no Emagrecimento (Múltipla Escolha)
              </h3>
              <p class="text-xs text-muted-foreground mt-0.5">
                Marque os pontos onde você costuma enfrentar maiores desafios.
              </p>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              @for (challenge of challengeOptions; track challenge.id) {
                <label class="flex items-center gap-2.5 rounded-lg border border-border bg-background p-3 cursor-pointer text-xs hover:border-primary/50">
                  <input
                    type="checkbox"
                    [checked]="hasChallenge(challenge.id)"
                    (change)="toggleChallenge(challenge.id)"
                    class="size-4 rounded text-primary"
                  />
                  <span class="text-foreground">{{ challenge.label }}</span>
                </label>
              }
            </div>
          </div>

          <!-- Limitação de Orçamento Alimentar (Sem perguntas invasivas sobre renda) -->
          <label class="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-muted/20 cursor-pointer text-xs">
            <input
              type="checkbox"
              formControlName="foodBudgetLimitation"
              class="size-4 rounded text-primary mt-0.5"
            />
            <div>
              <strong class="font-semibold text-foreground block">
                Possuo limitações de orçamento para compras alimentares
              </strong>
              <span class="text-muted-foreground block text-[11px] mt-0.5">
                Permite priorizar preparos simples, econômicos e alimentos acessíveis do dia a dia, sem ingredientes caros ou suplementos supérfluos.
              </span>
            </div>
          </label>
        </div>

        <!-- Botões de Ação da Etapa -->
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border pt-6">
          <button
            hlmBtn
            type="button"
            variant="outline"
            (click)="previous.emit()"
            class="w-full sm:w-auto"
          >
            ← Voltar para Rotina e Atividade
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
              Salvar e Revisar Avaliação →
            }
          </button>
        </div>
      </div>
    </form>
  `,
})
export class StepNutrition {
  public readonly initialData = input<NutritionAssessmentDto | null>(null);
  public readonly isSaving = input<boolean>(false);
  public readonly saveSection = output<NutritionAssessmentDto>();
  public readonly previous = output<void>();

  public readonly selectedChallenges = signal<string[]>([]);

  public readonly challengeOptions = [
    { id: 'ansiedade', label: 'Ansiedade ou comer emocional' },
    { id: 'falta_tempo', label: 'Falta de tempo para planejar e cozinhar' },
    { id: 'fome_noturna', label: 'Fome e compulsão no período da noite' },
    { id: 'eventos_sociais', label: 'Manter a rotina nos fins de semana e festas' },
    { id: 'constancia', label: 'Dificuldade em manter a constância a longo prazo' },
    { id: 'doces', label: 'Vontade intensa e frequente de doces e açúcar' },
  ];

  public readonly form = new FormGroup({
    dailyMealsCount: new FormControl<number>(3, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(10)],
    }),
    mealScheduleRegularity: new FormControl<MealScheduleRegularity>('regular', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    prolongedFasting: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    eatsAtDawn: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    cookingHabit: new FormControl<CookingHabit>('cooks_at_home', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    hasKitchenScale: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
    sugaryDrinksHabit: new FormControl<SugaryDrinksHabit>('rarely', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    alcoholConsumption: new FormControl<AlcoholConsumption>('none', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    foodBudgetLimitation: new FormControl<boolean>(false, {
      nonNullable: true,
    }),
  });

  constructor() {
    effect(() => {
      const data = this.initialData();
      if (data) {
        this.form.patchValue(
          {
            dailyMealsCount: data.dailyMealsCount ?? 3,
            mealScheduleRegularity: data.mealScheduleRegularity || 'regular',
            prolongedFasting: Boolean(data.prolongedFasting),
            eatsAtDawn: Boolean(data.eatsAtDawn),
            cookingHabit: data.cookingHabit || 'cooks_at_home',
            hasKitchenScale: Boolean(data.hasKitchenScale),
            sugaryDrinksHabit: data.sugaryDrinksHabit || 'rarely',
            alcoholConsumption: data.alcoholConsumption || 'none',
            foodBudgetLimitation: Boolean(data.foodBudgetLimitation),
          },
          { emitEvent: false },
        );
        this.selectedChallenges.set(data.weightLossChallenges || []);
      }
    });
  }

  public hasChallenge(id: string): boolean {
    return this.selectedChallenges().includes(id);
  }

  public toggleChallenge(id: string): void {
    const current = this.selectedChallenges();
    if (current.includes(id)) {
      this.selectedChallenges.set(current.filter((c) => c !== id));
    } else {
      this.selectedChallenges.set([...current, id]);
    }
  }

  public onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const dto: NutritionAssessmentDto = {
      dailyMealsCount: Number(raw.dailyMealsCount),
      mealScheduleRegularity: raw.mealScheduleRegularity,
      prolongedFasting: raw.prolongedFasting,
      eatsAtDawn: raw.eatsAtDawn,
      cookingHabit: raw.cookingHabit,
      hasKitchenScale: raw.hasKitchenScale,
      sugaryDrinksHabit: raw.sugaryDrinksHabit,
      alcoholConsumption: raw.alcoholConsumption,
      weightLossChallenges: this.selectedChallenges(),
      foodBudgetLimitation: raw.foodBudgetLimitation,
      dietaryPreferences: [],
      allergiesAndIntolerances: [],
      dietaryRestrictions: [],
    };

    this.saveSection.emit(dto);
  }
}
