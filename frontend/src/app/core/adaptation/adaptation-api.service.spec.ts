import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdaptationApiService } from './adaptation-api.service';

describe('AdaptationApiService contrato real', () => {
  let service: AdaptationApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AdaptationApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('apresenta disponibilidade, motivos e avisos decididos exclusivamente pela API', () => {
    service.getPreview().subscribe((value) => {
      expect(value.hasAssessment).toBe(true);
      expect(value.recommendedMode).toBeNull();
      expect(value.modes.standard.available).toBe(false);
      expect(value.safetyAlerts).toEqual(['Orientação profissional necessária.']);
      expect(value.calorieTargetKcal).toBeNull();
    });
    http.expectOne('/api/v1/adaptation/me/preview').flush({
      assessmentRevision: 8,
      recommendedMode: null,
      modes: {
        standard: { available: false, reasons: ['CLINICAL_CONDITION_RESTRICTION'] },
        intensified: { available: false, reasons: ['CLINICAL_POLICY_PENDING'] },
      },
      calorieTargetAvailable: false,
      notices: [{ code: 'ALERT', message: 'Orientação profissional necessária.' }],
    });
  });
  const wire = {
    id: 'initial',
    status: 'active',
    mode: 'standard',
    assessmentRevision: 8,
    startedAt: '2026-10-16T12:00:00Z',
    timeZone: 'America/Sao_Paulo',
    startLocalDate: '2026-10-16',
    day30LocalDate: '2026-11-14',
    currentDay: 8,
    elapsedDays: 7,
    remainingDays: 23,
    calendarProgressPercent: 23.3,
    calendar: [
      { dayNumber: 7, localDate: '2026-10-22', temporalState: 'past' },
      { dayNumber: 8, localDate: '2026-10-23', temporalState: 'today' },
    ],
    calorieTarget: null,
    notices: [],
  };
  for (const method of ['GET', 'POST'] as const)
    it(`mapeia calendário e progresso do ${method} sem recalcular`, () => {
      const dto = { mode: 'standard' as const, timeZone: 'America/Sao_Paulo' };
      const result = method === 'GET' ? service.getPlan() : service.startPlan(dto);
      result.subscribe((plan) => {
        expect(plan.status).toBe('in_progress');
        expect(plan.startDate).toBe('2026-10-16');
        expect(plan.calendarProgressPercent).toBe(23.3);
        expect(plan.days[0]?.isPast).toBe(true);
        expect(plan.days[0]?.isMilestone).toBe(true);
        expect(plan.days[1]?.isToday).toBe(true);
      });
      const req = http.expectOne('/api/v1/adaptation/me' + (method === 'POST' ? '/start' : ''));
      expect(req.request.method).toBe(method);
      if (method === 'POST') expect(req.request.body).toEqual(dto);
      req.flush(wire);
    });
});
