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
