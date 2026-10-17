export type AdaptationMode = 'standard' | 'intensified';
export type AdaptationStatus = 'in_progress' | 'completed' | 'expired';

export interface AdaptationModeOption {
  readonly mode: AdaptationMode;
  readonly title: string;
  readonly description: string;
  readonly available: boolean;
  readonly restrictionReasons?: readonly string[];
  readonly recommended: boolean;
  readonly badge?: string;
}

export interface AdaptationPreviewResponse {
  readonly hasAssessment: boolean;
  readonly assessmentCompleted: boolean;
  readonly assessmentRevision?: number;
  readonly recommendedMode: AdaptationMode | null;
  readonly modes: {
    readonly standard: AdaptationModeOption;
    readonly intensified: AdaptationModeOption;
  };
  readonly safetyStatus?: string;
  readonly safetyAlerts?: readonly string[];
  readonly calorieTargetKcal?: number | null;
  readonly calorieTargetExplanation?: string | null;
}

export interface StartAdaptationDto {
  readonly mode: AdaptationMode;
  readonly timeZone: string;
}

export interface AdaptationDay {
  readonly dayNumber: number; // 1 a 30
  readonly date: string; // YYYY-MM-DD
  readonly isPast: boolean;
  readonly isToday: boolean;
  readonly isFuture: boolean;
  readonly isMilestone: boolean;
  readonly milestoneTitle?: string;
  readonly milestoneDescription?: string;
}

export interface AdaptationPlanResponse {
  readonly uid?: string;
  readonly status: AdaptationStatus;
  readonly mode: AdaptationMode;
  readonly timeZone: string;
  readonly startDate: string; // YYYY-MM-DD
  readonly endDate: string; // YYYY-MM-DD
  readonly currentDay: number; // 1 a 30
  readonly totalDays: number; // 30
  readonly calorieTargetKcal?: number | null;
  readonly calorieTargetExplanation?: string | null;
  readonly days: readonly AdaptationDay[];
  readonly createdAt: string;
  readonly updatedAt?: string;
  readonly calendarProgressPercent?: number;
}

export interface WeighInRecord {
  readonly date: string; // YYYY-MM-DD
  readonly weightKg: number;
  readonly source: 'assessment' | 'diary';
}

export interface WeightEvolution {
  readonly initialWeightKg: number | null;
  readonly initialWeightDate: string | null;
  readonly latestWeightKg: number | null;
  readonly latestWeightDate: string | null;
  readonly weightDeltaKg: number | null;
  readonly weighIns: readonly WeighInRecord[];
  readonly currentBmi: number | null;
  readonly initialBmi: number | null;
  readonly updatedMetabolicEstimates: {
    readonly tmbKcal: number | null;
    readonly getKcal: number | null;
  } | null;
}

export interface HabitSummary {
  readonly totalDaysMonitored: number;
  readonly daysWithMeals: number;
  readonly daysWithWater: number;
  readonly daysWithActivities: number;
  readonly daysWithWeight: number;
  readonly totalWaterMl?: number;
  readonly totalActivityMinutes?: number;
}

export interface PeriodDay {
  readonly dayNumber: number;
  readonly date: string;
  readonly isPast: boolean;
  readonly isToday: boolean;
  readonly isFuture: boolean;
  readonly hasMeals: boolean;
  readonly hasWater: boolean;
  readonly hasActivities: boolean;
  readonly hasWeight: boolean;
}

export interface WeeklyPeriod {
  readonly periodNumber: number;
  readonly title: string;
  readonly startDay: number;
  readonly endDay: number;
  readonly milestoneDay: number | null;
  readonly milestoneTitle: string | null;
  readonly days: readonly PeriodDay[];
}

export interface AdaptationAchievement {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly icon?: string;
  readonly unlocked: boolean;
  readonly unlockedAt: string | null;
  readonly progress?: number;
  readonly target?: number;
}

export interface AdaptationProgressResponse {
  readonly planStatus: 'not_started' | 'in_progress' | 'completed';
  readonly mode: AdaptationMode | null;
  readonly currentDay: number;
  readonly totalDays: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly timeZone: string;
  readonly reportAvailable: boolean;
  readonly calorieTargetKcal: null;
  readonly summary: HabitSummary;
  readonly weightEvolution: WeightEvolution;
  readonly weeklyPeriods: readonly WeeklyPeriod[];
  readonly achievements: readonly AdaptationAchievement[];
  readonly notices: readonly string[];
}

