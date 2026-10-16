import {
  registerDecorator,
  type ValidationOptions,
  type ValidationArguments,
} from 'class-validator';
import { isValidIanaTimeZone } from '../../utils/date-calendar.utils.js';

export function IsValidIanaTimeZone(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      name: 'isValidIanaTimeZone',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return isValidIanaTimeZone(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} deve ser um identificador de fuso horário IANA válido (ex.: 'America/Recife', 'America/Sao_Paulo').`;
        },
      },
    });
  };
}
