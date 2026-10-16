import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepRoutine } from './step-routine';
import type { RoutineAssessmentDto } from '../../../../core/assessment/assessment.model';

describe('StepRoutine Component', () => {
  let component: StepRoutine;
  let fixture: ComponentFixture<StepRoutine>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepRoutine],
    }).compileComponents();

    fixture = TestBed.createComponent(StepRoutine);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exige dias, duração e intensidade somente quando exercício é informado', () => {
    expect(component.form.valid).toBe(true);
    component.form.controls.practicesStrengthTraining.setValue(true);
    expect(component.form.hasError('invalidTraining')).toBe(true);
    component.form.patchValue({
      strengthDaysPerWeek: 3,
      strengthMinutesPerSession: 45,
      strengthIntensity: 'moderate',
    });
    expect(component.form.valid).toBe(true);
  });

  it('inicializa com valores padrões válidos para rotina profissional e horas sentado', () => {
    expect(component.form.valid).toBe(true);
    expect(component.form.controls.workRoutine.value).toBe('sedentary');
    expect(component.form.controls.sittingHoursPerDay.value).toBe(8);
  });

  it('emite dados condicionais de musculação e cardio apenas se praticados', () => {
    component.form.controls.practicesStrengthTraining.setValue(true);
    component.form.controls.strengthDaysPerWeek.setValue(4);
    component.form.controls.strengthMinutesPerSession.setValue(45);
    component.form.controls.strengthIntensity.setValue('moderate');

    component.form.controls.practicesCardio.setValue(false);

    let emittedDto: RoutineAssessmentDto | undefined;
    component.saveSection.subscribe((dto) => {
      emittedDto = dto;
    });

    component.onSubmit();

    expect(emittedDto).toBeDefined();
    expect(emittedDto?.practicesStrengthTraining).toBe(true);
    expect(emittedDto?.strengthDaysPerWeek).toBe(4);
    expect(emittedDto?.practicesCardio).toBe(false);
    expect(emittedDto?.cardioDaysPerWeek).toBeNull();
  });
});
