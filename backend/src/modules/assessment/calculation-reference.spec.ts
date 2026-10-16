import { describe, expect, it } from 'vitest';
import { AssessmentCalculatorService } from './assessment-calculator.service.js';
import { calculateExactAge } from './utils/date-utils.js';
import type { BodySection, RoutineSection } from './types/assessment.types.js';

const calculator = new AssessmentCalculatorService();
const body: BodySection = {
  dateOfBirth: '1990-10-17',
  sexForMetabolicFormula: 'female',
  weightKg: 82.73,
  heightCm: 175.53,
  scaleType: 'standard',
  targetWeightKg: 72.3,
};
const routine: RoutineSection = {
  workPattern: 'sedentary',
  sittingHoursPerDay: 11,
  dailyMovementLevel: 'low',
  strengthTraining: { frequencyDaysPerWeek: 0, durationMinutes: 0, intensity: 'none' },
  cardioTraining: { frequencyDaysPerWeek: 0, durationMinutes: 0, intensity: 'none' },
};
describe('Referências numéricas independentes da avaliação', () => {
  it('preserva TMB fracionária até a estimativa GET e arredonda apenas saídas finais', () => {
    // Mifflin publicada: 10*82.73 + 6.25*175.53 - 5*35 - 161 = 1588.3625.
    const bmr = calculator.calculateBmr(body, 35);
    expect(bmr.bmrKcal).toBeCloseTo(1588.3625, 10);
    const tdee = calculator.calculateTdee(bmr, routine);
    expect(tdee.estimatedTdeeKcal).toBeCloseTo(1826.616875, 10);
    expect(tdee.minTdeeKcal).toBe(1680);
    expect(tdee.maxTdeeKcal).toBe(1973);
    expect(tdee.exerciseAddonKcal).toBe(0);
  });
  it.each([
    [18.499, 'underweight'],
    [18.5, 'normal'],
    [24.999, 'normal'],
    [25, 'overweight'],
    [29.999, 'overweight'],
    [30, 'obesity_1'],
    [34.999, 'obesity_1'],
    [35, 'obesity_2'],
    [39.999, 'obesity_2'],
    [40, 'obesity_3'],
  ] as const)('classifica IMC %s antes de arredondar', (bmi, category) => {
    expect(calculator.calculateBmi(bmi * 4, 200).category).toBe(category);
  });
  it.each([0, -1, NaN, Infinity, -Infinity])('recusa valor não calculável: %s', (weight) => {
    expect(() => calculator.calculateBmi(weight, 170)).toThrow();
  });
  it('calcula a idade por data civil UTC, aniversário e dia bissexto', () => {
    expect(calculateExactAge('2008-10-17', new Date('2026-10-16T23:59:59Z'))).toBe(17);
    expect(calculateExactAge('2008-10-17', new Date('2026-10-17T00:00:00Z'))).toBe(18);
    expect(calculateExactAge('2004-02-29', new Date('2026-02-28T12:00:00Z'))).toBe(21);
    expect(calculateExactAge('2004-02-29', new Date('2026-03-01T12:00:00Z'))).toBe(22);
    expect(() => calculateExactAge('2005-02-29')).toThrow();
  });
  it('calcula referência de 5% e mantém peso desejado editável sem o impor como meta clínica', () => {
    const reference = calculator.calculateWeightReference(body);
    expect(reference.milestone5PercentWeightKg).toBe(78.6);
    expect(reference.targetWeightAnalysis?.targetWeightKg).toBe(72.3);
    expect(reference.minNormalWeightKg).toBeCloseTo(18.5 * 1.7553 ** 2, 10);
  });
  it('não produz TMB/GET com variável ausente ou resultado metabólico inválido', () => {
    for (const data of [
      { ...body, sexForMetabolicFormula: 'unavailable' as const },
      { ...body, heightCm: 50, weightKg: 20 },
    ]) {
      const bmr = calculator.calculateBmr(data, 120);
      expect(bmr.bmrKcal).toBeNull();
      expect(calculator.calculateTdee(bmr, routine).estimatedTdeeKcal).toBeNull();
    }
  });
  it.each([
    { conditions: [], hasNoKnownConditions: false, isConditionUnknown: true, symptoms: [] },
    {
      conditions: ['cardiovascular'],
      hasNoKnownConditions: false,
      isConditionUnknown: false,
      symptoms: [],
    },
    {
      conditions: [],
      hasNoKnownConditions: true,
      isConditionUnknown: false,
      symptoms: [],
      takesContinuousMedication: true,
    },
  ])('não libera automação para saúde desconhecida ou condição/medicação declarada', (health) => {
    const safety = calculator.evaluateSafety(calculator.calculateBmi(70, 175), health);
    expect(safety.requiresProfessionalClearance).toBe(true);
    expect(safety.allowsAutomaticCaloricDeficit).toBe(false);
  });
});
