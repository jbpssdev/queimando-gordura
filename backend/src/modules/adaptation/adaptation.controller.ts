import { Body, Controller, Get, HttpStatus, Inject, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { VerifiedEmailGuard } from '../auth/verified-email.guard.js';
import { AdaptationService } from './adaptation.service.js';
import { StartAdaptationDto } from './dto/start-adaptation.dto.js';
import type {
  AdaptationPlanResponse,
  AdaptationPreviewResponse,
} from './types/adaptation.types.js';

@Controller('adaptation')
@UseGuards(FirebaseAuthGuard, VerifiedEmailGuard)
export class AdaptationController {
  constructor(@Inject(AdaptationService) private readonly adaptationService: AdaptationService) {}

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
Reflect.defineMetadata('design:paramtypes', [Object], AdaptationController.prototype, 'getPlan');
