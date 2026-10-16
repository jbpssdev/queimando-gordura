import {
  Component,
  computed,
  EventEmitter,
  inject,
  Input,
  OnInit,
  Output,
  signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { DiaryApiService } from '../../../../core/diary/diary-api.service';
import {
  computeMealTotals,
  computeNutrientsForAmount,
  formatPtBrCalories,
  formatPtBrNumber,
} from '../../../../core/diary/diary-helpers';
import type {
  CreateMealDto,
  DiaryMeal,
  DiaryMealItem,
  FoodItem,
  MealItemInput,
  MealType,
  UpdateMealDto,
} from '../../../../core/diary/diary.model';
import {
  MEAL_TYPES,
  MEAL_TYPE_LABELS,
} from '../../../../core/diary/diary.model';
import { CustomFoodDialog } from './custom-food-dialog';

@Component({
  selector: 'app-meal-editor-dialog',
  imports: [
    ReactiveFormsModule,
    HlmButton,
    HlmCardImports,
    HlmInput,
    HlmLabel,
    HlmAlertImports,
    CustomFoodDialog,
  ],
  template: `
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6 backdrop-blur-xs animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meal-editor-title"
      (keydown.escape)="onCancel()"
    >
      <div
        hlmCard
        class="w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-card border-border p-5 sm:p-6 shadow-2xl space-y-6"
      >
        <!-- Cabeçalho -->
        <div class="flex items-center justify-between border-b border-border pb-4">
          <div>
            <h2 id="meal-editor-title" class="text-lg font-bold text-foreground">
              {{ editingMeal ? 'Editar Refeição' : 'Registrar Refeição' }}
            </h2>
            <p class="text-xs text-muted-foreground mt-0.5">
              Combine alimentos, ajuste quantidades e acompanhe a estimativa nutricional.
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

        @if (errorMessage()) {
          <div hlmAlert variant="destructive" class="p-3 text-xs">
            {{ errorMessage() }}
          </div>
        }

        <!-- Seção: Tipo e Título da Refeição -->
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div class="space-y-1.5">
            <label hlmLabel for="meal-type-select" class="text-xs font-semibold">
              Momento / Grupo <span class="text-destructive">*</span>
            </label>
            <select
              id="meal-type-select"
              class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden focus:ring-2 focus:ring-ring"
              [value]="selectedMealType()"
              (change)="onMealTypeChange($event)"
            >
              @for (type of mealTypes; track type) {
                <option [value]="type">{{ mealTypeLabels[type] }}</option>
              }
            </select>
          </div>

          <div class="space-y-1.5">
            <label hlmLabel for="meal-title-input" class="text-xs font-semibold">
              Título opcional
            </label>
            <input
              hlmInput
              id="meal-title-input"
              type="text"
              placeholder="Ex.: Prato feito, Lanche da tarde"
              [value]="mealTitle()"
              (input)="onTitleChange($event)"
              class="w-full text-xs"
            />
          </div>
        </div>

        <!-- Seção: Busca de Alimentos no Catálogo -->
        <div class="border border-border rounded-xl p-4 bg-muted/15 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-foreground">
              Adicionar Alimentos do Catálogo
            </span>
            <button
              hlmBtn
              variant="outline"
              size="sm"
              type="button"
              class="text-[11px] h-7"
              (click)="showCustomFoodModal.set(true)"
            >
              + Criar Alimento Personalizado
            </button>
          </div>

          <div class="relative">
            <input
              hlmInput
              type="search"
              placeholder="Buscar por nome (ex.: Arroz, Frango, Maçã...)"
              [value]="searchQuery()"
              (input)="onSearchInput($event)"
              class="w-full text-xs pl-8"
            />
            <span class="absolute left-2.5 top-2.5 text-xs text-muted-foreground">🔍</span>
          </div>

          <!-- Carregando busca -->
          @if (isSearching()) {
            <div class="text-center py-3 text-xs text-muted-foreground">
              Buscando alimentos...
            </div>
          }

          <!-- Resultados da busca -->
          @if (searchResults().length > 0) {
            <div class="max-h-48 overflow-y-auto space-y-1 rounded-md border border-border bg-card p-1">
              @for (food of searchResults(); track food.id) {
                <button
                  type="button"
                  class="w-full text-left p-2 rounded-md hover:bg-muted text-xs transition-colors flex items-center justify-between gap-2"
                  [class.bg-primary/10]="selectedFood()?.id === food.id"
                  (click)="selectFood(food)"
                >
                  <div class="min-w-0">
                    <span class="font-semibold text-foreground truncate block">
                      {{ food.name }}
                    </span>
                    <span class="text-[11px] text-muted-foreground block truncate">
                      {{ food.preparation || 'In natura' }} • {{ food.source }}
                      @if (food.householdMeasures.length > 0) {
                        • {{ food.householdMeasures.length }} medida(s) caseira(s)
                      }
                    </span>
                  </div>

                  @if (food.isCustom) {
                    <span class="shrink-0 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold">
                      Personalizado
                    </span>
                  }
                </button>
              }
            </div>
          } @else if (searchQuery().length >= 2 && !isSearching()) {
            <div class="text-center py-2 text-xs text-muted-foreground">
              Nenhum alimento encontrado com "{{ searchQuery() }}".
            </div>
          }

          <!-- Alimento Selecionado e Configuração de Quantidade -->
          @if (selectedFood(); as food) {
            <div class="rounded-lg border border-primary/30 bg-card p-3.5 space-y-3 mt-3 animate-in fade-in">
              <div class="flex items-start justify-between gap-2">
                <div>
                  <span class="text-xs font-bold text-foreground block">
                    {{ food.name }}
                  </span>
                  <span class="text-[11px] text-muted-foreground">
                    Fonte: {{ food.source }} {{ food.preparation ? '• ' + food.preparation : '' }}
                  </span>
                </div>
                <button
                  type="button"
                  class="text-xs text-muted-foreground hover:text-foreground"
                  (click)="selectedFood.set(null)"
                >
                  ✕
                </button>
              </div>

              <!-- Escolha de Unidade e Quantidade -->
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div class="space-y-1">
                  <label for="item-unit-select" class="text-[11px] font-semibold text-muted-foreground">Unidade</label>
                  <select
                    id="item-unit-select"
                    class="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden"
                    [value]="itemUnit()"
                    (change)="onUnitChange($event)"
                  >
                    <option value="g">Gramas (g)</option>
                    @if (food.householdMeasures.length > 0) {
                      <option value="household">Medida caseira</option>
                    }
                  </select>
                </div>

                @if (itemUnit() === 'household') {
                  <div class="space-y-1">
                    <label for="item-measure-select" class="text-[11px] font-semibold text-muted-foreground">
                      Porção caseira
                    </label>
                    <select
                      id="item-measure-select"
                      class="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs text-foreground focus:outline-hidden"
                      [value]="selectedMeasureId() || ''"
                      (change)="onMeasureSelect($event)"
                    >
                      @for (m of food.householdMeasures; track m.id) {
                        <option [value]="m.id">
                          {{ m.label }} ({{ m.grams }} g)
                        </option>
                      }
                    </select>
                  </div>
                }

                <div class="space-y-1">
                  <label for="item-amount-input" class="text-[11px] font-semibold text-muted-foreground">
                    Quantidade {{ itemUnit() === 'g' ? 'em gramas' : 'de porções' }}
                  </label>
                  <input
                    hlmInput
                    id="item-amount-input"
                    type="number"
                    min="1"
                    step="0.5"
                    [value]="itemAmount()"
                    (input)="onAmountInput($event)"
                    class="w-full text-xs"
                  />
                </div>
              </div>

              <!-- Prévia de Nutrientes do Item -->
              <div class="rounded-md bg-muted/40 p-2.5 text-xs space-y-1">
                <div class="flex flex-wrap items-center justify-between text-muted-foreground text-[11px]">
                  <span>
                    Quantidade calculada:
                    <strong class="text-foreground">
                      {{ itemNutrientsPreview().calculatedGrams }} g
                    </strong>
                    @if (itemUnit() === 'household') {
                      <span class="text-[10px] text-muted-foreground"> (estimativa aproximada)</span>
                    }
                  </span>
                  <span>
                    Calorias:
                    <strong class="text-foreground">
                      {{ formatPtBrCalories(itemNutrientsPreview().energyKcal) }}
                    </strong>
                  </span>
                </div>
                <div class="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                  <span>P: {{ formatPtBrNumber(itemNutrientsPreview().proteinG) }} g</span>
                  <span>C: {{ formatPtBrNumber(itemNutrientsPreview().carbohydrateG) }} g</span>
                  <span>G: {{ formatPtBrNumber(itemNutrientsPreview().fatG) }} g</span>
                  <span>Fibra: {{ formatPtBrNumber(itemNutrientsPreview().fiberG) }} g</span>
                </div>
              </div>

              <button
                hlmBtn
                variant="default"
                size="sm"
                type="button"
                class="w-full text-xs font-semibold"
                [disabled]="itemAmount() <= 0"
                (click)="addItemToMeal()"
              >
                + Adicionar este alimento à refeição
              </button>
            </div>
          }
        </div>

        <!-- Seção: Alimentos da Refeição Montada -->
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-foreground">
              Alimentos na Refeição ({{ mealItems().length }})
            </span>
            @if (mealItems().length > 0) {
              <span class="text-xs text-muted-foreground">
                Total estimado:
                <strong class="text-foreground">
                  {{ formatPtBrCalories(mealTotals().energyKcal) }}
                </strong>
              </span>
            }
          </div>

          @if (mealItems().length === 0) {
            <div class="text-center py-6 border border-dashed border-border rounded-xl p-4 text-xs text-muted-foreground">
              Nenhum alimento adicionado ainda. Use a busca acima para incluir os ingredientes da sua refeição.
            </div>
          } @else {
            <div class="space-y-2 max-h-56 overflow-y-auto">
              @for (item of mealItems(); track $index) {
                <div class="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-card text-xs">
                  <div class="min-w-0">
                    <span class="font-semibold text-foreground block truncate">
                      {{ item.foodName }}
                    </span>
                    <span class="text-[11px] text-muted-foreground block">
                      {{ item.amount }} {{ item.unit === 'g' ? 'g' : (item.householdMeasureLabel || 'medida') }}
                      @if (item.unit === 'household') {
                        (~{{ item.calculatedGrams }} g)
                      }
                      • {{ formatPtBrCalories(item.energyKcal) }}
                    </span>
                  </div>

                  <div class="flex items-center gap-2">
                    <span class="text-[10px] text-muted-foreground hidden sm:inline">
                      P: {{ formatPtBrNumber(item.proteinG) }}g |
                      C: {{ formatPtBrNumber(item.carbohydrateG) }}g |
                      G: {{ formatPtBrNumber(item.fatG) }}g
                    </span>
                    <button
                      type="button"
                      class="text-destructive hover:text-destructive/80 p-1 text-xs"
                      (click)="removeItem($index)"
                      aria-label="Remover ingrediente"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              }
            </div>

            <!-- Resumo Nutricional Consolidado -->
            <div class="rounded-lg border border-border bg-muted/20 p-3 space-y-1 text-xs">
              <div class="flex items-center justify-between font-semibold">
                <span class="text-foreground">Total da Refeição</span>
                <span class="text-primary font-bold">
                  {{ formatPtBrCalories(mealTotals().energyKcal) }}
                </span>
              </div>
              <div class="grid grid-cols-4 gap-2 text-[11px] text-muted-foreground pt-1">
                <span>Proteínas: {{ formatPtBrNumber(mealTotals().proteinG) }} g</span>
                <span>Carboidratos: {{ formatPtBrNumber(mealTotals().carbohydrateG) }} g</span>
                <span>Gorduras: {{ formatPtBrNumber(mealTotals().fatG) }} g</span>
                <span>Fibras: {{ formatPtBrNumber(mealTotals().fiberG) }} g</span>
              </div>
              <p class="text-[10px] text-muted-foreground pt-1">
                Prévia estimada na interface; cálculos e validações finais são emitidos pelo servidor.
              </p>
            </div>
          }
        </div>

        <!-- Botões de Ação -->
        <div class="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button
            hlmBtn
            variant="outline"
            type="button"
            (click)="onCancel()"
            [disabled]="isSaving()"
          >
            Cancelar
          </button>
          <button
            hlmBtn
            variant="default"
            type="button"
            [disabled]="mealItems().length === 0 || isSaving()"
            (click)="onSaveMeal()"
          >
            {{ isSaving() ? 'Salvando...' : 'Salvar Refeição' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Modal de Alimento Personalizado -->
    @if (showCustomFoodModal()) {
      <app-custom-food-dialog
        (foodCreated)="onCustomFoodCreated($event)"
        (closed)="showCustomFoodModal.set(false)"
      />
    }
  `,
})
export class MealEditorDialog implements OnInit {
  private readonly api = inject(DiaryApiService);

  @Input() public date!: string;
  @Input() public editingMeal?: DiaryMeal | null = null;
  @Input() public initialMealType: MealType = 'lunch';

  @Output() public readonly saved = new EventEmitter<DiaryMeal>();
  @Output() public readonly closed = new EventEmitter<void>();

  public readonly mealTypes = MEAL_TYPES;
  public readonly mealTypeLabels = MEAL_TYPE_LABELS;

  // Estado do formulário da refeição
  public readonly selectedMealType = signal<MealType>('lunch');
  public readonly mealTitle = signal<string>('');
  public readonly mealItems = signal<DiaryMealItem[]>([]);

  // Busca de alimentos
  public readonly searchQuery = signal<string>('');
  public readonly searchResults = signal<FoodItem[]>([]);
  public readonly isSearching = signal<boolean>(false);
  private readonly searchSubject = new Subject<string>();

  // Alimento em edição / configuração
  public readonly selectedFood = signal<FoodItem | null>(null);
  public readonly itemUnit = signal<'g' | 'household'>('g');
  public readonly selectedMeasureId = signal<string | null>(null);
  public readonly itemAmount = signal<number>(100);

  // Estados gerais
  public readonly isSaving = signal<boolean>(false);
  public readonly errorMessage = signal<string | null>(null);
  public readonly showCustomFoodModal = signal<boolean>(false);

  // Totais computados
  public readonly itemNutrientsPreview = computed(() => {
    const food = this.selectedFood();
    if (!food) {
      return {
        calculatedGrams: 0,
        energyKcal: null,
        proteinG: null,
        carbohydrateG: null,
        fatG: null,
        fiberG: null,
        isPartial: false,
      };
    }
    return computeNutrientsForAmount(
      food,
      this.itemAmount(),
      this.itemUnit(),
      this.selectedMeasureId(),
    );
  });

  public readonly mealTotals = computed(() => {
    return computeMealTotals(this.mealItems());
  });

  public ngOnInit(): void {
    if (this.editingMeal) {
      this.selectedMealType.set(this.editingMeal.mealType);
      this.mealTitle.set(this.editingMeal.title || '');
      this.mealItems.set([...this.editingMeal.items]);
    } else {
      this.selectedMealType.set(this.initialMealType);
    }

    this.searchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((query) => {
        this.executeSearch(query);
      });
  }

  public onMealTypeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedMealType.set(target.value as MealType);
  }

  public onTitleChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.mealTitle.set(target.value);
  }

  public onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const q = target.value;
    this.searchQuery.set(q);
    this.searchSubject.next(q);
  }

  private executeSearch(query: string): void {
    if (query.trim().length < 2) {
      this.searchResults.set([]);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);
    this.api.searchFoods(query).subscribe({
      next: (res) => {
        this.searchResults.set(res.items || []);
        this.isSearching.set(false);
      },
      error: () => {
        this.searchResults.set([]);
        this.isSearching.set(false);
      },
    });
  }

  public selectFood(food: FoodItem): void {
    this.selectedFood.set(food);
    this.itemUnit.set('g');
    this.itemAmount.set(100);

    if (food.householdMeasures.length > 0) {
      this.selectedMeasureId.set(food.householdMeasures[0]?.id ?? null);
    } else {
      this.selectedMeasureId.set(null);
    }
  }

  public onUnitChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const unit = target.value as 'g' | 'household';
    this.itemUnit.set(unit);

    if (unit === 'household') {
      const food = this.selectedFood();
      if (food && food.householdMeasures.length > 0) {
        this.selectedMeasureId.set(food.householdMeasures[0]?.id ?? null);
      }
      this.itemAmount.set(1);
    } else {
      this.selectedMeasureId.set(null);
      this.itemAmount.set(100);
    }
  }

  public onMeasureSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.selectedMeasureId.set(target.value);
  }

  public onAmountInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    const val = parseFloat(target.value);
    this.itemAmount.set(isNaN(val) ? 0 : val);
  }

  public addItemToMeal(): void {
    const food = this.selectedFood();
    if (!food || this.itemAmount() <= 0) return;

    const preview = this.itemNutrientsPreview();
    const newItem: DiaryMealItem = {
      foodId: food.id,
      foodName: food.name,
      foodPreparation: food.preparation,
      foodSource: food.source,
      isCustom: food.isCustom,
      amount: this.itemAmount(),
      unit: this.itemUnit(),
      householdMeasureLabel: preview.selectedMeasureLabel ?? null,
      calculatedGrams: preview.calculatedGrams,
      energyKcal: preview.energyKcal,
      proteinG: preview.proteinG,
      carbohydrateG: preview.carbohydrateG,
      fatG: preview.fatG,
      fiberG: preview.fiberG,
    };

    this.mealItems.set([...this.mealItems(), newItem]);
    this.selectedFood.set(null);
    this.searchQuery.set('');
    this.searchResults.set([]);
  }

  public removeItem(index: number): void {
    const current = this.mealItems();
    this.mealItems.set(current.filter((_, i) => i !== index));
  }

  public onCustomFoodCreated(food: FoodItem): void {
    this.showCustomFoodModal.set(false);
    this.selectFood(food);
  }

  public onCancel(): void {
    this.closed.emit();
  }

  public onSaveMeal(): void {
    const items = this.mealItems();
    if (items.length === 0) return;

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const inputItems: MealItemInput[] = items.map((item) => ({
      foodId: item.foodId,
      amount: item.amount,
      unit: item.unit,
      householdMeasureId: item.unit === 'household' ? (this.selectedMeasureId() ?? undefined) : undefined,
    }));

    if (this.editingMeal) {
      const dto: UpdateMealDto = {
        mealType: this.selectedMealType(),
        title: this.mealTitle().trim() || undefined,
        items: inputItems,
        version: this.editingMeal.version,
      };

      this.api.updateMeal(this.editingMeal.id, dto).subscribe({
        next: (savedMeal) => {
          this.isSaving.set(false);
          this.saved.emit(savedMeal);
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            err instanceof Error ? err.message : 'Erro ao atualizar refeição.',
          );
        },
      });
    } else {
      const dto: CreateMealDto = {
        date: this.date,
        mealType: this.selectedMealType(),
        title: this.mealTitle().trim() || undefined,
        items: inputItems,
        clientRequestId: `meal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      };

      this.api.createMeal(dto).subscribe({
        next: (savedMeal) => {
          this.isSaving.set(false);
          this.saved.emit(savedMeal);
        },
        error: (err: unknown) => {
          this.isSaving.set(false);
          this.errorMessage.set(
            err instanceof Error ? err.message : 'Erro ao registrar refeição.',
          );
        },
      });
    }
  }

  public formatPtBrCalories(val: number | null | undefined): string {
    return formatPtBrCalories(val);
  }

  public formatPtBrNumber(val: number | null | undefined): string {
    return formatPtBrNumber(val);
  }
}
