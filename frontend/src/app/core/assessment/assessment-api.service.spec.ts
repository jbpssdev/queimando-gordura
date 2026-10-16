import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AssessmentApiService } from './assessment-api.service';
import type {
  AssessmentDraftResponse,
  AssessmentResultsResponse,
  BodyAssessmentDto,
} from './assessment.model';

describe('AssessmentApiService', () => {
  let service: AssessmentApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(AssessmentApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('consulta rascunho com GET /api/v1/assessments/me', () => {
    const mockDraft: AssessmentDraftResponse = {
      id: 'draft-1',
      status: 'draft',
      body: {
        birthDate: '1995-04-12',
        biologicalSex: 'female',
        heightCm: 165,
        currentWeightKg: 68.5,
        scaleType: 'standard',
      },
    };

    service.getDraft().subscribe((res) => {
      expect(res).toEqual(mockDraft);
    });

    const req = httpTesting.expectOne('/api/v1/assessments/me');
    expect(req.request.method).toBe('GET');
    req.flush(mockDraft);
  });

  it('salva uma seção com PATCH /api/v1/assessments/me enviando section e data', () => {
    const bodyData: BodyAssessmentDto = {
      birthDate: '1990-01-15',
      biologicalSex: 'male',
      heightCm: 178,
      currentWeightKg: 82.0,
      scaleType: 'standard',
    };

    const mockResponse: AssessmentDraftResponse = {
      id: 'draft-1',
      status: 'draft',
      body: bodyData,
    };

    service.saveSection('body', bodyData).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne('/api/v1/assessments/me');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({
      section: 'body',
      data: bodyData,
    });
    req.flush(mockResponse);
  });

  it('solicita cálculo final com POST /api/v1/assessments/me/evaluate', () => {
    const mockResults: AssessmentResultsResponse = {
      calculatedAge: 36,
      currentWeightKg: 82.0,
      heightCm: 178,
      bmi: {
        value: 25.9,
        category: 'Sobrepeso',
        description: 'Faixa comumente associada a sobrepeso populacional.',
      },
      bmrKcal: {
        value: 1780,
        formula: 'Mifflin-St Jeor',
        description: 'Gasto metabólico basal estimado.',
      },
    };

    service.evaluate().subscribe((res) => {
      expect(res).toEqual(mockResults);
    });

    const req = httpTesting.expectOne('/api/v1/assessments/me/evaluate');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({});
    req.flush(mockResults);
  });

  it('consulta os resultados vigentes com GET /api/v1/assessments/me/results', () => {
    const mockResults: AssessmentResultsResponse = {
      calculatedAge: 30,
      currentWeightKg: 70,
      heightCm: 170,
    };

    service.getResults().subscribe((res) => {
      expect(res).toEqual(mockResults);
    });

    const req = httpTesting.expectOne('/api/v1/assessments/me/results');
    expect(req.request.method).toBe('GET');
    req.flush(mockResults);
  });
});
