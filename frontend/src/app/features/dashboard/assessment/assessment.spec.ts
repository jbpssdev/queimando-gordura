import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { Assessment } from './assessment';
import { AssessmentStateService } from '../../../core/assessment/assessment-state.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import type { AssessmentDraftResponse } from '../../../core/assessment/assessment.model';

describe('Assessment Component', () => {
  let component: Assessment;
  let fixture: ComponentFixture<Assessment>;
  let stateService: AssessmentStateService;
  let router: Router;

  const mockSession = {
    userDisplayName: () => 'Ana',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Assessment],
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: mockSession },
      ],
    }).compileComponents();

    stateService = TestBed.inject(AssessmentStateService);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(Assessment);
    component = fixture.componentInstance;
  });

  it('carrega o rascunho inicial ao iniciar o componente', () => {
    const mockDraft: AssessmentDraftResponse = {
      id: 'draft-10',
      status: 'draft',
      body: {
        birthDate: '1990-01-01',
        biologicalSex: 'female',
        heightCm: 165,
        currentWeightKg: 65,
        scaleType: 'standard',
      },
    };

    vi.spyOn(stateService, 'loadDraft').mockReturnValue(of(mockDraft));

    fixture.detectChanges();

    expect(stateService.loadDraft).toHaveBeenCalled();
  });

  it('salva a seção e avança para a próxima etapa', () => {
    vi.spyOn(stateService, 'saveSection').mockReturnValue(of({ status: 'draft' }));
    vi.spyOn(stateService, 'nextStep');

    stateService.setStep(1);

    component.onSaveSection('body', {
      birthDate: '1990-01-01',
      biologicalSex: 'female',
      heightCm: 165,
      currentWeightKg: 65,
      scaleType: 'standard',
    });

    expect(stateService.saveSection).toHaveBeenCalledWith('body', expect.any(Object));
    expect(stateService.nextStep).toHaveBeenCalled();
  });

  it('solicita cálculo dos resultados e redireciona para /avaliacao/resultados', () => {
    vi.spyOn(stateService, 'evaluate').mockReturnValue(of({ currentWeightKg: 65 }));

    component.onEvaluate();

    expect(stateService.evaluate).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/avaliacao/resultados']);
  });
});
