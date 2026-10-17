import { describe, expect, it, vi } from 'vitest';
import {
  calculateWeightChart,
  downloadBlob,
  formatHabitFrequency,
  formatWeightDelta,
  formatWeightKg,
} from './adaptation-progress-helpers';
import type { WeighInRecord } from './adaptation.model';

describe('adaptation-progress-helpers', () => {
  describe('formatWeightKg', () => {
    it('formata valor numérico com 1 casa decimal', () => {
      expect(formatWeightKg(82.45)).toBe('82.5 kg');
      expect(formatWeightKg(70)).toBe('70.0 kg');
    });

    it('retorna traço para valores nulos, indefinidos ou inválidos', () => {
      expect(formatWeightKg(null)).toBe('--');
      expect(formatWeightKg(undefined)).toBe('--');
      expect(formatWeightKg(NaN)).toBe('--');
    });
  });

  describe('formatWeightDelta', () => {
    it('formata redução com texto neutro e direção down', () => {
      const res = formatWeightDelta(-1.2);
      expect(res.direction).toBe('down');
      expect(res.text).toBe('1.2 kg a menos entre a primeira e a última pesagem do diário');
    });

    it('formata aumento com texto neutro e direção up', () => {
      const res = formatWeightDelta(0.5);
      expect(res.direction).toBe('up');
      expect(res.text).toBe('+0.5 kg entre a primeira e a última pesagem do diário');
    });

    it('formata estabilidade com direção neutral', () => {
      const res = formatWeightDelta(0);
      expect(res.direction).toBe('neutral');
      expect(res.text).toBe('0.0 kg (sem variação de peso registrada)');
    });

    it('retorna texto informativo para ausência de dados', () => {
      const res = formatWeightDelta(null);
      expect(res.direction).toBe('none');
      expect(res.text).toBe('Sem comparação disponível');
    });
  });

  describe('formatHabitFrequency', () => {
    it('formata contagem no plural e singular', () => {
      expect(formatHabitFrequency(12, 14)).toBe('12 de 14 dias acompanhados');
      expect(formatHabitFrequency(1, 1)).toBe('1 de 1 dia acompanhado');
      expect(formatHabitFrequency(5, 0)).toBe('5 dias');
    });
  });

  describe('calculateWeightChart', () => {
    it('retorna estado sem dados para array vazio', () => {
      const res = calculateWeightChart([]);
      expect(res.hasData).toBe(false);
      expect(res.hasSinglePoint).toBe(false);
      expect(res.points).toEqual([]);
      expect(res.polylinePoints).toBe('');
      expect(res.accessibleSummary).toContain('Nenhuma pesagem registrada');
    });

    it('retorna um único ponto com explicação e sem linha de tendência', () => {
      const weighIns: WeighInRecord[] = [
        { date: '2026-10-01', weightKg: 85.0, source: 'assessment' },
      ];
      const res = calculateWeightChart(weighIns);
      expect(res.hasData).toBe(true);
      expect(res.hasSinglePoint).toBe(true);
      expect(res.points.length).toBe(1);
      expect(res.points[0]?.source).toBe('assessment');
      expect(res.points[0]?.x).toBe(250);
      expect(res.points[0]?.y).toBe(110);
      expect(res.polylinePoints).toBe('');
      expect(res.accessibleSummary).toContain('Ainda não há tendência calculável');
    });

    it('calcula coordenadas e linha para múltiplas pesagens em ordem cronológica', () => {
      const weighIns: WeighInRecord[] = [
        { date: '2026-10-15', weightKg: 83.5, source: 'diary' },
        { date: '2026-10-01', weightKg: 85.0, source: 'assessment' },
        { date: '2026-10-08', weightKg: 84.0, source: 'diary' },
      ];
      const res = calculateWeightChart(weighIns);
      expect(res.hasData).toBe(true);
      expect(res.hasSinglePoint).toBe(false);
      expect(res.points.length).toBe(3);

      // Verificação da ordem cronológica
      expect(res.points[0]?.date).toBe('2026-10-01');
      expect(res.points[0]?.source).toBe('assessment');
      expect(res.points[1]?.date).toBe('2026-10-08');
      expect(res.points[2]?.date).toBe('2026-10-15');

      // Polyline válida com 3 coordenadas x,y
      const parts = res.polylinePoints.split(' ');
      expect(parts.length).toBe(3);
      expect(res.points[0]?.x).toBeLessThan(res.points[1]?.x ?? 0);
      expect(res.points[1]?.x).toBeLessThan(res.points[2]?.x ?? 0);

      // Maior peso fica mais próximo do topo (menor valor de y no SVG)
      expect(res.points[0]?.y).toBeLessThan(res.points[2]?.y ?? 0);
    });

    it('evita divisão por zero quando todos os pesos forem idênticos', () => {
      const weighIns: WeighInRecord[] = [
        { date: '2026-10-01', weightKg: 80.0, source: 'assessment' },
        { date: '2026-10-08', weightKg: 80.0, source: 'diary' },
      ];
      const res = calculateWeightChart(weighIns);
      expect(res.hasData).toBe(true);
      expect(res.points.length).toBe(2);
      expect(res.points[0]?.y).toBe(res.points[1]?.y);
    });
  });

  describe('downloadBlob', () => {
    it('dispara criação e clique de link temporário', () => {
      const blob = new Blob(['test content'], { type: 'application/pdf' });
      const createObjectURL = vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:test');
      const revokeObjectURL = vi
        .spyOn(window.URL, 'revokeObjectURL')
        .mockImplementation(() => undefined);

      downloadBlob(blob, 'teste.pdf');

      expect(createObjectURL).toHaveBeenCalledWith(blob);
      createObjectURL.mockRestore();
      revokeObjectURL.mockRestore();
    });
  });
});
