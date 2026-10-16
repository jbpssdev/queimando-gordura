import { Injectable } from '@nestjs/common';
import type {
  AssessmentSections,
  BodySection,
  ExerciseIntensity,
  HealthSection,
  RoutineSection,
} from './types/assessment.types.js';
import type {
  AssessmentResultDocument,
  BmiCategory,
  BmiResult,
  BmrResult,
  BodyCompositionResult,
  PendingItem,
  SafetyAlert,
  SafetyEvaluationResult,
  TdeeResult,
  WeightReferenceResult,
} from './types/metrics.types.js';
import { calculateExactAge } from './utils/date-utils.js';

@Injectable()
export class AssessmentCalculatorService {
  /**
   * Identifica itens e seções essenciais pendentes para a avaliação.
   */
  findPendingItems(sections: AssessmentSections): PendingItem[] {
    const pending: PendingItem[] = [];

    // 1. Body section
    const body = sections.body;
    if (!body) {
      pending.push({
        section: 'body',
        field: 'body',
        reason: 'A seção corporal é obrigatória.',
      });
    } else {
      if (!body.dateOfBirth) {
        pending.push({
          section: 'body',
          field: 'dateOfBirth',
          reason: 'Data de nascimento é obrigatória.',
        });
      }
      if (!body.sexForMetabolicFormula) {
        pending.push({
          section: 'body',
          field: 'sexForMetabolicFormula',
          reason: 'Sexo para fórmula metabólica é obrigatório.',
        });
      }
      if (!body.heightCm || body.heightCm <= 0) {
        pending.push({
          section: 'body',
          field: 'heightCm',
          reason: 'Altura em centímetros é obrigatória.',
        });
      }
      if (!body.weightKg || body.weightKg <= 0) {
        pending.push({
          section: 'body',
          field: 'weightKg',
          reason: 'Peso corporal é obrigatório.',
        });
      }
      if (!body.scaleType) {
        pending.push({
          section: 'body',
          field: 'scaleType',
          reason: 'Tipo de balança é obrigatório.',
        });
      }
    }

    // 2. Health section
    const health = sections.health;
    if (!health) {
      pending.push({
        section: 'health',
        field: 'health',
        reason: 'A seção de saúde é obrigatória.',
      });
    } else {
      const hasConditionStatus =
        health.hasNoKnownConditions === true ||
        health.isConditionUnknown === true ||
        (Array.isArray(health.conditions) && health.conditions.length > 0);

      if (!hasConditionStatus) {
        pending.push({
          section: 'health',
          field: 'conditions',
          reason:
            'Informe ao menos uma condição de saúde, confirme ausência de condições conhecidas ou marque como desconhecida.',
        });
      }
      if (!Array.isArray(health.symptoms)) {
        pending.push({
          section: 'health',
          field: 'symptoms',
          reason: 'Lista de sintomas é obrigatória.',
        });
      }
    }

    // 3. Routine section
    const routine = sections.routine;
    if (!routine) {
      pending.push({
        section: 'routine',
        field: 'routine',
        reason: 'A seção de rotina é obrigatória.',
      });
    } else {
      if (!routine.workPattern) {
        pending.push({
          section: 'routine',
          field: 'workPattern',
          reason: 'Padrão de trabalho é obrigatório.',
        });
      }
      if (routine.sittingHoursPerDay == null) {
        pending.push({
          section: 'routine',
          field: 'sittingHoursPerDay',
          reason: 'Horas sentado por dia é obrigatório.',
        });
      }
      if (!routine.dailyMovementLevel) {
        pending.push({
          section: 'routine',
          field: 'dailyMovementLevel',
          reason: 'Nível de movimentação diária é obrigatório.',
        });
      }
      if (!routine.strengthTraining) {
        pending.push({
          section: 'routine',
          field: 'strengthTraining',
          reason: 'Dados de treino de força são obrigatórios.',
        });
      }
      if (!routine.cardioTraining) {
        pending.push({
          section: 'routine',
          field: 'cardioTraining',
          reason: 'Dados de treino cardiovascular são obrigatórios.',
        });
      }
    }

    // 4. Nutrition section
    const nutrition = sections.nutrition;
    if (!nutrition) {
      pending.push({
        section: 'nutrition',
        field: 'nutrition',
        reason: 'A seção de nutrição é obrigatória.',
      });
    } else {
      if (nutrition.mealsPerDay == null) {
        pending.push({
          section: 'nutrition',
          field: 'mealsPerDay',
          reason: 'Número de refeições por dia é obrigatório.',
        });
      }
      if (!nutrition.mealRegularity) {
        pending.push({
          section: 'nutrition',
          field: 'mealRegularity',
          reason: 'Regularidade das refeições é obrigatória.',
        });
      }
      if (nutrition.hasKitchenScale == null) {
        pending.push({
          section: 'nutrition',
          field: 'hasKitchenScale',
          reason: 'Informação sobre posse de balança de cozinha é obrigatória.',
        });
      }
      if (!nutrition.sweetenedDrinksFrequency) {
        pending.push({
          section: 'nutrition',
          field: 'sweetenedDrinksFrequency',
          reason: 'Frequência de bebidas adoçadas é obrigatória.',
        });
      }
      if (!nutrition.alcoholFrequency) {
        pending.push({
          section: 'nutrition',
          field: 'alcoholFrequency',
          reason: 'Frequência de consumo de álcool é obrigatória.',
        });
      }
      if (nutrition.budgetConstrained == null) {
        pending.push({
          section: 'nutrition',
          field: 'budgetConstrained',
          reason: 'Informação de restrição orçamentária é obrigatória.',
        });
      }
    }

    return pending;
  }

  /**
   * Calcula todos os resultados a partir dos dados consolidados das seções.
   */
  calculateResults(
    uid: string,
    revision: number,
    sections: AssessmentSections,
    referenceDate: Date = new Date(),
  ): AssessmentResultDocument {
    const pending = this.findPendingItems(sections);
    if (pending.length > 0) {
      throw new Error('Não é possível calcular resultados com seções incompletas.');
    }

    const body = sections.body as BodySection;
    const health = sections.health as HealthSection;
    const routine = sections.routine as RoutineSection;

    // 1. Idade
    const age = calculateExactAge(body.dateOfBirth, referenceDate);

    // 2. IMC (BMI)
    const bmi = this.calculateBmi(body.weightKg, body.heightCm);

    // 3. TMB (BMR - Mifflin-St Jeor)
    const bmr = this.calculateBmr(body, age);

    // 4. GET (TDEE)
    const tdee = this.calculateTdee(bmr, routine);

    // 5. Pesos de referência
    const weightReference = this.calculateWeightReference(body);

    // 6. Composição corporal
    const bodyComposition = this.evaluateBodyComposition(body);

    // 7. Avaliação de segurança
    const safety = this.evaluateSafety(bmi, health);

    return {
      uid,
      revision,
      calculatedAt: referenceDate.toISOString(),
      age,
      bmi,
      bmr,
      tdee,
      weightReference,
      bodyComposition,
      safety,
    };
  }

  calculateBmi(weightKg: number, heightCm: number): BmiResult {
    const heightM = heightCm / 100;
    const rawBmi = weightKg / (heightM * heightM);
    const value = Math.round(rawBmi * 10) / 10;

    let category: BmiCategory;
    let classification: string;

    if (value < 18.5) {
      category = 'underweight';
      classification = 'Abaixo do peso';
    } else if (value < 25.0) {
      category = 'normal';
      classification = 'Peso normal';
    } else if (value < 30.0) {
      category = 'overweight';
      classification = 'Sobrepeso';
    } else if (value < 35.0) {
      category = 'obesity_1';
      classification = 'Obesidade grau 1';
    } else if (value < 40.0) {
      category = 'obesity_2';
      classification = 'Obesidade grau 2';
    } else {
      category = 'obesity_3';
      classification = 'Obesidade grau 3';
    }

    return {
      value,
      category,
      classification,
    };
  }

  calculateBmr(body: BodySection, age: number): BmrResult {
    if (body.sexForMetabolicFormula === 'unavailable') {
      return {
        formula: 'mifflin_st_jeor',
        calculated: false,
        bmrKcal: null,
        reasonIfNotCalculated:
          'Fórmula metabólica indisponível: sexo biológico para cálculo não informado.',
      };
    }

    // Mifflin-St Jeor:
    // Homem: 10 * peso(kg) + 6.25 * altura(cm) - 5 * idade(anos) + 5
    // Mulher: 10 * peso(kg) + 6.25 * altura(cm) - 5 * idade(anos) - 161
    const base = 10 * body.weightKg + 6.25 * body.heightCm - 5 * age;
    const bmrValue = body.sexForMetabolicFormula === 'male' ? base + 5 : base - 161;

    return {
      formula: 'mifflin_st_jeor',
      calculated: true,
      bmrKcal: Math.round(bmrValue),
    };
  }

  calculateTdee(bmr: BmrResult, routine: RoutineSection): TdeeResult {
    if (!bmr.calculated || bmr.bmrKcal == null) {
      return {
        estimatedTdeeKcal: null,
        minTdeeKcal: null,
        maxTdeeKcal: null,
        neatMultiplier: 0,
        exerciseAddonKcal: 0,
        explanation: 'GET não calculado devido à indisponibilidade da TMB.',
      };
    }

    // Fator de atividade basal (NEAT) conservador
    let neatMultiplier: number;
    switch (routine.dailyMovementLevel) {
      case 'low':
        neatMultiplier = 1.2;
        break;
      case 'moderate':
        neatMultiplier = 1.3;
        break;
      case 'high':
        neatMultiplier = 1.4;
        break;
      case 'very_high':
        neatMultiplier = 1.5;
        break;
      default:
        neatMultiplier = 1.2;
    }

    if (routine.workPattern === 'sedentary' && routine.sittingHoursPerDay >= 8) {
      neatMultiplier = Math.max(1.15, neatMultiplier - 0.05);
    } else if (routine.workPattern === 'heavy_labor') {
      neatMultiplier = Math.min(1.6, neatMultiplier + 0.05);
    }

    // Gasto adicional de exercícios estruturados (evitando dupla contagem de passos)
    const strengthKcalPerMin = this.getIntensityBurnRate(
      routine.strengthTraining.intensity,
      'strength',
    );
    const cardioKcalPerMin = this.getIntensityBurnRate(
      routine.cardioTraining.intensity,
      'cardio',
    );

    const weeklyStrengthKcal =
      routine.strengthTraining.frequencyDaysPerWeek *
      routine.strengthTraining.durationMinutes *
      strengthKcalPerMin;

    const weeklyCardioKcal =
      routine.cardioTraining.frequencyDaysPerWeek *
      routine.cardioTraining.durationMinutes *
      cardioKcalPerMin;

    const rawExerciseDailyKcal = Math.round((weeklyStrengthKcal + weeklyCardioKcal) / 7);
    // Teto conservador de 600 kcal/dia de gasto médio de treino para evitar superestimar
    const exerciseAddonKcal = Math.min(600, rawExerciseDailyKcal);

    const neatKcal = Math.round(bmr.bmrKcal * neatMultiplier);
    const estimatedTdeeKcal = neatKcal + exerciseAddonKcal;

    const minTdeeKcal = Math.round(estimatedTdeeKcal * 0.92);
    const maxTdeeKcal = Math.round(estimatedTdeeKcal * 1.08);

    const explanation = `GET estimado com base na TMB (${bmr.bmrKcal} kcal) multiplicada pelo fator basal conservador (${neatMultiplier.toFixed(2)}) somada ao gasto médio diário de treino (${exerciseAddonKcal} kcal). Intervalo de segurança: ${minTdeeKcal} a ${maxTdeeKcal} kcal.`;

    return {
      estimatedTdeeKcal,
      minTdeeKcal,
      maxTdeeKcal,
      neatMultiplier,
      exerciseAddonKcal,
      explanation,
    };
  }

  private getIntensityBurnRate(
    intensity: ExerciseIntensity,
    type: 'strength' | 'cardio',
  ): number {
    if (intensity === 'none') return 0;

    if (type === 'strength') {
      switch (intensity) {
        case 'light':
          return 3.5;
        case 'moderate':
          return 5.0;
        case 'high':
          return 6.5;
        default:
          return 0;
      }
    }

    switch (intensity) {
      case 'light':
        return 4.0;
      case 'moderate':
        return 6.5;
      case 'high':
        return 9.0;
      default:
        return 0;
    }
  }

  calculateWeightReference(body: BodySection): WeightReferenceResult {
    const heightM = body.heightCm / 100;
    const heightSq = heightM * heightM;

    const minNormalWeightKg = Math.round(18.5 * heightSq * 10) / 10;
    const maxNormalWeightKg = Math.round(24.9 * heightSq * 10) / 10;

    // Meta intermediária de 5% de redução com evidência de benefício metabólico
    const milestone5PercentWeightKg = Math.round(body.weightKg * 0.95 * 10) / 10;

    let targetWeightAnalysis = null;
    if (body.targetWeightKg != null) {
      const diff = Math.round((body.targetWeightKg - body.weightKg) * 10) / 10;
      let category: 'below_normal' | 'within_normal' | 'above_normal';

      if (body.targetWeightKg < minNormalWeightKg) {
        category = 'below_normal';
      } else if (body.targetWeightKg <= maxNormalWeightKg) {
        category = 'within_normal';
      } else {
        category = 'above_normal';
      }

      targetWeightAnalysis = {
        targetWeightKg: body.targetWeightKg,
        category,
        differenceFromCurrentKg: diff,
      };
    }

    return {
      minNormalWeightKg,
      maxNormalWeightKg,
      milestone5PercentWeightKg,
      targetWeightAnalysis,
    };
  }

  evaluateBodyComposition(body: BodySection): BodyCompositionResult {
    if (body.scaleType === 'standard') {
      return {
        scaleType: 'standard',
        notes: ['Balança convencional selecionada. Medições de bioimpedância não aplicadas.'],
      };
    }

    const notes: string[] = ['Balança de bioimpedância informada.'];

    return {
      scaleType: 'bioimpedance',
      bodyFatPercent: body.bodyFatPercent ?? null,
      muscleMassKg: body.muscleMassKg ?? null,
      bodyWaterPercent: body.bodyWaterPercent ?? null,
      visceralFatIndex: body.visceralFatIndex ?? null,
      notes,
    };
  }

  evaluateSafety(bmi: BmiResult, health: HealthSection): SafetyEvaluationResult {
    const alerts: SafetyAlert[] = [];

    // 1. Sintomas de emergência médica
    const emergencySymptomCodes = [
      'chest_pain',
      'fainting',
      'syncope',
      'severe_shortness_of_breath',
      'severe_palpitations',
      'dizziness_on_exertion',
    ];

    const reportedEmergencySymptoms = (health.symptoms || []).filter((s) =>
      emergencySymptomCodes.includes(s.toLowerCase()),
    );

    if (reportedEmergencySymptoms.length > 0) {
      alerts.push({
        code: 'EMERGENCY_SYMPTOMS',
        level: 'emergency',
        message:
          'Sintomas de alerta relatados (como dor no peito, desmaios ou falta de ar grave) exigem avaliação médica presencial imediata antes de qualquer início de dieta ou atividade física.',
      });

      return {
        status: 'emergency',
        alerts,
        requiresProfessionalClearance: true,
        isEmergency: true,
        allowsAutomaticCaloricDeficit: false,
        allowsIntensifiedAdaptation: false,
      };
    }

    // 2. Condições clínicas de risco e precaução
    const cautionConditionCodes = [
      'type_1_diabetes',
      'type_2_diabetes',
      'cardiovascular_disease',
      'heart_disease',
      'severe_respiratory_disease',
      'chronic_kidney_disease',
      'renal_disease',
      'active_eating_disorder',
      'cancer_active',
    ];

    const reportedConditions = (health.conditions || []).filter((c) =>
      cautionConditionCodes.includes(c.toLowerCase()),
    );

    const isPregnantOrNursing =
      health.pregnancyStatus === 'pregnant' || health.pregnancyStatus === 'breastfeeding';

    let requiresClearance = false;

    if (reportedConditions.length > 0) {
      requiresClearance = true;
      alerts.push({
        code: 'CLINICAL_CONDITION_CAUTION',
        level: 'warning',
        message:
          'Condição clínica crônica relatada. É obrigatório acompanhamento médico ou nutricional individualizado; restrição calórica automática desativada.',
      });
    }

    if (isPregnantOrNursing) {
      requiresClearance = true;
      alerts.push({
        code: 'PREGNANCY_LACTATION_CAUTION',
        level: 'warning',
        message:
          'Gestação ou lactação identificada. Necessidades nutricionais são específicas e contraindicam déficit calórico automático; orientação profissional é indispensável.',
      });
    }

    // 3. Obesidade Grau 3 (IMC >= 40.0)
    if (bmi.category === 'obesity_3') {
      requiresClearance = true;
      alerts.push({
        code: 'OBESITY_CLASS_3_CAUTION',
        level: 'warning',
        message:
          'Obesidade grau 3 identificada (IMC >= 40.0). Recomenda-se acompanhamento multidisciplinar. O início deve ser focado em hábitos graduais e sem cortes calóricos agressivos.',
      });
    }

    if (requiresClearance) {
      return {
        status: 'professional_clearance_required',
        alerts,
        requiresProfessionalClearance: true,
        isEmergency: false,
        allowsAutomaticCaloricDeficit: false,
        allowsIntensifiedAdaptation: false,
      };
    }

    // 4. Liberado (Cleared)
    alerts.push({
      code: 'SAFE_TO_PROCEED',
      level: 'info',
      message:
        'Nenhuma contraindicação clínica relatada. Apto para início das diretrizes graduais de adaptação.',
    });

    return {
      status: 'cleared',
      alerts,
      requiresProfessionalClearance: false,
      isEmergency: false,
      allowsAutomaticCaloricDeficit: true,
      allowsIntensifiedAdaptation: true,
    };
  }
}
