import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import type { AdaptationMode } from '../types/adaptation.types.js';
import { IsValidIanaTimeZone } from './validators/is-valid-iana-timezone.decorator.js';

export class StartAdaptationDto {
  @IsIn(['standard', 'intensified'], {
    message: 'mode deve ser standard ou intensified.',
  })
  mode!: AdaptationMode;

  @IsString({ message: 'timeZone deve ser um texto com um fuso horário IANA válido.' })
  @IsNotEmpty({ message: 'timeZone é obrigatório.' })
  @IsValidIanaTimeZone()
  timeZone!: string;
}
