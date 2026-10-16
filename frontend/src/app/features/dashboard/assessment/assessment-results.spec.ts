import { of } from 'rxjs';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AssessmentResults } from './assessment-results';
import { AssessmentStateService } from '../../../core/assessment/assessment-state.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import type { AssessmentResultsResponse } from '../../../core/assessment/assessment.model';

describe('AssessmentResults Component', () => {
  let component: AssessmentResults;
  let fixture: ComponentFixture<AssessmentResults>;
  let stateService: AssessmentStateService;

  const mockSession = {
    currentUser: () => null,
    userDisplayName: () => 'Carlos',
  };

  const mockResults: AssessmentResultsResponse = {
    calculatedAge: 35,
    currentWeightKg: 85.0,
    heightCm: 180,
    bmi: {
      value: 26.2,
      category: 'Sobrepeso',
      description: 'Faixa estatística de sobrepeso.',
    },
    bmrKcal: {
      value: 1820,
      formula: 'Mifflin-St Jeor',
      description: 'Gasto metabólico basal de repouso.',
    },
    tdeeKcalRange: {
      min: 2200,
      max: 2500,
      description: 'Faixa de gasto energético total diário estimado.',
    },
    target5PercentWeightKg: 80.8,
    bmiReferenceWeightRange: {
      min: 60.0,
      max: 80.9,
      description: 'Faixa demográfica referencial.',
    },
    desiredWeightKg: 78.0,
    safetyOrientations: {
      level: 'medical_attention',
      message:
        'Sua saúde merece atenção individualizada. Recomendamos conversar com seu médico antes de iniciar um plano de emagrecimento.',
      details: ['Histórico de hipertensão declarado'],
    },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssessmentResults],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthSessionService, useValue: mockSession },
      ],
    }).compileComponents();

    stateService = TestBed.inject(AssessmentStateService);
    stateService.results.set(mockResults);
    vi.spyOn(stateService, 'loadResults').mockReturnValue(of(mockResults));

    fixture = TestBed.createComponent(AssessmentResults);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('exibe as métricas de peso atual, idade e IMC na tela', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('85');
    expect(compiled.textContent).toContain('35');
    expect(compiled.textContent).toContain('26,2');
    expect(compiled.textContent).toContain('Sobrepeso');
  });

  it('exibe estimativas de TMB e alerta que não deve ser confundida com meta diária', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('1.820');
    expect(compiled.textContent).toContain('Taxa Metabólica Basal');
    expect(compiled.textContent).toContain(
      'NÃO deve ser confundida com sua meta de calorias diárias',
    );
  });

  it('apresenta o banner de orientações de segurança médica quando indicado', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Orientação de Segurança e Atenção Individualizada');
    expect(compiled.textContent).toContain('Sua saúde merece atenção individualizada');
  });

  it('apresenta a introdução da Adaptação de 30 dias com botão de acesso ao plano', () => {
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Adaptação — sua jornada de 30 dias');
    expect(compiled.textContent).toContain('Modalidade Padrão');
    expect(compiled.textContent).toContain('Modalidade Intensificada');
    expect(compiled.textContent).toContain('Iniciar Programa Adaptação (30 Dias)');
  });
});
