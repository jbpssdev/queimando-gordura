import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import type { MealType, PortionUnit } from '../types/diary.types.js';

export class MealItemDto {
  @IsString({ message: 'foodId deve ser um texto.' })
  @IsNotEmpty({ message: 'foodId é obrigatório.' })
  foodId!: string;

  @IsNumber({}, { message: 'amount deve ser um número.' })
  @Min(0.01, { message: 'amount deve ser maior que 0.' })
  amount!: number;

  @IsIn(['g', 'household'], {
    message: 'unit deve ser g ou household.',
  })
  unit!: PortionUnit;

  @IsOptional()
  @IsString({ message: 'householdMeasureId deve ser um texto.' })
  householdMeasureId?: string;
}

export class CreateMealDto {
  @IsString({ message: 'date deve ser um texto.' })
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date deve estar no formato civil YYYY-MM-DD.' })
  date!: string;

  @IsIn(
    [
      'breakfast',
      'morning_snack',
      'lunch',
      'afternoon_snack',
      'dinner',
      'snack',
      'supper',
      'other',
    ],
    {
      message: 'mealType inválido.',
    },
  )
  mealType!: MealType;

  @IsOptional()
  @IsString({ message: 'title deve ser um texto.' })
  @MaxLength(80, { message: 'title não pode ultrapassar 80 caracteres.' })
  title?: string;

  @IsArray({ message: 'items deve ser uma lista.' })
  @ArrayMinSize(1, { message: 'A refeição deve conter pelo menos um item.' })
  @ValidateNested({ each: true })
  @Type(() => MealItemDto)
  items!: MealItemDto[];

  @IsOptional()
  @IsString({ message: 'clientRequestId deve ser um texto.' })
  clientRequestId?: string;

  @IsOptional()
  @IsString({ message: 'timeZone deve ser um texto com um fuso horário IANA válido.' })
  timeZone?: string;
}
