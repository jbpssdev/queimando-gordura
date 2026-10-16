import { IsIn, IsNotEmptyObject, IsObject } from 'class-validator';
import type { AssessmentSectionName } from '../types/assessment.types.js';

export class PatchAssessmentDto {
  @IsIn(['body', 'health', 'routine', 'nutrition'], {
    message: 'section deve ser body, health, routine ou nutrition.',
  })
  section!: AssessmentSectionName;

  @IsObject({ message: 'data deve ser um objeto contendo os campos da seção.' })
  @IsNotEmptyObject({}, { message: 'data não pode ser um objeto vazio.' })
  data!: Record<string, unknown>;
}
