import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Adaptation } from './adaptation';
import { AdaptationStateService } from '../../../core/adaptation/adaptation-state.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import type {
  AdaptationPlanResponse,
  AdaptationPreviewResponse,
} from '../../../core/adaptation/adaptation.model';

describe('Adaptation Component', () => {
  let component: Adaptation;
  let fixture: ComponentFixture<Adaptation>;
  let stateService: AdaptationStateService;

  const mockSession = {
    userDisplayName: () => 'Beatriz',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Adaptation],
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: mockSession },
      ],
    }).compileComponents();

    stateService = TestBed.inject(AdaptationStateService);
    fixture = TestBed.createComponent(Adaptation);
    component = fixture.componentInstance;
  });

  it('chama loadState na inicialização', () => {
    vi.spyOn(stateService, 'loadState').mockReturnValue(of(null));
    fixture.detectChanges();
    expect(stateService.loadState).toHaveBeenCalled();
  });

  it('exibe a prévia de modalidades quando não há plano ativo', () => {
    vi.spyOn(stateService, 'loadState').mockReturnValue(
      of({
        hasAssessment: true,
        assessmentCompleted: true,
        recommendedMode: 'standard',
        modes: {
          standard: { mode: 'standard', title: 'Padrão', description: '', available: true, recommended: true },
          intensified: { mode: 'intensified', title: 'Intensificada', description: '', available: false, recommended: false },
        },
      } as AdaptationPreviewResponse),
    );

    stateService.plan.set(null);
    stateService.preview.set({
      hasAssessment: true,
      assessmentCompleted: true,
      recommendedMode: 'standard',
      modes: {
        standard: { mode: 'standard', title: 'Modalidade Padrão', description: '', available: true, recommended: true },
        intensified: { mode: 'intensified', title: 'Modalidade Intensificada', description: '', available: false, recommended: false },
      },
    });
    stateService.loadStatus.set('ready');

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-adaptation-preview')).toBeTruthy();
    expect(compiled.querySelector('app-adaptation-journey')).toBeFalsy();
  });

  it('exibe a jornada ativa quando há plano em andamento', () => {
    const mockPlan: AdaptationPlanResponse = {
      uid: 'user-1',
      status: 'in_progress',
      mode: 'standard',
      timeZone: 'America/Sao_Paulo',
      startDate: '2026-10-16',
      endDate: '2026-11-14',
      currentDay: 1,
      totalDays: 30,
      days: [],
      createdAt: '2026-10-16T12:00:00Z',
      updatedAt: '2026-10-16T12:00:00Z',
    };

    stateService.plan.set(mockPlan);
    stateService.loadStatus.set('ready');
    vi.spyOn(stateService, 'loadState').mockReturnValue(of(mockPlan));

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-adaptation-journey')).toBeTruthy();
    expect(compiled.querySelector('app-adaptation-preview')).toBeFalsy();
  });

  it('inicia o plano ao disparar onStartPlan', () => {
    vi.spyOn(stateService, 'startPlan').mockReturnValue(of({} as AdaptationPlanResponse));
    component.onStartPlan();
    expect(stateService.startPlan).toHaveBeenCalled();
  });
});
