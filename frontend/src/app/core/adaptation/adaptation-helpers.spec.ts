import {
  build30DaysTimeline,
  detectBrowserTimeZone,
  formatDatePtBr,
  formatDateRange,
} from './adaptation-helpers';

describe('adaptation-helpers', () => {
  describe('detectBrowserTimeZone', () => {
    it('detecta fuso horário do navegador sem retornar vazio', () => {
      const tz = detectBrowserTimeZone();
      expect(typeof tz).toBe('string');
      expect(tz.length).toBeGreaterThan(0);
    });
  });

  describe('formatDatePtBr', () => {
    it('formata data YYYY-MM-DD para português', () => {
      const formatted = formatDatePtBr('2026-10-16');
      expect(formatted).toContain('16 de outubro de 2026');
    });

    it('retorna string vazia para valores nulos ou vazios', () => {
      expect(formatDatePtBr(null)).toBe('');
      expect(formatDatePtBr('')).toBe('');
    });
  });

  describe('formatDateRange', () => {
    it('formata intervalo de duas datas', () => {
      const formatted = formatDateRange('2026-10-16', '2026-11-14');
      expect(formatted).toContain('16 de outubro de 2026 a 14 de novembro de 2026');
    });
  });

  describe('build30DaysTimeline', () => {
    it('constrói exatamente 30 dias consecutivos com datas corretas', () => {
      const days = build30DaysTimeline('2026-10-16', 5);
      expect(days.length).toBe(30);

      // Dia 1
      expect(days[0]?.dayNumber).toBe(1);
      expect(days[0]?.date).toBe('2026-10-16');
      expect(days[0]?.isPast).toBe(true);
      expect(days[0]?.isToday).toBe(false);

      // Dia 5 (Hoje)
      expect(days[4]?.dayNumber).toBe(5);
      expect(days[4]?.isPast).toBe(false);
      expect(days[4]?.isToday).toBe(true);

      // Dia 6 (Futuro)
      expect(days[5]?.dayNumber).toBe(6);
      expect(days[5]?.isFuture).toBe(true);

      // Marcos dos dias 7, 14, 21 e 30
      expect(days[6]?.isMilestone).toBe(true);
      expect(days[6]?.milestoneTitle).toContain('Marco 1');

      expect(days[13]?.isMilestone).toBe(true);
      expect(days[13]?.milestoneTitle).toContain('Marco 2');

      expect(days[20]?.isMilestone).toBe(true);
      expect(days[20]?.milestoneTitle).toContain('Marco 3');

      expect(days[29]?.isMilestone).toBe(true);
      expect(days[29]?.milestoneTitle).toContain('Marco 4');

      // Dia 8 não deve ser marco
      expect(days[7]?.isMilestone).toBe(false);
    });
  });
});
