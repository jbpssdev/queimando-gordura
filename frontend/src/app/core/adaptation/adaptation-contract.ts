// Contrato HTTP canônico; elegibilidade, calendário e métricas pertencem à API.
export type AdaptationMode = 'standard' | 'intensified';
export type AdaptationStatus = 'active' | 'completed';
export type CalendarTemporalState = 'past' | 'today' | 'future';

export interface CalendarDay {
  readonly dayNumber: number;
  readonly localDate: string; // YYYY-MM-DD
  readonly temporalState: CalendarTemporalState;
}

export interface ModeAvailability {
  readonly available: boolean;
  readonly reasons: readonly string[];
}

export interface AdaptationNotice {
  readonly code: string;
  readonly message: string;
}

export interface AdaptationPreviewResponse {
  readonly assessmentRevision: number;
  readonly recommendedMode: AdaptationMode | null;
  readonly modes: {
    readonly standard: ModeAvailability;
    readonly intensified: ModeAvailability;
  };
  readonly calorieTargetAvailable: false;
  readonly notices: readonly AdaptationNotice[];
}

export interface AdaptationPlanResponse {
  readonly id: string;
  readonly mode: AdaptationMode;
  readonly status: AdaptationStatus;
  readonly assessmentRevision: number;
  readonly startedAt: string;
  readonly timeZone: string;
  readonly startLocalDate: string;
  readonly day30LocalDate: string;
  readonly currentDay: number;
  readonly elapsedDays: number;
  readonly remainingDays: number;
  readonly calendarProgressPercent: number;
  readonly calendar: readonly CalendarDay[];
  readonly calorieTarget: null;
  readonly notices: readonly AdaptationNotice[];
}

export interface WireWeighInRecord {
  readonly date: string; // YYYY-MM-DD
  readonly weightKg: number;
  readonly source: 'assessment' | 'diary';
}

export interface WireWeightEvolution {
  readonly initialWeightKg: number | null;
  readonly initialWeightDate: string | null;
  readonly latestWeightKg: number | null;
  readonly latestWeightDate: string | null;
  readonly weightDeltaKg: number | null;
  readonly weighIns: readonly WireWeighInRecord[];
  readonly currentBmi: number | null;
  readonly initialBmi: number | null;
  readonly updatedMetabolicEstimates: {
    readonly tmbKcal: number | null;
    readonly getKcal: number | null;
  } | null;
}

export interface WireProgressHabitSummary {
  readonly totalDaysMonitored: number;
  readonly daysWithMeals: number;
  readonly daysWithWater: number;
  readonly daysWithActivities: number;
  readonly daysWithWeight: number;
  readonly totalWaterMl?: number;
  readonly totalActivityMinutes?: number;
}

export interface WirePeriodDay {
  readonly dayNumber: number;
  readonly localDate: string; // YYYY-MM-DD
  readonly temporalState: CalendarTemporalState;
  readonly hasMeals: boolean;
  readonly hasWater: boolean;
  readonly hasActivities: boolean;
  readonly hasWeight: boolean;
}

export interface WireWeeklyPeriod {
  readonly periodNumber: number; // 1 a 5
  readonly title: string;
  readonly startDay: number;
  readonly endDay: number;
  readonly milestoneDay: number | null;
  readonly milestoneTitle: string | null;
  readonly days: readonly WirePeriodDay[];
}

export interface WireAdaptationAchievement {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon?: string;
  readonly unlocked: boolean;
  readonly unlockedAt: string | null;
  readonly progress?: number;
  readonly target?: number;
}

export interface WireAdaptationProgressResponse {
  readonly planStatus: 'not_started' | 'active' | 'completed';
  readonly mode: AdaptationMode | null;
  readonly currentDay: number;
  readonly totalDays: number;
  readonly startLocalDate: string;
  readonly day30LocalDate: string;
  readonly timeZone: string;
  readonly reportAvailable: boolean;
  readonly calorieTarget: null;
  readonly summary: WireProgressHabitSummary;
  readonly weightEvolution: WireWeightEvolution;
  readonly weeklyPeriods: readonly WireWeeklyPeriod[];
  readonly achievements: readonly WireAdaptationAchievement[];
  readonly notices: readonly AdaptationNotice[];
}

