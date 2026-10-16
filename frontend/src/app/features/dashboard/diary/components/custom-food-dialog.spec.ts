import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { CustomFoodDialog } from './custom-food-dialog';
import { DiaryApiService } from '../../../../core/diary/diary-api.service';
import type { FoodItem } from '../../../../core/diary/diary.model';

describe('CustomFoodDialog Component', () => {
  let component: CustomFoodDialog;
  let fixture: ComponentFixture<CustomFoodDialog>;
  let api: DiaryApiService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomFoodDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: DiaryApiService,
          useValue: {
            createCustomFood: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    api = TestBed.inject(DiaryApiService);
    fixture = TestBed.createComponent(CustomFoodDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inicia com formulário inválido', () => {
    expect(component).toBeTruthy();
    expect(component.form.valid).toBe(false);
  });

  it('emite evento foodCreated ao submeter alimento válido', () => {
    const mockCreated: FoodItem = {
      id: 'custom-123',
      name: 'Granola caseira',
      source: 'Rótulo',
      isCustom: true,
      nutrientsPer100g: {
        energyKcal: 400,
        proteinG: 10,
        carbohydrateG: 60,
        fatG: 12,
        fiberG: 8,
      },
      householdMeasures: [{ id: 'm-1', label: 'Colher de sopa', grams: 20 }],
    };

    vi.spyOn(api, 'createCustomFood').mockReturnValue(of(mockCreated));
    const spyEmit = vi.spyOn(component.foodCreated, 'emit');

    component.form.setValue({
      name: 'Granola caseira',
      source: 'Rótulo',
      energyKcal: 400,
      proteinG: 10,
      carbohydrateG: 60,
      fatG: 12,
      fiberG: 8,
      measureLabel: 'Colher de sopa',
      measureGrams: 20,
    });

    component.onSubmit();

    expect(api.createCustomFood).toHaveBeenCalled();
    expect(spyEmit).toHaveBeenCalledWith(mockCreated);
  });

  it('exibe mensagem de erro quando a API falha', () => {
    vi.spyOn(api, 'createCustomFood').mockReturnValue(
      throwError(() => new Error('Falha no servidor')),
    );

    component.form.setValue({
      name: 'Pão de milho',
      source: 'Rótulo',
      energyKcal: 250,
      proteinG: null,
      carbohydrateG: 45,
      fatG: 3,
      fiberG: null,
      measureLabel: '',
      measureGrams: null,
    });

    component.onSubmit();

    expect(component.errorMessage()).toBe('Falha no servidor');
  });

  it('emite fechamento ao cancelar', () => {
    const spy = vi.spyOn(component.closed, 'emit');
    component.onCancel();
    expect(spy).toHaveBeenCalled();
  });
});
