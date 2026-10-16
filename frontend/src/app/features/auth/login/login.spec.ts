import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Login } from './login';
import { FirebaseAuthService } from '../../../core/auth/firebase-auth.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import type { User, UserCredential } from 'firebase/auth';
import type { UserProfile } from '../../../core/auth/user-profile.model';

describe('Login Component', () => {
  let router: Router;
  let mockFirebaseAuth: Partial<FirebaseAuthService>;
  let mockAuthSession: Partial<AuthSessionService>;

  beforeEach(() => {
    mockFirebaseAuth = {
      isConfigured: () => true,
      signInWithEmailAndPassword: vi.fn().mockResolvedValue({} as unknown as UserCredential),
      signInWithGoogle: vi.fn().mockResolvedValue({} as unknown as UserCredential),
      signInWithGoogleRedirect: vi.fn().mockResolvedValue(undefined),
      getRedirectResult: vi.fn().mockResolvedValue(null),
    };

    mockAuthSession = {
      refreshSession: vi.fn().mockResolvedValue({
        user: { uid: 'u1', emailVerified: true } as User,
        profile: { firstName: 'Ana', age18Confirmed: true } as UserProfile,
      }),
    };

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: FirebaseAuthService, useValue: mockFirebaseAuth },
        { provide: AuthSessionService, useValue: mockAuthSession },
      ],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('exige e-mail e senha válidos para submissão', () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component['form'].valid).toBe(false);

    component['form'].patchValue({ email: 'invalido' });
    expect(component['emailControl'].valid).toBe(false);

    component['form'].patchValue({ email: 'usuario@exemplo.com', password: '123' });
    expect(component['form'].valid).toBe(true);
  });

  it('realiza login com sucesso e encaminha usuário verificado ao painel', async () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].patchValue({ email: 'usuario@exemplo.com', password: 'password123' });

    await component['onSubmit']();

    expect(mockFirebaseAuth.signInWithEmailAndPassword).toHaveBeenCalledWith(
      'usuario@exemplo.com',
      'password123',
    );
    expect(router.navigateByUrl).toHaveBeenCalledWith('/painel');
  });

  it('encaminha para /verificar-email se o e-mail não estiver verificado', async () => {
    vi.mocked(mockAuthSession.refreshSession)!.mockResolvedValueOnce({
      user: { uid: 'u2', emailVerified: false } as User,
      profile: null,
    });

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].patchValue({ email: 'usuario@exemplo.com', password: 'password123' });

    await component['onSubmit']();

    expect(router.navigate).toHaveBeenCalledWith(['/verificar-email']);
  });

  it('encaminha para /completar-perfil se usuário verificado não possui perfil completo', async () => {
    vi.mocked(mockAuthSession.refreshSession)!.mockResolvedValueOnce({
      user: { uid: 'u3', emailVerified: true } as User,
      profile: null,
    });

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].patchValue({ email: 'usuario@exemplo.com', password: 'password123' });

    await component['onSubmit']();

    expect(router.navigate).toHaveBeenCalledWith(['/completar-perfil']);
  });

  it('apresenta mensagem amigável em caso de credenciais inválidas', async () => {
    vi.mocked(mockFirebaseAuth.signInWithEmailAndPassword)!.mockRejectedValueOnce({
      code: 'auth/invalid-credential',
    });

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].patchValue({ email: 'errado@exemplo.com', password: 'senhaErrada' });

    await component['onSubmit']();
    fixture.detectChanges();

    expect(component['errorMessage']()).toContain('E-mail ou senha incorretos');
  });

  it('executa login com Google através do provedor oficial via popup', async () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    await component['onGoogleLogin']();

    expect(mockFirebaseAuth.signInWithGoogle).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/painel');
  });

  it('habilita opção de redirecionamento quando popup é bloqueado pelo navegador', async () => {
    vi.mocked(mockFirebaseAuth.signInWithGoogle)!.mockRejectedValueOnce({
      code: 'auth/popup-blocked',
    });

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    await component['onGoogleLogin']();
    fixture.detectChanges();

    expect(component['showGoogleRedirectOption']()).toBe(true);
    expect(component['errorMessage']()).toContain('bloqueada pelo navegador');

    await component['onGoogleLoginRedirect']();
    expect(mockFirebaseAuth.signInWithGoogleRedirect).toHaveBeenCalled();
  });

  it('restaura sessão do Google ao retornar de redirecionamento via ngOnInit', async () => {
    vi.mocked(mockFirebaseAuth.getRedirectResult)!.mockResolvedValueOnce({
      user: { uid: 'u-google', emailVerified: true } as User,
    } as unknown as UserCredential);

    const fixture = TestBed.createComponent(Login);
    await fixture.componentInstance.ngOnInit();

    expect(mockAuthSession.refreshSession).toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/painel');
  });

  it('trata erro de domínio não autorizado no Firebase Console', async () => {
    vi.mocked(mockFirebaseAuth.signInWithGoogle)!.mockRejectedValueOnce({
      code: 'auth/unauthorized-domain',
    });

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    await component['onGoogleLogin']();

    expect(component['errorMessage']()).toContain(
      'não está autorizado para autenticação com o Google',
    );
  });
});
