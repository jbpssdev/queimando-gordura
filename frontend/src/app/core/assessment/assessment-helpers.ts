import type { AssessmentDraftResponse, PendingAssessmentItem } from './assessment.model';

/**
 * Calcula a idade em anos completos a partir de uma data de nascimento no formato YYYY-MM-DD.
 * Retorna null se a data for inválida ou futura.
 */
export function calculateAge(birthDateString: string | null | undefined): number | null {
  if (!birthDateString) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDateString.trim());
  if (!match || !match[1] || !match[2] || !match[3]) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1;
  const day = parseInt(match[3], 10);

  const birthDate = new Date(Date.UTC(year, month, day));
  if (
    birthDate.getUTCFullYear() !== year ||
    birthDate.getUTCMonth() !== month ||
    birthDate.getUTCDate() !== day
  ) {
    return null;
  }

  const today = new Date();
  if (birthDate > today) return null;

  let age = today.getUTCFullYear() - birthDate.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birthDate.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birthDate.getUTCDate())) {
    age--;
  }

  return age >= 0 ? age : null;
}

/**
 * Converte valor numérico digitado no formato brasileiro (ex.: '82,5' ou '82.5') para número.
 * Retorna null se vazio ou inválido.
 */
export function parseBrazilianNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const sanitized = value.trim().replace(/\s/g, '').replace(',', '.');
    if (!sanitized) return null;
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Formata um número para exibição em português brasileiro (com vírgula decimal).
 */
export function formatBrazilianNumber(
  value: number | null | undefined,
  fractionDigits = 1,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '';
  return value.toLocaleString('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
  });
}

/**
 * Computa as pendências inteligentes da avaliação com prioridades:
 * - Essenciais: impedem cálculos matemáticos ou metabólicos de referência.
 * - Importantes: contextualizam o resultado e rotina.
 * - Opcionais: fornecem acompanhamento complementar ('Você poderá adicionar sua circunferência abdominal depois.').
 */
export function computePendingItems(
  draft: AssessmentDraftResponse | null,
): PendingAssessmentItem[] {
  const pending: PendingAssessmentItem[] = [];
  const body = draft?.body;
  const health = draft?.health;
  const routine = draft?.routine;
  const nutrition = draft?.nutrition;

  // 1. Essenciais
  if (!body?.birthDate) {
    pending.push({
      key: 'birthDate',
      label: 'Data de nascimento',
      priority: 'essential',
      message: 'Essencial para validação de faixa etária e equações metabólicas.',
    });
  } else {
    const age = calculateAge(body.birthDate);
    if (age === null || age < 18) {
      pending.push({
        key: 'birthDateInvalid',
        label: 'Idade mínima',
        priority: 'essential',
        message: 'A idade mínima para participar do Queimando Gordura é de 18 anos.',
      });
    }
  }

  if (!body?.heightCm || body.heightCm <= 0) {
    pending.push({
      key: 'heightCm',
      label: 'Altura (cm)',
      priority: 'essential',
      message: 'Necessária para o cálculo do Índice de Massa Corporal (IMC).',
    });
  }

  if (!body?.currentWeightKg || body.currentWeightKg <= 0) {
    pending.push({
      key: 'currentWeightKg',
      label: 'Peso atual (kg)',
      priority: 'essential',
      message: 'Necessário para cálculos corporais, referências e TMB.',
    });
  }

  if (body?.biologicalSex === 'uninformed' || !body?.biologicalSex) {
    pending.push({
      key: 'biologicalSex',
      label: 'Informação biológica para TMB',
      priority: 'important',
      message:
        'Não informada. A taxa metabólica basal (TMB) não será calculada pela equação metabólica sem essa variável.',
    });
  }

  // 2. Importantes
  if (!body?.scaleType) {
    pending.push({
      key: 'scaleType',
      label: 'Tipo de balança',
      priority: 'essential',
      message: 'Ajuda a calibrar a precisão e origem das aferições de peso.',
    });
  }

  if (
    !health?.declarationType ||
    (health.declarationType === 'conditions' && !health.conditions?.length)
  ) {
    pending.push({
      key: 'healthConditions',
      label: 'Condições de saúde',
      priority: 'essential',
      message: 'Essencial para recomendações preventivas e diretrizes de segurança médica.',
    });
  }

  if (!routine?.workRoutine) {
    pending.push({
      key: 'workRoutine',
      label: 'Rotina de atividade e trabalho',
      priority: 'essential',
      message: 'Ajuda a contextualizar sua movimentação e estimativa de gasto diário.',
    });
  }

  if (!nutrition?.dailyMealsCount) {
    pending.push({
      key: 'dailyMealsCount',
      label: 'Padrão de refeições diárias',
      priority: 'essential',
      message: 'Importante para a personalização futura dos planos alimentares.',
    });
  }

  // 3. Opcionais
  if (!body?.targetWeightKg) {
    pending.push({
      key: 'targetWeightKg',
      label: 'Peso desejado',
      priority: 'optional',
      message: 'Opcional. Você pode registrar sua meta de peso pessoal a qualquer momento.',
    });
  }

  if (!body?.waistCircumferenceCm) {
    pending.push({
      key: 'waistCircumferenceCm',
      label: 'Circunferência abdominal',
      priority: 'optional',
      message: 'Você poderá adicionar sua circunferência abdominal depois.',
    });
  }

  if (!body?.neckCircumferenceCm) {
    pending.push({
      key: 'neckCircumferenceCm',
      label: 'Circunferência do pescoço',
      priority: 'optional',
      message: 'Opcional para acompanhamento e estimativas corporais complementares.',
    });
  }

  if (!body?.hipCircumferenceCm) {
    pending.push({
      key: 'hipCircumferenceCm',
      label: 'Circunferência do quadril',
      priority: 'optional',
      message: 'Opcional para análise de proporção corporal.',
    });
  }

  if (body?.scaleType === 'bioimpedance') {
    if (!body?.bodyFatPercentage) {
      pending.push({
        key: 'bodyFatPercentage',
        label: 'Gordura corporal (%)',
        priority: 'optional',
        message: 'Opcional. Medição estimada pelo seu aparelho de bioimpedância.',
      });
    }
    if (!body?.muscleMassKg) {
      pending.push({
        key: 'muscleMassKg',
        label: 'Massa muscular (kg)',
        priority: 'optional',
        message: 'Opcional. Valor estimado pela balança de bioimpedância.',
      });
    }
    if (!body?.visceralFatLevel) {
      pending.push({
        key: 'visceralFatLevel',
        label: 'Gordura visceral',
        priority: 'optional',
        message: 'Opcional. Indicador conforme a escala do seu aparelho.',
      });
    }
  }

  if (!routine?.dailySteps) {
    pending.push({
      key: 'dailySteps',
      label: 'Média de passos diários',
      priority: 'optional',
      message: 'Opcional. Pode ser inserida manualmente consultando o Google Fit ou smartwatch.',
    });
  }

  if (nutrition && nutrition.hasKitchenScale == null) {
    pending.push({
      key: 'hasKitchenScale',
      label: 'Balança culinária',
      priority: 'optional',
      message: 'Não obrigatória. Acompanhamento de porções será detalhado na fase de Adaptação.',
    });
  }

  return pending;
}
