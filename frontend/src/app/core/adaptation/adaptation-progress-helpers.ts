import { formatDatePtBr } from './adaptation-helpers';
import type { WeighInRecord } from './adaptation.model';

export interface FormattedWeightDelta {
  readonly text: string;
  readonly direction: 'down' | 'up' | 'neutral' | 'none';
}

export interface WeightChartPoint {
  readonly date: string;
  readonly formattedDate: string;
  readonly weightKg: number;
  readonly source: 'assessment' | 'diary';
  readonly x: number;
  readonly y: number;
  readonly label: string;
}

export interface WeightChartData {
  readonly points: readonly WeightChartPoint[];
  readonly polylinePoints: string;
  readonly minWeight: number;
  readonly maxWeight: number;
  readonly hasData: boolean;
  readonly hasSinglePoint: boolean;
  readonly accessibleSummary: string;
}

/**
 * Formata peso em quilogramas com 1 casa decimal.
 */
export function formatWeightKg(weightKg: number | null | undefined): string {
  if (weightKg === null || weightKg === undefined || Number.isNaN(weightKg)) {
    return '--';
  }
  return `${weightKg.toFixed(1)} kg`;
}

/**
 * Gera texto neutro e descritivo para variação de peso.
 * Sem julgamento moral de sucesso ou fracasso.
 */
export function formatWeightDelta(delta: number | null | undefined): FormattedWeightDelta {
  if (delta === null || delta === undefined || Number.isNaN(delta)) {
    return { text: 'Sem comparação disponível', direction: 'none' };
  }
  if (delta < 0) {
    return {
      text: `${Math.abs(delta).toFixed(1)} kg a menos em relação ao início`,
      direction: 'down',
    };
  }
  if (delta > 0) {
    return {
      text: `+${delta.toFixed(1)} kg em relação ao início`,
      direction: 'up',
    };
  }
  return {
    text: '0.0 kg (sem variação de peso registrada)',
    direction: 'neutral',
  };
}

/**
 * Formata a contagem de registros em relação aos dias acompanhados.
 * Ex.: "12 de 14 dias acompanhados"
 */
export function formatHabitFrequency(recordedDays: number, totalMonitoredDays: number): string {
  const safeRecorded = Math.max(0, recordedDays);
  const safeTotal = Math.max(0, totalMonitoredDays);
  if (safeTotal === 0) {
    return `${safeRecorded} ${safeRecorded === 1 ? 'dia' : 'dias'}`;
  }
  return `${safeRecorded} de ${safeTotal} ${safeTotal === 1 ? 'dia acompanhado' : 'dias acompanhados'}`;
}

/**
 * Calcula pontos SVG para gráfico de evolução de peso acessível e responsivo.
 * viewBox padrão: 0 0 500 220 com paddings de segurança.
 * Preserva lacunas temporais reais e não inventa valores intermediários.
 */
export function calculateWeightChart(
  weighIns: readonly WeighInRecord[],
  width = 500,
  height = 220,
): WeightChartData {
  if (!weighIns || weighIns.length === 0) {
    return {
      points: [],
      polylinePoints: '',
      minWeight: 0,
      maxWeight: 0,
      hasData: false,
      hasSinglePoint: false,
      accessibleSummary: 'Nenhuma pesagem registrada durante o período de adaptação.',
    };
  }

  // Ordena cronologicamente por data
  const sorted = [...weighIns].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 1) {
    const single = sorted[0]!;
    const point: WeightChartPoint = {
      date: single.date,
      formattedDate: formatDatePtBr(single.date),
      weightKg: single.weightKg,
      source: single.source,
      x: width / 2,
      y: height / 2,
      label: `${single.weightKg.toFixed(1)} kg (${single.source === 'assessment' ? 'Avaliação Inicial' : 'Diário'})`,
    };
    return {
      points: [point],
      polylinePoints: '',
      minWeight: single.weightKg,
      maxWeight: single.weightKg,
      hasData: true,
      hasSinglePoint: true,
      accessibleSummary: `Uma única pesagem registrada em ${point.formattedDate}: ${point.label}. Ainda não há tendência calculável.`,
    };
  }

  const weights = sorted.map((w) => w.weightKg);
  let minWeight = Math.min(...weights);
  let maxWeight = Math.max(...weights);

  // Se todos os pesos forem idênticos, adiciona margem vertical para desenhar linha central
  if (minWeight === maxWeight) {
    minWeight -= 1;
    maxWeight += 1;
  }

  const paddingX = 48;
  const paddingTop = 30;
  const paddingBottom = 40;
  const availableWidth = width - 2 * paddingX;
  const availableHeight = height - paddingTop - paddingBottom;

  const points: WeightChartPoint[] = sorted.map((w, index) => {
    const x = paddingX + (index / (sorted.length - 1)) * availableWidth;
    const normalizedY = (w.weightKg - minWeight) / (maxWeight - minWeight);
    const y = height - paddingBottom - normalizedY * availableHeight;
    const sourceLabel = w.source === 'assessment' ? 'Avaliação Inicial' : 'Diário';
    return {
      date: w.date,
      formattedDate: formatDatePtBr(w.date),
      weightKg: w.weightKg,
      source: w.source,
      x: Math.round(x * 10) / 10,
      y: Math.round(y * 10) / 10,
      label: `${w.weightKg.toFixed(1)} kg em ${formatDatePtBr(w.date)} (${sourceLabel})`,
    };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  const summaryItems = points.map((p) => `${p.formattedDate}: ${p.label}`).join('; ');
  const accessibleSummary = `Evolução do peso corporal contendo ${points.length} medições reais: ${summaryItems}.`;

  return {
    points,
    polylinePoints,
    minWeight: Math.min(...weights),
    maxWeight: Math.max(...weights),
    hasData: true,
    hasSinglePoint: false,
    accessibleSummary,
  };
}

/**
 * Dispara o download de um Blob no navegador de forma segura.
 * Revoga a URL temporária para liberar memória.
 */
export function downloadBlob(blob: Blob, filename = 'relatorio-adaptacao-30-dias.pdf'): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    if (document.body.contains(anchor)) {
      document.body.removeChild(anchor);
    }
    window.URL.revokeObjectURL(url);
  }, 200);
}
