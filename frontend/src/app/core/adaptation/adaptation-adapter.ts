import type {
  AdaptationPlanResponse as WirePlan,
  AdaptationPreviewResponse as WirePreview,
} from './adaptation-contract';
import type { AdaptationPlanResponse, AdaptationPreviewResponse } from './adaptation.model';
const reasons: Record<string, string> = {
  CLINICAL_POLICY_PENDING: 'Intensificada indisponível: política clínica ainda não validada.',
  EMERGENCY_SYMPTOMS_PRESENT: 'Sintomas urgentes exigem avaliação presencial imediata.',
  PREGNANCY_OR_LACTATION: 'Gestação ou lactação requer acompanhamento especializado.',
  HEALTH_CONDITIONS_UNKNOWN: 'Esclareça as informações clínicas com um profissional.',
  CLINICAL_CONDITION_RESTRICTION:
    'Condição de saúde ou medicamento informado requer orientação profissional prévia.',
  OBESITY_CLASS_3_CLINICAL_EVALUATION_REQUIRED: 'IMC >= 40 requer acompanhamento multidisciplinar.',
};
const milestones: Record<number, string> = {
  7: '1ª semana',
  14: '2ª semana',
  21: '3ª semana',
  30: 'Fim do período',
};
export function presentPreview(wire: WirePreview): AdaptationPreviewResponse {
  const option = (mode: 'standard' | 'intensified') => ({
    mode,
    title: mode === 'standard' ? 'Modalidade Padrão' : 'Modalidade Intensificada',
    description:
      mode === 'standard'
        ? 'Organização de rotina e hábitos por 30 dias.'
        : 'Indisponível nesta versão; requer política clínica validada.',
    available: wire.modes[mode].available,
    recommended: wire.recommendedMode === mode,
    restrictionReasons: wire.modes[mode].reasons.map((code) => reasons[code] ?? code),
  });
  return {
    hasAssessment: true,
    assessmentCompleted: true,
    assessmentRevision: wire.assessmentRevision,
    recommendedMode: wire.recommendedMode,
    modes: { standard: option('standard'), intensified: option('intensified') },
    safetyAlerts: wire.notices.map((notice) => notice.message),
    calorieTargetKcal: null,
    calorieTargetExplanation: wire.notices.find(
      (notice) => notice.code === 'CALORIE_TARGET_POLICY_PENDING',
    )?.message,
  };
}
export function presentPlan(wire: WirePlan): AdaptationPlanResponse {
  return {
    status: wire.status === 'active' ? 'in_progress' : 'completed',
    mode: wire.mode,
    timeZone: wire.timeZone,
    startDate: wire.startLocalDate,
    endDate: wire.day30LocalDate,
    currentDay: wire.currentDay,
    totalDays: 30,
    calendarProgressPercent: wire.calendarProgressPercent,
    calorieTargetKcal: null,
    calorieTargetExplanation: wire.notices.map((notice) => notice.message).join(' '),
    createdAt: wire.startedAt,
    days: wire.calendar.map((day) => ({
      dayNumber: day.dayNumber,
      date: day.localDate,
      isPast: day.temporalState === 'past',
      isToday: day.temporalState === 'today',
      isFuture: day.temporalState === 'future',
      isMilestone: Boolean(milestones[day.dayNumber]),
      milestoneTitle: milestones[day.dayNumber],
      milestoneDescription: 'Marco temporal; não comprova adesão nem conclusão de atividades.',
    })),
  };
}
