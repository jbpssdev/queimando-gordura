import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AssessmentService } from '../assessment/assessment.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { FirebaseService } from '../firebase/firebase.service.js';
import { AdaptationEligibilityService } from './adaptation-eligibility.service.js';
import { ClockService } from './clock.service.js';
import type { StartAdaptationDto } from './dto/start-adaptation.dto.js';
import type {
  AdaptationDocument,
  AdaptationNotice,
  AdaptationPlanResponse,
  AdaptationPreviewResponse,
} from './types/adaptation.types.js';
import {
  addCivilDays,
  computeTemporalMetrics,
  generate30DayCalendar,
  getLocalDateString,
} from './utils/date-calendar.utils.js';

@Injectable()
export class AdaptationService {
  private readonly logger = new Logger(AdaptationService.name);

  constructor(
    @Inject(FirebaseService) private readonly firebaseService: FirebaseService,
    @Inject(AssessmentService) private readonly assessmentService: AssessmentService,
    @Inject(AdaptationEligibilityService)
    private readonly eligibilityService: AdaptationEligibilityService,
    @Inject(ClockService) private readonly clockService: ClockService,
  ) {}

  async getPreview(user: AuthenticatedUser): Promise<AdaptationPreviewResponse> {
    try {
      const assessment = await this.fetchAssessment(user);
      const results = await this.fetchResults(user, assessment.revision);

      return this.eligibilityService.evaluateEligibility(assessment, results);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof UnprocessableEntityException
      ) {
        throw error;
      }
      this.logger.error('Erro ao consultar prévia da adaptação.');
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'TRANSACTION_FAILED',
        message: 'Serviço de adaptação temporariamente indisponível.',
      });
    }
  }

  async startAdaptation(
    user: AuthenticatedUser,
    dto: StartAdaptationDto,
  ): Promise<{ plan: AdaptationPlanResponse; isExisting: boolean }> {
    if (dto.mode !== 'standard') {
      throw new UnprocessableEntityException({
        statusCode: 422,
        code: 'MODE_NOT_AVAILABLE',
        message: 'A modalidade Intensificada não está disponível nesta versão.',
        reasons: ['CLINICAL_POLICY_PENDING'],
      });
    }

    try {
      const assessment = await this.fetchAssessment(user);
      const results = await this.fetchResults(user, assessment.revision);

      const preview = this.eligibilityService.evaluateEligibility(assessment, results);
      const modeEligibility = preview.modes[dto.mode];

      if (!modeEligibility.available) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'MODE_NOT_AVAILABLE',
          message: 'O usuário não está elegível para iniciar a modalidade selecionada.',
          reasons: modeEligibility.reasons,
        });
      }

      const firestore = this.firebaseService.getFirestore();
      const docRef = firestore
        .collection('users')
        .doc(user.uid)
        .collection('adaptations')
        .doc('initial');

      const now = this.clockService.now();
      const startedAt = now.toISOString();
      const startLocalDate = getLocalDateString(now, dto.timeZone);
      const day30LocalDate = addCivilDays(startLocalDate, 29);

      const result = await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(docRef);

        if (snapshot.exists) {
          const existing = snapshot.data() as AdaptationDocument;

          // Criação idempotente: repetição exata da mesma solicitação
          if (existing.mode === dto.mode && existing.timeZone === dto.timeZone) {
            return {
              plan: this.mapToPlanResponse(existing, now),
              isExisting: true,
            };
          }

          // Tentativa de alterar modalidade, fuso ou reiniciar plano em andamento
          throw new ConflictException({
            statusCode: 409,
            code: 'ADAPTATION_ALREADY_STARTED',
            message:
              'Plano de adaptação já iniciado com parâmetros diferentes. Não é permitido reiniciar ou alterar a modalidade/fuso de um plano existente.',
          });
        }

        const docToSave: AdaptationDocument = {
          uid: user.uid,
          id: 'initial',
          mode: dto.mode,
          policyVersion: '1.0.0',
          status: 'active',
          assessmentRevision: results.revision,
          startedAt,
          timeZone: dto.timeZone,
          startLocalDate,
          day30LocalDate,
          createdAt: startedAt,
          updatedAt: startedAt,
          completedAt: null,
        };

        transaction.set(docRef, docToSave);

        return {
          plan: this.mapToPlanResponse(docToSave, now),
          isExisting: false,
        };
      });

      return result;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ConflictException ||
        error instanceof UnprocessableEntityException
      ) {
        throw error;
      }
      this.logger.error('Erro transacional ao iniciar plano de adaptação.');
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'TRANSACTION_FAILED',
        message: 'Serviço de adaptação temporariamente indisponível.',
      });
    }
  }

  async getPlan(user: AuthenticatedUser): Promise<AdaptationPlanResponse> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const docRef = firestore
        .collection('users')
        .doc(user.uid)
        .collection('adaptations')
        .doc('initial');

      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'ADAPTATION_NOT_FOUND',
          message: 'Plano de adaptação não encontrado.',
        });
      }

      const doc = snapshot.data() as AdaptationDocument;
      const now = this.clockService.now();

      return this.mapToPlanResponse(doc, now);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Erro ao consultar plano de adaptação.');
      throw new ServiceUnavailableException({
        statusCode: 503,
        code: 'TRANSACTION_FAILED',
        message: 'Serviço de adaptação temporariamente indisponível.',
      });
    }
  }

  mapToPlanResponse(
    doc: AdaptationDocument,
    now: Date = this.clockService.now(),
  ): AdaptationPlanResponse {
    const currentLocalDate = getLocalDateString(now, doc.timeZone);
    const calendar = generate30DayCalendar(doc.startLocalDate, currentLocalDate);
    const metrics = computeTemporalMetrics(doc.startLocalDate, doc.day30LocalDate, currentLocalDate);

    const notices: AdaptationNotice[] = [
      {
        code: 'CALORIE_TARGET_UNAVAILABLE',
        message:
          'Metas calóricas numéricas automáticas desativadas nesta versão; acompanhamento focado na organização de hábitos sem prescrição numérica.',
      },
    ];

    if (metrics.status === 'completed') {
      notices.push({
        code: 'ADAPTATION_CYCLE_COMPLETED',
        message: 'Ciclo inicial de 30 dias de adaptação concluído.',
      });
    }

    return {
      id: doc.id,
      mode: doc.mode,
      status: metrics.status,
      assessmentRevision: doc.assessmentRevision,
      startedAt: doc.startedAt,
      timeZone: doc.timeZone,
      startLocalDate: doc.startLocalDate,
      day30LocalDate: doc.day30LocalDate,
      currentDay: metrics.currentDay,
      elapsedDays: metrics.elapsedDays,
      remainingDays: metrics.remainingDays,
      calendarProgressPercent: metrics.calendarProgressPercent,
      calendar,
      calorieTarget: null,
      notices,
    };
  }

  private async fetchAssessment(user: AuthenticatedUser) {
    try {
      const assessment = await this.assessmentService.getAssessment(user);
      if (assessment.status !== 'completed') {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'ASSESSMENT_INCOMPLETE',
          message: 'A avaliação inicial precisa estar concluída para prosseguir.',
        });
      }
      return assessment;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException({
          statusCode: 404,
          code: 'ASSESSMENT_NOT_FOUND',
          message: 'Avaliação inicial não encontrada.',
        });
      }
      throw error;
    }
  }

  private async fetchResults(user: AuthenticatedUser, assessmentRevision: number) {
    try {
      const results = await this.assessmentService.getResults(user);
      if (assessmentRevision > results.revision) {
        throw new ConflictException({
          statusCode: 409,
          code: 'ASSESSMENT_OUTDATED',
          message:
            'A avaliação foi modificada após o último cálculo. Execute uma nova avaliação para atualizar os resultados.',
        });
      }
      return results;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          code: 'ASSESSMENT_INCOMPLETE',
          message: 'Resultados da avaliação inicial não foram encontrados.',
        });
      }
      if (error instanceof ConflictException) {
        throw new ConflictException({
          statusCode: 409,
          code: 'ASSESSMENT_OUTDATED',
          message:
            'A avaliação foi modificada após o último cálculo. Execute uma nova avaliação para atualizar os resultados.',
        });
      }
      throw error;
    }
  }
}
