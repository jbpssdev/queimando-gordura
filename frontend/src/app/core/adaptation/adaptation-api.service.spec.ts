import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdaptationApiService } from './adaptation-api.service';
import type {
  AdaptationPlanResponse,
  AdaptationPreviewResponse,
  StartAdaptationDto,
} from './adaptation.model';

describe('AdaptationApiService', () => {
  let service: AdaptationApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AdaptationApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('consulta prévia com GET /api/v1/adaptation/me/preview', () => {
    const mockPreview: AdaptationPreviewResponse = {
      hasAssessment: true,
      assessmentCompleted: true,
      recommendedMode: 'standard',
      modes: {
        standard: {
          mode: 'standard',
          title: 'Modalidade Padrão',
          description: 'Acompanhamento gradual e sustentável.',
          available: true,
          recommended: true,
        },
        intensified: {
          mode: 'intensified',
          title: 'Modalidade Intensificada',
          description: 'Acompanhamento sujeito a validação clínica.',
          available: false,
          restrictionReasons: ['Critérios de segurança exigem avaliação profissional prévia.'],
          recommended: false,
        },
      },
    };

    service.getPreview().subscribe((res) => {
      expect(res).toEqual(mockPreview);
    });

    const req = httpTesting.expectOne('/api/v1/adaptation/me/preview');
    expect(req.request.method).toBe('GET');
    req.flush(mockPreview);
  });

  it('consulta plano ativo com GET /api/v1/adaptation/me', () => {
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

    service.getPlan().subscribe((res) => {
      expect(res).toEqual(mockPlan);
    });

    const req = httpTesting.expectOne('/api/v1/adaptation/me');
    expect(req.request.method).toBe('GET');
    req.flush(mockPlan);
  });

  it('inicia o plano com POST /api/v1/adaptation/me/start enviando mode e timeZone', () => {
    const dto: StartAdaptationDto = {
      mode: 'standard',
      timeZone: 'America/Sao_Paulo',
    };

    const mockResponse: AdaptationPlanResponse = {
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

    service.startPlan(dto).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne('/api/v1/adaptation/me/start');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(dto);
    req.flush(mockResponse);
  });
});
