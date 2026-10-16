import { Body, Controller, Get, Inject, Patch, Post, UseGuards } from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { VerifiedEmailGuard } from '../auth/verified-email.guard.js';
import { AssessmentService } from './assessment.service.js';
import { PatchAssessmentDto } from './dto/patch-assessment.dto.js';
import type { AssessmentResponse } from './types/assessment.types.js';
import type { AssessmentResultDocument } from './types/metrics.types.js';

@Controller('assessments')
@UseGuards(FirebaseAuthGuard, VerifiedEmailGuard)
export class AssessmentController {
  constructor(@Inject(AssessmentService) private readonly assessmentService: AssessmentService) {}

  @Get('me')
  async getAssessment(@CurrentUser() user: AuthenticatedUser): Promise<AssessmentResponse> {
    return this.assessmentService.getAssessment(user);
  }

  @Patch('me')
  async patchAssessment(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: PatchAssessmentDto,
  ): Promise<AssessmentResponse> {
    return this.assessmentService.patchAssessment(user, dto);
  }

  @Post('me/evaluate')
  async evaluateAssessment(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<AssessmentResultDocument> {
    return this.assessmentService.evaluateAssessment(user);
  }

  @Get('me/results')
  async getResults(@CurrentUser() user: AuthenticatedUser): Promise<AssessmentResultDocument> {
    return this.assessmentService.getResults(user);
  }
}

// Suporte para runners com Vite/Vitest que não emitem metadados automaticamente
Reflect.defineMetadata(
  'design:paramtypes',
  [Object],
  AssessmentController.prototype,
  'getAssessment',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, PatchAssessmentDto],
  AssessmentController.prototype,
  'patchAssessment',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object],
  AssessmentController.prototype,
  'evaluateAssessment',
);
Reflect.defineMetadata('design:paramtypes', [Object], AssessmentController.prototype, 'getResults');
