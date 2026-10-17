import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Inject,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { VerifiedEmailGuard } from '../auth/verified-email.guard.js';
import { AdaptationService } from './adaptation.service.js';
import { AdaptationReportQueryDto } from './dto/adaptation-report-query.dto.js';
import { StartAdaptationDto } from './dto/start-adaptation.dto.js';
import { AdaptationProgressService } from './services/adaptation-progress.service.js';
import { AdaptationReportPdfService } from './services/adaptation-report-pdf.service.js';
import type { AdaptationProgressResponse } from './types/adaptation-progress.types.js';
import type {
  AdaptationPlanResponse,
  AdaptationPreviewResponse,
} from './types/adaptation.types.js';

@Controller('adaptation')
@UseGuards(FirebaseAuthGuard, VerifiedEmailGuard)
export class AdaptationController {
  constructor(
    @Inject(AdaptationService) private readonly adaptationService: AdaptationService,
    @Inject(AdaptationProgressService)
    private readonly progressService: AdaptationProgressService,
    @Inject(AdaptationReportPdfService)
    private readonly reportPdfService: AdaptationReportPdfService,
  ) {}

  @Get('me/preview')
  async getPreview(@CurrentUser() user: AuthenticatedUser): Promise<AdaptationPreviewResponse> {
    return this.adaptationService.getPreview(user);
  }

  @Post('me/start')
  async startAdaptation(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: StartAdaptationDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AdaptationPlanResponse> {
    const result = await this.adaptationService.startAdaptation(user, dto);
    res.status(result.isExisting ? HttpStatus.OK : HttpStatus.CREATED);
    return result.plan;
  }

  @Get('me/progress')
  async getProgress(@CurrentUser() user: AuthenticatedUser): Promise<AdaptationProgressResponse> {
    return this.progressService.getProgress(user);
  }

  @Get('me/report.pdf')
  async getReportPdf(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: AdaptationReportQueryDto,
    @Res() res: Response,
  ): Promise<void> {
    const pdfBuffer = await this.reportPdfService.generateReportPdf(
      user,
      query.includeHealthDetails,
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio-adaptacao-30-dias.pdf"');
    res.setHeader('Cache-Control', 'no-store');
    res.send(pdfBuffer);
  }

  @Get('me')
  async getPlan(@CurrentUser() user: AuthenticatedUser): Promise<AdaptationPlanResponse> {
    return this.adaptationService.getPlan(user);
  }
}

// Suporte para runners com Vite/Vitest que não emitem metadados automaticamente
Reflect.defineMetadata('design:paramtypes', [Object], AdaptationController.prototype, 'getPreview');
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, StartAdaptationDto, Object],
  AdaptationController.prototype,
  'startAdaptation',
);
Reflect.defineMetadata('design:paramtypes', [Object], AdaptationController.prototype, 'getProgress');
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, AdaptationReportQueryDto, Object],
  AdaptationController.prototype,
  'getReportPdf',
);
Reflect.defineMetadata('design:paramtypes', [Object], AdaptationController.prototype, 'getPlan');
