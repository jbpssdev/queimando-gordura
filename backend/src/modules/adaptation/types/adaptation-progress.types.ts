import type { AdaptationMode, AdaptationNotice, AdaptationStatus } from './adaptation.types.js';

export type AchievementCode =
  | 'FIRST_DIARY_ENTRY'
  | 'FIRST_MEAL_ENTRY'
  | 'FIRST_ACTIVITY_ENTRY'
  | 'FIRST_WEIGHT_ENTRY'
  | 'SEVEN_DISTINCT_DAYS_RECORDED'
  | 'FOURTEEN_DISTINCT_DAYS_RECORDED'
  | 'ADAPTATION_30_DAYS_COMPLETED';

export interface AchievementItem {
  readonly code: AchievementCode;
  readonly title: string;
  readonly description: string;
  readonly unlocked: boolean;
  readonly unlockedAt: string | null;
  readonly progress: {
    readonly current: number;
    readonly target: number;
  };
}

export interface AdaptationParticipationMetrics {
  readonly distinctDaysRecorded: number;
  readonly daysWithMeals: number;
  readonly daysWithWater: number;
  readonly daysWithActivities: number;
  readonly daysWithWeight: number;
}

export interface WeightMeasurementPoint {
  readonly date: string; // YYYY-MM-DD
  readonly weightKg: number;
  readonly source: 'diary';
  readonly derivedBmi: number | null;
  readonly derivedBmr: number | null;
  readonly formulaVersion: string;
}

export interface InitialDeclaredWeight {
  readonly weightKg: number;
  readonly date: string; // YYYY-MM-DD
  readonly source: 'initial_assessment';
}

export interface WeightEvolution {
  readonly initialDeclaredWeight: InitialDeclaredWeight | null;
  readonly measurements: readonly WeightMeasurementPoint[];
  readonly firstMeasurement: { readonly date: string; readonly weightKg: number } | null;
  readonly lastMeasurement: { readonly date: string; readonly weightKg: number } | null;
  readonly weightDeltaKg: number | null;
  readonly deltaReason: string | null;
}

export interface WeeklyNutritionSummary {
  readonly totalKcal: number | null;
  readonly daysWithRecords: number;
  readonly isPartial: boolean;
  readonly note: string;
}

export interface WeeklyPeriodSummary {
  readonly periodNumber: number; // 1 a 5
  readonly label: string;
  readonly startDate: string; // YYYY-MM-DD
  readonly endDate: string; // YYYY-MM-DD
  readonly totalDays: number;
  readonly elapsedDays: number;
  readonly distinctDaysRecorded: number;
  readonly daysWithMeals: number;
  readonly daysWithWater: number;
  readonly daysWithActivities: number;
  readonly weights: readonly WeightMeasurementPoint[];
  readonly nutritionSummary: WeeklyNutritionSummary;
  readonly days?: readonly {
    readonly dayNumber: number;
    readonly localDate: string;
    readonly temporalState: 'past' | 'today' | 'future';
    readonly hasMeals: boolean;
    readonly hasWater: boolean;
    readonly hasActivities: boolean;
    readonly hasWeight: boolean;
  }[];
}

export interface CurrentBmiIndicator {
  readonly value: number;
  readonly category: string;
  readonly classification: string;
  readonly date: string;
  readonly formulaVersion: string;
}

export interface CurrentBmrIndicator {
  readonly bmrKcal: number | null;
  readonly formula: string;
  readonly formulaVersion: string;
  readonly date: string;
  readonly calculated: boolean;
  readonly reasonIfNotCalculated?: string;
}

export interface InitialDerivedIndicator {
  readonly value: number | null;
  readonly classification?: string;
  readonly formula?: string;
}

export interface DerivedIndicators {
  readonly currentBmi: CurrentBmiIndicator | null;
  readonly currentBmr: CurrentBmrIndicator | null;
  readonly initialBmi: InitialDerivedIndicator | null;
  readonly initialBmr: InitialDerivedIndicator | null;
}

export interface AdaptationProgressResponse {
  readonly id: string;
  readonly mode: AdaptationMode;
  readonly status: AdaptationStatus;
  readonly currentDay: number;
  readonly startDate: string;
  readonly endDate: string;
  readonly timeZone: string;
  readonly elapsedDays: number;
  readonly remainingDays: number;
  readonly calendarProgressPercent: number;
  readonly participation: AdaptationParticipationMetrics;
  readonly weeklyPeriods: readonly WeeklyPeriodSummary[];
  readonly weightEvolution: WeightEvolution;
  readonly derivedIndicators: DerivedIndicators;
  readonly achievements: {
    readonly unlocked: readonly AchievementItem[];
    readonly locked: readonly AchievementItem[];
  };
  readonly reportAvailable: boolean;
  readonly notices: readonly AdaptationNotice[];
}
