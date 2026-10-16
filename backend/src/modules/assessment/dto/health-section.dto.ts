import { IsArray, IsBoolean, IsIn, IsString, ValidateIf } from 'class-validator';
import type { PregnancyStatus } from '../types/assessment.types.js';

export class HealthSectionDto {
  @ValidateIf((o: HealthSectionDto) => o.takesContinuousMedication !== undefined)
  @IsBoolean()
  takesContinuousMedication?: boolean;

  @ValidateIf((o: HealthSectionDto) => o.conditions !== undefined)
  @IsArray({ message: 'conditions deve ser um array de strings.' })
  @IsString({ each: true, message: 'Cada item de conditions deve ser uma string.' })
  conditions?: string[];

  @ValidateIf((o: HealthSectionDto) => o.hasNoKnownConditions !== undefined)
  @IsBoolean({ message: 'hasNoKnownConditions deve ser um booleano.' })
  hasNoKnownConditions?: boolean;

  @ValidateIf((o: HealthSectionDto) => o.isConditionUnknown !== undefined)
  @IsBoolean({ message: 'isConditionUnknown deve ser um booleano.' })
  isConditionUnknown?: boolean;

  @ValidateIf((o: HealthSectionDto) => o.symptoms !== undefined)
  @IsArray({ message: 'symptoms deve ser um array de strings.' })
  @IsString({ each: true, message: 'Cada item de symptoms deve ser uma string.' })
  symptoms?: string[];

  @ValidateIf(
    (o: HealthSectionDto) =>
      o.continuousMedications !== undefined && o.continuousMedications !== null,
  )
  @IsArray({ message: 'continuousMedications deve ser um array de strings ou null.' })
  @IsString({ each: true, message: 'Cada item de continuousMedications deve ser uma string.' })
  continuousMedications?: string[] | null;

  @ValidateIf(
    (o: HealthSectionDto) => o.medicationPurposes !== undefined && o.medicationPurposes !== null,
  )
  @IsArray({ message: 'medicationPurposes deve ser um array de strings ou null.' })
  @IsString({ each: true, message: 'Cada item de medicationPurposes deve ser uma string.' })
  medicationPurposes?: string[] | null;

  @ValidateIf(
    (o: HealthSectionDto) => o.pregnancyStatus !== undefined && o.pregnancyStatus !== null,
  )
  @IsIn(['not_applicable', 'pregnant', 'breastfeeding', 'trying_to_conceive', 'none'], {
    message:
      'pregnancyStatus deve ser not_applicable, pregnant, breastfeeding, trying_to_conceive, none ou null.',
  })
  pregnancyStatus?: PregnancyStatus | null;

  @ValidateIf(
    (o: HealthSectionDto) =>
      o.professionalMonitoring !== undefined && o.professionalMonitoring !== null,
  )
  @IsBoolean({ message: 'professionalMonitoring deve ser um booleano ou null.' })
  professionalMonitoring?: boolean | null;
}
