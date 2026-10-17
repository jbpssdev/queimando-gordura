import { IsDateString } from 'class-validator';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class DiaryDateQueryDto {
  @IsString({ message: 'date deve ser um texto.' })
  @IsNotEmpty({ message: 'date é obrigatório.' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve estar no formato civil YYYY-MM-DD.' })
  date!: string;
}

export class DiarySummaryQueryDto {
  @IsString({ message: 'from deve ser um texto.' })
  @IsNotEmpty({ message: 'from é obrigatório.' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from deve estar no formato civil YYYY-MM-DD.' })
  from!: string;

  @IsString({ message: 'to deve ser um texto.' })
  @IsNotEmpty({ message: 'to é obrigatório.' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to deve estar no formato civil YYYY-MM-DD.' })
  to!: string;
}
