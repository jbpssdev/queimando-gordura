import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  Max,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import type {
  DailyMovementLevel,
  StepSource,
  WorkPattern,
} from '../types/assessment.types.js';
import { TrainingFrequencyDto } from './training-frequency.dto.js';

export class RoutineSectionDto {
  @ValidateIf((o: RoutineSectionDto) => o.workPattern !== undefined)
  @IsIn(['sedentary', 'standing', 'light_active', 'heavy_labor'], {
    message: 'workPattern deve ser sedentary, standing, light_active ou heavy_labor.',
  })
  workPattern?: WorkPattern;

  @ValidateIf((o: RoutineSectionDto) => o.sittingHoursPerDay !== undefined)
  @IsNumber({}, { message: 'sittingHoursPerDay deve ser um número entre 0 e 24.' })
  @Min(0, { message: 'sittingHoursPerDay não pode ser menor que 0.' })
  @Max(24, { message: 'sittingHoursPerDay não pode ser maior que 24.' })
  sittingHoursPerDay?: number;

  @ValidateIf((o: RoutineSectionDto) => o.dailyMovementLevel !== undefined)
  @IsIn(['low', 'moderate', 'high', 'very_high'], {
    message: 'dailyMovementLevel deve ser low, moderate, high ou very_high.',
  })
  dailyMovementLevel?: DailyMovementLevel;

  @ValidateIf(
    (o: RoutineSectionDto) => o.averageStepsPerDay !== undefined && o.averageStepsPerDay !== null,
  )
  @IsInt({ message: 'averageStepsPerDay deve ser um número inteiro positivo ou null.' })
  @Min(0, { message: 'averageStepsPerDay não pode ser menor que 0.' })
  @Max(100000, { message: 'averageStepsPerDay não pode ser maior que 100.000.' })
  averageStepsPerDay?: number | null;

  @ValidateIf((o: RoutineSectionDto) => o.stepSource !== undefined && o.stepSource !== null)
  @IsIn(['phone', 'smartwatch', 'estimate', 'unknown'], {
    message: 'stepSource deve ser phone, smartwatch, estimate, unknown ou null.',
  })
  stepSource?: StepSource | null;

  @ValidateIf((o: RoutineSectionDto) => o.strengthTraining !== undefined)
  @ValidateNested()
  @Type(() => TrainingFrequencyDto)
  strengthTraining?: TrainingFrequencyDto;

  @ValidateIf((o: RoutineSectionDto) => o.cardioTraining !== undefined)
  @ValidateNested()
  @Type(() => TrainingFrequencyDto)
  cardioTraining?: TrainingFrequencyDto;

  @ValidateIf(
    (o: RoutineSectionDto) =>
      o.recentlyStartedExercise !== undefined && o.recentlyStartedExercise !== null,
  )
  @IsBoolean({ message: 'recentlyStartedExercise deve ser um booleano ou null.' })
  recentlyStartedExercise?: boolean | null;
}
