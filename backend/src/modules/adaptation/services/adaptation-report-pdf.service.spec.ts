import { UnprocessableEntityException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AssessmentService } from '../../assessment/assessment.service.js';
import type { AuthenticatedUser } from '../../auth/auth.types.js';
import type { FirebaseService } from '../../firebase/firebase.service.js';
import { ClockService } from '../clock.service.js';
import type { AdaptationProgressResponse } from '../types/adaptation-progress.types.js';
import type { AdaptationProgressService } from './adaptation-progress.service.js';
import { AdaptationReportPdfService } from './adaptation-report-pdf.service.js';

describe('AdaptationReportPdfService', () => {
  let service: AdaptationReportPdfService;
  let mockFirebaseService: unknown;
  let mockProgressService: AdaptationProgressService;
  let mockAssessmentService: AssessmentService;
  let clockService: ClockService;

  const user: AuthenticatedUser = {
    uid: 'user-pdf-test',
    email: 'user.pdf@example.com',
    emailVerified: true,
  };

  const sampleProgressCompleted: AdaptationProgressResponse = {
    id: 'initial',
    mode: 'standard',
    status: 'completed',
    currentDay: 30,
    startDate: '2026-10-01',
    endDate: '2026-10-30',
    timeZone: 'America/Sao_Paulo',
    elapsedDays: 30,
    remainingDays: 0,
    calendarProgressPercent: 100,
    participation: {
      distinctDaysRecorded: 22,
      daysWithMeals: 20,
      daysWithWater: 18,
      daysWithActivities: 12,
      daysWithWeight: 4,
    },
    weeklyPeriods: [
      {
        periodNumber: 1,
        label: 'Dias 1 a 7',
        startDate: '2026-10-01',
        endDate: '2026-10-07',
        totalDays: 7,
        elapsedDays: 7,
        distinctDaysRecorded: 6,
        daysWithMeals: 6,
        daysWithWater: 5,
        daysWithActivities: 3,
        weights: [
          {
            date: '2026-10-01',
            weightKg: 80.0,
            source: 'diary',
            derivedBmi: 27.7,
            derivedBmr: 1650,
            formulaVersion: '1.0.0',
          },
        ],
        nutritionSummary: {
          totalKcal: 8500,
          daysWithRecords: 6,
          isPartial: true,
          note: 'Totais parciais',
        },
      },
      {
        periodNumber: 2,
        label: 'Dias 8 a 14',
        startDate: '2026-10-08',
        endDate: '2026-10-14',
        totalDays: 7,
        elapsedDays: 7,
        distinctDaysRecorded: 5,
        daysWithMeals: 5,
        daysWithWater: 4,
        daysWithActivities: 3,
        weights: [
          {
            date: '2026-10-08',
            weightKg: 79.2,
            source: 'diary',
            derivedBmi: 27.4,
            derivedBmr: 1642,
            formulaVersion: '1.0.0',
          },
        ],
        nutritionSummary: {
          totalKcal: 7200,
          daysWithRecords: 5,
          isPartial: true,
          note: 'Totais parciais',
        },
      },
      {
        periodNumber: 3,
        label: 'Dias 15 a 21',
        startDate: '2026-10-15',
        endDate: '2026-10-21',
        totalDays: 7,
        elapsedDays: 7,
        distinctDaysRecorded: 5,
        daysWithMeals: 4,
        daysWithWater: 4,
        daysWithActivities: 3,
        weights: [
          {
            date: '2026-10-15',
            weightKg: 78.8,
            source: 'diary',
            derivedBmi: 27.3,
            derivedBmr: 1638,
            formulaVersion: '1.0.0',
          },
        ],
        nutritionSummary: {
          totalKcal: 6100,
          daysWithRecords: 4,
          isPartial: true,
          note: 'Totais parciais',
        },
      },
      {
        periodNumber: 4,
        label: 'Dias 22 a 28',
        startDate: '2026-10-22',
        endDate: '2026-10-28',
        totalDays: 7,
        elapsedDays: 7,
        distinctDaysRecorded: 4,
        daysWithMeals: 4,
        daysWithWater: 4,
        daysWithActivities: 2,
        weights: [
          {
            date: '2026-10-22',
            weightKg: 78.1,
            source: 'diary',
            derivedBmi: 27.0,
            derivedBmr: 1631,
            formulaVersion: '1.0.0',
          },
        ],
        nutritionSummary: {
          totalKcal: 5900,
          daysWithRecords: 4,
          isPartial: true,
          note: 'Totais parciais',
        },
      },
      {
        periodNumber: 5,
        label: 'Dias 29 a 30 (Fechamento)',
        startDate: '2026-10-29',
        endDate: '2026-10-30',
        totalDays: 2,
        elapsedDays: 2,
        distinctDaysRecorded: 2,
        daysWithMeals: 1,
        daysWithWater: 1,
        daysWithActivities: 1,
        weights: [],
        nutritionSummary: {
          totalKcal: 1400,
          daysWithRecords: 1,
          isPartial: true,
          note: 'Totais parciais',
        },
      },
    ],
    weightEvolution: {
      initialDeclaredWeight: {
        weightKg: 80.5,
        date: '2026-10-01',
        source: 'initial_assessment',
      },
      measurements: [
        {
          date: '2026-10-01',
          weightKg: 80.0,
          source: 'diary',
          derivedBmi: 27.7,
          derivedBmr: 1650,
          formulaVersion: '1.0.0',
        },
        {
          date: '2026-10-08',
          weightKg: 79.2,
          source: 'diary',
          derivedBmi: 27.4,
          derivedBmr: 1642,
          formulaVersion: '1.0.0',
        },
        {
          date: '2026-10-15',
          weightKg: 78.8,
          source: 'diary',
          derivedBmi: 27.3,
          derivedBmr: 1638,
          formulaVersion: '1.0.0',
        },
        {
          date: '2026-10-22',
          weightKg: 78.1,
          source: 'diary',
          derivedBmi: 27.0,
          derivedBmr: 1631,
          formulaVersion: '1.0.0',
        },
      ],
      firstMeasurement: { date: '2026-10-01', weightKg: 80.0 },
      lastMeasurement: { date: '2026-10-22', weightKg: 78.1 },
      weightDeltaKg: -1.9,
      deltaReason: null,
    },
    derivedIndicators: {
      currentBmi: {
        value: 27.0,
        category: 'overweight',
        classification: 'Sobrepeso',
        date: '2026-10-22',
        formulaVersion: '1.0.0',
      },
      currentBmr: {
        bmrKcal: 1631,
        formula: 'mifflin_st_jeor',
        formulaVersion: '1.0.0',
        date: '2026-10-22',
        calculated: true,
      },
      initialBmi: { value: 27.9, classification: 'Sobrepeso' },
      initialBmr: { value: 1655, formula: 'mifflin_st_jeor' },
    },
    achievements: {
      unlocked: [
        {
          code: 'FIRST_DIARY_ENTRY',
          title: 'Primeiro Registro',
          description: 'Primeiro registro realizado.',
          unlocked: true,
          unlockedAt: 'conquistado',
          progress: { current: 1, target: 1 },
        },
        {
          code: 'SEVEN_DISTINCT_DAYS_RECORDED',
          title: '7 Dias com Registros',
          description: '7 dias registrados.',
          unlocked: true,
          unlockedAt: 'conquistado',
          progress: { current: 7, target: 7 },
        },
        {
          code: 'ADAPTATION_30_DAYS_COMPLETED',
          title: 'Ciclo de 30 Dias Concluído',
          description: '30 dias completados.',
          unlocked: true,
          unlockedAt: 'conquistado',
          progress: { current: 1, target: 1 },
        },
      ],
      locked: [],
    },
    reportAvailable: true,
    notices: [],
  };

  const sampleAssessment = {
    revision: 1,
    status: 'completed',
    sections: {
      body: {
        heightCm: 170,
        weightKg: 80.5,
        sexForMetabolicFormula: 'male',
      },
      health: {
        conditions: ['Hipertensão arterial'],
        symptoms: [],
        takesContinuousMedication: true,
        continuousMedications: ['Losartana 50mg'],
        professionalMonitoring: true,
      },
    },
  };

  beforeEach(() => {
    clockService = new ClockService();
    vi.spyOn(clockService, 'now').mockReturnValue(new Date('2026-11-01T12:00:00.000Z'));

    mockProgressService = {
      getProgress: vi.fn().mockResolvedValue(sampleProgressCompleted),
    } as unknown as AdaptationProgressService;

    mockAssessmentService = {
      getAssessment: vi.fn().mockResolvedValue(sampleAssessment),
    } as unknown as AssessmentService;

    mockFirebaseService = {
      getFirestore: vi.fn(() => ({
        collection: vi.fn(() => ({
          doc: vi.fn(() => ({
            get: vi.fn(async () => ({
              exists: true,
              data: () => ({ displayName: 'Carlos Teste' }),
            })),
            collection: vi.fn(() => ({
              doc: vi.fn(() => ({
                get: vi.fn(async () => ({ exists: true, data: () => ({ assessmentRevision: 1 }) })),
                collection: vi.fn(() => ({
                  doc: vi.fn(() => ({
                    get: vi.fn(async () => ({
                      exists: true,
                      data: () => ({ body: sampleAssessment.sections.body }),
                    })),
                  })),
                })),
              })),
            })),
          })),
        })),
      })),
    };

    service = new AdaptationReportPdfService(
      mockFirebaseService as unknown as FirebaseService,
      mockProgressService as unknown as AdaptationProgressService,
      mockAssessmentService as unknown as AssessmentService,
      clockService,
    );
  });

  it('rejeita com 422 REPORT_NOT_AVAILABLE quando o plano ainda está ativo', async () => {
    vi.mocked(mockProgressService.getProgress).mockResolvedValueOnce({
      ...sampleProgressCompleted,
      status: 'active',
      reportAvailable: false,
      currentDay: 15,
    });

    await expect(service.generateReportPdf(user, false)).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('gera PDF binário válido iniciando com %PDF-1.4 para plano concluído', async () => {
    const pdfBuffer = await service.generateReportPdf(user, false);

    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(500);

    const pdfString = pdfBuffer.toString('latin1');
    expect(pdfString.startsWith('%PDF-1.4')).toBe(true);
    expect(pdfString).toContain('%%EOF');
    expect(pdfString).toContain('Queimando Gordura');
    expect(pdfString).toContain('Carlos Teste');
  });

  it('omite seção clínica quando includeHealthDetails = false', async () => {
    const pdfBuffer = await service.generateReportPdf(user, false);
    const pdfString = pdfBuffer.toString('latin1');

    expect(pdfString).not.toContain('Losartana 50mg');
  });

  it('inclui seção clínica autodeclarada e aviso quando includeHealthDetails = true', async () => {
    const pdfBuffer = await service.generateReportPdf(user, true);
    const pdfString = pdfBuffer.toString('latin1');

    expect(pdfString).toContain('Losartana 50mg');
    expect(pdfString).toContain('INFORMA\\307\\325ES AUTODECLARADAS PELO USU\\301RIO');
  });
});
