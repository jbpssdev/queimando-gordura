import type {
  AdaptationPlanResponse as WirePlan,
  AdaptationPreviewResponse as WirePreview,
  WireAdaptationProgressResponse as WireProgress,
} from './adaptation-contract';
import type {
  AdaptationPlanResponse,
  AdaptationPreviewResponse,
  AdaptationProgressResponse,
} from './adaptation.model';
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

export function presentProgress(wire: WireProgress): AdaptationProgressResponse {
  const evolution = wire.weightEvolution;
  return {
    planStatus: wire.status === 'active' ? 'in_progress' : 'completed',
    mode: wire.mode,
    currentDay: wire.currentDay,
    totalDays: 30,
    startDate: wire.startDate,
    endDate: wire.endDate,
    timeZone: wire.timeZone,
    reportAvailable: wire.reportAvailable,
    calorieTargetKcal: null,
    summary: {
      totalDaysMonitored: wire.currentDay,
      daysWithMeals: wire.participation.daysWithMeals,
      daysWithWater: wire.participation.daysWithWater,
      daysWithActivities: wire.participation.daysWithActivities,
      daysWithWeight: wire.participation.daysWithWeight,
    },
    weightEvolution: {
      initialWeightKg: evolution.initialDeclaredWeight?.weightKg ?? null,
      initialWeightDate: evolution.initialDeclaredWeight?.date ?? null,
      latestWeightKg: evolution.lastMeasurement?.weightKg ?? null,
      latestWeightDate: evolution.lastMeasurement?.date ?? null,
      weightDeltaKg: evolution.weightDeltaKg,
      weighIns: evolution.measurements.map((w) => ({
        date: w.date,
        weightKg: w.weightKg,
        source: w.source,
      })),
      currentBmi: wire.derivedIndicators.currentBmi?.value ?? null,
      initialBmi: wire.derivedIndicators.initialBmi?.value ?? null,
      updatedMetabolicEstimates: wire.derivedIndicators.currentBmr
        ? {
            tmbKcal: wire.derivedIndicators.currentBmr.bmrKcal,
            getKcal: null,
          }
        : null,
    },
    weeklyPeriods: wire.weeklyPeriods.map((wp) => ({
      periodNumber: wp.periodNumber,
      title: wp.label,
      startDay: wp.days?.[0]?.dayNumber ?? 0,
      endDay: wp.days?.at(-1)?.dayNumber ?? 0,
      milestoneDay: wp.days?.find((d) => milestones[d.dayNumber])?.dayNumber ?? null,
      milestoneTitle: wp.days?.map((d) => milestones[d.dayNumber]).find(Boolean) ?? null,
      days: (wp.days ?? []).map((d) => ({
        dayNumber: d.dayNumber,
        date: d.localDate,
        isPast: d.temporalState === 'past',
        isToday: d.temporalState === 'today',
        isFuture: d.temporalState === 'future',
        hasMeals: d.hasMeals,
        hasWater: d.hasWater,
        hasActivities: d.hasActivities,
        hasWeight: d.hasWeight,
      })),
    })),
    achievements: [...wire.achievements.unlocked, ...wire.achievements.locked].map((a) => ({
      id: a.code,
      title: a.title,
      description: a.description,
      unlocked: a.unlocked,
      unlockedAt: a.unlockedAt,
      progress: a.progress.current,
      target: a.progress.target,
    })),
    notices: wire.notices.map((n) => n.message),
  };
}
