import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard.js';
import { VerifiedEmailGuard } from '../auth/verified-email.guard.js';
import { DiaryService } from './diary.service.js';
import { CreateMealDto } from './dto/create-meal.dto.js';
import { DiaryDateQueryDto, DiarySummaryQueryDto } from './dto/diary-query.dto.js';
import { LogActivityDto } from './dto/log-activity.dto.js';
import { LogWaterDto } from './dto/log-water.dto.js';
import { LogWeightDto } from './dto/log-weight.dto.js';
import { UpdateActivityDto } from './dto/update-activity.dto.js';
import { UpdateMealDto } from './dto/update-meal.dto.js';
import type {
  ActivityEntry,
  DiaryDayResponse,
  DiarySummaryResponse,
  MealDocument,
  WaterEntry,
  WeightEntry,
} from './types/diary.types.js';

@Controller('diary')
@UseGuards(FirebaseAuthGuard, VerifiedEmailGuard)
export class DiaryController {
  constructor(@Inject(DiaryService) private readonly diaryService: DiaryService) {}

  /* ========================================================================
   * REFEIÇÕES (MEALS)
   * ======================================================================== */

  @Post('me/meals')
  @HttpCode(HttpStatus.CREATED)
  async createMeal(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMealDto,
  ): Promise<MealDocument> {
    return this.diaryService.createMeal(user, dto);
  }

  @Patch('me/meals/:id')
  async updateMeal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateMealDto,
  ): Promise<MealDocument> {
    return this.diaryService.updateMeal(id, user, dto);
  }

  @Delete('me/meals/:id')
  async deleteMeal(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.diaryService.deleteMeal(id, user);
  }

  /* ========================================================================
   * HIDRATAÇÃO (WATER)
   * ======================================================================== */

  @Post('me/water')
  @HttpCode(HttpStatus.CREATED)
  async logWater(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogWaterDto,
  ): Promise<WaterEntry> {
    return this.diaryService.logWater(user, dto);
  }

  @Delete('me/water/:id')
  async deleteWater(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.diaryService.deleteWater(id, user);
  }

  /* ========================================================================
   * ATIVIDADES FÍSICAS (ACTIVITIES)
   * ======================================================================== */

  @Post('me/activities')
  @HttpCode(HttpStatus.CREATED)
  async logActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogActivityDto,
  ): Promise<ActivityEntry> {
    return this.diaryService.logActivity(user, dto);
  }

  @Patch('me/activities/:id')
  async updateActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<ActivityEntry> {
    return this.diaryService.updateActivity(id, user, dto);
  }

  @Delete('me/activities/:id')
  async deleteActivity(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ success: boolean; id: string }> {
    return this.diaryService.deleteActivity(id, user);
  }

  /* ========================================================================
   * PESO SEMANAL (WEIGHT)
   * ======================================================================== */

  @Put('me/weight')
  async logWeight(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogWeightDto,
  ): Promise<WeightEntry> {
    return this.diaryService.logWeight(user, dto);
  }

  @Delete('me/weight/:date')
  async deleteWeightParam(
    @CurrentUser() user: AuthenticatedUser,
    @Param('date') date: string,
  ): Promise<{ success: boolean; date: string }> {
    return this.diaryService.deleteWeight(date, user);
  }

  @Delete('me/weight')
  async deleteWeightQuery(
    @CurrentUser() user: AuthenticatedUser,
    @Query('date') date: string,
  ): Promise<{ success: boolean; date: string }> {
    return this.diaryService.deleteWeight(date, user);
  }

  /* ========================================================================
   * LEITURA DO DIÁRIO (DAY & SUMMARY)
   * ======================================================================== */

  @Get('me/summary')
  async getSummary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DiarySummaryQueryDto,
  ): Promise<DiarySummaryResponse> {
    return this.diaryService.getSummary(user, query.from, query.to);
  }

  @Get('me')
  async getDayDiary(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: DiaryDateQueryDto,
  ): Promise<DiaryDayResponse> {
    return this.diaryService.getDayDiary(user, query.date);
  }
}

// Suporte para runners com Vite/Vitest que não emitem metadados automaticamente
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, CreateMealDto],
  DiaryController.prototype,
  'createMeal',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, String, UpdateMealDto],
  DiaryController.prototype,
  'updateMeal',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, String],
  DiaryController.prototype,
  'deleteMeal',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, LogWaterDto],
  DiaryController.prototype,
  'logWater',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, String],
  DiaryController.prototype,
  'deleteWater',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, LogActivityDto],
  DiaryController.prototype,
  'logActivity',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, String, UpdateActivityDto],
  DiaryController.prototype,
  'updateActivity',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, String],
  DiaryController.prototype,
  'deleteActivity',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, LogWeightDto],
  DiaryController.prototype,
  'logWeight',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, String],
  DiaryController.prototype,
  'deleteWeightParam',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, String],
  DiaryController.prototype,
  'deleteWeightQuery',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, DiarySummaryQueryDto],
  DiaryController.prototype,
  'getSummary',
);
Reflect.defineMetadata(
  'design:paramtypes',
  [Object, DiaryDateQueryDto],
  DiaryController.prototype,
  'getDayDiary',
);
