import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  Min,
  ArrayMaxSize,
  ArrayUnique,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { FoodNutrientsPer100gDto, HouseholdMeasureDto } from './create-custom-food.dto.js';

export class UpdateCustomFoodDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  version?: number;
  @IsOptional()
  @IsString({ message: 'name deve ser um texto.' })
  @MaxLength(120, { message: 'name não pode ultrapassar 120 caracteres.' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'preparation deve ser um texto.' })
  @MaxLength(60, { message: 'preparation não pode ultrapassar 60 caracteres.' })
  preparation?: string;

  @IsOptional()
  @IsString({ message: 'category deve ser um texto.' })
  @MaxLength(60, { message: 'category não pode ultrapassar 60 caracteres.' })
  category?: string;

  @IsOptional()
  @IsString({ message: 'source deve ser um texto.' })
  @MaxLength(60, { message: 'source não pode ultrapassar 60 caracteres.' })
  source?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => FoodNutrientsPer100gDto)
  nutrientsPer100g?: FoodNutrientsPer100gDto;

  @IsOptional()
  @IsArray({ message: 'householdMeasures deve ser uma lista.' })
  @ValidateNested({ each: true })
  @Type(() => HouseholdMeasureDto)
  @ArrayMaxSize(20)
  @ArrayUnique((item: HouseholdMeasureDto) => item.id)
  householdMeasures?: HouseholdMeasureDto[];
}
