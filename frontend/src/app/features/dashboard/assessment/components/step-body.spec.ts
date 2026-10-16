import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StepBody } from './step-body';
import type { BodyAssessmentDto } from '../../../../core/assessment/assessment.model';

describe('StepBody Component', () => {
  let component: StepBody;
  let fixture: ComponentFixture<StepBody>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StepBody],
    }).compileComponents();

    fixture = TestBed.createComponent(StepBody);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('não converte uma medida opcional inválida em remoção silenciosa', () => {
    component.form.patchValue({
      birthDate: '1990-05-15',
      heightCm: '170',
      currentWeightKg: '70',
      waistCircumferenceCm: 'abc',
    });
    const emitted = vi.fn();
    component.saveSection.subscribe(emitted);
    component.onSubmit();
    expect(component.form.hasError('invalidOptional')).toBe(true);
    expect(emitted).not.toHaveBeenCalled();
  });

  it('invalida data de nascimento para menores de 18 anos', () => {
    // Definir data de nascimento de 10 anos atrás
    const today = new Date();
    const tenYearsAgo = `${today.getFullYear() - 10}-01-01`;

    component.form.controls.birthDate.setValue(tenYearsAgo);
    component.onBirthDateChange();

    expect(component.form.controls.birthDate.invalid).toBe(true);
    expect(component.form.controls.birthDate.hasError('minimumAge')).toBe(true);
    expect(component.calculatedAge()).toBe(10);
  });

  it('valida data de nascimento para maiores de 18 anos', () => {
    const today = new Date();
    const twentyYearsAgo = `${today.getFullYear() - 20}-01-01`;

    component.form.controls.birthDate.setValue(twentyYearsAgo);
    component.onBirthDateChange();

    expect(component.form.controls.birthDate.valid).toBe(true);
    expect(component.calculatedAge()).toBe(20);
  });

  it('aceita números decimais com vírgula no formato brasileiro para peso e altura', () => {
    component.form.controls.birthDate.setValue('1990-05-15');
    component.form.controls.heightCm.setValue('175,5');
    component.form.controls.currentWeightKg.setValue('82,7');
    component.form.controls.scaleType.setValue('standard');

    let emittedDto: BodyAssessmentDto | undefined;
    component.saveSection.subscribe((dto) => {
      emittedDto = dto;
    });

    component.onSubmit();

    expect(emittedDto).toBeDefined();
    expect(emittedDto?.heightCm).toBe(175.5); // preserva precisão
    expect(emittedDto?.currentWeightKg).toBe(82.7);
  });

  it('exibe e emite campos condicionais de bioimpedância quando selecionada', () => {
    component.form.controls.birthDate.setValue('1992-08-20');
    component.form.controls.heightCm.setValue('170');
    component.form.controls.currentWeightKg.setValue('68');
    component.form.controls.scaleType.setValue('bioimpedance');
    component.form.controls.bodyFatPercentage.setValue('22,5');
    component.form.controls.muscleMassKg.setValue('31,2');
    component.form.controls.visceralFatLevel.setValue('6');

    let emittedDto: BodyAssessmentDto | undefined;
    component.saveSection.subscribe((dto) => {
      emittedDto = dto;
    });

    component.onSubmit();

    expect(emittedDto?.scaleType).toBe('bioimpedance');
    expect(emittedDto?.bodyFatPercentage).toBe(22.5);
    expect(emittedDto?.muscleMassKg).toBe(31.2);
    expect(emittedDto?.visceralFatLevel).toBe(6);
  });

  it('permite a opção "Prefiro não informar" para a variável biológica', () => {
    component.form.controls.biologicalSex.setValue('uninformed');
    expect(component.form.controls.biologicalSex.valid).toBe(true);

    component.form.controls.birthDate.setValue('1990-01-01');
    component.form.controls.heightCm.setValue('170');
    component.form.controls.currentWeightKg.setValue('70');

    let emittedDto: BodyAssessmentDto | undefined;
    component.saveSection.subscribe((dto) => {
      emittedDto = dto;
    });

    component.onSubmit();
    expect(emittedDto?.biologicalSex).toBe('uninformed');
  });
});
