import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepNutrition } from './step-nutrition';
import type { NutritionAssessmentDto } from '../../../../core/assessment/assessment.model';

describe('StepNutrition Component', () => {
  let component: StepNutrition;
  let fixture: ComponentFixture<StepNutrition>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepNutrition],
    }).compileComponents();

    fixture = TestBed.createComponent(StepNutrition);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('permite alternar desafios de emagrecimento na lista múltipla', () => {
    expect(component.hasChallenge('ansiedade')).toBe(false);

    component.toggleChallenge('ansiedade');
    expect(component.hasChallenge('ansiedade')).toBe(true);

    component.toggleChallenge('ansiedade');
    expect(component.hasChallenge('ansiedade')).toBe(false);
  });

  it('emite DTO com dados de nutrição e hábitos preenchidos', () => {
    component.form.controls.dailyMealsCount.setValue(4);
    component.form.controls.mealScheduleRegularity.setValue('regular');
    component.form.controls.hasKitchenScale.setValue(true);
    component.form.controls.foodBudgetLimitation.setValue(true);
    component.toggleChallenge('falta_tempo');

    let emittedDto: NutritionAssessmentDto | undefined;
    component.saveSection.subscribe((dto) => {
      emittedDto = dto;
    });

    component.onSubmit();

    expect(emittedDto).toBeDefined();
    expect(emittedDto?.dailyMealsCount).toBe(4);
    expect(emittedDto?.hasKitchenScale).toBe(true);
    expect(emittedDto?.foodBudgetLimitation).toBe(true);
    expect(emittedDto?.weightLossChallenges).toContain('falta_tempo');
  });
});
