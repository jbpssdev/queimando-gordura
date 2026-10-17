import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AdaptationController } from './adaptation.controller.js';
import type { AdaptationService } from './adaptation.service.js';
import type { StartAdaptationDto } from './dto/start-adaptation.dto.js';
import type { AdaptationProgressService } from './services/adaptation-progress.service.js';
import type { AdaptationReportPdfService } from './services/adaptation-report-pdf.service.js';
import type { AdaptationProgressResponse } from './types/adaptation-progress.types.js';
import type {
  AdaptationPlanResponse,
  AdaptationPreviewResponse,
} from './types/adaptation.types.js';

describe('AdaptationController', () => {
  const user: AuthenticatedUser = {
    uid: 'user-ctrl-1',
    email: 'user@example.com',
    emailVerified: true,
  };

  const defaultMockProgressService = {
    getProgress: vi.fn(),
  } as unknown as AdaptationProgressService;

  const defaultMockReportPdfService = {
    generateReportPdf: vi.fn(),
  } as unknown as AdaptationReportPdfService;

  it('getPreview delega para AdaptationService', async () => {
    const mockPreview: AdaptationPreviewResponse = {
      assessmentRevision: 1,
      recommendedMode: 'standard',
      modes: {
        standard: { available: true, reasons: [] },
        intensified: { available: false, reasons: ['CLINICAL_POLICY_PENDING'] },
      },
      calorieTargetAvailable: false,
      notices: [],
    };

    const mockService = {
      getPreview: vi.fn().mockResolvedValue(mockPreview),
    } as unknown as AdaptationService;

    const controller = new AdaptationController(
      mockService,
      defaultMockProgressService,
      defaultMockReportPdfService,
    );
    const result = await controller.getPreview(user);

    expect(mockService.getPreview).toHaveBeenCalledWith(user);
    expect(result.recommendedMode).toBe('standard');
  });

  it('startAdaptation responde 201 Created na primeira criação (isExisting = false)', async () => {
    const mockPlan: AdaptationPlanResponse = {
      id: 'initial',
      mode: 'standard',
      status: 'active',
      assessmentRevision: 1,
      startedAt: '2026-10-16T15:00:00.000Z',
      timeZone: 'America/Recife',
      startLocalDate: '2026-10-16',
      day30LocalDate: '2026-11-14',
      currentDay: 1,
      elapsedDays: 0,
      remainingDays: 29,
      calendarProgressPercent: 3.3,
      calendar: [],
      calorieTarget: null,
      notices: [],
    };

    const mockService = {
      startAdaptation: vi.fn().mockResolvedValue({ plan: mockPlan, isExisting: false }),
    } as unknown as AdaptationService;

    const controller = new AdaptationController(
      mockService,
      defaultMockProgressService,
      defaultMockReportPdfService,
    );
    const dto: StartAdaptationDto = { mode: 'standard', timeZone: 'America/Recife' };

    const mockRes = {
      status: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const result = await controller.startAdaptation(user, dto, mockRes);

    expect(mockService.startAdaptation).toHaveBeenCalledWith(user, dto);
    expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.CREATED);
    expect(result.id).toBe('initial');
  });

  it('startAdaptation responde 200 OK na repetição idempotente (isExisting = true)', async () => {
    const mockPlan: AdaptationPlanResponse = {
      id: 'initial',
      mode: 'standard',
      status: 'active',
      assessmentRevision: 1,
      startedAt: '2026-10-16T15:00:00.000Z',
      timeZone: 'America/Recife',
      startLocalDate: '2026-10-16',
      day30LocalDate: '2026-11-14',
      currentDay: 1,
      elapsedDays: 0,
      remainingDays: 29,
      calendarProgressPercent: 3.3,
      calendar: [],
      calorieTarget: null,
      notices: [],
    };

    const mockService = {
      startAdaptation: vi.fn().mockResolvedValue({ plan: mockPlan, isExisting: true }),
    } as unknown as AdaptationService;

    const controller = new AdaptationController(
      mockService,
      defaultMockProgressService,
      defaultMockReportPdfService,
    );
    const dto: StartAdaptationDto = { mode: 'standard', timeZone: 'America/Recife' };

    const mockRes = {
      status: vi.fn().mockReturnThis(),
    } as unknown as Response;

    const result = await controller.startAdaptation(user, dto, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(result.id).toBe('initial');
  });

  it('getPlan delega para AdaptationService', async () => {
    const mockPlan: AdaptationPlanResponse = {
      id: 'initial',
      mode: 'standard',
      status: 'active',
      assessmentRevision: 1,
      startedAt: '2026-10-16T15:00:00.000Z',
      timeZone: 'America/Recife',
      startLocalDate: '2026-10-16',
      day30LocalDate: '2026-11-14',
      currentDay: 1,
      elapsedDays: 0,
      remainingDays: 29,
      calendarProgressPercent: 3.3,
      calendar: [],
      calorieTarget: null,
      notices: [],
    };

    const mockService = {
      getPlan: vi.fn().mockResolvedValue(mockPlan),
    } as unknown as AdaptationService;

    const controller = new AdaptationController(
      mockService,
      defaultMockProgressService,
      defaultMockReportPdfService,
    );
    const result = await controller.getPlan(user);

    expect(mockService.getPlan).toHaveBeenCalledWith(user);
    expect(result.id).toBe('initial');
  });

  it('getProgress delega para AdaptationProgressService', async () => {
    const mockProgress = {
      id: 'initial',
      status: 'active',
      currentDay: 5,
    } as unknown as AdaptationProgressResponse;

    const mockProgressService = {
      getProgress: vi.fn().mockResolvedValue(mockProgress),
    } as unknown as AdaptationProgressService;

    const controller = new AdaptationController(
      {} as AdaptationService,
      mockProgressService,
      defaultMockReportPdfService,
    );
    const result = await controller.getProgress(user);

    expect(mockProgressService.getProgress).toHaveBeenCalledWith(user);
    expect(result.currentDay).toBe(5);
  });

  it('getReportPdf delega para AdaptationReportPdfService e define cabeçalhos corretos', async () => {
    const mockPdfBuffer = Buffer.from('%PDF-1.4 sample');
    const mockReportPdfService = {
      generateReportPdf: vi.fn().mockResolvedValue(mockPdfBuffer),
    } as unknown as AdaptationReportPdfService;

    const controller = new AdaptationController(
      {} as AdaptationService,
      defaultMockProgressService,
      mockReportPdfService,
    );

    const mockRes = {
      setHeader: vi.fn(),
      send: vi.fn(),
    } as unknown as Response;

    await controller.getReportPdf(user, { includeHealthDetails: true }, mockRes);

    expect(mockReportPdfService.generateReportPdf).toHaveBeenCalledWith(user, true);
    expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(mockRes.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="relatorio-adaptacao-30-dias.pdf"',
    );
    expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-store');
    expect(mockRes.send).toHaveBeenCalledWith(mockPdfBuffer);
  });
});
