import {
  IsIn,
  IsInt,
  IsNumber,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import type { ScaleType, SexForMetabolicFormula } from '../types/assessment.types.js';
import { IsAdultBirthDate } from './validators/is-adult-birth-date.decorator.js';

export class BodySectionDto {
  @ValidateIf((o: BodySectionDto) => o.dateOfBirth !== undefined)
  @IsString({ message: 'dateOfBirth deve ser uma string no formato YYYY-MM-DD.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'dateOfBirth deve estar no formato YYYY-MM-DD.' })
  @IsAdultBirthDate()
  dateOfBirth?: string;

  @ValidateIf((o: BodySectionDto) => o.sexForMetabolicFormula !== undefined)
  @IsIn(['male', 'female', 'unavailable'], {
    message: 'sexForMetabolicFormula deve ser male, female ou unavailable.',
  })
  sexForMetabolicFormula?: SexForMetabolicFormula;

  @ValidateIf((o: BodySectionDto) => o.heightCm !== undefined)
  @IsNumber({}, { message: 'heightCm deve ser um número em centímetros.' })
  @Min(50, { message: 'heightCm deve ser no mínimo 50 cm.' })
  @Max(250, { message: 'heightCm deve ser no máximo 250 cm.' })
  heightCm?: number;

  @ValidateIf((o: BodySectionDto) => o.weightKg !== undefined)
  @IsNumber({}, { message: 'weightKg deve ser um número em kg.' })
  @Min(20, { message: 'weightKg deve ser no mínimo 20 kg.' })
  @Max(400, { message: 'weightKg deve ser no máximo 400 kg.' })
  weightKg?: number;

  @ValidateIf((o: BodySectionDto) => o.targetWeightKg !== undefined && o.targetWeightKg !== null)
  @IsNumber({}, { message: 'targetWeightKg deve ser um número em kg.' })
  @Min(20, { message: 'targetWeightKg deve ser no mínimo 20 kg.' })
  @Max(400, { message: 'targetWeightKg deve ser no máximo 400 kg.' })
  targetWeightKg?: number | null;

  @ValidateIf((o: BodySectionDto) => o.scaleType !== undefined)
  @IsIn(['standard', 'bioimpedance'], {
    message: 'scaleType deve ser standard ou bioimpedance.',
  })
  scaleType?: ScaleType;

  @ValidateIf((o: BodySectionDto) => o.waistCm !== undefined && o.waistCm !== null)
  @IsNumber({}, { message: 'waistCm deve ser um número em cm.' })
  @Min(30, { message: 'waistCm deve ser no mínimo 30 cm.' })
  @Max(250, { message: 'waistCm deve ser no máximo 250 cm.' })
  waistCm?: number | null;

  @ValidateIf((o: BodySectionDto) => o.neckCm !== undefined && o.neckCm !== null)
  @IsNumber({}, { message: 'neckCm deve ser um número em cm.' })
  @Min(15, { message: 'neckCm deve ser no mínimo 15 cm.' })
  @Max(80, { message: 'neckCm deve ser no máximo 80 cm.' })
  neckCm?: number | null;

  @ValidateIf((o: BodySectionDto) => o.hipCm !== undefined && o.hipCm !== null)
  @IsNumber({}, { message: 'hipCm deve ser um número em cm.' })
  @Min(30, { message: 'hipCm deve ser no mínimo 30 cm.' })
  @Max(250, { message: 'hipCm deve ser no máximo 250 cm.' })
  hipCm?: number | null;

  @ValidateIf((o: BodySectionDto) => o.bodyFatPercent !== undefined && o.bodyFatPercent !== null)
  @IsNumber({}, { message: 'bodyFatPercent deve ser um percentual.' })
  @Min(3, { message: 'bodyFatPercent deve ser no mínimo 3%.' })
  @Max(70, { message: 'bodyFatPercent deve ser no máximo 70%.' })
  bodyFatPercent?: number | null;

  @ValidateIf((o: BodySectionDto) => o.muscleMassKg !== undefined && o.muscleMassKg !== null)
  @IsNumber({}, { message: 'muscleMassKg deve ser um número em kg.' })
  @Min(5, { message: 'muscleMassKg deve ser no mínimo 5 kg.' })
  @Max(300, { message: 'muscleMassKg deve ser no máximo 300 kg.' })
  muscleMassKg?: number | null;

  @ValidateIf(
    (o: BodySectionDto) => o.bodyWaterPercent !== undefined && o.bodyWaterPercent !== null,
  )
  @IsNumber({}, { message: 'bodyWaterPercent deve ser um percentual.' })
  @Min(20, { message: 'bodyWaterPercent deve ser no mínimo 20%.' })
  @Max(85, { message: 'bodyWaterPercent deve ser no máximo 85%.' })
  bodyWaterPercent?: number | null;

  @ValidateIf(
    (o: BodySectionDto) => o.visceralFatIndex !== undefined && o.visceralFatIndex !== null,
  )
  @IsInt({ message: 'visceralFatIndex deve ser um número inteiro.' })
  @Min(1, { message: 'visceralFatIndex deve ser no mínimo 1.' })
  @Max(30, { message: 'visceralFatIndex deve ser no máximo 30.' })
  visceralFatIndex?: number | null;
}
