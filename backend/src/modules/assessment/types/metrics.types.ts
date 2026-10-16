import type { AssessmentSectionName, ScaleType } from './assessment.types.js';

export type BmiCategory =
  | 'underweight'
  | 'normal'
  | 'overweight'
  | 'obesity_1'
  | 'obesity_2'
  | 'obesity_3';

export interface BmiResult {
  readonly value: number;
  readonly category: BmiCategory;
  readonly classification: string;
}

export interface BmrResult {
  readonly formula: 'mifflin_st_jeor';
  readonly calculated: boolean;
  readonly bmrKcal: number | null;
  readonly reasonIfNotCalculated?: string | null;
}

export interface TdeeResult {
  readonly estimatedTdeeKcal: number | null;
  readonly minTdeeKcal: number | null;
  readonly maxTdeeKcal: number | null;
  readonly neatMultiplier: number;
  readonly exerciseAddonKcal: number;
  readonly explanation: string;
}

export interface TargetWeightAnalysis {
  readonly targetWeightKg: number;
  readonly category: 'below_normal' | 'within_normal' | 'above_normal';
  readonly differenceFromCurrentKg: number;
}

export interface WeightReferenceResult {
  readonly minNormalWeightKg: number;
  readonly maxNormalWeightKg: number;
  readonly milestone5PercentWeightKg: number;
  readonly targetWeightAnalysis?: TargetWeightAnalysis | null;
}

export interface BodyCompositionResult {
  readonly scaleType: ScaleType;
  readonly bodyFatPercent?: number | null;
  readonly muscleMassKg?: number | null;
  readonly bodyWaterPercent?: number | null;
  readonly visceralFatIndex?: number | null;
  readonly notes?: string[];
}

export type SafetyStatus = 'cleared' | 'professional_clearance_required' | 'emergency';
export type SafetyAlertLevel = 'emergency' | 'warning' | 'info';

export interface SafetyAlert {
  readonly code: string;
  readonly level: SafetyAlertLevel;
  readonly message: string;
}

export interface SafetyEvaluationResult {
  readonly status: SafetyStatus;
  readonly alerts: readonly SafetyAlert[];
  readonly requiresProfessionalClearance: boolean;
  readonly isEmergency: boolean;
  readonly allowsAutomaticCaloricDeficit: boolean;
  readonly allowsIntensifiedAdaptation: boolean;
}

export interface PendingItem {
  readonly section: AssessmentSectionName;
  readonly field: string;
  readonly reason: string;
}

export interface AssessmentResultDocument {
  readonly uid: string;
  readonly revision: number;
  readonly calculatedAt: string;
  readonly age: number;
  readonly bmi: BmiResult;
  readonly bmr: BmrResult;
  readonly tdee: TdeeResult;
  readonly weightReference: WeightReferenceResult;
  readonly bodyComposition: BodyCompositionResult;
  readonly safety: SafetyEvaluationResult;
}
