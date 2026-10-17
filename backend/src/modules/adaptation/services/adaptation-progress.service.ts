import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AssessmentCalculatorService } from '../../assessment/assessment-calculator.service.js';
import { AssessmentService } from '../../assessment/assessment.service.js';
import type { BodySection } from '../../assessment/types/assessment.types.js';
import type { AssessmentResultDocument } from '../../assessment/types/metrics.types.js';
import { calculateExactAge } from '../../assessment/utils/date-utils.js';
import type { AuthenticatedUser } from '../../auth/auth.types.js';
import type {
  ActivityEntry,
  MealDocument,
  WaterEntry,
  WeightEntry,
} from '../../diary/types/diary.types.js';
import { FirebaseService } from '../../firebase/firebase.service.js';
import { ClockService } from '../clock.service.js';
import type {
  AchievementCode,
  AchievementItem,
  AdaptationParticipationMetrics,
  AdaptationProgressResponse,
  CurrentBmiIndicator,
  CurrentBmrIndicator,
  DerivedIndicators,
  InitialDeclaredWeight,
  WeeklyNutritionSummary,
  WeeklyPeriodSummary,
  WeightEvolution,
  WeightMeasurementPoint,
} from '../types/adaptation-progress.types.js';
import type { AdaptationDocument, AdaptationNotice } from '../types/adaptation.types.js';
import {
  addCivilDays,
  computeTemporalMetrics,
  diffCivilDays,
  getLocalDateString,
} from '../utils/date-calendar.utils.js';

@Injectable()
export class AdaptationProgressService {
  private readonly logger = new Logger(AdaptationProgressService.name);

  constructor(
    @Inject(FirebaseService) private readonly firebaseService: FirebaseService,
    @Inject(AssessmentService) private readonly assessmentService: AssessmentService,
    @Inject(AssessmentCalculatorService)
    private readonly assessmentCalculatorService: AssessmentCalculatorService,
    @Inject(ClockService) private readonly clockService: ClockService,
  ) {}

  async getProgress(user: AuthenticatedUser): Promise<AdaptationProgressResponse> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const planDocRef = firestore
        .collection('users')
        .doc(user.uid)
        .collection('adaptations')
        .doc('initial');

      const planSnapshot = await planDocRef.get();
      if (!planSnapshot.exists) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'ADAPTATION_NOT_FOUND',
          message: 'Plano de adaptação não encontrado.',
        });
      }

      const planDoc = planSnapshot.data() as AdaptationDocument;
      const now = this.clockService.now();
      const currentLocalDate = getLocalDateString(now, planDoc.timeZone);

      const metrics = computeTemporalMetrics(
        planDoc.startLocalDate,
        planDoc.day30LocalDate,
        currentLocalDate,
      );

      // 1. Consulta dados do diário estritamente dentro do intervalo de 30 dias
      const userRef = firestore.collection('users').doc(user.uid);
      const [mealsSnap, waterSnap, activitiesSnap, weightsSnap] = await Promise.all([
        userRef
          .collection('diary_meals')
          .where('date', '>=', planDoc.startLocalDate)
          .where('date', '<=', planDoc.day30LocalDate)
          .get(),
        userRef
          .collection('diary_water')
          .where('date', '>=', planDoc.startLocalDate)
          .where('date', '<=', planDoc.day30LocalDate)
          .get(),
        userRef
          .collection('diary_activities')
          .where('date', '>=', planDoc.startLocalDate)
          .where('date', '<=', planDoc.day30LocalDate)
          .get(),
        userRef
          .collection('diary_weights')
          .where('date', '>=', planDoc.startLocalDate)
          .where('date', '<=', planDoc.day30LocalDate)
          .get(),
      ]);

      const meals = mealsSnap.docs.map((d) => d.data() as MealDocument);
      const waterEntries = waterSnap.docs.map((d) => d.data() as WaterEntry);
      const activities = activitiesSnap.docs.map((d) => d.data() as ActivityEntry);
      const weightEntries = weightsSnap.docs.map((d) => d.data() as WeightEntry);

      // 2. Consulta avaliação inicial para obter dados de referência (altura, sexo, peso inicial declarado)
      let initialAssessment = null;
      let initialResults: AssessmentResultDocument | null = null;
      try {
        initialAssessment = await this.assessmentService.getAssessment(user);
        initialResults = await this.assessmentService.getResults(user);
      } catch {
        // Se a avaliação não estiver completa ou der erro, continua com dados parciais
      }

      const bodySection = initialAssessment?.sections?.body ?? null;

      // 3. Participação e métricas por categoria
      const mealsDates = new Set(meals.map((m) => m.date));
      const waterDates = new Set(waterEntries.map((w) => w.date));
      const activitiesDates = new Set(activities.map((a) => a.date));
      const weightDates = new Set(weightEntries.map((w) => w.date));

      const allRecordedDates = new Set([
        ...mealsDates,
        ...waterDates,
        ...activitiesDates,
        ...weightDates,
      ]);

      const participation: AdaptationParticipationMetrics = {
        distinctDaysRecorded: allRecordedDates.size,
        daysWithMeals: mealsDates.size,
        daysWithWater: waterDates.size,
        daysWithActivities: activitiesDates.size,
        daysWithWeight: weightDates.size,
      };

      // 4. Medições de peso e indicadores derivados
      const sortedWeightEntries = [...weightEntries].sort((a, b) => a.date.localeCompare(b.date));
      const measurements: WeightMeasurementPoint[] = sortedWeightEntries.map((entry) => {
        let derivedBmi: number | null = null;
        let derivedBmr: number | null = null;

        if (bodySection?.heightCm && bodySection.heightCm > 0) {
          try {
            const bmiResult = this.assessmentCalculatorService.calculateBmi(
              entry.weightKg,
              bodySection.heightCm,
            );
            derivedBmi = bmiResult.value;
          } catch {
            derivedBmi = null;
          }
        }

        if (
          bodySection?.sexForMetabolicFormula &&
          bodySection.sexForMetabolicFormula !== 'unavailable' &&
          bodySection.dateOfBirth &&
          bodySection.heightCm
        ) {
          try {
            const ageAtDate = calculateExactAge(
              bodySection.dateOfBirth,
              new Date(`${entry.date}T12:00:00Z`),
            );
            const bmrResult = this.assessmentCalculatorService.calculateBmr(
              {
                ...bodySection,
                weightKg: entry.weightKg,
              },
              ageAtDate,
            );
            if (bmrResult.calculated && bmrResult.bmrKcal != null) {
              derivedBmr = Math.round(bmrResult.bmrKcal * 10) / 10;
            }
          } catch {
            derivedBmr = null;
          }
        }

        return {
          date: entry.date,
          weightKg: entry.weightKg,
          source: 'diary',
          derivedBmi,
          derivedBmr,
          formulaVersion: '1.0.0',
        };
      });

      const initialDeclaredWeight: InitialDeclaredWeight | null =
        bodySection?.weightKg != null
          ? {
              weightKg: bodySection.weightKg,
              date: (
                initialAssessment?.completedAt ||
                initialAssessment?.updatedAt ||
                planDoc.startLocalDate
              ).substring(0, 10),
              source: 'initial_assessment',
            }
          : null;

      let weightDeltaKg: number | null = null;
      let deltaReason: string | null = null;
      let firstMeasurement: { date: string; weightKg: number } | null = null;
      let lastMeasurement: { date: string; weightKg: number } | null = null;

      if (measurements.length >= 2) {
        const first = measurements[0]!;
        const last = measurements[measurements.length - 1]!;
        firstMeasurement = {
          date: first.date,
          weightKg: first.weightKg,
        };
        lastMeasurement = {
          date: last.date,
          weightKg: last.weightKg,
        };
        weightDeltaKg = Math.round((last.weightKg - first.weightKg) * 10) / 10;
        deltaReason = null;
      } else if (measurements.length === 1) {
        const single = measurements[0]!;
        firstMeasurement = {
          date: single.date,
          weightKg: single.weightKg,
        };
        lastMeasurement = {
          date: single.date,
          weightKg: single.weightKg,
        };
        weightDeltaKg = null;
        deltaReason = 'INSUFFICIENT_MEASUREMENTS';
      } else {
        weightDeltaKg = null;
        deltaReason = 'NO_MEASUREMENTS_RECORDED';
      }

      const weightEvolution: WeightEvolution = {
        initialDeclaredWeight,
        measurements,
        firstMeasurement,
        lastMeasurement,
        weightDeltaKg,
        deltaReason,
      };

      // 5. Períodos semanais
      const weeklyPeriods = this.calculateWeeklyPeriods(
        planDoc.startLocalDate,
        currentLocalDate,
        meals,
        waterEntries,
        activities,
        measurements,
      );

      // 6. Indicadores derivados atuais
      const derivedIndicators = this.calculateDerivedIndicators(
        measurements,
        bodySection,
        initialResults,
        initialDeclaredWeight?.date || planDoc.startLocalDate,
      );

      // 7. Motor de conquistas
      const achievements = this.calculateAchievements(
        participation,
        metrics.status === 'completed',
        planDoc.completedAt ?? null,
      );

      // 8. Avisos de segurança e informativos
      const notices: AdaptationNotice[] = [
        {
          code: 'TEMPORAL_PROGRESS_ONLY',
          message:
            'O calendário representa somente o tempo transcorrido, não atividades concluídas ou liberação clínica.',
        },
        {
          code: 'CALORIE_TARGET_UNAVAILABLE',
          message:
            'Metas calóricas numéricas automáticas desativadas nesta versão; acompanhamento focado na organização de hábitos sem prescrição numérica.',
        },
      ];

      if (metrics.status === 'completed') {
        notices.push({
          code: 'ADAPTATION_CYCLE_COMPLETED',
          message: 'Ciclo inicial de 30 dias de adaptação concluído.',
        });
      }

      if (participation.distinctDaysRecorded === 0) {
        notices.push({
          code: 'NO_DIARY_ENTRIES_YET',
          message: 'Nenhum registro lançado no diário durante o ciclo de adaptação até o momento.',
        });
      }

      if (measurements.length < 2) {
        notices.push({
          code: 'INSUFFICIENT_WEIGHT_MEASUREMENTS',
          message:
            'Variação de peso indisponível: necessárias ao menos duas pesagens registradas no diário para calcular a variação.',
        });
      }

      return {
        id: planDoc.id,
        mode: planDoc.mode,
        status: metrics.status,
        currentDay: metrics.currentDay,
        startDate: planDoc.startLocalDate,
        endDate: planDoc.day30LocalDate,
        timeZone: planDoc.timeZone,
        elapsedDays: metrics.elapsedDays,
        remainingDays: metrics.remainingDays,
        calendarProgressPercent: metrics.calendarProgressPercent,
        participation,
        weeklyPeriods,
        weightEvolution,
        derivedIndicators,
        achievements,
        reportAvailable: metrics.status === 'completed',
        notices,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Erro ao consultar progresso da adaptação.', error);
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'TRANSACTION_FAILED',
        message: 'Serviço de progresso da adaptação temporariamente indisponível.',
      });
    }
  }

  private calculateWeeklyPeriods(
    startLocalDate: string,
    currentLocalDate: string,
    meals: MealDocument[],
    waterEntries: WaterEntry[],
    activities: ActivityEntry[],
    measurements: WeightMeasurementPoint[],
  ): WeeklyPeriodSummary[] {
    const periodDefinitions = [
      { periodNumber: 1, label: 'Dias 1 a 7', startOffset: 0, endOffset: 6, totalDays: 7 },
      { periodNumber: 2, label: 'Dias 8 a 14', startOffset: 7, endOffset: 13, totalDays: 7 },
      { periodNumber: 3, label: 'Dias 15 a 21', startOffset: 14, endOffset: 20, totalDays: 7 },
      { periodNumber: 4, label: 'Dias 22 a 28', startOffset: 21, endOffset: 27, totalDays: 7 },
      {
        periodNumber: 5,
        label: 'Dias 29 a 30 (Fechamento)',
        startOffset: 28,
        endOffset: 29,
        totalDays: 2,
      },
    ];

    return periodDefinitions.map((def) => {
      const pStart = addCivilDays(startLocalDate, def.startOffset);
      const pEnd = addCivilDays(startLocalDate, def.endOffset);

      // Dias transcorridos neste período
      let elapsedDays = 0;
      if (currentLocalDate < pStart) {
        elapsedDays = 0;
      } else if (currentLocalDate >= pEnd) {
        elapsedDays = def.totalDays;
      } else {
        elapsedDays = diffCivilDays(pStart, currentLocalDate) + 1;
      }

      // Filtra registros do período
      const pMeals = meals.filter((m) => m.date >= pStart && m.date <= pEnd);
      const pWater = waterEntries.filter((w) => w.date >= pStart && w.date <= pEnd);
      const pActivities = activities.filter((a) => a.date >= pStart && a.date <= pEnd);
      const pWeights = measurements.filter((w) => w.date >= pStart && w.date <= pEnd);

      const pMealDates = new Set(pMeals.map((m) => m.date));
      const pWaterDates = new Set(pWater.map((w) => w.date));
      const pActivityDates = new Set(pActivities.map((a) => a.date));
      const pWeightDates = new Set(pWeights.map((w) => w.date));

      const pDistinctDates = new Set([
        ...pMealDates,
        ...pWaterDates,
        ...pActivityDates,
        ...pWeightDates,
      ]);

      // Nutrição da semana: soma kcal apenas dos registros existentes
      const rawKcal = pMeals.reduce((acc, m) => acc + (m.totals?.energyKcal?.value ?? 0), 0);
      const hasMeals = pMeals.length > 0;
      const totalKcal = hasMeals ? Math.round(rawKcal * 10) / 10 : null;

      const isPartial =
        elapsedDays > 0 &&
        (pMealDates.size < elapsedDays || (hasMeals && pMealDates.size < def.totalDays));

      const nutritionSummary: WeeklyNutritionSummary = {
        totalKcal,
        daysWithRecords: pMealDates.size,
        isPartial,
        note: hasMeals
          ? 'Totais nutricionais parciais calculados exclusivamente sobre as refeições lançadas; dias sem registro não são considerados consumo zero.'
          : 'Nenhuma refeição registrada neste período.',
      };

      return {
        periodNumber: def.periodNumber,
        label: def.label,
        startDate: pStart,
        endDate: pEnd,
        totalDays: def.totalDays,
        elapsedDays,
        distinctDaysRecorded: pDistinctDates.size,
        daysWithMeals: pMealDates.size,
        daysWithWater: pWaterDates.size,
        daysWithActivities: pActivityDates.size,
        weights: pWeights,
        nutritionSummary,
      };
    });
  }

  private calculateDerivedIndicators(
    measurements: WeightMeasurementPoint[],
    bodySection: BodySection | null,
    initialResults: AssessmentResultDocument | null,
    referenceDate: string,
  ): DerivedIndicators {
    let currentBmi: CurrentBmiIndicator | null = null;
    let currentBmr: CurrentBmrIndicator | null = null;

    if (measurements.length > 0) {
      const latest = measurements[measurements.length - 1]!;

      if (bodySection?.heightCm) {
        try {
          const bmiResult = this.assessmentCalculatorService.calculateBmi(
            latest.weightKg,
            bodySection.heightCm,
          );
          currentBmi = {
            value: bmiResult.value,
            category: bmiResult.category,
            classification: bmiResult.classification,
            date: latest.date,
            formulaVersion: '1.0.0',
          };
        } catch {
          currentBmi = null;
        }
      }

      if (latest.derivedBmr != null) {
        currentBmr = {
          bmrKcal: latest.derivedBmr,
          formula: 'mifflin_st_jeor',
          formulaVersion: '1.0.0',
          date: latest.date,
          calculated: true,
        };
      } else {
        currentBmr = {
          bmrKcal: null,
          formula: 'mifflin_st_jeor',
          formulaVersion: '1.0.0',
          date: latest.date,
          calculated: false,
          reasonIfNotCalculated:
            'Dados incompletos ou sexo biológico não informado para cálculo da Taxa Metabólica Basal.',
        };
      }
    } else if (initialResults) {
      if (initialResults.bmi) {
        currentBmi = {
          value: initialResults.bmi.value,
          category: initialResults.bmi.category,
          classification: initialResults.bmi.classification,
          date: referenceDate,
          formulaVersion: '1.0.0',
        };
      }
      if (initialResults.bmr) {
        currentBmr = {
          bmrKcal: initialResults.bmr.bmrKcal,
          formula: initialResults.bmr.formula,
          formulaVersion: '1.0.0',
          date: referenceDate,
          calculated: initialResults.bmr.calculated,
          reasonIfNotCalculated: initialResults.bmr.reasonIfNotCalculated ?? undefined,
        };
      }
    }

    const initialBmi = initialResults?.bmi
      ? {
          value: initialResults.bmi.value,
          classification: initialResults.bmi.classification,
        }
      : null;

    const initialBmr = initialResults?.bmr
      ? {
          value: initialResults.bmr.bmrKcal,
          formula: initialResults.bmr.formula,
        }
      : null;

    return {
      currentBmi,
      currentBmr,
      initialBmi,
      initialBmr,
    };
  }

  private calculateAchievements(
    participation: AdaptationParticipationMetrics,
    isCompleted: boolean,
    completedAt: string | null,
  ): { unlocked: AchievementItem[]; locked: AchievementItem[] } {
    const definitions: {
      code: AchievementCode;
      title: string;
      description: string;
      target: number;
      current: number;
      unlocked: boolean;
      unlockedAt: string | null;
    }[] = [
      {
        code: 'FIRST_DIARY_ENTRY',
        title: 'Primeiro Registro',
        description: 'Realizou o primeiro registro de alimentação, água, atividade ou peso no diário.',
        target: 1,
        current: Math.min(participation.distinctDaysRecorded, 1),
        unlocked: participation.distinctDaysRecorded >= 1,
        unlockedAt: participation.distinctDaysRecorded >= 1 ? 'conquistado' : null,
      },
      {
        code: 'FIRST_MEAL_ENTRY',
        title: 'Primeira Refeição Registrada',
        description: 'Registrou a primeira refeição acompanhada com dados nutricionais.',
        target: 1,
        current: Math.min(participation.daysWithMeals, 1),
        unlocked: participation.daysWithMeals >= 1,
        unlockedAt: participation.daysWithMeals >= 1 ? 'conquistado' : null,
      },
      {
        code: 'FIRST_ACTIVITY_ENTRY',
        title: 'Primeira Atividade Registrada',
        description: 'Registrou a primeira atividade física realizada.',
        target: 1,
        current: Math.min(participation.daysWithActivities, 1),
        unlocked: participation.daysWithActivities >= 1,
        unlockedAt: participation.daysWithActivities >= 1 ? 'conquistado' : null,
      },
      {
        code: 'FIRST_WEIGHT_ENTRY',
        title: 'Primeira Pesagem no Diário',
        description: 'Registrou a primeira pesagem de acompanhamento durante o período.',
        target: 1,
        current: Math.min(participation.daysWithWeight, 1),
        unlocked: participation.daysWithWeight >= 1,
        unlockedAt: participation.daysWithWeight >= 1 ? 'conquistado' : null,
      },
      {
        code: 'SEVEN_DISTINCT_DAYS_RECORDED',
        title: '7 Dias com Registros',
        description: 'Registrou informações em 7 datas distintas durante a Adaptação.',
        target: 7,
        current: Math.min(participation.distinctDaysRecorded, 7),
        unlocked: participation.distinctDaysRecorded >= 7,
        unlockedAt: participation.distinctDaysRecorded >= 7 ? 'conquistado' : null,
      },
      {
        code: 'FOURTEEN_DISTINCT_DAYS_RECORDED',
        title: '14 Dias com Registros',
        description: 'Registrou informações em 14 datas distintas durante a Adaptação.',
        target: 14,
        current: Math.min(participation.distinctDaysRecorded, 14),
        unlocked: participation.distinctDaysRecorded >= 14,
        unlockedAt: participation.distinctDaysRecorded >= 14 ? 'conquistado' : null,
      },
      {
        code: 'ADAPTATION_30_DAYS_COMPLETED',
        title: 'Ciclo de 30 Dias Concluído',
        description: 'Concluiu o ciclo temporal completo de 30 dias do plano de adaptação.',
        target: 1,
        current: isCompleted ? 1 : 0,
        unlocked: isCompleted,
        unlockedAt: isCompleted ? completedAt || 'conquistado' : null,
      },
    ];

    const unlocked: AchievementItem[] = [];
    const locked: AchievementItem[] = [];

    for (const d of definitions) {
      const item: AchievementItem = {
        code: d.code,
        title: d.title,
        description: d.description,
        unlocked: d.unlocked,
        unlockedAt: d.unlockedAt,
        progress: {
          current: d.current,
          target: d.target,
        },
      };

      if (d.unlocked) {
        unlocked.push(item);
      } else {
        locked.push(item);
      }
    }

    return { unlocked, locked };
  }
}
