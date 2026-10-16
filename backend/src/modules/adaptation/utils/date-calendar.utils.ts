import type {
  AdaptationStatus,
  CalendarDay,
  CalendarTemporalState,
} from '../types/adaptation.types.js';

/**
 * Valida se a string fornecida corresponde a um fuso horário IANA válido.
 */
export function isValidIanaTimeZone(timeZone: unknown): boolean {
  if (typeof timeZone !== 'string' || !timeZone.trim()) {
    return false;
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Retorna a data civil local (YYYY-MM-DD) para um instante e fuso horário informados.
 */
export function getLocalDateString(date: Date, timeZone: string): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Adiciona uma quantidade de dias civis a uma data no formato YYYY-MM-DD.
 * Preserva exatidão através de viradas de mês, ano e anos bissextos.
 */
export function addCivilDays(dateStr: string, days: number): string {
  const parts = dateStr.split('-');
  const year = Number.parseInt(parts[0] ?? '1970', 10);
  const month = Number.parseInt(parts[1] ?? '1', 10);
  const day = Number.parseInt(parts[2] ?? '1', 10);

  const utcDate = new Date(Date.UTC(year, month - 1, day + days));
  const y = utcDate.getUTCFullYear();
  const m = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(utcDate.getUTCDate()).padStart(2, '0');

  return `${y}-${m}-${d}`;
}

/**
 * Calcula a diferença em dias civis entre duas datas no formato YYYY-MM-DD (to - from).
 */
export function diffCivilDays(fromStr: string, toStr: string): number {
  const [y1, m1, d1] = fromStr.split('-').map(Number);
  const [y2, m2, d2] = toStr.split('-').map(Number);

  const utc1 = Date.UTC(y1 ?? 1970, (m1 ?? 1) - 1, d1 ?? 1);
  const utc2 = Date.UTC(y2 ?? 1970, (m2 ?? 1) - 1, d2 ?? 1);

  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((utc2 - utc1) / MS_PER_DAY);
}

/**
 * Gera os 30 dias do calendário da Adaptação com seus estados temporais calculados.
 */
export function generate30DayCalendar(
  startLocalDate: string,
  currentLocalDate: string,
): CalendarDay[] {
  const calendar: CalendarDay[] = [];

  for (let dayNumber = 1; dayNumber <= 30; dayNumber += 1) {
    const localDate = addCivilDays(startLocalDate, dayNumber - 1);
    let temporalState: CalendarTemporalState;

    if (localDate < currentLocalDate) {
      temporalState = 'past';
    } else if (localDate === currentLocalDate) {
      temporalState = 'today';
    } else {
      temporalState = 'future';
    }

    calendar.push({
      dayNumber,
      localDate,
      temporalState,
    });
  }

  return calendar;
}

export interface TemporalMetrics {
  currentDay: number;
  elapsedDays: number;
  remainingDays: number;
  calendarProgressPercent: number;
  status: AdaptationStatus;
}

/**
 * Calcula métricas temporais do plano com base na data local atual versus o intervalo de 30 dias.
 */
export function computeTemporalMetrics(
  startLocalDate: string,
  day30LocalDate: string,
  currentLocalDate: string,
): TemporalMetrics {
  if (currentLocalDate < startLocalDate) {
    return {
      currentDay: 1,
      elapsedDays: 0,
      remainingDays: 30,
      calendarProgressPercent: 0,
      status: 'active',
    };
  }

  if (currentLocalDate <= day30LocalDate) {
    const dayIndex = diffCivilDays(startLocalDate, currentLocalDate) + 1; // 1 a 30
    const elapsedDays = dayIndex - 1; // dias anteriores finalizados
    const remainingDays = 30 - dayIndex;
    const calendarProgressPercent = Math.round((dayIndex / 30) * 100 * 10) / 10;

    return {
      currentDay: dayIndex,
      elapsedDays,
      remainingDays,
      calendarProgressPercent,
      status: 'active',
    };
  }

  // Se currentLocalDate > day30LocalDate: plano concluído
  return {
    currentDay: 30, // Nunca ultrapassa 30
    elapsedDays: 30,
    remainingDays: 0,
    calendarProgressPercent: 100.0,
    status: 'completed',
  };
}
