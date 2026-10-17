import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AssessmentService } from '../../assessment/assessment.service.js';
import type { AssessmentResponse } from '../../assessment/types/assessment.types.js';
import type { AuthenticatedUser } from '../../auth/auth.types.js';
import { FirebaseService } from '../../firebase/firebase.service.js';
import { ClockService } from '../clock.service.js';
import type { AdaptationProgressResponse } from '../types/adaptation-progress.types.js';
import { Colors, PdfBuilder } from '../utils/pdf-builder.js';
import { AdaptationProgressService } from './adaptation-progress.service.js';

@Injectable()
export class AdaptationReportPdfService {
  private readonly logger = new Logger(AdaptationReportPdfService.name);

  constructor(
    @Inject(FirebaseService) private readonly firebaseService: FirebaseService,
    @Inject(AdaptationProgressService)
    private readonly progressService: AdaptationProgressService,
    @Inject(AssessmentService) private readonly assessmentService: AssessmentService,
    @Inject(ClockService) private readonly clockService: ClockService,
  ) {}

  async generateReportPdf(
    user: AuthenticatedUser,
    includeHealthDetails = false,
  ): Promise<Buffer> {
    try {
      const progress = await this.progressService.getProgress(user);

      if (!progress.reportAvailable || progress.status !== 'completed') {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'REPORT_NOT_AVAILABLE',
          message:
            'O relatório final em PDF só estará disponível após o encerramento do ciclo de 30 dias de adaptação.',
        });
      }

      let assessment = null;
      try {
        assessment = await this.assessmentService.getAssessment(user);
      } catch {
        // Assessment pode não estar disponível ou já ter sido obtida
      }

      // Consulta nome do usuário para cabeçalho
      let userName = 'Usuário Queimando Gordura';
      try {
        const userDoc = await this.firebaseService
          .getFirestore()
          .collection('users')
          .doc(user.uid)
          .get();
        if (userDoc.exists) {
          const uData = userDoc.data();
          userName = uData?.displayName || uData?.name || user.email || 'Usuário Queimando Gordura';
        }
      } catch {
        // Fallback para e-mail ou nome padrão
      }

      return this.renderPdf(progress, assessment, userName, includeHealthDetails);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof UnprocessableEntityException
      ) {
        throw error;
      }
      this.logger.error('Erro ao gerar relatório PDF da adaptação.', error);
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'TRANSACTION_FAILED',
        message: 'Serviço de geração de relatório PDF temporariamente indisponível.',
      });
    }
  }

  private renderPdf(
    progress: AdaptationProgressResponse,
    assessment: AssessmentResponse | null,
    userName: string,
    includeHealthDetails: boolean,
  ): Buffer {
    const pdf = new PdfBuilder();
    const now = this.clockService.now();
    const nowFormatted = now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC';

    // ==========================================
    // CABEÇALHO DO DOCUMENTO
    // ==========================================
    pdf.drawRect(pdf.margin, pdf.y - 65, pdf.contentWidth, 65, {
      fillColor: Colors.primaryLight,
      strokeColor: Colors.primary,
      lineWidth: 1.5,
    });

    pdf.drawText(
      'Queimando Gordura — Relatório de Acompanhamento de 30 Dias',
      pdf.margin + 12,
      pdf.y - 20,
      { font: 'F2', size: 13, color: Colors.primary },
    );
    pdf.drawText(
      'Ciclo Oficial de Adaptação • Relatório Final Consolidado',
      pdf.margin + 12,
      pdf.y - 34,
      { font: 'F1', size: 9.5, color: Colors.darkGray },
    );

    const modeLabel = progress.mode === 'standard' ? 'Padrão' : 'Intensificada';
    pdf.drawText(
      `Usuário: ${userName}  •  Modalidade: ${modeLabel}  •  Fuso: ${progress.timeZone}`,
      pdf.margin + 12,
      pdf.y - 48,
      { font: 'F1', size: 8.5, color: Colors.black },
    );
    pdf.drawText(
      `Período: ${progress.startDate} a ${progress.endDate}  •  Emissão: ${nowFormatted}`,
      pdf.margin + 12,
      pdf.y - 58,
      { font: 'F1', size: 8, color: Colors.gray },
    );

    pdf.y -= 75;

    // ==========================================
    // SEÇÃO 1: RESUMO TEMPORAL E PARTICIPAÇÃO
    // ==========================================
    pdf.writeHeading('1. Resumo Temporal e Participação no Diário', 2);

    const partRows = [
      ['Duração total do ciclo', '30 dias civis (100% concluído)'],
      [
        'Dias distintos com registros no Diário',
        `${progress.participation.distinctDaysRecorded} de 30 dias (${Math.round((progress.participation.distinctDaysRecorded / 30) * 100)}%)`,
      ],
      ['Dias com alimentação registrada', `${progress.participation.daysWithMeals} dias`],
      ['Dias com hidratação registrada', `${progress.participation.daysWithWater} dias`],
      ['Dias com atividades físicas registradas', `${progress.participation.daysWithActivities} dias`],
      ['Dias com pesagens registradas', `${progress.participation.daysWithWeight} dias`],
    ];

    pdf.drawTable(['Métrica de Participação', 'Consolidação'], partRows, [260, 255.28], {
      fontSize: 8.5,
    });

    pdf.drawCallout(
      'Diretriz de Leitura: Participação Não Implica Cumprimento Nutricional',
      [
        'Dias sem registros no diário indicam estritamente ausência de preenchimento voluntário de informações, e NUNCA consumo de 0 kcal, jejum forçado ou falha de adesão.',
        'O registro de uma única refeição ou ingestão hídrica em uma data civil não representa a dieta integral daquele dia. Metas calóricas numéricas automáticas permaneceram desativadas.',
      ],
      { type: 'info' },
    );

    // ==========================================
    // SEÇÃO 2: DADOS CORPORAIS E INICIAIS
    // ==========================================
    pdf.writeHeading('2. Informações Corporais e Valores de Referência Iniciais', 2);

    const body = assessment?.sections?.body;
    const initialWeightKg = progress.weightEvolution.initialDeclaredWeight?.weightKg;
    const initialWeightDate = progress.weightEvolution.initialDeclaredWeight?.date || progress.startDate;
    const initialBmiVal = progress.derivedIndicators.initialBmi?.value;
    const initialBmiClass = progress.derivedIndicators.initialBmi?.classification || 'N/A';
    const initialBmrVal = progress.derivedIndicators.initialBmr?.value;

    const bodyRows = [
      ['Altura cadastrada', body?.heightCm ? `${body.heightCm} cm` : 'Não informada'],
      [
        'Peso inicial declarado',
        initialWeightKg != null
          ? `${initialWeightKg} kg (Declarado na Avaliação Inicial em ${initialWeightDate})`
          : 'Não informado',
      ],
      [
        'IMC inicial de referência',
        initialBmiVal != null ? `${initialBmiVal} kg/m² (${initialBmiClass})` : 'Não calculado',
      ],
      [
        'Taxa Metabólica Basal inicial estimada',
        initialBmrVal != null ? `${Math.round(initialBmrVal)} kcal (Fórmula Mifflin-St Jeor)` : 'Não calculada',
      ],
      [
        'Sexo para fórmula metabólica',
        body?.sexForMetabolicFormula === 'male'
          ? 'Masculino'
          : body?.sexForMetabolicFormula === 'female'
            ? 'Feminino'
            : 'Não informado / Indisponível',
      ],
    ];

    pdf.drawTable(['Parâmetro Corporal Inicial', 'Valor Cadastrado'], bodyRows, [220, 295.28], {
      fontSize: 8.5,
    });

    // ==========================================
    // SEÇÃO 3: EVOLUÇÃO SEMANAL (5 PERÍODOS)
    // ==========================================
    pdf.writeHeading('3. Acompanhamento por Período Semanal', 2);

    const weekHeaders = [
      'Período',
      'Intervalo Civil',
      'Dias c/ Reg.',
      'Refeições',
      'Kcal Lançadas*',
      'Pesagens',
    ];
    const weekRows = progress.weeklyPeriods.map((wp) => {
      const kcalStr =
        wp.nutritionSummary.totalKcal != null
          ? `${wp.nutritionSummary.totalKcal} kcal${wp.nutritionSummary.isPartial ? '*' : ''}`
          : '—';
      const weightsStr =
        wp.weights.length > 0 ? wp.weights.map((w) => `${w.weightKg}kg`).join(', ') : '—';

      return [
        wp.label,
        `${wp.startDate} a ${wp.endDate}`,
        `${wp.distinctDaysRecorded}/${wp.totalDays}`,
        `${wp.daysWithMeals} dias`,
        kcalStr,
        weightsStr,
      ];
    });

    pdf.drawTable(weekHeaders, weekRows, [110, 130, 65, 65, 80, 65.28], {
      fontSize: 8,
    });

    pdf.writeParagraph(
      '*Nota sobre Totais Calóricos: Valores parciais calculados exclusivamente sobre refeições lançadas no diário. Dias sem registros não foram computados como consumo zero e não compõem médias artificiais.',
      { size: 7.5, color: Colors.gray, spacingAfter: 8 },
    );

    // ==========================================
    // SEÇÃO 4: PESAGENS E VARIAÇÃO DE PESO
    // ==========================================
    pdf.writeHeading('4. Histórico de Pesagens e Variação de Peso', 2);

    if (progress.weightEvolution.measurements.length > 0) {
      const weightHeaders = ['Data da Pesagem', 'Peso Aferido', 'IMC Derivado', 'TMB Derivada', 'Origem'];
      const weightTableRows = progress.weightEvolution.measurements.map((m) => [
        m.date,
        `${m.weightKg} kg`,
        m.derivedBmi != null ? `${m.derivedBmi} kg/m²` : '—',
        m.derivedBmr != null ? `${Math.round(m.derivedBmr)} kcal` : '—',
        'Diário (Balança Pessoal)',
      ]);

      pdf.drawTable(weightHeaders, weightTableRows, [95, 95, 95, 95, 135.28], {
        fontSize: 8,
      });

      if (progress.weightEvolution.weightDeltaKg != null) {
        const sign = progress.weightEvolution.weightDeltaKg > 0 ? '+' : '';
        const deltaText = `Variação observada entre a primeira pesagem (${progress.weightEvolution.firstMeasurement?.date}: ${progress.weightEvolution.firstMeasurement?.weightKg} kg) e a última pesagem (${progress.weightEvolution.lastMeasurement?.date}: ${progress.weightEvolution.lastMeasurement?.weightKg} kg): ${sign}${progress.weightEvolution.weightDeltaKg} kg.`;
        pdf.writeParagraph(deltaText, { font: 'F2', size: 9, color: Colors.primary, spacingAfter: 4 });
      } else {
        pdf.writeParagraph(
          'Variação entre pesagens indisponível: são necessárias ao menos duas pesagens registradas no diário durante o ciclo de 30 dias para calcular a diferença ponderal real.',
          { font: 'F3', size: 8.5, color: Colors.darkGray, spacingAfter: 4 },
        );
      }
    } else {
      pdf.writeParagraph(
        'Nenhuma pesagem foi registrada no Diário durante o intervalo de 30 dias da Adaptação. O peso inicial da Avaliação Inicial permanece preservado como referência declarada.',
        { font: 'F3', size: 8.5, color: Colors.darkGray, spacingAfter: 6 },
      );
    }

    pdf.drawCallout(
      'Limitações Metrológicas sobre a Balança',
      [
        'Oscilações de peso a curto prazo são frequentemente causadas por variações hídricas, retenção de líquidos, teor de sódio na dieta e resíduos gastrointestinais.',
        'O aplicativo não atribui alterações na balança exclusivamente à perda de gordura corporal nem realiza diagnósticos clínicos de composição corporal sem bioimpedância ou dobras cutâneas.',
      ],
      { type: 'warning' },
    );

    // ==========================================
    // SEÇÃO 5: CONQUISTAS DO CICLO
    // ==========================================
    pdf.writeHeading('5. Conquistas Obtidas no Ciclo de Adaptação', 2);

    const unlocked = progress.achievements.unlocked;
    if (unlocked.length > 0) {
      const achHeaders = ['Conquista', 'Critério', 'Progresso', 'Status'];
      const achRows = unlocked.map((a) => [
        a.title,
        a.description,
        `${a.progress.current}/${a.progress.target}`,
        'Conquistado',
      ]);
      pdf.drawTable(achHeaders, achRows, [130, 230, 75, 80.28], {
        fontSize: 8,
        headerBg: Colors.successLight,
      });
    } else {
      pdf.writeParagraph(
        'Nenhuma conquista foi desbloqueada no período por ausência de registros suficientes.',
        { font: 'F3', size: 8.5, color: Colors.gray, spacingAfter: 6 },
      );
    }

    pdf.writeParagraph(
      'Nota: As conquistas do aplicativo servem exclusivamente para estimular a assiduidade nos registros pessoais e não representam atestado médico, pontuação clínica ou validação de saúde.',
      { size: 7.5, color: Colors.gray, spacingAfter: 8 },
    );

    // ==========================================
    // SEÇÃO 6: INFORMAÇÕES DE SAÚDE (CONDICIONAL)
    // ==========================================
    if (includeHealthDetails) {
      pdf.writeHeading('6. Informações de Saúde e Condições Autodeclaradas', 2);

      pdf.drawCallout(
        'AVISO: INFORMAÇÕES AUTODECLARADAS PELO USUÁRIO — NÃO CONSTITUEM DIAGNÓSTICO MÉDICO',
        [
          'As condições, sintomas e medicamentos abaixo foram autodeclarados exclusivamente pelo usuário na Avaliação Inicial. O Queimando Gordura não realiza exames clínicos, diagnósticos médicos ou validação laboratorial.',
        ],
        { type: 'danger' },
      );

      const health = assessment?.sections?.health;
      const condStr =
        health?.conditions && health.conditions.length > 0
          ? health.conditions.join(', ')
          : health?.hasNoKnownConditions
            ? 'Nenhuma condição crônica conhecida declarada'
            : 'Não informado / Desconhecido';

      const sympStr =
        health?.symptoms && health.symptoms.length > 0
          ? health.symptoms.join(', ')
          : 'Nenhum sintoma relevante declarado';

      const medStr =
        health?.continuousMedications && health.continuousMedications.length > 0
          ? health.continuousMedications.join(', ')
          : health?.takesContinuousMedication === false
            ? 'Não faz uso de medicação contínua'
            : 'Não informado';

      const healthRows = [
        ['Condições de saúde declaradas', condStr],
        ['Sintomas relatados', sympStr],
        ['Medicamentos de uso contínuo', medStr],
        [
          'Acompanhamento profissional prévio',
          health?.professionalMonitoring === true ? 'Sim, declarado' : 'Não declarado',
        ],
      ];

      pdf.drawTable(['Campo Clínico Autodeclarado', 'Informação Fornecida'], healthRows, [180, 335.28], {
        fontSize: 8.5,
      });
    }

    // ==========================================
    // SEÇÃO 7: TERMO LEGAL E DISCLAIMER MÉDICO
    // ==========================================
    pdf.writeHeading('Declaração Legal e Responsabilidade Clínica', 2);

    pdf.drawCallout(
      'ISENÇÃO DE RESPONSABILIDADE MÉDICA E NUTRICIONAL',
      [
        'Este documento foi emitido pelo sistema Queimando Gordura 1.0 para finalidade exclusiva de autoacompanhamento pessoal e histórico do usuário.',
        'As métricas, resumos e variações calculadas NÃO CONSTITUEM consulta médica, diagnóstico nutricional ou autorização para práticas desportivas de alta intensidade.',
        'Quaisquer decisões relativas a restrição energética, dietas de perda de peso, introdução de suplementos ou programas de exercícios físicos intensos devem ser tomadas com supervisão direta de profissionais qualificados de saúde (médicos e nutricionistas).',
      ],
      { type: 'warning' },
    );

    return pdf.build();
  }
}
