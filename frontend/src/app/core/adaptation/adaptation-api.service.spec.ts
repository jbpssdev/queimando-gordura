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

  it('consulta e adapta progresso, evolução de peso e conquistas', () => {
    const wireProgress = {
      planStatus: 'active' as const,
      mode: 'standard' as const,
      currentDay: 14,
      totalDays: 30,
      startLocalDate: '2026-10-01',
      day30LocalDate: '2026-10-30',
      timeZone: 'America/Sao_Paulo',
      reportAvailable: true,
      calorieTarget: null,
      summary: {
        totalDaysMonitored: 14,
        daysWithMeals: 12,
        daysWithWater: 14,
        daysWithActivities: 8,
        daysWithWeight: 2,
        totalWaterMl: 28000,
        totalActivityMinutes: 320,
      },
      weightEvolution: {
        initialWeightKg: 85.0,
        initialWeightDate: '2026-09-30',
        latestWeightKg: 84.2,
        latestWeightDate: '2026-10-14',
        weightDeltaKg: -0.8,
        weighIns: [
          { date: '2026-09-30', weightKg: 85.0, source: 'assessment' as const },
          { date: '2026-10-07', weightKg: 84.7, source: 'diary' as const },
          { date: '2026-10-14', weightKg: 84.2, source: 'diary' as const },
        ],
        currentBmi: 27.5,
        initialBmi: 27.8,
        updatedMetabolicEstimates: { tmbKcal: 1750, getKcal: 2350 },
      },
      weeklyPeriods: [
        {
          periodNumber: 1,
          title: 'Semana 1 (Dias 1–7)',
          startDay: 1,
          endDay: 7,
          milestoneDay: 7,
          milestoneTitle: '1ª semana',
          days: [
            {
              dayNumber: 1,
              localDate: '2026-10-01',
              temporalState: 'past' as const,
              hasMeals: true,
              hasWater: true,
              hasActivities: false,
              hasWeight: false,
            },
          ],
        },
      ],
      achievements: [
        {
          id: 'first_diary_entry',
          title: 'Primeiro Registro',
          description: 'Primeiro registro realizado no diário.',
          unlocked: true,
          unlockedAt: '2026-10-01T10:00:00Z',
          progress: 1,
          target: 1,
        },
      ],
      notices: [{ code: 'INFO', message: 'Progresso regular.' }],
    };

    service.getProgress().subscribe((progress) => {
      expect(progress.planStatus).toBe('in_progress');
      expect(progress.currentDay).toBe(14);
      expect(progress.summary.daysWithMeals).toBe(12);
      expect(progress.weightEvolution.initialWeightKg).toBe(85.0);
      expect(progress.weightEvolution.latestWeightKg).toBe(84.2);
      expect(progress.weightEvolution.weighIns.length).toBe(3);
      expect(progress.weeklyPeriods.length).toBe(1);
      expect(progress.weeklyPeriods[0]?.days[0]?.hasMeals).toBe(true);
      expect(progress.achievements[0]?.unlocked).toBe(true);
      expect(progress.notices).toEqual(['Progresso regular.']);
    });

    const req = http.expectOne('/api/v1/adaptation/me/progress');
    expect(req.request.method).toBe('GET');
    req.flush(wireProgress);
  });

  it('solicita relatório em PDF com parâmetro includeHealthDetails', () => {
    const mockBlob = new Blob(['%PDF-1.4...'], { type: 'application/pdf' });

    service.getReportPdf(true).subscribe((blob) => {
      expect(blob).toBeTruthy();
      expect(blob.type).toBe('application/pdf');
    });

    const req = http.expectOne('/api/v1/adaptation/me/report.pdf?includeHealthDetails=true');
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(mockBlob);
  });
});

