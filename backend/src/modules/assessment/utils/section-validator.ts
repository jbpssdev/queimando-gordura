import { BadRequestException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate, type ValidationError } from 'class-validator';
import { BodySectionDto } from '../dto/body-section.dto.js';
import { HealthSectionDto } from '../dto/health-section.dto.js';
import { NutritionSectionDto } from '../dto/nutrition-section.dto.js';
import { RoutineSectionDto } from '../dto/routine-section.dto.js';
import type { AssessmentSectionName } from '../types/assessment.types.js';

function formatErrors(errors: ValidationError[]): string[] {
  const messages: string[] = [];
  for (const err of errors) {
    if (err.constraints) {
      messages.push(...Object.values(err.constraints));
    }
    if (err.children && err.children.length > 0) {
      messages.push(...formatErrors(err.children));
    }
  }
  return messages;
}

export async function validateAndSanitizeSectionData(
  section: AssessmentSectionName,
  rawData: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let instance: object;

  switch (section) {
    case 'body':
      instance = plainToInstance(BodySectionDto, rawData);
      break;
    case 'health':
      instance = plainToInstance(HealthSectionDto, rawData);
      break;
    case 'routine':
      instance = plainToInstance(RoutineSectionDto, rawData);
      break;
    case 'nutrition':
      instance = plainToInstance(NutritionSectionDto, rawData);
      break;
    default:
      throw new BadRequestException(`Seção desconhecida: ${section}`);
  }

  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });

  if (errors.length > 0) {
    const formatted = formatErrors(errors);
    throw new BadRequestException(formatted);
  }

  // Cross-field logic checks for specific sections
  if (section === 'health') {
    const health = instance as HealthSectionDto;
    if (health.hasNoKnownConditions && health.isConditionUnknown) {
      throw new BadRequestException(
        'hasNoKnownConditions e isConditionUnknown não podem ser ambos verdadeiros.',
      );
    }
    if (health.hasNoKnownConditions && health.conditions && health.conditions.length > 0) {
      throw new BadRequestException(
        'Quando hasNoKnownConditions é verdadeiro, conditions não deve conter itens.',
      );
    }
    if (health.isConditionUnknown && health.conditions && health.conditions.length > 0) {
      throw new BadRequestException(
        'Quando isConditionUnknown é verdadeiro, conditions não deve conter itens.',
      );
    }
  }

  if (section === 'body') {
    const body = instance as BodySectionDto;
    if (body.muscleMassKg != null && body.weightKg != null && body.muscleMassKg >= body.weightKg) {
      throw new BadRequestException('muscleMassKg deve ser menor que o peso corporal (weightKg).');
    }
  }

  // Clean undefined keys from rawData, but preserve null explicitly
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
