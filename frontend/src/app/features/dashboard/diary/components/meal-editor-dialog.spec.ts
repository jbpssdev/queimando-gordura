import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { MealEditorDialog } from './meal-editor-dialog';
import { DiaryApiService } from '../../../../core/diary/diary-api.service';
import type { DiaryMeal, FoodItem } from '../../../../core/diary/diary.model';

describe('MealEditorDialog Component', () => {
  let component: MealEditorDialog;
  let fixture: ComponentFixture<MealEditorDialog>;
  let api: DiaryApiService;

  const mockFood: FoodItem = {
    id: 'f-1',
    name: 'Feijão preto cozido',
    source: 'TACO',
    nutrientsPer100g: {
      energyKcal: 77,
      proteinG: 4.5,
      carbohydrateG: 14,
      fatG: 0.5,
      fiberG: 8.4,
    },
    householdMeasures: [
      { id: 'm-concha', label: 'Concha média', grams: 85 },
    ],
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MealEditorDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: DiaryApiService,
          useValue: {
            searchFoods: vi.fn().mockReturnValue(of({ items: [mockFood] })),
            createMeal: vi.fn(),
            updateMeal: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    api = TestBed.inject(DiaryApiService);
    fixture = TestBed.createComponent(MealEditorDialog);
    component = fixture.componentInstance;
    component.date = '2026-10-16';
    fixture.detectChanges();
  });

  it('inicializa e renderiza corretamente', () => {
    expect(component).toBeTruthy();
    expect(component.mealItems().length).toBe(0);
  });

  it('permite selecionar alimento e adicioná-lo à refeição com medida em gramas', () => {
    component.selectFood(mockFood);
    expect(component.selectedFood()).toEqual(mockFood);
    expect(component.itemUnit()).toBe('g');

    component.itemAmount.set(150);
    component.addItemToMeal();

    expect(component.mealItems().length).toBe(1);
    expect(component.mealItems()[0]?.foodName).toBe('Feijão preto cozido');
    expect(component.mealItems()[0]?.calculatedGrams).toBe(150);
  });

  it('permite alternar para medida caseira com cálculo proporcional', () => {
    component.selectFood(mockFood);
    component.itemUnit.set('household');
    component.selectedMeasureId.set('m-concha');
    component.itemAmount.set(2); // 2 conchas = 170g

    const preview = component.itemNutrientsPreview();
    expect(preview.calculatedGrams).toBe(170);

    component.addItemToMeal();
    expect(component.mealItems().length).toBe(1);
    expect(component.mealItems()[0]?.unit).toBe('household');
  });

  it('permite remover item da lista', () => {
    component.selectFood(mockFood);
    component.addItemToMeal();
    expect(component.mealItems().length).toBe(1);

    component.removeItem(0);
    expect(component.mealItems().length).toBe(0);
  });

  it('salva nova refeição e emite evento', () => {
    const mockCreatedMeal: DiaryMeal = {
      id: 'meal-new',
      date: '2026-10-16',
      mealType: 'lunch',
      items: [],
      totalKcal: 150,
      totalProteinG: 10,
      totalCarbG: 20,
      totalFatG: 2,
      totalFiberG: 4,
    };

    vi.spyOn(api, 'createMeal').mockReturnValue(of(mockCreatedMeal));
    const spy = vi.spyOn(component.saved, 'emit');

    component.selectFood(mockFood);
    component.addItemToMeal();
    component.onSaveMeal();

    expect(api.createMeal).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith(mockCreatedMeal);
  });
});
