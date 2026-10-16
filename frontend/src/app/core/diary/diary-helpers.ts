import type {
  DiaryMealItem,
  DiaryNutritionTotals,
  FoodItem,
  HouseholdMeasure,
} from './diary.model';

/**
 * Retorna a data de hoje no formato YYYY-MM-DD no fuso horário local.
 */
export function getTodayIsoString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Valida se uma string possui o formato estrito YYYY-MM-DD.
 */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parts = value.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 0;
  const day = parts[2] ?? 0;
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

/**
 * Adiciona ou subtrai dias de uma data ISO YYYY-MM-DD.
 */
export function addDaysToDate(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 0;
  const day = parts[2] ?? 0;
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  const newDay = String(date.getDate()).padStart(2, '0');
  return `${newYear}-${newMonth}-${newDay}`;
}

/**
 * Formata data ISO para pt-BR longo com indicação de "Hoje" ou "Ontem" quando aplicável.
 */
export function formatDatePtBrLong(dateStr: string): string {
  if (!isValidIsoDate(dateStr)) return dateStr;

  const parts = dateStr.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 0;
  const day = parts[2] ?? 0;
  const date = new Date(year, month - 1, day);
  const today = getTodayIsoString();
  const yesterday = addDaysToDate(today, -1);
  const tomorrow = addDaysToDate(today, 1);

  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };

  const formatted = date.toLocaleDateString('pt-BR', options);
  const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);

  if (dateStr === today) {
    return `Hoje • ${capitalized}`;
  }
  if (dateStr === yesterday) {
    return `Ontem • ${capitalized}`;
  }
  if (dateStr === tomorrow) {
    return `Amanhã • ${capitalized}`;
  }
  return capitalized;
}

/**
 * Formata data ISO para DD/MM/AAAA.
 */
export function formatDatePtBrShort(dateStr: string): string {
  if (!isValidIsoDate(dateStr)) return dateStr;
  const parts = dateStr.split('-');
  return `${parts[2] ?? ''}/${parts[1] ?? ''}/${parts[0] ?? ''}`;
}

export interface CalculatedNutrientsResult {
  calculatedGrams: number;
  energyKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
  fiberG: number | null;
  isPartial: boolean;
  selectedMeasureLabel?: string | null;
}

/**
 * Calcula a estimativa proporcional de nutrientes de um alimento para prévia visual na interface.
 * IMPORTANTE: Nutrientes não declarados (null) permanecem estritamente null. Nunca substituir por 0!
 */
export function computeNutrientsForAmount(
  food: FoodItem,
  amount: number,
  unit: 'g' | 'household',
  householdMeasureId?: string | null,
): CalculatedNutrientsResult {
  if (!amount || amount <= 0) {
    return {
      calculatedGrams: 0,
      energyKcal: null,
      proteinG: null,
      carbohydrateG: null,
      fatG: null,
      fiberG: null,
      isPartial: false,
      selectedMeasureLabel: null,
    };
  }

  let calculatedGrams = amount;
  let selectedMeasureLabel: string | null = null;

  if (unit === 'household') {
    const measure = food.householdMeasures.find((m: HouseholdMeasure) => m.id === householdMeasureId);
    if (measure && measure.grams > 0) {
      calculatedGrams = Math.round(amount * measure.grams * 10) / 10;
      selectedMeasureLabel = measure.label;
    }
  }

  const factor = calculatedGrams / 100;
  const n = food.nutrientsPer100g;

  const round1 = (val: number | null): number | null => {
    if (val === null || val === undefined) return null;
    return Math.round(val * factor * 10) / 10;
  };

  const energyKcal = round1(n.energyKcal);
  const proteinG = round1(n.proteinG);
  const carbohydrateG = round1(n.carbohydrateG);
  const fatG = round1(n.fatG);
  const fiberG = round1(n.fiberG);

  const isPartial =
    n.energyKcal === null ||
    n.proteinG === null ||
    n.carbohydrateG === null ||
    n.fatG === null ||
    n.fiberG === null;

  return {
    calculatedGrams,
    energyKcal,
    proteinG,
    carbohydrateG,
    fatG,
    fiberG,
    isPartial,
    selectedMeasureLabel,
  };
}

/**
 * Calcula totais estimados de uma refeição a partir dos itens.
 * Se algum item tiver nutriente null, o total desse nutriente torna-se null e a refeição é marcada como parcial.
 */
export function computeMealTotals(items: DiaryMealItem[]): DiaryNutritionTotals {
  if (!items || items.length === 0) {
    return {
      energyKcal: 0,
      proteinG: 0,
      carbohydrateG: 0,
      fatG: 0,
      fiberG: 0,
      isPartialNutrition: false,
    };
  }

  let totalKcal: number | null = 0;
  let totalProtein: number | null = 0;
  let totalCarb: number | null = 0;
  let totalFat: number | null = 0;
  let totalFiber: number | null = 0;
  let isPartial = false;

  for (const item of items) {
    if (item.energyKcal === null) {
      totalKcal = null;
      isPartial = true;
    } else if (totalKcal !== null) {
      totalKcal += item.energyKcal;
    }

    if (item.proteinG === null) {
      totalProtein = null;
      isPartial = true;
    } else if (totalProtein !== null) {
      totalProtein += item.proteinG;
    }

    if (item.carbohydrateG === null) {
      totalCarb = null;
      isPartial = true;
    } else if (totalCarb !== null) {
      totalCarb += item.carbohydrateG;
    }

    if (item.fatG === null) {
      totalFat = null;
      isPartial = true;
    } else if (totalFat !== null) {
      totalFat += item.fatG;
    }

    if (item.fiberG === null) {
      totalFiber = null;
      isPartial = true;
    } else if (totalFiber !== null) {
      totalFiber += item.fiberG;
    }
  }

  const round = (val: number | null) => (val === null ? null : Math.round(val * 10) / 10);

  return {
    energyKcal: round(totalKcal),
    proteinG: round(totalProtein),
    carbohydrateG: round(totalCarb),
    fatG: round(totalFat),
    fiberG: round(totalFiber),
    isPartialNutrition: isPartial,
  };
}

/**
 * Formata número com decimais pt-BR (ex: 1.234,5).
 */
export function formatPtBrNumber(
  value: number | null | undefined,
  decimals = 1,
  fallback = 'Não informado',
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return fallback;
  }
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/**
 * Formata calorias para exibição.
 */
export function formatPtBrCalories(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'Não informado';
  }
  return `${Math.round(value).toLocaleString('pt-BR')} kcal`;
}

/**
 * Formata peso em kg com 1 decimal.
 */
export function formatPtBrWeight(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return 'Não informado';
  }
  return `${formatPtBrNumber(value, 1)} kg`;
}

/**
 * Formata volume de água em ml.
 */
export function formatPtBrWater(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return '0 ml';
  }
  return `${Math.round(value).toLocaleString('pt-BR')} ml`;
}
