import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import type { FirebaseService } from '../firebase/firebase.service.js';
import type { AuthenticatedUser } from '../auth/auth.types.js';

describe('UsersService', () => {
  let usersService: UsersService;
  let mockFirestore: {
    collection: ReturnType<typeof vi.fn>;
    runTransaction: ReturnType<typeof vi.fn>;
  };
  let mockAuth: {
    getUser: ReturnType<typeof vi.fn>;
  };
  let mockFirebaseService: FirebaseService;

  beforeEach(() => {
    mockFirestore = {
      collection: vi.fn(),
      runTransaction: vi.fn(),
    };
    mockAuth = {
      getUser: vi.fn(),
    };
    mockFirebaseService = {
      getFirestore: vi.fn().mockReturnValue(mockFirestore),
      getAuth: vi.fn().mockReturnValue(mockAuth),
    } as unknown as FirebaseService;

    usersService = new UsersService(mockFirebaseService);
  });

  describe('getProfile', () => {
    it('retorna o perfil quando o documento existe no Firestore', async () => {
      const storedData = {
        uid: 'user-123',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        age18Confirmed: true,
        createdAt: '2026-10-15T10:00:00.000Z',
        updatedAt: '2026-10-15T12:00:00.000Z',
      };
      const docMock = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => storedData,
        }),
      };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(docMock) });

      const user: AuthenticatedUser = {
        uid: 'user-123',
        email: 'ana@example.com',
        emailVerified: true,
      };

      const result = await usersService.getProfile(user);

      expect(result).toEqual({
        uid: 'user-123',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        emailVerified: true,
        age18Confirmed: true,
        createdAt: '2026-10-15T10:00:00.000Z',
        updatedAt: '2026-10-15T12:00:00.000Z',
      });
    });

    it('lança 404 NotFoundException quando o perfil não existe', async () => {
      const docMock = {
        get: vi.fn().mockResolvedValue({ exists: false }),
      };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(docMock) });

      const user: AuthenticatedUser = {
        uid: 'nonexistent',
        email: 'test@example.com',
        emailVerified: true,
      };

      await expect(usersService.getProfile(user)).rejects.toThrow(NotFoundException);
    });

    it('lança 503 ServiceUnavailableException em erro do Firestore', async () => {
      const docMock = {
        get: vi.fn().mockRejectedValue(new Error('Firestore connection failure')),
      };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(docMock) });

      const user: AuthenticatedUser = {
        uid: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
      };

      await expect(usersService.getProfile(user)).rejects.toThrow(ServiceUnavailableException);
    });
  });

  describe('upsertProfile', () => {
    it('cria novo perfil preservando timestamp de criação e atualizando data', async () => {
      const docRef = { id: 'user-123' };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(docRef) });

      mockFirestore.runTransaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({ exists: false }),
            set: vi.fn(),
          };
          return callback(transaction);
        },
      );

      const user: AuthenticatedUser = {
        uid: 'user-123',
        email: 'ana@example.com',
        emailVerified: false,
      };

      const result = await usersService.upsertProfile(user, {
        firstName: 'Ana',
        lastName: 'Silva',
        age18Confirmed: true,
      });

      expect(result.uid).toBe('user-123');
      expect(result.firstName).toBe('Ana');
      expect(result.lastName).toBe('Silva');
      expect(result.email).toBe('ana@example.com');
      expect(result.age18Confirmed).toBe(true);
      expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.createdAt).toBe(result.updatedAt);
    });

    it('atualiza perfil existente preservando createdAt original', async () => {
      const originalCreatedAt = '2026-10-10T08:00:00.000Z';
      const docRef = { id: 'user-123' };
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue(docRef) });

      let persistedData: unknown;
      mockFirestore.runTransaction.mockImplementation(
        async (callback: (tx: unknown) => Promise<unknown>) => {
          const transaction = {
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({
                uid: 'user-123',
                firstName: 'Ana',
                lastName: 'Souza',
                createdAt: originalCreatedAt,
                updatedAt: originalCreatedAt,
              }),
            }),
            set: vi.fn((_ref: unknown, data: unknown) => {
              persistedData = data;
            }),
          };
          return callback(transaction);
        },
      );

      const user: AuthenticatedUser = {
        uid: 'user-123',
        email: 'ana@example.com',
        emailVerified: true,
      };

      const result = await usersService.upsertProfile(user, {
        firstName: 'Ana',
        lastName: 'Silva',
        age18Confirmed: true,
      });

      expect(result.createdAt).toBe(originalCreatedAt);
      expect(result.updatedAt).not.toBe(originalCreatedAt);
      expect(result.lastName).toBe('Silva');
      expect((persistedData as { createdAt: string }).createdAt).toBe(originalCreatedAt);
    });

    it('lança 503 ServiceUnavailableException quando a transação do Firestore falhar', async () => {
      mockFirestore.collection.mockReturnValue({ doc: vi.fn().mockReturnValue({}) });
      mockFirestore.runTransaction.mockRejectedValue(new Error('Transaction lock timeout'));

      const user: AuthenticatedUser = {
        uid: 'user-123',
        email: 'ana@example.com',
        emailVerified: true,
      };

      await expect(
        usersService.upsertProfile(user, {
          firstName: 'Ana',
          lastName: 'Silva',
          age18Confirmed: true,
        }),
      ).rejects.toThrow(ServiceUnavailableException);
    });
  });
});
