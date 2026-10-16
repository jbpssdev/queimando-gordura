import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { VerifyEmail } from './verify-email';
import { FirebaseAuthService } from '../../../core/auth/firebase-auth.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../../../core/auth/user-profile.model';

describe('VerifyEmail Component', () => {
  let router: Router;
  let mockFirebaseAuth: Partial<FirebaseAuthService>;
  let mockAuthSession: Partial<AuthSessionService>;

  beforeEach(() => {
    mockFirebaseAuth = {
      sendEmailVerification: vi.fn().mockResolvedValue(undefined),
    };

    mockAuthSession = {
      currentUser: signal({ email: 'usuario@exemplo.com' } as unknown as User),
      refreshSession: vi.fn().mockResolvedValue({
        user: { emailVerified: true } as User,
        profile: { firstName: 'Ana', age18Confirmed: true } as UserProfile,
      }),
      signOut: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      imports: [VerifyEmail],
      providers: [
        provideRouter([]),
        { provide: FirebaseAuthService, useValue: mockFirebaseAuth },
        { provide: AuthSessionService, useValue: mockAuthSession },
      ],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('exibe o e-mail do usuário', () => {
    const fixture = TestBed.createComponent(VerifyEmail);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('usuario@exemplo.com');
  });

  it('reenvia e-mail de confirmação e inicia cooldown de proteção contra envio duplicado', async () => {
    const fixture = TestBed.createComponent(VerifyEmail);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    await component['resendVerificationEmail']();

    expect(mockFirebaseAuth.sendEmailVerification).toHaveBeenCalled();
    expect(component['resendFeedback']()).toContain('e-mail de confirmação foi enviado');
    expect(component['resendCooldown']()).toBeGreaterThan(0);
  });

  it('redireciona para /painel quando o e-mail é confirmado e o perfil existe', async () => {
    const fixture = TestBed.createComponent(VerifyEmail);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    await component['checkVerificationStatus']();

    expect(mockAuthSession.refreshSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/painel']);
  });

  it('informa que o e-mail ainda não está confirmado se user.emailVerified for false', async () => {
    vi.mocked(mockAuthSession.refreshSession)!.mockResolvedValueOnce({
      user: { emailVerified: false } as User,
      profile: null,
    });

    const fixture = TestBed.createComponent(VerifyEmail);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    await component['checkVerificationStatus']();

    expect(component['errorMessage']()).toContain('ainda não consta como confirmado');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('realiza logout ao acionar o botão de sair da conta', async () => {
    const fixture = TestBed.createComponent(VerifyEmail);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    await component['onSignOut']();

    expect(mockAuthSession.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/entrar']);
  });
});
