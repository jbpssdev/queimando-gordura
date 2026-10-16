import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { AssessmentApiService } from './assessment-api.service';
import type { AssessmentResponse, AssessmentResultDocument } from './assessment-contract';

const wire: AssessmentResponse = {
  status: 'draft',
  revision: 3,
  updatedAt: '2026-10-16T12:00:00.000Z',
  sections: {
    body: {
      dateOfBirth: '1990-01-15',
      sexForMetabolicFormula: 'unavailable',
      heightCm: 178.5,
      weightKg: 82.7,
      scaleType: 'standard',
    },
    health: null,
    routine: null,
    nutrition: null,
  },
};
const result: AssessmentResultDocument = {
  uid: 'owned-test',
  revision: 3,
  calculatedAt: wire.updatedAt,
  age: 36,
  body: wire.sections.body!,
  bmi: { value: 25.96, category: 'overweight', classification: 'Sobrepeso' },
  bmr: { calculated: false, formula: 'mifflin_st_jeor', bmrKcal: null },
  tdee: {
    estimatedTdeeKcal: null,
    minTdeeKcal: null,
    maxTdeeKcal: null,
    neatMultiplier: 0,
    exerciseAddonKcal: 0,
    explanation: 'Variável indisponível',
  },
  weightReference: {
    minNormalWeightKg: 58.9,
    maxNormalWeightKg: 79.3,
    milestone5PercentWeightKg: 78.6,
  },
  bodyComposition: { scaleType: 'standard' },
  safety: {
    status: 'professional_clearance_required',
    alerts: [{ code: 'TEST', level: 'warning', message: 'Orientação profissional' }],
    requiresProfessionalClearance: true,
    isEmergency: false,
    allowsAutomaticCaloricDeficit: false,
    allowsIntensifiedAdaptation: false,
  },
};
describe('AssessmentApiService: contrato Nest real', () => {
  let api: AssessmentApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AssessmentApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('recupera sections e revision sem perder precisão', async () => {
    const response = firstValueFrom(api.getDraft());
    http.expectOne('/api/v1/assessments/me').flush(wire);
    expect(await response).toMatchObject({
      revision: 3,
      body: {
        birthDate: '1990-01-15',
        biologicalSex: 'uninformed',
        currentWeightKg: 82.7,
        heightCm: 178.5,
      },
    });
  });
  it('envia nomes canônicos no PATCH e usa a seção devolvida pelo servidor', async () => {
    const response = firstValueFrom(
      api.saveSection('body', {
        birthDate: '1990-01-15',
        biologicalSex: 'uninformed',
        currentWeightKg: 82.7,
        heightCm: 178.5,
        scaleType: 'standard',
      }),
    );
    const req = http.expectOne('/api/v1/assessments/me');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.data).toMatchObject({
      dateOfBirth: '1990-01-15',
      sexForMetabolicFormula: 'unavailable',
      weightKg: 82.7,
      heightCm: 178.5,
    });
    expect(req.request.body.data.birthDate).toBeUndefined();
    req.flush(wire);
    expect((await response).revision).toBe(3);
  });
  for (const operation of ['evaluate', 'getResults'] as const) {
    it(`${operation}: apresenta métricas e segurança da API sem recalcular`, async () => {
      const response = firstValueFrom(api[operation]());
      const req = http.expectOne(
        '/api/v1/assessments/me/' + (operation === 'evaluate' ? 'evaluate' : 'results'),
      );
      expect(req.request.method).toBe(operation === 'evaluate' ? 'POST' : 'GET');
      req.flush(result);
      expect(await response).toMatchObject({
        revision: 3,
        calculatedAge: 36,
        currentWeightKg: 82.7,
        bmi: { value: 25.96, category: 'Sobrepeso' },
        bmrKcal: null,
        tdeeKcalRange: null,
        safetyOrientations: { level: 'medical_attention', message: 'Orientação profissional' },
      });
    });
  }
});
