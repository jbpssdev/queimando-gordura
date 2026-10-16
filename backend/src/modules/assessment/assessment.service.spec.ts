import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { FirebaseService } from '../firebase/firebase.service.js';
import { AssessmentCalculatorService } from './assessment-calculator.service.js';
import { AssessmentService } from './assessment.service.js';
import type { AssessmentDocument } from './types/assessment.types.js';
import type { AssessmentResultDocument } from './types/metrics.types.js';

describe('AssessmentService', () => {
  let assessmentService: AssessmentService;
  let calculatorService: AssessmentCalculatorService;
  let mockFirestore: {
    collection: ReturnType<typeof vi.fn>;
    runTransaction: ReturnType<typeof vi.fn>;
  };
  let mockFirebaseService: FirebaseService;

  const user: AuthenticatedUser = {
    uid: 'user-assessment-123',
    email: 'user@example.com',
    emailVerified: true,
  };

  beforeEach(() => {
    mockFirestore = {
      collection: vi.fn(),
      runTransaction: vi.fn(),
    };
    mockFirebaseService = {
      getFirestore: vi.fn().mockReturnValue(mockFirestore),
    } as unknown as FirebaseService;

    calculatorService = new AssessmentCalculatorService();
    assessmentService = new AssessmentService(mockFirebaseService, calculatorService);
  });

  describe('getAssessment', () => {
    it('retorna a avaliação do usuário quando existe', async () => {
      const assessmentDoc: AssessmentDocument = {
        uid: user.uid,
        status: 'draft',
        revision: 2,
        sections: {
          body: {
            dateOfBirth: '1990-01-01',
            sexForMetabolicFormula: 'male',
            heightCm: 180,
            weightKg: 80,
            scaleType: 'standard',
          },
          health: null,
          routine: null,
          nutrition: null,
        },
        createdAt: '2026-10-16T10:00:00.000Z',
        updatedAt: '2026-10-16T12:00:00.000Z',
        completedAt: null,
      };

      const docMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => assessmentDoc,
        }),
      };
      const assessmentsColMock = { doc: vi.fn().mockReturnValue(docMock) };
      const usersDocMock = {
        collection: vi.fn().mockImplementation((sub) => {
          if (sub === 'assessments') return assessmentsColMock;
          return {};
        }),
      };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      const response = await assessmentService.getAssessment(user);

      expect(response.status).toBe('draft');
      expect(response.revision).toBe(2);
      expect(response.sections.body?.weightKg).toBe(80);
      expect(response.sections.health).toBeNull();
    });

    it('lança 404 NotFoundException se a avaliação não existir', async () => {
      const docMock = {
        get: vi.fn().mockResolvedValue({ exists: false }),
      };
      const assessmentsColMock = { doc: vi.fn().mockReturnValue(docMock) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(assessmentsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      await expect(assessmentService.getAssessment(user)).rejects.toThrow(NotFoundException);
    });

    it('lança 503 ServiceUnavailableException em erro do Firestore', async () => {
      const docMock = {
        get: vi.fn().mockRejectedValue(new Error('Connection failure')),
      };
      const assessmentsColMock = { doc: vi.fn().mockReturnValue(docMock) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(assessmentsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      await expect(assessmentService.getAssessment(user)).rejects.toThrow(
        ServiceUnavailableException,
      );
    });
  });

  describe('patchAssessment', () => {
    it('cria rascunho com revisão 1 na primeira seção salva', async () => {
      const docRef = { id: 'initial' };
      const assessmentsColMock = { doc: vi.fn().mockReturnValue(docRef) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(assessmentsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      let savedDoc: unknown;
      mockFirestore.runTransaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            get: vi.fn().mockResolvedValue({ exists: false }),
            set: vi.fn((_ref, data) => {
              savedDoc = data;
            }),
          };
          return cb(tx);
        },
      );

      const response = await assessmentService.patchAssessment(user, {
        section: 'body',
        data: {
          dateOfBirth: '1995-05-20',
          sexForMetabolicFormula: 'female',
          heightCm: 165,
          weightKg: 62,
          scaleType: 'standard',
        },
      });

      expect(response.revision).toBe(1);
      expect(response.status).toBe('draft');
      expect(response.sections.body?.heightCm).toBe(165);
      expect((savedDoc as AssessmentDocument).revision).toBe(1);
    });

    it('mescla atualização parcial preservando dados e incrementando revisão', async () => {
      const existingDoc: AssessmentDocument = {
        uid: user.uid,
        status: 'draft',
        revision: 1,
        sections: {
          body: {
            dateOfBirth: '1995-05-20',
            sexForMetabolicFormula: 'female',
            heightCm: 165,
            weightKg: 62,
            targetWeightKg: 58,
            scaleType: 'standard',
          },
          health: null,
          routine: null,
          nutrition: null,
        },
        createdAt: '2026-10-16T10:00:00.000Z',
        updatedAt: '2026-10-16T10:00:00.000Z',
        completedAt: null,
      };

      const docRef = { id: 'initial' };
      const assessmentsColMock = { doc: vi.fn().mockReturnValue(docRef) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(assessmentsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      let savedDoc: unknown;
      mockFirestore.runTransaction.mockImplementation(
        async (cb: (tx: unknown) => Promise<unknown>) => {
          const tx = {
            get: vi.fn().mockResolvedValue({ exists: true, data: () => existingDoc }),
            set: vi.fn((_ref, data) => {
              savedDoc = data;
            }),
          };
          return cb(tx);
        },
      );

      // Atualiza apenas weightKg e limpa targetWeightKg enviando null
      const response = await assessmentService.patchAssessment(user, {
        section: 'body',
        data: {
          weightKg: 60,
          targetWeightKg: null,
        },
      });

      expect(response.revision).toBe(2);
      expect(response.sections.body?.weightKg).toBe(60);
      expect(response.sections.body?.heightCm).toBe(165); // preservado
      expect(response.sections.body?.dateOfBirth).toBe('1995-05-20'); // preservado
      expect((savedDoc as AssessmentDocument).sections.body?.targetWeightKg).toBeUndefined();
    });

    it('rejeita dados inválidos com 400 BadRequestException', async () => {
      await expect(
        assessmentService.patchAssessment(user, {
          section: 'body',
          data: {
            heightCm: 10, // Inválido: menor que 50cm
          },
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('evaluateAssessment', () => {
    it('lança 404 se a avaliação não existir', async () => {
      const docMock = {
        get: vi.fn().mockResolvedValue({ exists: false }),
        collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue({}) }),
      };
      const assessmentsColMock = { doc: vi.fn().mockReturnValue(docMock) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(assessmentsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      await expect(assessmentService.evaluateAssessment(user)).rejects.toThrow(NotFoundException);
    });

    it('lança 422 UnprocessableEntityException com pendingItems se houver campos faltantes', async () => {
      const incompleteDoc: AssessmentDocument = {
        uid: user.uid,
        status: 'draft',
        revision: 1,
        sections: {
          body: {
            dateOfBirth: '1995-05-20',
            sexForMetabolicFormula: 'male',
            heightCm: 180,
            weightKg: 80,
            scaleType: 'standard',
          },
          health: null,
          routine: null,
          nutrition: null,
        },
        createdAt: '2026-10-16T10:00:00.000Z',
        updatedAt: '2026-10-16T10:00:00.000Z',
      };

      const docMock = {
        get: vi.fn().mockResolvedValue({ exists: true, data: () => incompleteDoc }),
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({ get: vi.fn().mockResolvedValue({ exists: false }) }),
        }),
      };
      const assessmentsColMock = { doc: vi.fn().mockReturnValue(docMock) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(assessmentsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      try {
        await assessmentService.evaluateAssessment(user);
        expect.unreachable('Deveria ter lançado UnprocessableEntityException');
      } catch (err) {
        expect(err).toBeInstanceOf(UnprocessableEntityException);
        const res = (err as UnprocessableEntityException).getResponse() as {
          pendingItems: Array<{ section: string }>;
        };
        expect(res.pendingItems.length).toBeGreaterThan(0);
        expect(res.pendingItems.some((p) => p.section === 'health')).toBe(true);
      }
    });

    it('retorna resultado existente sem recalcular se a revisão já foi avaliada (idempotência)', async () => {
      const cachedResult: AssessmentResultDocument = {
        uid: user.uid,
        revision: 3,
        calculatedAt: '2026-10-16T11:00:00.000Z',
        age: 30,
        bmi: { value: 24.5, category: 'normal', classification: 'Peso normal' },
        bmr: { formula: 'mifflin_st_jeor', calculated: true, bmrKcal: 1700 },
        tdee: {
          estimatedTdeeKcal: 2300,
          minTdeeKcal: 2116,
          maxTdeeKcal: 2484,
          neatMultiplier: 1.3,
          exerciseAddonKcal: 90,
          explanation: 'test',
        },
        weightReference: {
          minNormalWeightKg: 60,
          maxNormalWeightKg: 80,
          milestone5PercentWeightKg: 76,
        },
        bodyComposition: { scaleType: 'standard' },
        safety: {
          status: 'cleared',
          alerts: [],
          requiresProfessionalClearance: false,
          isEmergency: false,
          allowsAutomaticCaloricDeficit: true,
          allowsIntensifiedAdaptation: true,
        },
      };

      const assessmentDoc = {
        uid: user.uid,
        status: 'completed',
        revision: 3,
        sections: {},
      };

      const currentResultDocMock = {
        get: vi.fn().mockResolvedValue({ exists: true, data: () => cachedResult }),
      };
      const resultsColMock = {
        doc: vi.fn().mockImplementation((id) => {
          if (id === 'current') return currentResultDocMock;
          return {};
        }),
      };
      const assessmentDocMock = {
        get: vi.fn().mockResolvedValue({ exists: true, data: () => assessmentDoc }),
        collection: vi.fn().mockReturnValue(resultsColMock),
      };
      const assessmentsColMock = { doc: vi.fn().mockReturnValue(assessmentDocMock) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(assessmentsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      const result = await assessmentService.evaluateAssessment(user);

      expect(result.revision).toBe(3);
      expect(result.calculatedAt).toBe('2026-10-16T11:00:00.000Z');
      expect(mockFirestore.runTransaction).not.toHaveBeenCalled();
    });
  });

  describe('getResults', () => {
    it('lança 404 se não houver avaliação ou resultados', async () => {
      const currentDocMock = { get: vi.fn().mockResolvedValue({ exists: false }) };
      const resultsColMock = { doc: vi.fn().mockReturnValue(currentDocMock) };
      const assessmentDocMock = {
        get: vi.fn().mockResolvedValue({ exists: false }),
        collection: vi.fn().mockReturnValue(resultsColMock),
      };
      const assessmentsColMock = { doc: vi.fn().mockReturnValue(assessmentDocMock) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(assessmentsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      await expect(assessmentService.getResults(user)).rejects.toThrow(NotFoundException);
    });

    it('lança 409 ConflictException se os dados foram modificados após a última avaliação', async () => {
      const assessmentDoc = { revision: 4 };
      const currentResult = { revision: 3 };

      const currentDocMock = {
        get: vi.fn().mockResolvedValue({ exists: true, data: () => currentResult }),
      };
      const resultsColMock = { doc: vi.fn().mockReturnValue(currentDocMock) };
      const assessmentDocMock = {
        get: vi.fn().mockResolvedValue({ exists: true, data: () => assessmentDoc }),
        collection: vi.fn().mockReturnValue(resultsColMock),
      };
      const assessmentsColMock = { doc: vi.fn().mockReturnValue(assessmentDocMock) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(assessmentsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      await expect(assessmentService.getResults(user)).rejects.toThrow(ConflictException);
    });

    it('retorna os resultados quando as revisões coincidem', async () => {
      const assessmentDoc = { revision: 3 };
      const currentResult = {
        revision: 3,
        calculatedAt: '2026-10-16T12:00:00.000Z',
        bmi: { value: 25.5 },
      };

      const currentDocMock = {
        get: vi.fn().mockResolvedValue({ exists: true, data: () => currentResult }),
      };
      const resultsColMock = { doc: vi.fn().mockReturnValue(currentDocMock) };
      const assessmentDocMock = {
        get: vi.fn().mockResolvedValue({ exists: true, data: () => assessmentDoc }),
        collection: vi.fn().mockReturnValue(resultsColMock),
      };
      const assessmentsColMock = { doc: vi.fn().mockReturnValue(assessmentDocMock) };
      const usersDocMock = { collection: vi.fn().mockReturnValue(assessmentsColMock) };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(usersDocMock) });

      const res = await assessmentService.getResults(user);
      expect(res.revision).toBe(3);
      expect(res.bmi.value).toBe(25.5);
    });
  });
});
