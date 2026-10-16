import { AuthSessionService } from '../auth/auth-session.service';
import { signal } from '@angular/core';
import type { User } from 'firebase/auth';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { AssessmentStateService } from './assessment-state.service';
import { AssessmentApiService } from './assessment-api.service';
import type {
  AssessmentDraftResponse,
  AssessmentResultsResponse,
  BodyAssessmentDto,
} from './assessment.model';

describe('AssessmentStateService', () => {
  let service: AssessmentStateService;
  const currentUser = signal<User | null>(null);
  let mockApi: {
    getDraft: ReturnType<typeof vi.fn>;
    saveSection: ReturnType<typeof vi.fn>;
    evaluate: ReturnType<typeof vi.fn>;
    getResults: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    currentUser.set(null);
    mockApi = {
      getDraft: vi.fn(),
      saveSection: vi.fn(),
      evaluate: vi.fn(),
      getResults: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        AssessmentStateService,
        { provide: AuthSessionService, useValue: { currentUser } },
        { provide: AssessmentApiService, useValue: mockApi },
      ],
    });

    service = TestBed.inject(AssessmentStateService);
  });

  it('inicializa com etapa 1 e status ocioso', () => {
    expect(service.currentStep()).toBe(1);
    expect(service.loadStatus()).toBe('idle');
    expect(service.saveStatus()).toBe('idle');
    expect(service.draft()).toBeNull();
  });

  it('cancela respostas pendentes e limpa dados de saúde ao trocar de identidade', () => {
    currentUser.set({ uid: 'first' } as User);
    TestBed.tick();
    const response = new Subject<AssessmentDraftResponse>();
    mockApi.getDraft.mockReturnValue(response);
    service.loadDraft().subscribe();
    currentUser.set({ uid: 'second' } as User);
    TestBed.tick();
    response.next({ body: { currentWeightKg: 99 } as BodyAssessmentDto });
    expect(service.draft()).toBeNull();
    expect(service.results()).toBeNull();
    expect(service.lastSavedAt()).toBeNull();
  });

  it.each([401, 409, 503])(
    'expõe falha %s ao consultar resultados, sem manter métricas antigas',
    (status) => {
      mockApi.getResults.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      service.results.set({ currentWeightKg: 99 });
      service.loadResults().subscribe({ error: () => undefined });
      expect(service.results()).toBeNull();
      expect(service.isEvaluating()).toBe(false);
      expect(service.evaluateError()).toBeTruthy();
    },
  );

  describe('loadDraft', () => {
    it('carrega rascunho com sucesso e define status ready', () => {
      const mockDraft: AssessmentDraftResponse = {
        id: '123',
        status: 'draft',
        body: {
          birthDate: '1992-03-20',
          biologicalSex: 'female',
          heightCm: 168,
          currentWeightKg: 70,
          scaleType: 'standard',
        },
      };

      mockApi.getDraft.mockReturnValue(of(mockDraft));

      service.loadDraft().subscribe((draft) => {
        expect(draft).toEqual(mockDraft);
      });

      expect(service.draft()).toEqual(mockDraft);
      expect(service.loadStatus()).toBe('ready');
      expect(service.loadError()).toBeNull();
    });

    it('inicializa rascunho vazio sem erro quando a API responde 404', () => {
      const error404 = new HttpErrorResponse({ status: 404, statusText: 'Not Found' });
      mockApi.getDraft.mockReturnValue(throwError(() => error404));

      service.loadDraft().subscribe((draft) => {
        expect(draft).toEqual({ status: 'draft' });
      });

      expect(service.draft()).toEqual({ status: 'draft' });
      expect(service.loadStatus()).toBe('ready');
      expect(service.loadError()).toBeNull();
    });

    it('registra mensagem amigável quando a API falha com 503', () => {
      const error503 = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
      mockApi.getDraft.mockReturnValue(throwError(() => error503));

      service.loadDraft().subscribe({
        error: (err) => {
          expect(err).toBe(error503);
        },
      });

      expect(service.loadStatus()).toBe('error');
      expect(service.loadError()).toContain('Não foi possível conectar ao servidor');
    });
  });

  describe('saveSection', () => {
    it('salva a seção com sucesso e atualiza o estado local do rascunho', () => {
      const bodyData: BodyAssessmentDto = {
        birthDate: '1988-11-05',
        biologicalSex: 'male',
        heightCm: 180,
        currentWeightKg: 85,
        scaleType: 'standard',
      };

      mockApi.saveSection.mockReturnValue(of({ body: bodyData }));

      service.saveSection('body', bodyData).subscribe();

      expect(service.saveStatus()).toBe('saved');
      expect(service.draft()?.body).toEqual(bodyData);
      expect(service.lastSavedAt()).toBeInstanceOf(Date);
    });

    it('registra erro de salvamento sem perder dados locais quando a API falha', () => {
      const error503 = new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' });
      mockApi.saveSection.mockReturnValue(throwError(() => error503));

      service.saveSection('body', { heightCm: 175 }).subscribe({
        error: (err) => {
          expect(err).toBe(error503);
        },
      });

      expect(service.saveStatus()).toBe('error');
      expect(service.saveError()).toContain('Serviço temporariamente indisponível');
    });
  });

  describe('evaluate', () => {
    it('solicita cálculo dos resultados e armazena o retorno no signal results', () => {
      const mockResults: AssessmentResultsResponse = {
        calculatedAge: 38,
        currentWeightKg: 85,
        heightCm: 180,
        bmi: { value: 26.2, category: 'Sobrepeso', description: 'IMC contextualizado' },
      };

      mockApi.evaluate.mockReturnValue(of(mockResults));

      service.evaluate().subscribe((res) => {
        expect(res).toEqual(mockResults);
      });

      expect(service.results()).toEqual(mockResults);
      expect(service.isEvaluating()).toBe(false);
      expect(service.evaluateError()).toBeNull();
    });
  });

  describe('navegação entre etapas', () => {
    it('permite avançar, retroceder e definir etapas dentro dos limites 1 a 5', () => {
      expect(service.currentStep()).toBe(1);

      service.nextStep();
      expect(service.currentStep()).toBe(2);

      service.previousStep();
      expect(service.currentStep()).toBe(1);

      // Limite inferior
      service.previousStep();
      expect(service.currentStep()).toBe(1);

      service.setStep(4);
      expect(service.currentStep()).toBe(4);

      service.nextStep();
      expect(service.currentStep()).toBe(5);

      // Limite superior
      service.nextStep();
      expect(service.currentStep()).toBe(5);
    });
  });

  describe('canEvaluate e pendências', () => {
    it('aguarda as demais seções obrigatórias mesmo com dados corporais completos', () => {
      service.draft.set({
        body: {
          birthDate: '1990-01-01',
          biologicalSex: 'female',
          heightCm: 165,
          currentWeightKg: 65,
          scaleType: 'standard',
          // Opcionais não preenchidos (circunferências, bioimpedância, peso desejado)
        },
      });

      expect(service.essentialPending().length).toBe(3);
      expect(service.canEvaluate()).toBe(false); // saúde, rotina e nutrição ainda não persistidas
      expect(service.optionalPending().length).toBeGreaterThan(0);
    });

    it('bloqueia avaliação se data de nascimento ou peso estiverem ausentes', () => {
      service.draft.set({
        body: {
          birthDate: '',
          biologicalSex: 'uninformed',
          heightCm: 165,
          currentWeightKg: 0,
          scaleType: 'standard',
        },
      });

      expect(service.canEvaluate()).toBe(false);
      expect(service.essentialPending().length).toBeGreaterThan(0);
    });
  });
});
