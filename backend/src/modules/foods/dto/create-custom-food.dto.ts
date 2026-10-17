import { Type } from 'class-transformer';
import {
  IsArray,
  ArrayMaxSize,
  ArrayUnique,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';

export class HouseholdMeasureDto {
  @IsString({ message: 'id da medida deve ser um texto.' })
  @IsNotEmpty({ message: 'id da medida é obrigatório.' })
  id!: string;

  @IsString({ message: 'label da medida deve ser um texto.' })
  @IsNotEmpty({ message: 'label da medida é obrigatório.' })
  @MaxLength(80, { message: 'label da medida não pode ultrapassar 80 caracteres.' })
  label!: string;

  @IsNumber({}, { message: 'grams deve ser um número.' })
  @Min(0.1, { message: 'grams deve ser maior que 0.' })
  @Max(5000, { message: 'grams não pode ultrapassar 5000.' })
  grams!: number;

  @IsOptional()
  @IsString({ message: 'source deve ser um texto.' })
  source?: string;
}

export class FoodNutrientsPer100gDto {
  @IsOptional()
  @IsNumber({}, { message: 'energyKcal deve ser um número ou nulo.' })
  @Min(0, { message: 'energyKcal não pode ser negativo.' })
  @Max(1000, { message: 'energyKcal por 100g não pode ultrapassar 1000 kcal.' })
  energyKcal?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'proteinG deve ser um número ou nulo.' })
  @Min(0, { message: 'proteinG não pode ser negativo.' })
  @Max(100, { message: 'proteinG por 100g não pode ultrapassar 100g.' })
  proteinG?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'carbohydrateG deve ser um número ou nulo.' })
  @Min(0, { message: 'carbohydrateG não pode ser negativo.' })
  @Max(100, { message: 'carbohydrateG por 100g não pode ultrapassar 100g.' })
  carbohydrateG?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'fatG deve ser um número ou nulo.' })
  @Min(0, { message: 'fatG não pode ser negativo.' })
  @Max(100, { message: 'fatG por 100g não pode ultrapassar 100g.' })
  fatG?: number | null;

  @IsOptional()
  @IsNumber({}, { message: 'fiberG deve ser um número ou nulo.' })
  @Min(0, { message: 'fiberG não pode ser negativo.' })
  @Max(100, { message: 'fiberG por 100g não pode ultrapassar 100g.' })
  fiberG?: number | null;
}

export class CreateCustomFoodDto {
  @IsString({ message: 'name deve ser um texto.' })
  @IsNotEmpty({ message: 'name é obrigatório.' })
  @MaxLength(120, { message: 'name não pode ultrapassar 120 caracteres.' })
  name!: string;

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
