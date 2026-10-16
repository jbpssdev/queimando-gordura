import { describe, expect, it } from 'vitest';
import { AssessmentCalculatorService } from './assessment-calculator.service.js';
import type {
  AssessmentSections,
  BodySection,
  HealthSection,
  NutritionSection,
  RoutineSection,
} from './types/assessment.types.js';
import { calculateExactAge } from './utils/date-utils.js';

describe('AssessmentCalculatorService', () => {
  const service = new AssessmentCalculatorService();

  const validBody: BodySection = {
    dateOfBirth: '1995-06-15',
    sexForMetabolicFormula: 'male',
    heightCm: 180,
    weightKg: 85,
    targetWeightKg: 78,
    scaleType: 'standard',
  };

  const validHealth: HealthSection = {
    conditions: [],
    hasNoKnownConditions: true,
    isConditionUnknown: false,
    symptoms: ['none'],
  };

  const validRoutine: RoutineSection = {
    workPattern: 'sedentary',
    sittingHoursPerDay: 8,
    dailyMovementLevel: 'low',
    strengthTraining: {
      frequencyDaysPerWeek: 3,
      durationMinutes: 45,
      intensity: 'moderate',
    },
    cardioTraining: {
      frequencyDaysPerWeek: 2,
      durationMinutes: 30,
      intensity: 'light',
    },
  };

  const validNutrition: NutritionSection = {
    mealsPerDay: 3,
    mealRegularity: 'regular',
    hasKitchenScale: true,
    sweetenedDrinksFrequency: 'never',
    alcoholFrequency: 'never',
    budgetConstrained: false,
    dietaryPreferences: ['omnivore'],
    allergies: [],
    intolerances: [],
    dietaryRestrictions: [],
    mealSources: ['home_cooked'],
    weightLossChallenges: [],
  };

  const completeSections: AssessmentSections = {
    body: validBody,
    health: validHealth,
    routine: validRoutine,
    nutrition: validNutrition,
  };

  describe('Cálculo de Idade Civil e Anos Bissextos', () => {
    it('calcula idade exata considerando mês e dia', () => {
      // Nascido em 15/06/1995
      // Em 14/06/2025: 29 anos (véspera do aniversário)
      expect(calculateExactAge('1995-06-15', new Date(Date.UTC(2025, 5, 14)))).toBe(29);
      // Em 15/06/2025: 30 anos (dia do aniversário)
      expect(calculateExactAge('1995-06-15', new Date(Date.UTC(2025, 5, 15)))).toBe(30);
      // Em 16/06/2025: 30 anos
      expect(calculateExactAge('1995-06-15', new Date(Date.UTC(2025, 5, 16)))).toBe(30);
    });

    it('trata corretamente ano bissexto para nascidos em 29 de fevereiro', () => {
      // Nascido em 29/02/2004
      // Em 28/02/2022 (ano não-bissexto): ainda 17 anos
      expect(calculateExactAge('2004-02-29', new Date(Date.UTC(2022, 1, 28)))).toBe(17);
      // Em 01/03/2022 (ano não-bissexto): completa 18 anos
      expect(calculateExactAge('2004-02-29', new Date(Date.UTC(2022, 2, 1)))).toBe(18);
      // Em 29/02/2024 (ano bissexto): completa 20 anos no próprio dia 29
      expect(calculateExactAge('2004-02-29', new Date(Date.UTC(2024, 1, 29)))).toBe(20);
    });

    it('rejeita formato inválido', () => {
      expect(() => calculateExactAge('invalid-date')).toThrow();
    });
  });

  describe('Cálculo de IMC (BMI)', () => {
    it('classifica abaixo do peso (< 18.5)', () => {
      const res = service.calculateBmi(50, 175); // IMC ~16.3
      expect(res.value).toBe(16.3);
      expect(res.category).toBe('underweight');
      expect(res.classification).toBe('Abaixo do peso');
    });

    it('classifica peso normal (18.5 a 24.9)', () => {
      const res = service.calculateBmi(70, 175); // IMC ~22.9
      expect(res.value).toBe(22.9);
      expect(res.category).toBe('normal');
      expect(res.classification).toBe('Peso normal');
    });

    it('classifica sobrepeso (25.0 a 29.9)', () => {
      const res = service.calculateBmi(80, 175); // IMC ~26.1
      expect(res.value).toBe(26.1);
      expect(res.category).toBe('overweight');
      expect(res.classification).toBe('Sobrepeso');
    });

    it('classifica obesidade grau 1 (30.0 a 34.9)', () => {
      const res = service.calculateBmi(95, 175); // IMC ~31.0
      expect(res.value).toBe(31);
      expect(res.category).toBe('obesity_1');
      expect(res.classification).toBe('Obesidade grau 1');
    });

    it('classifica obesidade grau 2 (35.0 a 39.9)', () => {
      const res = service.calculateBmi(110, 175); // IMC ~35.9
      expect(res.value).toBe(35.9);
      expect(res.category).toBe('obesity_2');
      expect(res.classification).toBe('Obesidade grau 2');
    });

    it('classifica obesidade grau 3 (>= 40.0)', () => {
      const res = service.calculateBmi(130, 175); // IMC ~42.4
      expect(res.value).toBe(42.4);
      expect(res.category).toBe('obesity_3');
      expect(res.classification).toBe('Obesidade grau 3');
    });
  });

  describe('Cálculo de TMB (Mifflin-St Jeor)', () => {
    it('calcula corretamente para homens', () => {
      // 80kg, 180cm, 30 anos
      // 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
      const body: BodySection = {
        ...validBody,
        sexForMetabolicFormula: 'male',
        weightKg: 80,
        heightCm: 180,
      };
      const bmr = service.calculateBmr(body, 30);
      expect(bmr.calculated).toBe(true);
      expect(bmr.bmrKcal).toBe(1780);
    });

    it('calcula corretamente para mulheres', () => {
      // 60kg, 165cm, 25 anos
      // 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25 -> 1345
      const body: BodySection = {
        ...validBody,
        sexForMetabolicFormula: 'female',
        weightKg: 60,
        heightCm: 165,
      };
      const bmr = service.calculateBmr(body, 25);
      expect(bmr.calculated).toBe(true);
      expect(bmr.bmrKcal).toBe(1345.25);
    });

    it('retorna unavailable quando sexo biológico não for informado', () => {
      const body: BodySection = {
        ...validBody,
        sexForMetabolicFormula: 'unavailable',
      };
      const bmr = service.calculateBmr(body, 30);
      expect(bmr.calculated).toBe(false);
      expect(bmr.bmrKcal).toBeNull();
      expect(bmr.reasonIfNotCalculated).toContain('Fórmula metabólica indisponível');
    });
  });

  describe('Cálculo de GET (TDEE)', () => {
    it('calcula GET conservador baseado em NEAT e treinos', () => {
      const bmr = { formula: 'mifflin_st_jeor' as const, calculated: true, bmrKcal: 1800 };
      const tdee = service.calculateTdee(bmr, validRoutine);

      expect(tdee.estimatedTdeeKcal).toBeGreaterThan(1800);
      expect(tdee.minTdeeKcal).toBeLessThan(tdee.estimatedTdeeKcal!);
      expect(tdee.maxTdeeKcal).toBeGreaterThan(tdee.estimatedTdeeKcal!);
      expect(tdee.exerciseAddonKcal).toBeGreaterThan(0);
      expect(tdee.explanation).toContain('Faixa heurística');
    });

    it('retorna nulo se TMB não estiver calculada', () => {
      const bmr = { formula: 'mifflin_st_jeor' as const, calculated: false, bmrKcal: null };
      const tdee = service.calculateTdee(bmr, validRoutine);

      expect(tdee.estimatedTdeeKcal).toBeNull();
      expect(tdee.minTdeeKcal).toBeNull();
      expect(tdee.maxTdeeKcal).toBeNull();
    });
  });

  describe('Pesos de Referência', () => {
    it('calcula faixa normal 18.5 - 24.9 e marco de 5%', () => {
      const ref = service.calculateWeightReference({
        ...validBody,
        heightCm: 180,
        weightKg: 100,
        targetWeightKg: 80,
      });

      // Altura 1.80m -> 18.5 * 3.24 = 59.9 kg, 24.9 * 3.24 = 80.7 kg
      expect(ref.minNormalWeightKg).toBeCloseTo(59.94, 10);
      expect(ref.maxNormalWeightKg).toBeCloseTo(80.676, 10);
      // Marco 5% de 100kg -> 95kg
      expect(ref.milestone5PercentWeightKg).toBe(95);

      expect(ref.targetWeightAnalysis?.targetWeightKg).toBe(80);
      expect(ref.targetWeightAnalysis?.category).toBe('within_normal');
      expect(ref.targetWeightAnalysis?.differenceFromCurrentKg).toBe(-20);
    });
  });

  describe('Avaliação de Segurança', () => {
    it('emite emergency quando há sintomas de risco', () => {
      const bmi = service.calculateBmi(80, 180);
      const health: HealthSection = {
        ...validHealth,
        symptoms: ['chest_pain', 'fainting'],
      };

      const safety = service.evaluateSafety(bmi, health);
      expect(safety.status).toBe('emergency');
      expect(safety.isEmergency).toBe(true);
      expect(safety.allowsAutomaticCaloricDeficit).toBe(false);
      expect(safety.requiresProfessionalClearance).toBe(true);
      expect(safety.alerts[0]?.level).toBe('emergency');
    });

    it('emite professional_clearance_required para condição clínica crônica', () => {
      const bmi = service.calculateBmi(80, 180);
      const health: HealthSection = {
        conditions: ['type_1_diabetes'],
        hasNoKnownConditions: false,
        isConditionUnknown: false,
        symptoms: ['none'],
      };

      const safety = service.evaluateSafety(bmi, health);
      expect(safety.status).toBe('professional_clearance_required');
      expect(safety.isEmergency).toBe(false);
      expect(safety.allowsAutomaticCaloricDeficit).toBe(false);
      expect(safety.requiresProfessionalClearance).toBe(true);
    });

    it('emite professional_clearance_required para gestante ou lactante', () => {
      const bmi = service.calculateBmi(60, 165);
      const health: HealthSection = {
        ...validHealth,
        pregnancyStatus: 'pregnant',
      };

      const safety = service.evaluateSafety(bmi, health);
      expect(safety.status).toBe('professional_clearance_required');
      expect(safety.allowsAutomaticCaloricDeficit).toBe(false);
    });

    it('emite caution para obesidade grau 3 (IMC >= 40.0)', () => {
      const bmi = service.calculateBmi(140, 180); // IMC ~43.2
      const safety = service.evaluateSafety(bmi, validHealth);

      expect(safety.status).toBe('professional_clearance_required');
      expect(safety.allowsAutomaticCaloricDeficit).toBe(false);
      expect(safety.alerts.some((a) => a.code === 'OBESITY_CLASS_3_CAUTION')).toBe(true);
    });

    it('não declara aptidão clínica nem libera plano automático sem alertas informados', () => {
      const bmi = service.calculateBmi(70, 175);
      const safety = service.evaluateSafety(bmi, validHealth);

      expect(safety.status).toBe('cleared');
      expect(safety.isEmergency).toBe(false);
      expect(safety.requiresProfessionalClearance).toBe(false);
      expect(safety.allowsAutomaticCaloricDeficit).toBe(false);
    });
  });

  describe('Identificação de Itens Pendentes (findPendingItems)', () => {
    it('detecta ausência de seções completas', () => {
      const pending = service.findPendingItems({
        body: null,
        health: null,
        routine: null,
        nutrition: null,
      });

      expect(pending).toHaveLength(4);
      expect(pending.map((p) => p.section)).toEqual(['body', 'health', 'routine', 'nutrition']);
    });

    it('detecta campos essenciais ausentes na seção corporal', () => {
      const pending = service.findPendingItems({
        ...completeSections,
        body: {
          ...validBody,
          weightKg: 0,
        },
      });

      expect(pending.some((p) => p.field === 'weightKg')).toBe(true);
    });

    it('retorna lista vazia quando todos os campos obrigatórios estão preenchidos', () => {
      const pending = service.findPendingItems(completeSections);
      expect(pending).toHaveLength(0);
    });
  });

  describe('Cálculo Consolidado Completo (calculateResults)', () => {
    it('gera documento completo de resultados para avaliação válida', () => {
      const refDate = new Date(Date.UTC(2026, 9, 16, 12, 0, 0));
      const results = service.calculateResults('user-1', 1, completeSections, refDate);

      expect(results.uid).toBe('user-1');
      expect(results.revision).toBe(1);
      expect(results.calculatedAt).toBe('2026-10-16T12:00:00.000Z');
      expect(results.age).toBe(31);
      expect(results.bmi.value).toBe(26.2);
      expect(results.bmi.category).toBe('overweight');
      expect(results.bmr.calculated).toBe(true);
      expect(results.tdee.estimatedTdeeKcal).toBeGreaterThan(0);
      expect(results.weightReference.milestone5PercentWeightKg).toBe(80.8);
      expect(results.safety.status).toBe('cleared');
    });
  });
});
