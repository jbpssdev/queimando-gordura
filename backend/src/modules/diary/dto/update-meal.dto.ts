import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import type { MealType } from '../types/diary.types.js';
import { MealItemDto } from './create-meal.dto.js';

export class UpdateMealDto {
  @IsOptional()
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
  mealType?: MealType;

  @IsOptional()
  @IsString({ message: 'title deve ser um texto.' })
  @MaxLength(80, { message: 'title não pode ultrapassar 80 caracteres.' })
  title?: string;

  @IsOptional()
  @IsArray({ message: 'items deve ser uma lista.' })
  @ArrayMinSize(1, { message: 'A refeição deve conter pelo menos um item.' })
  @ValidateNested({ each: true })
  @Type(() => MealItemDto)
  items?: MealItemDto[];
}
