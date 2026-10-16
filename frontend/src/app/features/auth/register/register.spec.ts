import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Register } from './register';
import { FirebaseAuthService } from '../../../core/auth/firebase-auth.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import type { UserCredential } from 'firebase/auth';

describe('Register Component', () => {
  let router: Router;
  let mockFirebaseAuth: Partial<FirebaseAuthService>;
  let mockAuthSession: Partial<AuthSessionService>;

  beforeEach(() => {
    mockFirebaseAuth = {
      isConfigured: () => true,
      createUserWithEmailAndPassword: vi
        .fn()
        .mockResolvedValue({ user: { uid: '123' } } as unknown as UserCredential),
      updateDisplayName: vi.fn().mockResolvedValue(undefined),
      sendEmailVerification: vi.fn().mockResolvedValue(undefined),
    };

    mockAuthSession = {
      saveProfile: vi.fn().mockResolvedValue({
        uid: '123',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana@example.com',
        emailVerified: false,
        age18Confirmed: true,
        createdAt: '2026-10-16T00:00:00Z',
        updatedAt: '2026-10-16T00:00:00Z',
      }),
    };

    TestBed.configureTestingModule({
      imports: [Register],
      providers: [
        provideRouter([]),
        { provide: FirebaseAuthService, useValue: mockFirebaseAuth },
        { provide: AuthSessionService, useValue: mockAuthSession },
      ],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('inicia com formulário inválido e valida campos obrigatórios', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component['form'].valid).toBe(false);

    component['form'].patchValue({
      firstName: 'Carlos',
      lastName: 'Oliveira',
      email: 'carlos@exemplo.com',
      password: 'senhaSegura123',
      confirmPassword: 'senhaSegura123',
      age18Confirmed: true,
    });

    expect(component['form'].valid).toBe(true);
  });

  it('valida divergência entre senha e confirmação de senha', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].patchValue({
      firstName: 'Carlos',
      lastName: 'Oliveira',
      email: 'carlos@exemplo.com',
      password: 'senhaSegura123',
      confirmPassword: 'outraSenhaDiferente',
      age18Confirmed: true,
    });

    expect(component['form'].hasError('passwordMismatch')).toBe(true);
    expect(component['form'].valid).toBe(false);
  });

  it('exige autodeclaração obrigatória de 18 anos ou mais', () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].patchValue({
      firstName: 'Carlos',
      lastName: 'Oliveira',
      email: 'carlos@exemplo.com',
      password: 'senhaSegura123',
      confirmPassword: 'senhaSegura123',
      age18Confirmed: false,
    });

    expect(component['age18Control'].valid).toBe(false);
    expect(component['form'].valid).toBe(false);
  });

  it('executa o cadastro completo e encaminha para /verificar-email', async () => {
    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].patchValue({
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana@exemplo.com',
      password: 'senhaForte123',
      confirmPassword: 'senhaForte123',
      age18Confirmed: true,
    });

    await component['onSubmit']();

    expect(mockFirebaseAuth.createUserWithEmailAndPassword).toHaveBeenCalledWith(
      'ana@exemplo.com',
      'senhaForte123',
    );
    expect(mockFirebaseAuth.updateDisplayName).toHaveBeenCalledWith('Ana Silva');
    expect(mockAuthSession.saveProfile).toHaveBeenCalledWith({
      firstName: 'Ana',
      lastName: 'Silva',
      age18Confirmed: true,
    });
    expect(mockFirebaseAuth.sendEmailVerification).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/verificar-email']);
  });

  it('trata falha parcial na API preservando dados digitados e oferecendo recuperação', async () => {
    vi.mocked(mockAuthSession.saveProfile)!.mockRejectedValueOnce(new Error('API indisponível'));

    const fixture = TestBed.createComponent(Register);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].patchValue({
      firstName: 'Beatriz',
      lastName: 'Melo',
      email: 'beatriz@exemplo.com',
      password: 'senhaForte123',
      confirmPassword: 'senhaForte123',
      age18Confirmed: true,
    });

    await component['onSubmit']();
    fixture.detectChanges();

    expect(component['partialFailure']()).toBe(true);
    expect(component['form'].controls.firstName.value).toBe('Beatriz');
    expect(component['form'].controls.lastName.value).toBe('Melo');
    expect(router.navigate).not.toHaveBeenCalledWith(['/verificar-email']);

    // Testa nova tentativa bem-sucedida
    vi.mocked(mockAuthSession.saveProfile)!.mockResolvedValueOnce({
      uid: '123',
      firstName: 'Beatriz',
      lastName: 'Melo',
      email: 'beatriz@exemplo.com',
      emailVerified: false,
      age18Confirmed: true,
      createdAt: '2026-10-16T00:00:00Z',
      updatedAt: '2026-10-16T00:00:00Z',
    });
    await component['retryProfileSync']();
    expect(router.navigate).toHaveBeenCalledWith(['/verificar-email']);
  });
});
