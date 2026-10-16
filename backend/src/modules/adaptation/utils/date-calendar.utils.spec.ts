import { describe, expect, it } from 'vitest';
import {
  addCivilDays,
  computeTemporalMetrics,
  diffCivilDays,
  generate30DayCalendar,
  getLocalDateString,
  isValidIanaTimeZone,
} from './date-calendar.utils.js';

describe('Date & Calendar Utilities (Adaptação 30 dias)', () => {
  describe('isValidIanaTimeZone', () => {
    it('valida fusos horários IANA comuns e oficiais', () => {
      expect(isValidIanaTimeZone('America/Recife')).toBe(true);
      expect(isValidIanaTimeZone('America/Sao_Paulo')).toBe(true);
      expect(isValidIanaTimeZone('UTC')).toBe(true);
      expect(isValidIanaTimeZone('Europe/London')).toBe(true);
      expect(isValidIanaTimeZone('Asia/Tokyo')).toBe(true);
    });

    it('recusa fusos inválidos ou nulos', () => {
      expect(isValidIanaTimeZone('Invalid/Timezone')).toBe(false);
      expect(isValidIanaTimeZone('')).toBe(false);
      expect(isValidIanaTimeZone(null)).toBe(false);
      expect(isValidIanaTimeZone(undefined)).toBe(false);
      expect(isValidIanaTimeZone('GMT+3')).toBe(false);
    });
  });

  describe('getLocalDateString', () => {
    it('retorna a data civil local exata YYYY-MM-DD para diferentes fusos', () => {
      // 2026-10-16T23:30:00Z:
      // Em UTC: 2026-10-16
      // Em Recife (UTC-3): 2026-10-16 (20:30)
      // Em Tóquio (UTC+9): 2026-10-17 (08:30)
      const instant = new Date('2026-10-16T23:30:00.000Z');
      expect(getLocalDateString(instant, 'UTC')).toBe('2026-10-16');
      expect(getLocalDateString(instant, 'America/Recife')).toBe('2026-10-16');
      expect(getLocalDateString(instant, 'Asia/Tokyo')).toBe('2026-10-17');
    });
  });

  describe('addCivilDays e diffCivilDays', () => {
    it('soma dias civis atravessando viradas de mês', () => {
      expect(addCivilDays('2026-10-30', 2)).toBe('2026-11-01');
      expect(addCivilDays('2026-10-16', 29)).toBe('2026-11-14');
    });

    it('trata corretamente ano bissexto (2024)', () => {
      expect(addCivilDays('2024-02-28', 1)).toBe('2024-02-29');
      expect(addCivilDays('2024-02-28', 2)).toBe('2024-03-01');
    });

    it('trata corretamente ano não bissexto (2023)', () => {
      expect(addCivilDays('2023-02-28', 1)).toBe('2023-03-01');
    });

    it('soma dias civis atravessando virada de ano', () => {
      expect(addCivilDays('2026-12-31', 1)).toBe('2027-01-01');
      expect(addCivilDays('2026-12-15', 29)).toBe('2027-01-13');
    });

    it('calcula a diferença exata em dias civis', () => {
      expect(diffCivilDays('2026-10-16', '2026-10-16')).toBe(0);
      expect(diffCivilDays('2026-10-16', '2026-11-14')).toBe(29);
      expect(diffCivilDays('2026-12-31', '2027-01-01')).toBe(1);
    });
  });

  describe('generate30DayCalendar', () => {
    it('produz exatamente 30 dias com temporalState correto no Dia 1', () => {
      const calendar = generate30DayCalendar('2026-10-16', '2026-10-16');
      expect(calendar).toHaveLength(30);

      expect(calendar[0]).toEqual({
        dayNumber: 1,
        localDate: '2026-10-16',
        temporalState: 'today',
      });
      expect(calendar[1]?.temporalState).toBe('future');
      expect(calendar[29]).toEqual({
        dayNumber: 30,
        localDate: '2026-11-14',
        temporalState: 'future',
      });
    });

    it('classifica dias anteriores como past e futuros como future no meio do plano', () => {
      // No Dia 10 (2026-10-25)
      const calendar = generate30DayCalendar('2026-10-16', '2026-10-25');
      expect(calendar[0]?.temporalState).toBe('past');
      expect(calendar[8]?.temporalState).toBe('past');
      expect(calendar[9]).toEqual({
        dayNumber: 10,
        localDate: '2026-10-25',
        temporalState: 'today',
      });
      expect(calendar[10]?.temporalState).toBe('future');
      expect(calendar[29]?.temporalState).toBe('future');
    });

    it('classifica todos os dias como past após a conclusão (Dia 31+)', () => {
      const calendar = generate30DayCalendar('2026-10-16', '2026-11-15');
      expect(calendar).toHaveLength(30);
      expect(calendar.every((day) => day.temporalState === 'past')).toBe(true);
    });
  });

  describe('computeTemporalMetrics', () => {
    const start = '2026-10-16';
    const day30 = '2026-11-14';

    it('calcula métricas do Dia 1', () => {
      const metrics = computeTemporalMetrics(start, day30, '2026-10-16');
      expect(metrics.status).toBe('active');
      expect(metrics.currentDay).toBe(1);
      expect(metrics.elapsedDays).toBe(0);
      expect(metrics.remainingDays).toBe(29);
      expect(metrics.calendarProgressPercent).toBe(3.3);
    });

    it('calcula métricas do Dia 15', () => {
      const day15Date = '2026-10-30';
      const metrics = computeTemporalMetrics(start, day30, day15Date);
      expect(metrics.status).toBe('active');
      expect(metrics.currentDay).toBe(15);
      expect(metrics.elapsedDays).toBe(14);
      expect(metrics.remainingDays).toBe(15);
      expect(metrics.calendarProgressPercent).toBe(50.0);
    });

    it('calcula métricas do Dia 30', () => {
      const metrics = computeTemporalMetrics(start, day30, day30);
      expect(metrics.status).toBe('active');
      expect(metrics.currentDay).toBe(30);
      expect(metrics.elapsedDays).toBe(29);
      expect(metrics.remainingDays).toBe(0);
      expect(metrics.calendarProgressPercent).toBe(100.0);
    });

    it('conclui o plano e limita currentDay a 30 no Dia 31+', () => {
      const metrics = computeTemporalMetrics(start, day30, '2026-11-15');
      expect(metrics.status).toBe('completed');
      expect(metrics.currentDay).toBe(30);
      expect(metrics.elapsedDays).toBe(30);
      expect(metrics.remainingDays).toBe(0);
      expect(metrics.calendarProgressPercent).toBe(100.0);
    });
  });
});
