import type { AdaptationDay } from './adaptation.model';

/**
 * Detecta o fuso horário IANA do navegador atual sem fixá-lo no código.
 */
export function detectBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Formata data no formato YYYY-MM-DD para string legível em português.
 * Ex.: '2026-10-16' -> '16 de outubro de 2026'
 */
export function formatDatePtBr(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString;

  const year = parseInt(parts[0] ?? '0', 10);
  const month = parseInt(parts[1] ?? '0', 10) - 1;
  const day = parseInt(parts[2] ?? '0', 10);

  const date = new Date(year, month, day);
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formata intervalo de datas.
 * Ex.: '16 de outubro de 2026 a 14 de novembro de 2026'
 */
export function formatDateRange(startDate: string, endDate: string): string {
  if (!startDate || !endDate) return '';
  return `${formatDatePtBr(startDate)} a ${formatDatePtBr(endDate)}`;
}

/**
 * Gera ou complementa os 30 dias de acompanhamento caso a API retorne datas base.
 * Identifica os marcos dos dias 7, 14, 21 e 30.
 */
export function build30DaysTimeline(
  startDateStr: string,
  currentDayNumber: number,
): AdaptationDay[] {
  const days: AdaptationDay[] = [];
  const parts = startDateStr.split('-');
  const startYear = parseInt(parts[0] ?? '2026', 10);
  const startMonth = parseInt(parts[1] ?? '1', 10) - 1;
  const startDay = parseInt(parts[2] ?? '1', 10);

  const milestones: Record<number, { title: string; desc: string }> = {
    7: {
      title: 'Marco 1: 1ª Semana Concluída',
      desc: 'Primeiros 7 dias consecutivos de constância e alinhamento.',
    },
    14: {
      title: 'Marco 2: Metade da Jornada',
      desc: '14 dias completados. Adaptação do ritmo na rotina diária.',
    },
    21: {
      title: 'Marco 3: Consolidação de Hábitos',
      desc: '21 dias consecutivos. A consistência se torna natural.',
    },
    30: {
      title: 'Marco 4: Conclusão da Adaptação',
      desc: '30 dias completados com integridade e aprendizado.',
    },
  };

  for (let i = 1; i <= 30; i++) {
    const d = new Date(startYear, startMonth, startDay + (i - 1));
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const dateFormatted = `${yyyy}-${mm}-${dd}`;

    const isPast = i < currentDayNumber;
    const isToday = i === currentDayNumber;
    const isFuture = i > currentDayNumber;
    const milestoneInfo = milestones[i];

    days.push({
      dayNumber: i,
      date: dateFormatted,
      isPast,
      isToday,
      isFuture,
      isMilestone: Boolean(milestoneInfo),
      milestoneTitle: milestoneInfo?.title,
      milestoneDescription: milestoneInfo?.desc,
    });
  }

  return days;
}
