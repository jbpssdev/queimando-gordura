import { IsValidIanaTimeZone } from '../../adaptation/dto/validators/is-valid-iana-timezone.decorator.js';
import { IsDateString } from 'class-validator';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import type { ActivityIntensity, ActivityType } from '../types/diary.types.js';

export class LogActivityDto {
  @IsString({ message: 'date deve ser um texto.' })
  @IsNotEmpty({ message: 'date é obrigatório.' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve estar no formato civil YYYY-MM-DD.' })
  date!: string;

  @IsIn(['cardio', 'strength', 'other'], {
    message: 'type deve ser cardio, strength ou other.',
  })
  type!: ActivityType;

  @IsString({ message: 'description deve ser um texto.' })
  @IsNotEmpty({ message: 'description é obrigatória.' })
  @MaxLength(120, { message: 'description não pode ultrapassar 120 caracteres.' })
  description!: string;

  @IsNumber({}, { message: 'durationMinutes deve ser um número.' })
  @IsInt({ message: 'durationMinutes deve ser um número inteiro.' })
  @Min(1, { message: 'durationMinutes deve ser no mínimo 1 minuto.' })
  @Max(720, { message: 'durationMinutes não pode ultrapassar 720 minutos (12 horas).' })
  durationMinutes!: number;

  @IsIn(['light', 'moderate', 'vigorous'], {
    message: 'intensity deve ser light, moderate ou vigorous.',
  })
  intensity!: ActivityIntensity;

  @IsOptional()
  @IsString({ message: 'clientRequestId deve ser um texto.' })
  @MaxLength(100)
  clientRequestId?: string;

  @IsOptional()
  @IsString({ message: 'timeZone deve ser um texto com um fuso horário IANA válido.' })
  @IsValidIanaTimeZone()
  timeZone?: string;
}
