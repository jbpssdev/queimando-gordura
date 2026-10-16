import {
  registerDecorator,
  type ValidationOptions,
  type ValidationArguments,
} from 'class-validator';
import { calculateExactAge, parseCivilDate } from '../../utils/date-utils.js';

export function IsAdultBirthDate(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isAdultBirthDate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') {
            return false;
          }
          const parsed = parseCivilDate(value);
          if (!parsed) {
            return false;
          }
          try {
            const age = calculateExactAge(value);
            return age >= 18 && age <= 120;
          } catch {
            return false;
          }
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} deve ser uma data civil válida (YYYY-MM-DD) e o usuário deve ter no mínimo 18 anos.`;
        },
      },
    });
  };
}
