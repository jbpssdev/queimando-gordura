import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subject, throwError } from 'rxjs';
import type { User } from 'firebase/auth';
import { AuthSessionService } from './auth-session.service';
import { FirebaseAuthService } from './firebase-auth.service';
import { UserProfileApiService } from './user-profile-api.service';
import type { UserProfile } from './user-profile.model';

describe('AuthSessionService — contrato da API', () => {
  const user = { uid: 'session-user', emailVerified: true } as User;
  const profile = {
    uid: user.uid,
    firstName: 'Ana',
    lastName: 'Silva',
    age18Confirmed: true,
  } as UserProfile;
  const api = { getProfile: vi.fn(), saveProfile: vi.fn() };
  let session: AuthSessionService;

  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: FirebaseAuthService,
          useValue: { reloadUser: vi.fn().mockResolvedValue(user), isConfigured: () => true },
        },
        { provide: UserProfileApiService, useValue: api },
      ],
    });
    session = TestBed.inject(AuthSessionService);
    session.currentUser.set(user);
  });

  it('trata somente 404 como perfil inexistente', async () => {
    api.getProfile.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 404 })));
    expect((await session.refreshSession()).profile).toBeNull();
    expect(session.profileLoadError()).toBeNull();
  });

  it.each([0, 401, 403, 503])('preserva a distinção do erro HTTP %s', async (status) => {
    api.getProfile.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    await expect(session.refreshSession()).rejects.toMatchObject({ status });
    expect(session.profileLoadError()).toBe(status);
    api.getProfile.mockReturnValue(of(profile));
    expect((await session.refreshSession()).profile).toEqual(profile);
    expect(session.profileLoadError()).toBeNull();
  });

  it('não aplica o perfil de uma sessão encerrada enquanto a consulta estava em trânsito', async () => {
    const response = new Subject<UserProfile>();
    api.getProfile.mockReturnValue(response);
    const loading = session.loadProfile();
    session.currentUser.set(null);
    response.next(profile);
    expect(await loading).toBeNull();
    expect(session.currentProfile()).toBeNull();
  });
});
