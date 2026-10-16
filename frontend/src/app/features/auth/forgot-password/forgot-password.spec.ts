import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ForgotPassword } from './forgot-password';
import { FirebaseAuthService } from '../../../core/auth/firebase-auth.service';

describe('ForgotPassword Component', () => {
  let mockFirebaseAuth: Partial<FirebaseAuthService>;

  beforeEach(() => {
    mockFirebaseAuth = {
      sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      imports: [ForgotPassword],
      providers: [
        provideRouter([]),
        { provide: FirebaseAuthService, useValue: mockFirebaseAuth },
      ],
    });
  });

  it('exige e-mail válido para submissão', () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component['form'].valid).toBe(false);

    component['form'].patchValue({ email: 'invalido' });
    expect(component['emailControl'].valid).toBe(false);

    component['form'].patchValue({ email: 'recuperar@exemplo.com' });
    expect(component['form'].valid).toBe(true);
  });

  it('envia e-mail de recuperação e apresenta mensagem neutra', async () => {
    const fixture = TestBed.createComponent(ForgotPassword);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].patchValue({ email: 'recuperar@exemplo.com' });

    await component['onSubmit']();
    fixture.detectChanges();

    expect(mockFirebaseAuth.sendPasswordResetEmail).toHaveBeenCalledWith('recuperar@exemplo.com');
    expect(component['successMessage']()).toContain('Se o e-mail informado estiver cadastrado');
  });
});
