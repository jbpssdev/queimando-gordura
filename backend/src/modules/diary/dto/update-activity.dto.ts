import { IsIn, IsInt, IsNumber, IsOptional, IsString, MaxLength, Min, Max } from 'class-validator';
import type { ActivityIntensity, ActivityType } from '../types/diary.types.js';

export class UpdateActivityDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
  @IsOptional()
  @IsIn(['cardio', 'strength', 'other'], {
    message: 'type deve ser cardio, strength ou other.',
  })
  type?: ActivityType;

  @IsOptional()
  @IsString({ message: 'description deve ser um texto.' })
  @MaxLength(120, { message: 'description não pode ultrapassar 120 caracteres.' })
  description?: string;

  @IsOptional()
  @IsNumber({}, { message: 'durationMinutes deve ser um número.' })
  @IsInt({ message: 'durationMinutes deve ser um número inteiro.' })
  @Min(1, { message: 'durationMinutes deve ser no mínimo 1 minuto.' })
  @Max(720, { message: 'durationMinutes não pode ultrapassar 720 minutos.' })
  durationMinutes?: number;

  @IsOptional()
  @IsIn(['light', 'moderate', 'vigorous'], {
    message: 'intensity deve ser light, moderate ou vigorous.',
  })
  intensity?: ActivityIntensity;
}
