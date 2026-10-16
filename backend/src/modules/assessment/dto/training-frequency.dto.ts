import { IsIn, IsInt, Max, Min } from 'class-validator';
import type { ExerciseIntensity, TrainingFrequency } from '../types/assessment.types.js';

export class TrainingFrequencyDto implements TrainingFrequency {
  @IsInt({ message: 'frequencyDaysPerWeek deve ser um número inteiro entre 0 e 7.' })
  @Min(0, { message: 'frequencyDaysPerWeek não pode ser menor que 0.' })
  @Max(7, { message: 'frequencyDaysPerWeek não pode ser maior que 7.' })
  frequencyDaysPerWeek!: number;

  @IsInt({ message: 'durationMinutes deve ser um número inteiro entre 0 e 360.' })
  @Min(0, { message: 'durationMinutes não pode ser menor que 0.' })
  @Max(360, { message: 'durationMinutes não pode ser maior que 360.' })
  durationMinutes!: number;

  @IsIn(['none', 'light', 'moderate', 'high'], {
    message: 'intensity deve ser none, light, moderate ou high.',
  })
  intensity!: ExerciseIntensity;
}
