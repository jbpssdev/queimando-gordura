import { Component, inject, signal } from '@angular/core';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { DiaryStateService } from '../../../../core/diary/diary-state.service';
import {
  formatPtBrCalories,
  formatPtBrNumber,
} from '../../../../core/diary/diary-helpers';
import type { DiaryMeal, MealType } from '../../../../core/diary/diary.model';
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
} from '../../../../core/diary/diary.model';
import { MealEditorDialog } from './meal-editor-dialog';

@Component({
  selector: 'app-diary-meals',
  imports: [HlmButton, HlmCardImports, HlmAlertImports, MealEditorDialog],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho da Seção de Refeições -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h2 class="text-lg font-bold text-foreground">Refeições do Dia</h2>
          <p class="text-xs text-muted-foreground mt-0.5">
            Acompanhe o consumo alimentar com base nas informações do catálogo e fontes oficiais.
          </p>
        </div>

        <button
          hlmBtn
          variant="default"
          size="sm"
          type="button"
          class="text-xs font-semibold self-start sm:self-auto"
          (click)="openAddMealModal('lunch')"
        >
          + Adicionar Refeição
        </button>
      </div>

      <!-- Resumo Geral de Refeições -->
      @if (state.meals().length > 0) {
        <div hlmCard class="p-4 bg-muted/20 border-border">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                Total do Dia em Refeições
              </span>
              <div class="flex items-baseline gap-2 mt-0.5">
                <span class="text-2xl font-black text-foreground">
                  {{ formatPtBrCalories(state.dayTotals().energyKcal) }}
                </span>
                @if (state.dayTotals().isPartialNutrition) {
                  <span class="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    (Total parcial • nutrientes incompletos na fonte)
                  </span>
                }
              </div>
            </div>

            <div class="flex flex-wrap gap-4 text-xs text-muted-foreground">
              <div>
                <span class="block text-[11px]">Proteínas</span>
                <strong class="text-foreground">
                  {{ formatPtBrNumber(state.dayTotals().proteinG) }} g
                </strong>
              </div>
              <div>
                <span class="block text-[11px]">Carboidratos</span>
                <strong class="text-foreground">
                  {{ formatPtBrNumber(state.dayTotals().carbohydrateG) }} g
                </strong>
              </div>
              <div>
                <span class="block text-[11px]">Gorduras</span>
                <strong class="text-foreground">
                  {{ formatPtBrNumber(state.dayTotals().fatG) }} g
                </strong>
              </div>
              <div>
                <span class="block text-[11px]">Fibras</span>
                <strong class="text-foreground">
                  {{ formatPtBrNumber(state.dayTotals().fiberG) }} g
                </strong>
              </div>
            </div>
          </div>
        </div>
      }

      <!-- Grupos de Refeições -->
      <div class="space-y-5">
        @for (group of mealGroups; track group) {
          <div hlmCard class="p-4 sm:p-5 border-border bg-card space-y-3">
            <div class="flex items-center justify-between border-b border-border pb-3">
              <div class="flex items-center gap-2">
                <h3 class="text-sm font-bold text-foreground">
                  {{ mealTypeLabels[group] }}
                </h3>
                @if (state.mealsByType()[group].length > 0) {
                  <span class="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                    {{ state.mealsByType()[group].length }} refeição(ões)
                  </span>
                }
              </div>

              <button
                hlmBtn
                variant="outline"
                size="sm"
                type="button"
                class="text-xs h-7"
                (click)="openAddMealModal(group)"
              >
                + Adicionar
              </button>
            </div>

            <!-- Lista de Refeições deste grupo -->
            @if (state.mealsByType()[group].length === 0) {
              <p class="text-xs text-muted-foreground py-2 italic">
                Nenhum registro para este momento.
              </p>
            } @else {
              <div class="space-y-3">
                @for (meal of state.mealsByType()[group]; track meal.id) {
                  <div class="rounded-xl border border-border/80 bg-muted/10 p-3.5 space-y-2.5">
                    <div class="flex items-start justify-between gap-2">
                      <div>
                        @if (meal.title) {
                          <h4 class="text-xs font-bold text-foreground">
                            {{ meal.title }}
                          </h4>
                        }
                        <span class="text-xs font-semibold text-primary">
                          {{ formatPtBrCalories(meal.totalKcal) }}
                        </span>
                        @if (meal.isPartialNutrition) {
                          <span class="text-[10px] text-amber-600 dark:text-amber-400 ml-1.5 font-medium">
                            (Parcial)
                          </span>
                        }
                      </div>

                      <div class="flex items-center gap-2">
                        <button
                          hlmBtn
                          variant="outline"
                          size="sm"
                          type="button"
                          class="text-[11px] h-7 px-2"
                          (click)="openEditMealModal(meal)"
                        >
                          Editar
                        </button>
                        <button
                          hlmBtn
                          variant="outline"
                          size="sm"
                          type="button"
                          class="text-[11px] h-7 px-2 text-destructive hover:bg-destructive/10"
                          (click)="confirmDeleteMeal(meal)"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>

                    <!-- Itens/Ingredientes -->
                    <div class="space-y-1 pt-1 border-t border-border/50">
                      @for (item of meal.items; track $index) {
                        <div class="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span class="text-foreground">
                            • {{ item.foodName }}
                            @if (item.unit === 'household') {
                              ({{ item.amount }} {{ item.householdMeasureLabel || 'porção' }} ~{{ item.calculatedGrams }}g)
                            } @else {
                              ({{ item.amount }} g)
                            }
                          </span>
                          <span class="shrink-0 font-medium">
                            {{ formatPtBrCalories(item.energyKcal) }}
                          </span>
                        </div>
                      }
                    </div>

                    <!-- Macros da Refeição -->
                    <div class="flex flex-wrap gap-3 pt-1 text-[10px] text-muted-foreground">
                      <span>P: {{ formatPtBrNumber(meal.totalProteinG) }} g</span>
                      <span>C: {{ formatPtBrNumber(meal.totalCarbG) }} g</span>
                      <span>G: {{ formatPtBrNumber(meal.totalFatG) }} g</span>
                      <span>Fibras: {{ formatPtBrNumber(meal.totalFiberG) }} g</span>
                    </div>
                  </div>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>

    <!-- Modal de Criação / Edição de Refeição -->
    @if (isEditorOpen()) {
      <app-meal-editor-dialog
        [date]="state.selectedDate()"
        [editingMeal]="editingMeal()"
        [initialMealType]="editorMealType()"
        (saved)="onMealSaved()"
        (closed)="isEditorOpen.set(false)"
      />
    }

    <!-- Modal de Confirmação de Exclusão -->
    @if (mealToDelete(); as meal) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-meal-title"
      >
        <div hlmCard class="w-full max-w-sm bg-card border-border p-6 shadow-xl space-y-4">
          <h3 id="delete-meal-title" class="text-base font-bold text-foreground">
            Excluir Refeição?
          </h3>
          <p class="text-xs text-muted-foreground leading-relaxed">
            Tem certeza de que deseja remover esta refeição
            @if (meal.title) {
              (<strong>{{ meal.title }}</strong>)
            }
            do seu diário? Os alimentos associados serão desvinculados desta data.
          </p>

          <div class="flex justify-end gap-3 pt-2">
            <button
              hlmBtn
              variant="outline"
              size="sm"
              type="button"
              (click)="mealToDelete.set(null)"
              [disabled]="state.isSaving()"
            >
              Cancelar
            </button>
            <button
              hlmBtn
              variant="destructive"
              size="sm"
              type="button"
              (click)="executeDeleteMeal()"
              [disabled]="state.isSaving()"
            >
              {{ state.isSaving() ? 'Excluindo...' : 'Sim, Excluir' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class DiaryMeals {
  protected readonly state = inject(DiaryStateService);

  public readonly mealGroups = MEAL_TYPES;
  public readonly mealTypeLabels = MEAL_TYPE_LABELS;

  public readonly isEditorOpen = signal<boolean>(false);
  public readonly editingMeal = signal<DiaryMeal | null>(null);
  public readonly editorMealType = signal<MealType>('lunch');

  public readonly mealToDelete = signal<DiaryMeal | null>(null);

  public openAddMealModal(group: MealType): void {
    this.editingMeal.set(null);
    this.editorMealType.set(group);
    this.isEditorOpen.set(true);
  }

  public openEditMealModal(meal: DiaryMeal): void {
    this.editingMeal.set(meal);
    this.editorMealType.set(meal.mealType);
    this.isEditorOpen.set(true);
  }

  public onMealSaved(): void {
    this.isEditorOpen.set(false);
    this.editingMeal.set(null);
  }

  public confirmDeleteMeal(meal: DiaryMeal): void {
    this.mealToDelete.set(meal);
  }

  public executeDeleteMeal(): void {
    const meal = this.mealToDelete();
    if (!meal) return;

    this.state.deleteMeal(meal.id).subscribe({
      next: () => {
        this.mealToDelete.set(null);
      },
    });
  }

  public formatPtBrCalories(val: number | null | undefined): string {
    return formatPtBrCalories(val);
  }

  public formatPtBrNumber(val: number | null | undefined): string {
    return formatPtBrNumber(val);
  }
}
