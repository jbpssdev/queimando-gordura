import { Component, EventEmitter, inject, Output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { DiaryApiService } from '../../../../core/diary/diary-api.service';
import type { CreateCustomFoodDto, FoodItem } from '../../../../core/diary/diary.model';

@Component({
  selector: 'app-custom-food-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButton,
    HlmCardImports,
    HlmInput,
    HlmLabel,
    HlmAlertImports,
  ],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="custom-food-title"
      (keydown.escape)="onCancel()"
    >
      <div
        hlmCard
        class="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card border-border p-6 shadow-xl space-y-6"
      >
        <div class="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 id="custom-food-title" class="text-lg font-bold text-foreground">
              Cadastrar Alimento Personalizado
            </h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Alimentos cadastrados são privados e disponíveis apenas na sua conta.
            </p>
          </div>
          <button
            type="button"
            class="text-muted-foreground hover:text-foreground p-1 text-lg leading-none"
            (click)="onCancel()"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div hlmAlert class="p-3 text-xs border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200">
          A exatidão dos dados nutricionais depende das informações fornecidas por você (ex.: tabela nutricional do rótulo).
        </div>

        @if (errorMessage()) {
          <div hlmAlert variant="destructive" class="p-3 text-xs">
            {{ errorMessage() }}
          </div>
        }

        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <!-- Nome do Alimento -->
          <div class="space-y-1.5">
            <label hlmLabel for="food-name" class="text-xs font-semibold">
              Nome do alimento <span class="text-destructive">*</span>
            </label>
            <input
              hlmInput
              id="food-name"
              type="text"
              formControlName="name"
              placeholder="Ex.: Pão artesanal de centeio"
              class="w-full text-xs"
            />
            @if (form.controls.name.invalid && form.controls.name.touched) {
              <span class="text-[11px] text-destructive block">
                O nome do alimento é obrigatório (mínimo 2 caracteres).
              </span>
            }
          </div>

          <!-- Fonte Declarada -->
          <div class="space-y-1.5">
            <label hlmLabel for="food-source" class="text-xs font-semibold">
              Fonte das informações <span class="text-destructive">*</span>
            </label>
            <input
              hlmInput
              id="food-source"
              type="text"
              formControlName="source"
              placeholder="Ex.: Rótulo da embalagem, Receita caseira"
              class="w-full text-xs"
            />
          </div>

          <!-- Tabela Nutricional por 100g -->
          <div class="border border-border rounded-lg p-3.5 bg-muted/20 space-y-3">
            <span class="text-xs font-bold text-foreground block">
              Informações Nutricionais por 100 g
            </span>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label hlmLabel for="food-kcal" class="text-[11px]">
                  Calorias (kcal) <span class="text-destructive">*</span>
                </label>
                <input
                  hlmInput
                  id="food-kcal"
                  type="number"
                  step="0.1"
                  min="0"
                  formControlName="energyKcal"
                  placeholder="0"
                  class="w-full text-xs"
                />
              </div>

              <div class="space-y-1">
                <label hlmLabel for="food-protein" class="text-[11px]">Proteínas (g)</label>
                <input
                  hlmInput
                  id="food-protein"
                  type="number"
                  step="0.1"
                  min="0"
                  formControlName="proteinG"
                  placeholder="Opcional"
                  class="w-full text-xs"
                />
              </div>

              <div class="space-y-1">
                <label hlmLabel for="food-carb" class="text-[11px]">Carboidratos (g)</label>
                <input
                  hlmInput
                  id="food-carb"
                  type="number"
                  step="0.1"
                  min="0"
                  formControlName="carbohydrateG"
                  placeholder="Opcional"
                  class="w-full text-xs"
                />
              </div>

              <div class="space-y-1">
                <label hlmLabel for="food-fat" class="text-[11px]">Gorduras totais (g)</label>
                <input
                  hlmInput
                  id="food-fat"
                  type="number"
                  step="0.1"
                  min="0"
                  formControlName="fatG"
                  placeholder="Opcional"
                  class="w-full text-xs"
                />
              </div>

              <div class="space-y-1 col-span-2">
                <label hlmLabel for="food-fiber" class="text-[11px]">Fibras alimentares (g)</label>
                <input
                  hlmInput
                  id="food-fiber"
                  type="number"
                  step="0.1"
                  min="0"
                  formControlName="fiberG"
                  placeholder="Opcional"
                  class="w-full text-xs"
                />
              </div>
            </div>
          </div>

          <!-- Medida Caseira Opcional -->
          <div class="border border-border rounded-lg p-3.5 bg-muted/20 space-y-3">
            <span class="text-xs font-bold text-foreground block">
              Medida Caseira de Equivalência (Opcional)
            </span>
            <p class="text-[11px] text-muted-foreground">
              Cadastre apenas se souber o peso exato da porção (ex.: 1 fatia = 30 g).
            </p>

            <div class="grid grid-cols-2 gap-3">
              <div class="space-y-1">
                <label hlmLabel for="measure-label" class="text-[11px]">Nome da medida</label>
                <input
                  hlmInput
                  id="measure-label"
                  type="text"
                  formControlName="measureLabel"
                  placeholder="Ex.: Fatia média"
                  class="w-full text-xs"
                />
              </div>

              <div class="space-y-1">
                <label hlmLabel for="measure-grams" class="text-[11px]">Equivalente em gramas (g)</label>
                <input
                  hlmInput
                  id="measure-grams"
                  type="number"
                  step="0.5"
                  min="1"
                  formControlName="measureGrams"
                  placeholder="Ex.: 30"
                  class="w-full text-xs"
                />
              </div>
            </div>
          </div>

          <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button
              hlmBtn
              variant="outline"
              type="button"
              (click)="onCancel()"
              [disabled]="isSubmitting()"
            >
              Cancelar
            </button>
            <button
              hlmBtn
              variant="default"
              type="submit"
              [disabled]="form.invalid || isSubmitting()"
            >
              {{ isSubmitting() ? 'Cadastrando...' : 'Cadastrar Alimento' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class CustomFoodDialog {
  private readonly api = inject(DiaryApiService);

  @Output() public readonly foodCreated = new EventEmitter<FoodItem>();
  @Output() public readonly closed = new EventEmitter<void>();

  public readonly isSubmitting = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);

  public readonly form = new FormGroup({
    name: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    source: new FormControl<string>('Rótulo do produto', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    energyKcal: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    proteinG: new FormControl<number | null>(null, [Validators.min(0)]),
    carbohydrateG: new FormControl<number | null>(null, [Validators.min(0)]),
    fatG: new FormControl<number | null>(null, [Validators.min(0)]),
    fiberG: new FormControl<number | null>(null, [Validators.min(0)]),
    measureLabel: new FormControl<string>('', { nonNullable: true }),
    measureGrams: new FormControl<number | null>(null, [Validators.min(1)]),
  });

  public onCancel(): void {
    this.closed.emit();
  }

  public onSubmit(): void {
    if (this.form.invalid) return;

    const val = this.form.getRawValue();
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const dto: CreateCustomFoodDto = {
      name: val.name.trim(),
      source: val.source.trim(),
      nutrientsPer100g: {
        energyKcal: val.energyKcal,
        proteinG: val.proteinG !== null ? val.proteinG : null,
        carbohydrateG: val.carbohydrateG !== null ? val.carbohydrateG : null,
        fatG: val.fatG !== null ? val.fatG : null,
        fiberG: val.fiberG !== null ? val.fiberG : null,
      },
      householdMeasure:
        val.measureLabel.trim() && val.measureGrams && val.measureGrams > 0
          ? {
              label: val.measureLabel.trim(),
              grams: val.measureGrams,
            }
          : null,
    };

    this.api.createCustomFood(dto).subscribe({
      next: (created) => {
        this.isSubmitting.set(false);
        this.foodCreated.emit(created);
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        const msg =
          err instanceof Error
            ? err.message
            : 'Erro ao cadastrar alimento. Verifique os dados e tente novamente.';
        this.errorMessage.set(msg);
      },
    });
  }
}
