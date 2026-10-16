import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import { FirebaseService } from '../firebase/firebase.service.js';
import { AssessmentCalculatorService } from './assessment-calculator.service.js';
import type { PatchAssessmentDto } from './dto/patch-assessment.dto.js';
import type {
  AssessmentDocument,
  AssessmentResponse,
  AssessmentSections,
} from './types/assessment.types.js';
import type { AssessmentResultDocument } from './types/metrics.types.js';
import { validateAndSanitizeSectionData } from './utils/section-validator.js';

@Injectable()
export class AssessmentService {
  private readonly logger = new Logger(AssessmentService.name);

  constructor(
    @Inject(FirebaseService) private readonly firebaseService: FirebaseService,
    @Inject(AssessmentCalculatorService)
    private readonly calculatorService: AssessmentCalculatorService,
  ) {}

  async getAssessment(user: AuthenticatedUser): Promise<AssessmentResponse> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const docRef = firestore
        .collection('users')
        .doc(user.uid)
        .collection('assessments')
        .doc('initial');

      const snapshot = await docRef.get();

      if (!snapshot.exists) {
        throw new NotFoundException('Avaliação não encontrada.');
      }

      const data = snapshot.data() as Partial<AssessmentDocument>;

      return {
        status: data.status ?? 'draft',
        sections: {
          body: data.sections?.body ?? null,
          health: data.sections?.health ?? null,
          routine: data.sections?.routine ?? null,
          nutrition: data.sections?.nutrition ?? null,
        },
        revision: data.revision ?? 1,
        updatedAt: data.updatedAt ?? new Date().toISOString(),
        completedAt: data.completedAt ?? null,
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ServiceUnavailableException) throw error;

      this.logger.error('Erro ao buscar avaliação do usuário.');
      throw new ServiceUnavailableException('Serviço de avaliação indisponível.');
    }
  }

  async patchAssessment(
    user: AuthenticatedUser,
    dto: PatchAssessmentDto,
  ): Promise<AssessmentResponse> {
    const sanitized = await validateAndSanitizeSectionData(dto.section, dto.data);

    try {
      const firestore = this.firebaseService.getFirestore();
      const docRef = firestore
        .collection('users')
        .doc(user.uid)
        .collection('assessments')
        .doc('initial');
      const now = new Date().toISOString();

      const response = await firestore.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(docRef);
        let createdAt = now;
        let revision = 1;
        let existingSections: AssessmentSections = {
          body: null,
          health: null,
          routine: null,
          nutrition: null,
        };

        if (snapshot.exists) {
          const existing = snapshot.data() as Partial<AssessmentDocument>;
          createdAt = existing.createdAt ?? now;
          revision = (existing.revision ?? 0) + 1;
          if (existing.sections) {
            existingSections = {
              body: existing.sections.body ?? null,
              health: existing.sections.health ?? null,
              routine: existing.sections.routine ?? null,
              nutrition: existing.sections.nutrition ?? null,
            };
          }
        }

        const currentSectionData =
          (existingSections[dto.section] as Record<string, unknown> | null) || {};
        const updatedSectionData: Record<string, unknown> = { ...currentSectionData };

        for (const [key, value] of Object.entries(sanitized)) {
          if (value === null) {
            delete updatedSectionData[key];
          } else {
            updatedSectionData[key] = value;
          }
        }

        const updatedSections: AssessmentSections = {
          ...existingSections,
          [dto.section]: updatedSectionData as never,
        };
        // Validate the merged section too: a partial PATCH must not bypass cross-field rules.
        await validateAndSanitizeSectionData(dto.section, updatedSectionData);

        const documentToSave: AssessmentDocument = {
          uid: user.uid,
          status: 'draft',
          revision,
          sections: updatedSections,
          createdAt,
          updatedAt: now,
          completedAt: null,
        };

        transaction.set(docRef, { ...(snapshot.exists ? snapshot.data() : {}), ...documentToSave });

        return {
          status: documentToSave.status,
          sections: documentToSave.sections,
          revision: documentToSave.revision,
          updatedAt: documentToSave.updatedAt,
          completedAt: documentToSave.completedAt,
        };
      });

      return response;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof ServiceUnavailableException) throw error;

      this.logger.error('Erro ao atualizar seção da avaliação.');
      throw new ServiceUnavailableException('Serviço de avaliação indisponível.');
    }
  }

  async evaluateAssessment(user: AuthenticatedUser): Promise<AssessmentResultDocument> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const docRef = firestore
        .collection('users')
        .doc(user.uid)
        .collection('assessments')
        .doc('initial');
      const currentResultRef = docRef.collection('results').doc('current');

      const assessmentSnap = await docRef.get();
      if (!assessmentSnap.exists) {
        throw new NotFoundException('Avaliação não encontrada.');
      }

      const assessment = assessmentSnap.data() as AssessmentDocument;

      // Idempotência: se já calculada para a revisão atual, retorna os resultados existentes
      const currentSnap = await currentResultRef.get();
      if (currentSnap.exists) {
        const currentData = currentSnap.data() as AssessmentResultDocument;
        if (currentData.revision === assessment.revision) {
          return currentData;
        }
      }

      // Validação de preenchimento completo dos campos essenciais
      const pendingItems = this.calculatorService.findPendingItems(assessment.sections);
      if (pendingItems.length > 0) {
        throw new UnprocessableEntityException({
          statusCode: 422,
          message: 'Avaliação incompleta para cálculo de resultados.',
          pendingItems,
        });
      }

      // Cálculo de métricas estritamente no servidor
      const now = new Date();
      const results = this.calculatorService.calculateResults(
        user.uid,
        assessment.revision,
        assessment.sections,
        now,
      );

      const revResultRef = docRef.collection('results').doc(`rev_${assessment.revision}`);

      const persistedResults = await firestore.runTransaction(async (transaction) => {
        const latest = await transaction.get(docRef);
        if (!latest.exists || latest.data()?.['revision'] !== assessment.revision) {
          throw new ConflictException('A avaliação mudou durante o cálculo. Tente novamente.');
        }
        const cached = await transaction.get(currentResultRef);
        if (cached.exists && cached.data()?.['revision'] === assessment.revision) {
          return cached.data() as AssessmentResultDocument;
        }
        transaction.set(currentResultRef, results);
        transaction.set(revResultRef, results);
        transaction.update(docRef, {
          status: 'completed',
          completedAt: now.toISOString(),
          updatedAt: now.toISOString(),
        });
        return results;
      });

      return persistedResults;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof UnprocessableEntityException) throw error;
      if (error instanceof ConflictException) throw error;
      if (error instanceof ServiceUnavailableException) throw error;

      this.logger.error('Erro ao avaliar dados da avaliação.');
      throw new ServiceUnavailableException('Serviço de avaliação indisponível.');
    }
  }

  async getResults(user: AuthenticatedUser): Promise<AssessmentResultDocument> {
    try {
      const firestore = this.firebaseService.getFirestore();
      const docRef = firestore
        .collection('users')
        .doc(user.uid)
        .collection('assessments')
        .doc('initial');
      const currentResultRef = docRef.collection('results').doc('current');

      const [assessmentSnap, currentSnap] = await Promise.all([
        docRef.get(),
        currentResultRef.get(),
      ]);

      if (!assessmentSnap.exists || !currentSnap.exists) {
        throw new NotFoundException('Nenhum resultado de avaliação encontrado.');
      }

      const assessment = assessmentSnap.data() as AssessmentDocument;
      const results = currentSnap.data() as AssessmentResultDocument;

      // Se os dados da avaliação foram modificados após o último cálculo
      if (assessment.revision > results.revision) {
        throw new ConflictException(
          'A avaliação foi modificada após o último cálculo. Execute uma nova avaliação para atualizar os resultados.',
        );
      }

      return results;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      if (error instanceof ConflictException) throw error;
      if (error instanceof ServiceUnavailableException) throw error;

      this.logger.error('Erro ao obter resultados da avaliação.');
      throw new ServiceUnavailableException('Serviço de avaliação indisponível.');
    }
  }
}
