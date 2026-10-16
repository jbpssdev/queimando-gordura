import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsNotEmpty, IsString, Length } from 'class-validator';

export class UpsertUserProfileDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'O primeiro nome deve ser um texto.' })
  @IsNotEmpty({ message: 'O primeiro nome é obrigatório.' })
  @Length(1, 100, { message: 'O primeiro nome deve ter entre 1 e 100 caracteres.' })
  firstName!: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString({ message: 'O sobrenome deve ser um texto.' })
  @IsNotEmpty({ message: 'O sobrenome é obrigatório.' })
  @Length(1, 100, { message: 'O sobrenome deve ter entre 1 e 100 caracteres.' })
  lastName!: string;

  @IsBoolean({ message: 'A confirmação de maioridade deve ser um booleano.' })
  @Equals(true, { message: 'A confirmação de maioridade é obrigatória.' })
  age18Confirmed!: boolean;
}
