import {
  calculateAge,
  computePendingItems,
  formatBrazilianNumber,
  parseBrazilianNumber,
} from './assessment-helpers';
import type { AssessmentDraftResponse } from './assessment.model';

describe('assessment-helpers', () => {
  describe('calculateAge', () => {
    it('calcula a idade corretamente para data válida', () => {
      const today = new Date();
      const birthYear = today.getFullYear() - 25;
      const birthMonth = String(today.getMonth() + 1).padStart(2, '0');
      const birthDay = String(today.getDate()).padStart(2, '0');
      const birthDate = `${birthYear}-${birthMonth}-${birthDay}`;

      const age = calculateAge(birthDate);
      expect(age).toBe(25);
    });

    it('ajusta a idade quando o aniversário ainda não ocorreu no ano corrente', () => {
      const today = new Date();
      // Criar data no final do ano se hoje não for dezembro
      const birthYear = today.getFullYear() - 20;
      // Se hoje for depois de janeiro, definir aniversário para daqui a 1 mês
      const nextMonth = new Date(today);
      nextMonth.setMonth(today.getMonth() + 2);
      const birthMonth = String(nextMonth.getMonth() + 1).padStart(2, '0');
      const birthDay = String(nextMonth.getDate()).padStart(2, '0');
      const birthDate = `${birthYear}-${birthMonth}-${birthDay}`;

      if (nextMonth.getFullYear() === today.getFullYear()) {
        const age = calculateAge(birthDate);
        expect(age).toBe(19);
      }
    });

    it('retorna null para datas futuras, inválidas ou nulas', () => {
      expect(calculateAge(null)).toBeNull();
      expect(calculateAge('')).toBeNull();
      expect(calculateAge('data-invalida')).toBeNull();
      expect(calculateAge('2099-01-01')).toBeNull();
    });
  });

  describe('parseBrazilianNumber', () => {
    it('converte string com vírgula para número', () => {
      expect(parseBrazilianNumber('82,5')).toBe(82.5);
      expect(parseBrazilianNumber('175,0')).toBe(175);
    });

    it('converte string com ponto para número', () => {
      expect(parseBrazilianNumber('75.4')).toBe(75.4);
    });

    it('lida com números puros e espaços', () => {
      expect(parseBrazilianNumber(90.2)).toBe(90.2);
      expect(parseBrazilianNumber('  68,3  ')).toBe(68.3);
    });

    it('retorna null para valores vazios ou inválidos', () => {
      expect(parseBrazilianNumber('')).toBeNull();
      expect(parseBrazilianNumber('abc')).toBeNull();
      expect(parseBrazilianNumber(null)).toBeNull();
    });
  });

  describe('formatBrazilianNumber', () => {
    it('formata número com vírgula decimal brasileira', () => {
      expect(formatBrazilianNumber(82.5)).toBe('82,5');
      expect(formatBrazilianNumber(175)).toBe('175');
    });

    it('retorna string vazia para valores nulos ou indefinidos', () => {
      expect(formatBrazilianNumber(null)).toBe('');
      expect(formatBrazilianNumber(undefined)).toBe('');
    });
  });

  describe('computePendingItems', () => {
    it('retorna pendências essenciais quando campos críticos não foram preenchidos', () => {
      const draft: AssessmentDraftResponse = {
        body: {
          birthDate: '',
          biologicalSex: 'uninformed',
          heightCm: 0,
          currentWeightKg: 0,
          scaleType: 'standard',
        },
      };

      const pending = computePendingItems(draft);
      const essentialKeys = pending.filter((p) => p.priority === 'essential').map((p) => p.key);

      expect(essentialKeys).toContain('birthDate');
      expect(essentialKeys).toContain('heightCm');
      expect(essentialKeys).toContain('currentWeightKg');
      expect(pending.find((p) => p.key === 'biologicalSex')?.priority).toBe('important');
    });

    it('aponta erro de idade mínima se nascimento indicar menor de 18 anos', () => {
      const draft: AssessmentDraftResponse = {
        body: {
          birthDate: '2015-05-10', // 11 anos
          biologicalSex: 'male',
          heightCm: 170,
          currentWeightKg: 65,
          scaleType: 'standard',
        },
      };

      const pending = computePendingItems(draft);
      const invalidAge = pending.find((p) => p.key === 'birthDateInvalid');
      expect(invalidAge).toBeDefined();
      expect(invalidAge?.priority).toBe('essential');
    });

    it('classifica circunferências corporais e bioimpedância como opcionais', () => {
      const draft: AssessmentDraftResponse = {
        body: {
          birthDate: '1990-01-01',
          biologicalSex: 'female',
          heightCm: 165,
          currentWeightKg: 65,
          scaleType: 'bioimpedance',
        },
      };

      const pending = computePendingItems(draft);
      const optionalKeys = pending.filter((p) => p.priority === 'optional').map((p) => p.key);

      expect(optionalKeys).toContain('waistCircumferenceCm');
      expect(optionalKeys).toContain('bodyFatPercentage');
      expect(optionalKeys).toContain('muscleMassKg');
    });
  });
});
