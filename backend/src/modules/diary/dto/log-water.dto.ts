import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export class LogWaterDto {
  @IsString({ message: 'date deve ser um texto.' })
  @IsNotEmpty({ message: 'date é obrigatório.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve estar no formato civil YYYY-MM-DD.' })
  date!: string;

  @IsNumber({}, { message: 'amountMl deve ser um número.' })
  @IsInt({ message: 'amountMl deve ser um número inteiro.' })
  @Min(10, { message: 'amountMl deve ser no mínimo 10 ml.' })
  @Max(5000, { message: 'amountMl por registro não pode ultrapassar 5000 ml.' })
  amountMl!: number;

  @IsOptional()
  @IsString({ message: 'clientRequestId deve ser um texto.' })
  clientRequestId?: string;

  @IsOptional()
  @IsString({ message: 'timeZone deve ser um texto com um fuso horário IANA válido.' })
  timeZone?: string;
}
