import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { Dashboard } from './dashboard';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AdaptationStateService } from '../../../core/adaptation/adaptation-state.service';
import type { AdaptationPlanResponse } from '../../../core/adaptation/adaptation.model';

describe('Dashboard Component', () => {
  let component: Dashboard;
  let fixture: ComponentFixture<Dashboard>;
  let adaptationState: AdaptationStateService;

  const mockSession = {
    currentUser: () => ({ email: 'carlos@exemplo.com' }),
    userDisplayName: () => 'Carlos',
    signOut: vi.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Dashboard],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthSessionService, useValue: mockSession },
      ],
    }).compileComponents();

    adaptationState = TestBed.inject(AdaptationStateService);
    fixture = TestBed.createComponent(Dashboard);
    component = fixture.componentInstance;
  });

  it('exibe o nome do usuário e status da adaptação não iniciada', () => {
    expect(component).toBeTruthy();
    vi.spyOn(adaptationState, 'loadState').mockReturnValue(of(null));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Olá, Carlos!');
    expect(compiled.textContent).toContain('Programa Adaptação');
    expect(compiled.textContent).toContain('Conhecer e Iniciar Adaptação');
  });

  it('exibe o dia ativo e link para a jornada quando o plano está em andamento', () => {
    const mockPlan: AdaptationPlanResponse = {
      uid: 'user-1',
      status: 'in_progress',
      mode: 'standard',
      timeZone: 'America/Sao_Paulo',
      startDate: '2026-10-16',
      endDate: '2026-11-14',
      currentDay: 7,
      totalDays: 30,
      days: [],
      createdAt: '2026-10-16T12:00:00Z',
      updatedAt: '2026-10-16T12:00:00Z',
    };

    adaptationState.plan.set(mockPlan);
    vi.spyOn(adaptationState, 'loadState').mockReturnValue(of(mockPlan));
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Dia 7 de 30');
    expect(compiled.textContent).toContain('Acessar Minha Jornada (Dia 7/30)');
  });
});
