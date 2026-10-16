import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepHealth } from './step-health';
import type { HealthAssessmentDto } from '../../../../core/assessment/assessment.model';

describe('StepHealth Component', () => {
  let component: StepHealth;
  let fixture: ComponentFixture<StepHealth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepHealth],
    }).compileComponents();

    fixture = TestBed.createComponent(StepHealth);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('limpa condições selecionadas ao marcar "Nenhuma condição conhecida"', () => {
    component.form.controls.declarationType.setValue('conditions');
    component.toggleCondition('cardiovascular');
    component.toggleCondition('diabetesOrGlycemic');
    expect(component.selectedConditions().length).toBe(2);

    // Usuário altera para 'none'
    component.form.controls.declarationType.setValue('none');
    component.onDeclarationChange('none');

    expect(component.selectedConditions().length).toBe(0);
  });

  it('detecta sintomas urgentes de dor no peito e desmaios', () => {
    expect(component.hasUrgentSymptoms()).toBe(false);

    component.toggleSymptom('chestPain');
    expect(component.hasUrgentSymptoms()).toBe(true);

    component.toggleSymptom('fainting');
    expect(component.hasUrgentSymptoms()).toBe(true);

    // Marca 'none' (limpa os outros)
    component.toggleSymptom('none');
    expect(component.hasUrgentSymptoms()).toBe(false);
  });

  it('emite DTO com dados de saúde válidos ao submeter', () => {
    component.form.controls.declarationType.setValue('conditions');
    component.toggleCondition('cardiovascular');
    component.form.controls.takesContinuousMedication.setValue(true);
    component.form.controls.medicationsDetails.setValue('Losartana 50mg');

    let emittedDto: HealthAssessmentDto | undefined;
    component.saveSection.subscribe((dto) => {
      emittedDto = dto;
    });

    component.onSubmit();

    expect(emittedDto).toBeDefined();
    expect(emittedDto?.declarationType).toBe('conditions');
    expect(emittedDto?.conditions).toEqual(['cardiovascular']);
    expect(emittedDto?.takesContinuousMedication).toBe(true);
    expect(emittedDto?.medicationsDetails).toBe('Losartana 50mg');
  });
});
