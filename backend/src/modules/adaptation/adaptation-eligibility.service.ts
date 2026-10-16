import { Injectable } from '@nestjs/common';
import type { AssessmentResponse, HealthSection } from '../assessment/types/assessment.types.js';
import type { AssessmentResultDocument } from '../assessment/types/metrics.types.js';
import type {
  AdaptationNotice,
  AdaptationPreviewResponse,
  ModeAvailability,
} from './types/adaptation.types.js';

const EMERGENCY_SYMPTOMS = [
  'chest_pain',
  'fainting',
  'syncope',
  'severe_shortness_of_breath',
  'severe_palpitations',
  'dizziness_on_exertion',
];

@Injectable()
export class AdaptationEligibilityService {
  evaluateEligibility(
    assessment: AssessmentResponse,
    results: AssessmentResultDocument,
  ): AdaptationPreviewResponse {
    const health = assessment.sections.health;
    const notices: AdaptationNotice[] = [];

    // 1. Sintomas de urgência / emergência
    const hasEmergency = this.hasEmergencySymptoms(health, results);
    if (hasEmergency) {
      notices.push({
        code: 'EMERGENCY_SYMPTOMS_ALERT',
        message:
          'Sintomas de alerta relatados (como dor no peito, desmaios ou falta de ar grave). É indispensável buscar avaliação médica presencial imediatamente antes de iniciar qualquer jornada.',
      });

      return {
        assessmentRevision: results.revision,
        recommendedMode: null,
        modes: {
          standard: {
            available: false,
            reasons: ['EMERGENCY_SYMPTOMS_PRESENT'],
          },
          intensified: {
            available: false,
            reasons: ['CLINICAL_POLICY_PENDING', 'EMERGENCY_SYMPTOMS_PRESENT'],
          },
        },
        calorieTargetAvailable: false,
        notices: this.appendCalorieNotice(notices),
      };
    }

    // 2. Gestação ou lactação
    const isPregnantOrNursing =
      health?.pregnancyStatus === 'pregnant' || health?.pregnancyStatus === 'breastfeeding';
    if (isPregnantOrNursing) {
      notices.push({
        code: 'PREGNANCY_LACTATION_ALERT',
        message:
          'Gestantes e lactantes necessitam de acompanhamento médico e nutricional especializado; jornada de adaptação padrão não recomendada.',
      });

      return {
        assessmentRevision: results.revision,
        recommendedMode: null,
        modes: {
          standard: {
            available: false,
            reasons: ['PREGNANCY_OR_LACTATION'],
          },
          intensified: {
            available: false,
            reasons: ['CLINICAL_POLICY_PENDING', 'PREGNANCY_OR_LACTATION'],
          },
        },
        calorieTargetAvailable: false,
        notices: this.appendCalorieNotice(notices),
      };
    }

    // 3. Condições de saúde desconhecidas
    if (health?.isConditionUnknown) {
      notices.push({
        code: 'HEALTH_UNKNOWN_ALERT',
        message:
          'Informações de saúde informadas como desconhecidas. Recomenda-se avaliação médica prévia para esclarecimento antes de iniciar o plano de adaptação.',
      });

      return {
        assessmentRevision: results.revision,
        recommendedMode: null,
        modes: {
          standard: {
            available: false,
            reasons: ['HEALTH_CONDITIONS_UNKNOWN'],
          },
          intensified: {
            available: false,
            reasons: ['CLINICAL_POLICY_PENDING', 'HEALTH_CONDITIONS_UNKNOWN'],
          },
        },
        calorieTargetAvailable: false,
        notices: this.appendCalorieNotice(notices),
      };
    }

    // 4. Comorbidades / Condições clínicas crônicas relevantes
    const hasRestrictiveConditions = this.hasRestrictiveConditions(health);
    if (hasRestrictiveConditions) {
      notices.push({
        code: 'CLINICAL_CONDITION_ALERT',
        message:
          'Condição clínica crônica declarada exige acompanhamento profissional especializado individualizado antes do início da jornada.',
      });

      return {
        assessmentRevision: results.revision,
        recommendedMode: null,
        modes: {
          standard: {
            available: false,
            reasons: ['CLINICAL_CONDITION_RESTRICTION'],
          },
          intensified: {
            available: false,
            reasons: ['CLINICAL_POLICY_PENDING', 'CLINICAL_CONDITION_RESTRICTION'],
          },
        },
        calorieTargetAvailable: false,
        notices: this.appendCalorieNotice(notices),
      };
    }

    // 5. Obesidade Grau 3 (IMC >= 40) isolada
    const isObesityClass3 = results.bmi.category === 'obesity_3';
    if (isObesityClass3) {
      notices.push({
        code: 'OBESITY_CLASS_3_GUIDANCE',
        message:
          'Para IMC igual ou superior a 40, a jornada Padrão de 30 dias está disponível para organização de rotina e hábitos. O acompanhamento multidisciplinar é fundamental e a modalidade Intensificada permanece indisponível.',
      });

      return {
        assessmentRevision: results.revision,
        recommendedMode: 'standard',
        modes: {
          standard: {
            available: true,
            reasons: [],
          },
          intensified: {
            available: false,
            reasons: ['CLINICAL_POLICY_PENDING', 'OBESITY_CLASS_3_CLINICAL_EVALUATION_REQUIRED'],
          },
        },
        calorieTargetAvailable: false,
        notices: this.appendCalorieNotice(notices),
      };
    }

    // 6. Elegível para a modalidade Padrão (Sem contraindicações específicas)
    notices.push({
      code: 'STANDARD_MODE_AVAILABLE',
      message:
        'Jornada Padrão de 30 dias disponível para acompanhamento de rotina e consolidação de hábitos saudáveis.',
    });

    const standardMode: ModeAvailability = {
      available: true,
      reasons: [],
    };

    const intensifiedMode: ModeAvailability = {
      available: false,
      reasons: ['CLINICAL_POLICY_PENDING'],
    };

    return {
      assessmentRevision: results.revision,
      recommendedMode: 'standard',
      modes: {
        standard: standardMode,
        intensified: intensifiedMode,
      },
      calorieTargetAvailable: false,
      notices: this.appendCalorieNotice(notices),
    };
  }

  private hasEmergencySymptoms(
    health: HealthSection | null,
    results: AssessmentResultDocument,
  ): boolean {
    if (results.safety.isEmergency) return true;
    if (!health?.symptoms || !Array.isArray(health.symptoms)) return false;

    return health.symptoms.some((s) => EMERGENCY_SYMPTOMS.includes(s.toLowerCase()));
  }

  private hasRestrictiveConditions(health: HealthSection | null): boolean {
    if (!health) return false;
    if (health.takesContinuousMedication) return true;

    if (Array.isArray(health.continuousMedications) && health.continuousMedications.length > 0) {
      return true;
    }

    if (!Array.isArray(health.conditions) || health.conditions.length === 0) {
      return false;
    }

    // AssessmentModule sinaliza qualquer condição declarada, inclusive texto livre.
    return health.conditions.length > 0;
  }

  private appendCalorieNotice(notices: AdaptationNotice[]): AdaptationNotice[] {
    return [
      ...notices,
      {
        code: 'NO_CLINICAL_CLEARANCE',
        message:
          'A disponibilidade da jornada é apenas organizacional: não constitui liberação clínica. Informações autodeclaradas sem alertas não comprovam saúde; procure orientação profissional.',
      },
      {
        code: 'CALORIE_TARGET_POLICY_PENDING',
        message:
          'Metas calóricas numéricas automáticas desativadas nesta versão; jornada voltada à consolidação de hábitos comportamentais e rotina.',
      },
    ];
  }
}
