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

export interface AdaptationDocument {
  readonly uid: string;
  readonly id: 'initial';
  readonly mode: AdaptationMode;
  readonly policyVersion: string;
  readonly status: AdaptationStatus;
  readonly assessmentRevision: number;
  readonly startedAt: string;
  readonly timeZone: string;
  readonly startLocalDate: string;
  readonly day30LocalDate: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly completedAt?: string | null;
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
