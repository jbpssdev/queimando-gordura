import type {
  ActivityEntry,
  DiaryDayResponse as WireDay,
  MealDocument,
  DiarySummaryResponse as WireSummary,
} from './diary-contract';
import type {
  DiaryActivity,
  DiaryDayResponse,
  DiaryMeal,
  DiarySummaryResponse,
} from './diary.model';
export function presentMeal(meal: MealDocument): DiaryMeal {
  const totals = meal.totals;
  return {
    id: meal.id,
    date: meal.date,
    mealType: meal.mealType,
    title: meal.title ?? undefined,
    version: meal.version ?? 1,
    createdAt: meal.createdAt,
    updatedAt: meal.updatedAt,
    items: meal.items.map((item) => ({
      foodId: item.foodId,
      foodName: item.name,
      foodPreparation: item.preparation,
      foodSource: item.source,
      amount: item.amount,
      unit: item.unit,
      householdMeasureId: item.householdMeasureId,
      householdMeasureLabel: item.householdMeasureLabel,
      calculatedGrams: item.weightG,
      ...item.calculatedNutrients,
    })),
    totalKcal: totals.energyKcal.value,
    totalProteinG: totals.proteinG.value,
    totalCarbG: totals.carbohydrateG.value,
    totalFatG: totals.fatG.value,
    totalFiberG: totals.fiberG.value,
    isPartialNutrition: Object.values(totals).some((n) => !n.isComplete),
  };
}
export function presentActivity(activity: ActivityEntry): DiaryActivity {
  return {
    ...activity,
    title: activity.description,
    perceivedIntensity: activity.intensity,
    version: activity.version ?? 1,
  };
}
export function presentDay(day: WireDay): DiaryDayResponse {
  const n = day.nutritionTotals;
  return {
    date: day.date,
    meals: day.meals.map(presentMeal),
    waterEntries: day.water.entries,
    totalWaterMl: day.water.totalMl,
    activities: day.activities.map(presentActivity),
    weight: day.weight,
    dayTotals: {
      energyKcal: n.energyKcal.value,
      proteinG: n.proteinG.value,
      carbohydrateG: n.carbohydrateG.value,
      fatG: n.fatG.value,
      fiberG: n.fiberG.value,
      isPartialNutrition:
        n.hasEntries &&
        [n.energyKcal, n.proteinG, n.carbohydrateG, n.fatG, n.fiberG].some(
          (value) => !value.isComplete,
        ),
    },
  };
}
export function presentSummary(summary: WireSummary): DiarySummaryResponse {
  return {
    summaries: summary.items.map((item) => ({
      ...item,
      hasMeals: item.hasMealEntries,
      hasWater: item.hasWaterEntries,
      hasWeight: item.hasWeightEntry,
      totalKcal: item.nutritionIsComplete === false ? null : item.totalKcal,
    })),
  };
}
