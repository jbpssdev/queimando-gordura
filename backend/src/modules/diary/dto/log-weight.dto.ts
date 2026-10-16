import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  Max,
} from 'class-validator';

export class LogWeightDto {
  @IsString({ message: 'date deve ser um texto.' })
  @IsNotEmpty({ message: 'date é obrigatório.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve estar no formato civil YYYY-MM-DD.' })
  date!: string;

  @IsNumber({}, { message: 'weightKg deve ser um número.' })
  @Min(20, { message: 'weightKg deve ser no mínimo 20 kg.' })
  @Max(500, { message: 'weightKg não pode ultrapassar 500 kg.' })
  weightKg!: number;

  @IsOptional()
  @IsString({ message: 'notes deve ser um texto.' })
  @MaxLength(200, { message: 'notes não pode ultrapassar 200 caracteres.' })
  notes?: string;

  @IsOptional()
  @IsString({ message: 'timeZone deve ser um texto com um fuso horário IANA válido.' })
  timeZone?: string;
}
