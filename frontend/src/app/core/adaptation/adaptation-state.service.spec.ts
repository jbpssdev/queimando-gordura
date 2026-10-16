import type { User } from 'firebase/auth';
import { signal } from '@angular/core';
import { AuthSessionService } from '../auth/auth-session.service';
import { TestBed } from '@angular/core/testing';
import { build30DaysTimeline } from './adaptation-helpers';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AdaptationStateService } from './adaptation-state.service';
import { AdaptationApiService } from './adaptation-api.service';
import type { AdaptationPlanResponse, AdaptationPreviewResponse } from './adaptation.model';

describe('AdaptationStateService', () => {
  let service: AdaptationStateService;
  let mockApi: {
    getPreview: ReturnType<typeof vi.fn>;
    getPlan: ReturnType<typeof vi.fn>;
    startPlan: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    mockApi = {
      getPreview: vi.fn(),
      getPlan: vi.fn(),
      startPlan: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AdaptationStateService,
        { provide: AuthSessionService, useValue: { currentUser: signal(null) } },
        { provide: AdaptationApiService, useValue: mockApi },
      ],
    });

    service = TestBed.inject(AdaptationStateService);
  });

  it('inicializa com estado padrão', () => {
    expect(service.plan()).toBeNull();
    expect(service.preview()).toBeNull();
    expect(service.loadStatus()).toBe('idle');
    expect(service.hasActivePlan()).toBe(false);
  });

  describe('loadState', () => {
    it('carrega plano ativo quando a API retorna 200', () => {
      const mockPlan: AdaptationPlanResponse = {
        uid: 'user-abc',
        status: 'in_progress',
        mode: 'standard',
        timeZone: 'America/Recife',
        startDate: '2026-10-16',
        endDate: '2026-11-14',
        currentDay: 1,
        totalDays: 30,
        days: [],
        createdAt: '2026-10-16T10:00:00Z',
        updatedAt: '2026-10-16T10:00:00Z',
      };

      mockApi.getPlan.mockReturnValue(of(mockPlan));

      service.loadState().subscribe((plan) => {
        expect(plan).toEqual(mockPlan);
      });

      expect(service.plan()).toEqual(mockPlan);
      expect(service.hasActivePlan()).toBe(true);
      expect(service.loadStatus()).toBe('ready');
    });

    it('consulta preview de modalidades quando o plano ainda não foi iniciado (404)', () => {
      const error404 = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      mockApi.getPlan.mockReturnValue(throwError(() => error404));

      const mockPreview: AdaptationPreviewResponse = {
        hasAssessment: true,
        assessmentCompleted: true,
        recommendedMode: 'standard',
        modes: {
          standard: {
            mode: 'standard',
            title: 'Modalidade Padrão',
            description: 'Transição gradual.',
            available: true,
            recommended: true,
          },
          intensified: {
            mode: 'intensified',
            title: 'Modalidade Intensificada',
            description: 'Validação clínica.',
            available: false,
            restrictionReasons: ['Critérios de segurança.'],
            recommended: false,
          },
        },
      };

      mockApi.getPreview.mockReturnValue(of(mockPreview));

      service.loadState().subscribe((preview) => {
        expect(preview).toEqual(mockPreview);
      });

      expect(service.plan()).toBeNull();
      expect(service.preview()).toEqual(mockPreview);
      expect(service.selectedMode()).toBe('standard');
      expect(service.loadStatus()).toBe('ready');
    });

    it('lida com falhas 503 na consulta de plano', () => {
      const error503 = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
      mockApi.getPlan.mockReturnValue(throwError(() => error503));

      service.loadState().subscribe({
        error: (err) => {
          expect(err).toBe(error503);
        },
      });

      expect(service.loadStatus()).toBe('error');
      expect(service.loadError()).toContain('Não foi possível conectar ao servidor');
    });
  });

  describe('selectMode e restrições', () => {
    beforeEach(() => {
      service.preview.set({
        hasAssessment: true,
        assessmentCompleted: true,
        recommendedMode: 'standard',
        modes: {
          standard: {
            mode: 'standard',
            title: 'Modalidade Padrão',
            description: 'Sustentável.',
            available: true,
            recommended: true,
          },
          intensified: {
            mode: 'intensified',
            title: 'Modalidade Intensificada',
            description: 'Critérios adicionais.',
            available: false,
            restrictionReasons: ['Não recomendada para o seu perfil clínico atual.'],
            recommended: false,
          },
        },
      });
    });

    it('permite selecionar modalidade disponível', () => {
      service.selectMode('standard');
      expect(service.selectedMode()).toBe('standard');
      expect(service.isSelectedModeAvailable()).toBe(true);
    });

    it('rejeita selecionar modalidade indisponível / bloqueada', () => {
      service.selectedMode.set('standard');
      service.selectMode('intensified');
      // Permanece 'standard' pois 'intensified' tem available: false
      expect(service.selectedMode()).toBe('standard');
    });
  });

  describe('startPlan', () => {
    beforeEach(() => {
      service.preview.set({
        hasAssessment: true,
        assessmentCompleted: true,
        recommendedMode: 'standard',
        modes: {
          standard: {
            mode: 'standard',
            title: 'Modalidade Padrão',
            description: 'Sustentável.',
            available: true,
            recommended: true,
          },
          intensified: {
            mode: 'intensified',
            title: 'Modalidade Intensificada',
            description: 'Intensificada.',
            available: true,
            recommended: false,
          },
        },
      });
      service.selectedMode.set('standard');
    });

    it('inicia o plano enviando a modalidade e o fuso IANA', () => {
      const mockStartedPlan: AdaptationPlanResponse = {
        uid: 'user-xyz',
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

      mockApi.startPlan.mockReturnValue(of(mockStartedPlan));

      service.startPlan().subscribe((plan) => {
        expect(plan).toEqual(mockStartedPlan);
      });

      expect(mockApi.startPlan).toHaveBeenCalledWith({
        mode: 'standard',
        timeZone: expect.any(String),
      });
      expect(service.plan()).toEqual(mockStartedPlan);
      expect(service.isStarting()).toBe(false);
    });

    it('registra mensagem adequada em caso de conflito 409 (plano já iniciado)', () => {
      const error409 = new HttpErrorResponse({ status: 409, statusText: 'Conflict' });
      mockApi.startPlan.mockReturnValue(throwError(() => error409));
      mockApi.getPlan.mockReturnValue(of({} as AdaptationPlanResponse));

      service.startPlan().subscribe({
        error: (err) => {
          expect(err).toBe(error409);
        },
      });

      expect(service.startError()).toContain(
        'Seu plano de adaptação já foi iniciado anteriormente.',
      );
      expect(service.isStarting()).toBe(false);
    });
  });

  describe('timelineDays e marcos', () => {
    it('gera 30 dias com destaque para o dia atual e marcos em 7, 14, 21 e 30', () => {
      service.plan.set({
        uid: 'user-1',
        status: 'in_progress',
        mode: 'standard',
        timeZone: 'America/Sao_Paulo',
        startDate: '2026-10-01',
        endDate: '2026-10-30',
        currentDay: 10,
        totalDays: 30,
        days: build30DaysTimeline('2026-10-01', 10),
        createdAt: '2026-10-01T00:00:00Z',
        updatedAt: '2026-10-01T00:00:00Z',
      });

      const days = service.timelineDays();
      expect(days.length).toBe(30);

      const day1 = days[0];
      expect(day1?.dayNumber).toBe(1);
      expect(day1?.isPast).toBe(true);
      expect(day1?.isToday).toBe(false);

      const day10 = days[9];
      expect(day10?.dayNumber).toBe(10);
      expect(day10?.isPast).toBe(false);
      expect(day10?.isToday).toBe(true);

      const day15 = days[14];
      expect(day15?.dayNumber).toBe(15);
      expect(day15?.isFuture).toBe(true);

      // Marcos
      const day7 = days[6];
      expect(day7?.isMilestone).toBe(true);
      expect(day7?.milestoneTitle).toContain('Marco 1');

      const day14 = days[13];
      expect(day14?.isMilestone).toBe(true);
      expect(day14?.milestoneTitle).toContain('Marco 2');

      const day21 = days[20];
      expect(day21?.isMilestone).toBe(true);
      expect(day21?.milestoneTitle).toContain('Marco 3');

      const day30 = days[29];
      expect(day30?.isMilestone).toBe(true);
      expect(day30?.milestoneTitle).toContain('Marco 4');
    });
  });
  it('limpa dados e cancela resposta anterior quando a identidade muda', () => {
    const session = TestBed.inject(AuthSessionService);
    session.currentUser.set({ uid: 'first' } as User);
    TestBed.tick();
    const pending = new Subject<AdaptationPlanResponse>();
    mockApi.getPlan.mockReturnValue(pending);
    service.loadState().subscribe();
    session.currentUser.set({ uid: 'second' } as User);
    TestBed.tick();
    pending.next({ currentDay: 20 } as AdaptationPlanResponse);
    expect(service.plan()).toBeNull();
    expect(service.preview()).toBeNull();
    expect(service.loadStatus()).toBe('idle');
  });
});
