import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { AssessmentController } from './assessment.controller.js';
import type { AssessmentService } from './assessment.service.js';
import type { PatchAssessmentDto } from './dto/patch-assessment.dto.js';

describe('AssessmentController', () => {
  const user: AuthenticatedUser = {
    uid: 'user-ctrl-123',
    email: 'user@example.com',
    emailVerified: true,
  };

  it('getAssessment delega para o AssessmentService', async () => {
    const mockService = {
      getAssessment: vi.fn().mockResolvedValue({
        status: 'draft',
        revision: 1,
        sections: { body: null, health: null, routine: null, nutrition: null },
        updatedAt: '2026-10-16T12:00:00.000Z',
        completedAt: null,
      }),
    } as unknown as AssessmentService;

    const controller = new AssessmentController(mockService);
    const result = await controller.getAssessment(user);

    expect(mockService.getAssessment).toHaveBeenCalledWith(user);
    expect(result.status).toBe('draft');
  });

  it('patchAssessment delega para o AssessmentService', async () => {
    const mockService = {
      patchAssessment: vi.fn().mockResolvedValue({
        status: 'draft',
        revision: 2,
        sections: { body: {}, health: null, routine: null, nutrition: null },
        updatedAt: '2026-10-16T12:05:00.000Z',
        completedAt: null,
      }),
    } as unknown as AssessmentService;

    const controller = new AssessmentController(mockService);
    const dto: PatchAssessmentDto = {
      section: 'body',
      data: { heightCm: 180 },
    };

    const result = await controller.patchAssessment(user, dto);

    expect(mockService.patchAssessment).toHaveBeenCalledWith(user, dto);
    expect(result.revision).toBe(2);
  });

  it('evaluateAssessment delega para o AssessmentService', async () => {
    const mockService = {
      evaluateAssessment: vi.fn().mockResolvedValue({
        uid: user.uid,
        revision: 2,
        calculatedAt: '2026-10-16T12:10:00.000Z',
        bmi: { value: 24.5 },
      }),
    } as unknown as AssessmentService;

    const controller = new AssessmentController(mockService);
    const result = await controller.evaluateAssessment(user);

    expect(mockService.evaluateAssessment).toHaveBeenCalledWith(user);
    expect(result.revision).toBe(2);
  });

  it('getResults delega para o AssessmentService', async () => {
    const mockService = {
      getResults: vi.fn().mockResolvedValue({
        uid: user.uid,
        revision: 2,
        calculatedAt: '2026-10-16T12:10:00.000Z',
        bmi: { value: 24.5 },
      }),
    } as unknown as AssessmentService;

    const controller = new AssessmentController(mockService);
    const result = await controller.getResults(user);

    expect(mockService.getResults).toHaveBeenCalledWith(user);
    expect(result.revision).toBe(2);
  });
});
