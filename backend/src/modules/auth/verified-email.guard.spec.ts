import { describe, expect, it, vi } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { VerifiedEmailGuard } from './verified-email.guard.js';
import type { FirebaseService } from '../firebase/firebase.service.js';
import type { AuthenticatedUser } from './auth.types.js';

describe('VerifiedEmailGuard', () => {
  function createMockContext(user?: AuthenticatedUser): {
    context: ExecutionContext;
    request: { user?: AuthenticatedUser };
  } {
    const request = { user };
    const context = {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
    return { context, request };
  }

  it('lança 401 se não houver usuário autenticado no request', async () => {
    const firebaseService = {} as FirebaseService;
    const guard = new VerifiedEmailGuard(firebaseService);
    const { context } = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('retorna true imediatamente se o token já indicar e-mail verificado', async () => {
    const getUserMock = vi.fn();
    const firebaseService = {
      getAuth: vi.fn().mockReturnValue({ getUser: getUserMock }),
    } as unknown as FirebaseService;

    const guard = new VerifiedEmailGuard(firebaseService);
    const { context } = createMockContext({
      uid: 'user-1',
      email: 'verified@example.com',
      emailVerified: true,
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it('consulta Firebase Auth e autoriza quando usuário verificou e-mail recentemente', async () => {
    const getUserMock = vi.fn().mockResolvedValue({
      uid: 'user-1',
      email: 'pending@example.com',
      emailVerified: true,
    });
    const firebaseService = {
      getAuth: vi.fn().mockReturnValue({ getUser: getUserMock }),
    } as unknown as FirebaseService;

    const guard = new VerifiedEmailGuard(firebaseService);
    const { context, request } = createMockContext({
      uid: 'user-1',
      email: 'pending@example.com',
      emailVerified: false,
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(getUserMock).toHaveBeenCalledWith('user-1');
    expect(request.user?.emailVerified).toBe(true);
  });

  it('lança 403 ForbiddenException quando e-mail continuar não verificado no Firebase', async () => {
    const getUserMock = vi.fn().mockResolvedValue({
      uid: 'user-1',
      email: 'pending@example.com',
      emailVerified: false,
    });
    const firebaseService = {
      getAuth: vi.fn().mockReturnValue({ getUser: getUserMock }),
    } as unknown as FirebaseService;

    const guard = new VerifiedEmailGuard(firebaseService);
    const { context } = createMockContext({
      uid: 'user-1',
      email: 'pending@example.com',
      emailVerified: false,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
    expect(getUserMock).toHaveBeenCalledWith('user-1');
  });

  it('lança 403 ForbiddenException quando consulta ao Auth falhar com erro inesperado', async () => {
    const getUserMock = vi.fn().mockRejectedValue(new Error('Network error'));
    const firebaseService = {
      getAuth: vi.fn().mockReturnValue({ getUser: getUserMock }),
    } as unknown as FirebaseService;

    const guard = new VerifiedEmailGuard(firebaseService);
    const { context } = createMockContext({
      uid: 'user-1',
      email: 'pending@example.com',
      emailVerified: false,
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
