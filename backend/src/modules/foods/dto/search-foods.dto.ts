import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min, MaxLength } from 'class-validator';

export class SearchFoodsDto {
  @IsOptional()
  @IsString({ message: 'query deve ser um texto.' })
  @MaxLength(120)
  query?: string;

  @IsOptional()
  @IsString({ message: 'category deve ser um texto.' })
  category?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'limit deve ser um número inteiro.' })
  @Min(1, { message: 'limit deve ser no mínimo 1.' })
  @Max(100, { message: 'limit deve ser no máximo 100.' })
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'offset deve ser um número inteiro maior ou igual a 0.' })
  @Min(0, { message: 'offset não pode ser negativo.' })
  @Max(10000)
  offset?: number;
}
