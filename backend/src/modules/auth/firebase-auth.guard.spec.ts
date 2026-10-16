import { describe, expect, it, vi } from 'vitest';
import {
  ExecutionContext,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { FirebaseAuthGuard } from './firebase-auth.guard.js';
import type { FirebaseService } from '../firebase/firebase.service.js';

describe('FirebaseAuthGuard', () => {
  function createMockContext(headers: Record<string, string | undefined>): {
    context: ExecutionContext;
    request: { headers: Record<string, string | undefined>; user?: unknown };
  } {
    const request = { headers, user: undefined };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  it('lança 503 quando FirebaseService não estiver disponível', async () => {
    const firebaseService = {
      isAvailable: vi.fn().mockReturnValue(false),
    } as unknown as FirebaseService;

    const guard = new FirebaseAuthGuard(firebaseService);
    const { context } = createMockContext({ authorization: 'Bearer token-123' });

    await expect(guard.canActivate(context)).rejects.toThrow(ServiceUnavailableException);
  });

  it('lança 401 quando o cabeçalho Authorization estiver ausente', async () => {
    const firebaseService = {
      isAvailable: vi.fn().mockReturnValue(true),
    } as unknown as FirebaseService;

    const guard = new FirebaseAuthGuard(firebaseService);
    const { context } = createMockContext({});

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('lança 401 quando o cabeçalho Authorization estiver mal formatado', async () => {
    const firebaseService = {
      isAvailable: vi.fn().mockReturnValue(true),
    } as unknown as FirebaseService;

    const guard = new FirebaseAuthGuard(firebaseService);

    for (const invalidHeader of ['Basic 123', 'Bearer', 'Bearer   ', 'Token abc']) {
      const { context } = createMockContext({ authorization: invalidHeader });
      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    }
  });

  it('lança 401 quando verifyIdToken falhar (expirado ou inválido)', async () => {
    const firebaseService = {
      isAvailable: vi.fn().mockReturnValue(true),
      getAuth: vi.fn().mockReturnValue({
        verifyIdToken: vi.fn().mockRejectedValue(new Error('Firebase ID token has expired')),
      }),
    } as unknown as FirebaseService;

    const guard = new FirebaseAuthGuard(firebaseService);
    const { context } = createMockContext({ authorization: 'Bearer expired-token' });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('anexa a identidade confiável e retorna true para token válido', async () => {
    const decodedToken = {
      uid: 'user-uid-456',
      email: 'ana@example.com',
      email_verified: true,
    };
    const firebaseService = {
      isAvailable: vi.fn().mockReturnValue(true),
      getAuth: vi.fn().mockReturnValue({
        verifyIdToken: vi.fn().mockResolvedValue(decodedToken),
      }),
    } as unknown as FirebaseService;

    const guard = new FirebaseAuthGuard(firebaseService);
    const { context, request } = createMockContext({
      authorization: 'Bearer valid-token',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({
      uid: 'user-uid-456',
      email: 'ana@example.com',
      emailVerified: true,
    });
  });

  it('trata tokens válidos com e-mail não verificado', async () => {
    const decodedToken = {
      uid: 'unverified-user',
      email: 'novo@example.com',
      email_verified: false,
    };
    const firebaseService = {
      isAvailable: vi.fn().mockReturnValue(true),
      getAuth: vi.fn().mockReturnValue({
        verifyIdToken: vi.fn().mockResolvedValue(decodedToken),
      }),
    } as unknown as FirebaseService;

    const guard = new FirebaseAuthGuard(firebaseService);
    const { context, request } = createMockContext({
      authorization: 'Bearer valid-unverified-token',
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.user).toEqual({
      uid: 'unverified-user',
      email: 'novo@example.com',
      emailVerified: false,
    });
  });
});
