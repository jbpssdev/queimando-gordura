import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { DiaryMeals } from './diary-meals';
import { DiaryStateService } from '../../../../core/diary/diary-state.service';
import type { DiaryMeal } from '../../../../core/diary/diary.model';

describe('DiaryMeals Component', () => {
  let component: DiaryMeals;
  let fixture: ComponentFixture<DiaryMeals>;
  let state: DiaryStateService;

  const mockMeal: DiaryMeal = {
    id: 'm-1',
    date: '2026-10-16',
    mealType: 'breakfast',
    title: 'Café matinal',
    items: [
      {
        foodId: 'f1',
        foodName: 'Banana',
        amount: 1,
        unit: 'household',
        householdMeasureLabel: 'Unidade média',
        calculatedGrams: 90,
        energyKcal: 85,
        proteinG: 1,
        carbohydrateG: 22,
        fatG: 0.1,
        fiberG: 2,
      },
    ],
    totalKcal: 85,
    totalProteinG: 1,
    totalCarbG: 22,
    totalFatG: 0.1,
    totalFiberG: 2,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiaryMeals],
      providers: [provideHttpClient(), provideHttpClientTesting(), DiaryStateService],
    }).compileComponents();

    state = TestBed.inject(DiaryStateService);
    fixture = TestBed.createComponent(DiaryMeals);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renderiza os grupos de refeições vazios inicialmente', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Café da manhã');
    expect(compiled.textContent).toContain('Almoço');
    expect(compiled.textContent).toContain('Jantar');
  });

  it('exibe refeições quando adicionadas ao estado', () => {
    state.dayData.set({
      date: '2026-10-16',
      meals: [mockMeal],
      waterEntries: [],
      totalWaterMl: 0,
      activities: [],
      dayTotals: { energyKcal: 85, proteinG: 1, carbohydrateG: 22, fatG: 0.1, fiberG: 2 },
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Café matinal');
    expect(compiled.textContent).toContain('Banana');
    expect(compiled.textContent).toContain('85 kcal');
  });

  it('abre o modal de adição de refeição', () => {
    component.openAddMealModal('lunch');
    expect(component.isEditorOpen()).toBe(true);
    expect(component.editorMealType()).toBe('lunch');
  });

  it('permite abrir confirmação de exclusão e chamar exclusão', () => {
    state.dayData.set({
      date: '2026-10-16',
      meals: [mockMeal],
      waterEntries: [],
      totalWaterMl: 0,
      activities: [],
      dayTotals: { energyKcal: 85, proteinG: 1, carbohydrateG: 22, fatG: 0.1, fiberG: 2 },
    });
    fixture.detectChanges();

    vi.spyOn(state, 'deleteMeal').mockReturnValue(of(undefined));

    component.confirmDeleteMeal(mockMeal);
    expect(component.mealToDelete()).toEqual(mockMeal);

    component.executeDeleteMeal();
    expect(state.deleteMeal).toHaveBeenCalledWith('m-1');
  });
});
