import { TestBed } from '@angular/core/testing';
import {
  type ActivatedRouteSnapshot,
  type GuardResult,
  provideRouter,
  type RouterStateSnapshot,
} from '@angular/router';
import { firstValueFrom, isObservable, Observable, of } from 'rxjs';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { verifyEmailGuard } from './verify-email.guard';
import { completeProfileGuard } from './complete-profile.guard';
import { AuthSessionService } from '../auth-session.service';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../user-profile.model';

async function executeGuard(
  guardFn: () => Observable<GuardResult> | Promise<GuardResult> | GuardResult,
): Promise<GuardResult> {
  const res = TestBed.runInInjectionContext(guardFn);
  if (isObservable(res)) {
    return firstValueFrom(res);
  }
  return res;
}

describe('Auth Guards', () => {
  let mockSession: Partial<AuthSessionService>;
  const dummyRoute = {} as ActivatedRouteSnapshot;

  beforeEach(() => {
    mockSession = {
      ensureInitialized: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: mockSession },
      ],
    });
  });

  describe('authGuard', () => {
    it('redireciona para /entrar com returnUrl se o usuário não estiver autenticado', async () => {
      vi.mocked(mockSession.ensureInitialized)!.mockReturnValue(
        of({ user: null, profile: null }),
      );

      const dummyState = { url: '/painel' } as RouterStateSnapshot;
      const result = await executeGuard(() => authGuard(dummyRoute, dummyState));
      expect(String(result)).toBe('/entrar');
    });

    it('redireciona para /verificar-email se o e-mail não estiver verificado', async () => {
      vi.mocked(mockSession.ensureInitialized)!.mockReturnValue(
        of({ user: { emailVerified: false } as User, profile: null }),
      );

      const dummyState = { url: '/painel' } as RouterStateSnapshot;
      const result = await executeGuard(() => authGuard(dummyRoute, dummyState));
      expect(String(result)).toBe('/verificar-email');
    });

    it('redireciona para /completar-perfil se usuário verificado não possui perfil', async () => {
      vi.mocked(mockSession.ensureInitialized)!.mockReturnValue(
        of({ user: { emailVerified: true } as User, profile: null }),
      );

      const dummyState = { url: '/painel' } as RouterStateSnapshot;
      const result = await executeGuard(() => authGuard(dummyRoute, dummyState));
      expect(String(result)).toBe('/completar-perfil');
    });

    it('permite acesso se usuário estiver verificado e perfil estiver completo', async () => {
      vi.mocked(mockSession.ensureInitialized)!.mockReturnValue(
        of({
          user: { emailVerified: true } as User,
          profile: { firstName: 'Ana', age18Confirmed: true } as UserProfile,
        }),
      );

      const dummyState = { url: '/painel' } as RouterStateSnapshot;
      const result = await executeGuard(() => authGuard(dummyRoute, dummyState));
      expect(result).toBe(true);
    });
  });

  describe('guestGuard', () => {
    it('permite acesso para usuários não autenticados', async () => {
      vi.mocked(mockSession.ensureInitialized)!.mockReturnValue(
        of({ user: null, profile: null }),
      );

      const result = await executeGuard(() => guestGuard(dummyRoute, {} as RouterStateSnapshot));
      expect(result).toBe(true);
    });

    it('redireciona usuário autenticado e completo para /painel', async () => {
      vi.mocked(mockSession.ensureInitialized)!.mockReturnValue(
        of({
          user: { emailVerified: true } as User,
          profile: { firstName: 'Ana', age18Confirmed: true } as UserProfile,
        }),
      );

      const result = await executeGuard(() => guestGuard(dummyRoute, {} as RouterStateSnapshot));
      expect(String(result)).toBe('/painel');
    });
  });

  describe('verifyEmailGuard', () => {
    it('permite acesso quando o usuário está autenticado mas com e-mail não verificado', async () => {
      vi.mocked(mockSession.ensureInitialized)!.mockReturnValue(
        of({ user: { emailVerified: false } as User, profile: null }),
      );

      const result = await executeGuard(() =>
        verifyEmailGuard(dummyRoute, {} as RouterStateSnapshot),
      );
      expect(result).toBe(true);
    });

    it('redireciona para /painel quando o e-mail já foi verificado e perfil está completo', async () => {
      vi.mocked(mockSession.ensureInitialized)!.mockReturnValue(
        of({
          user: { emailVerified: true } as User,
          profile: { firstName: 'Ana', age18Confirmed: true } as UserProfile,
        }),
      );

      const result = await executeGuard(() =>
        verifyEmailGuard(dummyRoute, {} as RouterStateSnapshot),
      );
      expect(String(result)).toBe('/painel');
    });
  });

  describe('completeProfileGuard', () => {
    it('permite acesso quando e-mail está verificado mas o perfil está incompleto', async () => {
      vi.mocked(mockSession.ensureInitialized)!.mockReturnValue(
        of({ user: { emailVerified: true } as User, profile: null }),
      );

      const result = await executeGuard(() =>
        completeProfileGuard(dummyRoute, {} as RouterStateSnapshot),
      );
      expect(result).toBe(true);
    });

    it('redireciona para /painel quando o perfil já está completo', async () => {
      vi.mocked(mockSession.ensureInitialized)!.mockReturnValue(
        of({
          user: { emailVerified: true } as User,
          profile: { firstName: 'Ana', age18Confirmed: true } as UserProfile,
        }),
      );

      const result = await executeGuard(() =>
        completeProfileGuard(dummyRoute, {} as RouterStateSnapshot),
      );
      expect(String(result)).toBe('/painel');
    });
  });
});
