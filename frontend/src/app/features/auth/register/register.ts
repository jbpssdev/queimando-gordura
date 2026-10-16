import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { mapFirebaseAuthErrorMessage } from '../../../core/auth/auth-error.util';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { FirebaseAuthService } from '../../../core/auth/firebase-auth.service';

function passwordMatchValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  };
}

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmButton,
    HlmInput,
    HlmLabel,
    HlmCardImports,
    HlmAlertImports,
  ],

  template: `
    <div class="min-h-dvh bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <a class="skip-link" href="#register-form">Pular para o formulário de cadastro</a>

      <div class="sm:mx-auto sm:w-full sm:max-w-lg">
        <div class="text-center">
          <a routerLink="/" class="inline-flex items-center gap-2 font-bold text-foreground">
            <span
              aria-hidden="true"
              class="grid size-10 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-xs"
            >
              QG
            </span>
            <span class="text-xl tracking-tight">Queimando Gordura</span>
          </a>
          <h1 class="mt-6 text-2xl font-bold tracking-tight text-foreground">Crie sua conta</h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Já possui uma conta?
            <a routerLink="/entrar" class="font-medium text-primary hover:underline">
              Faça login aqui
            </a>
          </p>
        </div>

        <div class="mt-8" hlmCard>
          <div hlmCardContent class="p-6 sm:p-8">
            <!-- Aviso quando Firebase não está configurado -->
            @if (!firebaseAuth.isConfigured()) {
              <div
                hlmAlert
                class="mb-6 border-amber-300/60 bg-amber-50 text-amber-900"
                role="alert"
              >
                <h4 hlmAlertTitle class="font-semibold text-amber-950">Ambiente de Demonstração</h4>
                <p hlmAlertDescription class="text-xs text-amber-900/90 mt-1">
                  A autenticação com Firebase ainda não está configurada neste ambiente. Os campos
                  estão disponíveis para testes de interface, mas o cadastro exige credenciais do
                  Firebase.
                </p>
              </div>
            }

            <!-- Alerta de falha parcial: usuário Firebase criado mas erro na API NestJS -->
            @if (partialFailure()) {
              <div
                hlmAlert
                class="mb-6 border-amber-400 bg-amber-50/90 text-amber-950"
                role="alert"
              >
                <h4 hlmAlertTitle class="font-bold">Atenção: Conclusão Parcial do Cadastro</h4>
                <p hlmAlertDescription class="text-xs mt-1 leading-relaxed">
                  Sua conta de acesso foi criada com sucesso, mas a sincronização do perfil com o
                  servidor falhou temporariamente. Seus dados digitados continuam preservados
                  abaixo.
                </p>
                <div class="mt-4 flex flex-col sm:flex-row gap-2">
                  <button
                    hlmBtn
                    size="sm"
                    type="button"
                    (click)="retryProfileSync()"
                    [disabled]="isSubmitting()"
                    class="font-semibold"
                  >
                    {{ isSubmitting() ? 'Tentando novamente…' : 'Tentar salvar perfil novamente' }}
                  </button>
                  <button
                    hlmBtn
                    variant="outline"
                    size="sm"
                    type="button"
                    (click)="proceedToVerification()"
                  >
                    Continuar para confirmação de e-mail
                  </button>
                </div>
              </div>
            }

            <!-- Mensagem de erro geral -->
            @if (errorMessage()) {
              <div hlmAlert variant="destructive" class="mb-6" role="alert">
                <h4 hlmAlertTitle class="font-semibold">Erro no cadastro</h4>
                <p hlmAlertDescription class="text-xs mt-1">{{ errorMessage() }}</p>
              </div>
            }

            <form id="register-form" [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label hlmLabel for="firstName" class="block text-sm font-medium text-foreground">
                    Nome
                  </label>
                  <div class="mt-1.5">
                    <input
                      hlmInput
                      id="firstName"
                      type="text"
                      autocomplete="given-name"
                      placeholder="Ana"
                      formControlName="firstName"
                      [attr.aria-invalid]="
                        firstNameControl.invalid &&
                        (firstNameControl.dirty || firstNameControl.touched)
                      "
                      aria-describedby="first-name-error"
                      class="w-full"
                    />
                    @if (
                      firstNameControl.invalid &&
                      (firstNameControl.dirty || firstNameControl.touched)
                    ) {
                      <p id="first-name-error" class="mt-1 text-xs text-destructive">
                        Informe seu nome.
                      </p>
                    }
                  </div>
                </div>

                <div>
                  <label hlmLabel for="lastName" class="block text-sm font-medium text-foreground">
                    Sobrenome
                  </label>
                  <div class="mt-1.5">
                    <input
                      hlmInput
                      id="lastName"
                      type="text"
                      autocomplete="family-name"
                      placeholder="Silva"
                      formControlName="lastName"
                      [attr.aria-invalid]="
                        lastNameControl.invalid &&
                        (lastNameControl.dirty || lastNameControl.touched)
                      "
                      aria-describedby="last-name-error"
                      class="w-full"
                    />
                    @if (
                      lastNameControl.invalid && (lastNameControl.dirty || lastNameControl.touched)
                    ) {
                      <p id="last-name-error" class="mt-1 text-xs text-destructive">
                        Informe seu sobrenome.
                      </p>
                    }
                  </div>
                </div>
              </div>

              <div>
                <label hlmLabel for="email" class="block text-sm font-medium text-foreground">
                  E-mail
                </label>
                <div class="mt-1.5">
                  <input
                    hlmInput
                    id="email"
                    type="email"
                    autocomplete="email"
                    placeholder="ana.silva@exemplo.com"
                    formControlName="email"
                    [attr.aria-invalid]="
                      emailControl.invalid && (emailControl.dirty || emailControl.touched)
                    "
                    aria-describedby="email-error"
                    class="w-full"
                  />
                  @if (emailControl.invalid && (emailControl.dirty || emailControl.touched)) {
                    <p id="email-error" class="mt-1 text-xs text-destructive">
                      @if (emailControl.hasError('required')) {
                        Informe seu endereço de e-mail.
                      } @else if (emailControl.hasError('email')) {
                        Informe um e-mail válido.
                      }
                    </p>
                  }
                </div>
              </div>

              <div>
                <label hlmLabel for="password" class="block text-sm font-medium text-foreground">
                  Senha
                </label>
                <div class="mt-1.5 relative">
                  <input
                    hlmInput
                    id="password"
                    [type]="showPassword() ? 'text' : 'password'"
                    autocomplete="new-password"
                    placeholder="Mínimo de 6 caracteres"
                    formControlName="password"
                    [attr.aria-invalid]="
                      passwordControl.invalid && (passwordControl.dirty || passwordControl.touched)
                    "
                    aria-describedby="password-error"
                    class="w-full pr-12"
                  />
                  <button
                    type="button"
                    (click)="togglePasswordVisibility()"
                    class="absolute inset-y-0 right-0 flex items-center px-3 text-xs text-muted-foreground hover:text-foreground"
                    [attr.aria-label]="showPassword() ? 'Ocultar senha' : 'Exibir senha'"
                  >
                    {{ showPassword() ? 'Ocultar' : 'Exibir' }}
                  </button>
                  @if (
                    passwordControl.invalid && (passwordControl.dirty || passwordControl.touched)
                  ) {
                    <p id="password-error" class="mt-1 text-xs text-destructive">
                      @if (passwordControl.hasError('required')) {
                        Informe uma senha.
                      } @else if (passwordControl.hasError('minlength')) {
                        A senha deve ter no mínimo 6 caracteres.
                      }
                    </p>
                  }
                </div>
              </div>

              <div>
                <label
                  hlmLabel
                  for="confirmPassword"
                  class="block text-sm font-medium text-foreground"
                >
                  Confirmar senha
                </label>
                <div class="mt-1.5">
                  <input
                    hlmInput
                    id="confirmPassword"
                    [type]="showPassword() ? 'text' : 'password'"
                    autocomplete="new-password"
                    formControlName="confirmPassword"
                    [attr.aria-invalid]="
                      confirmPasswordControl.invalid &&
                      (confirmPasswordControl.dirty || confirmPasswordControl.touched)
                    "
                    aria-describedby="confirm-password-error"
                    class="w-full"
                  />
                  @if (
                    (confirmPasswordControl.dirty || confirmPasswordControl.touched) &&
                    (confirmPasswordControl.hasError('required') ||
                      form.hasError('passwordMismatch'))
                  ) {
                    <p id="confirm-password-error" class="mt-1 text-xs text-destructive">
                      @if (confirmPasswordControl.hasError('required')) {
                        Confirme sua senha.
                      } @else if (form.hasError('passwordMismatch')) {
                        As senhas digitadas não coincidem.
                      }
                    </p>
                  }
                </div>
              </div>

              <!-- Autodeclaração de Maioridade (18 anos ou mais) -->
              <div class="pt-2">
                <div class="flex items-start gap-3">
                  <input
                    id="age18Confirmed"
                    type="checkbox"
                    formControlName="age18Confirmed"
                    class="mt-1 size-4 rounded border-border text-primary focus:ring-ring"
                    aria-describedby="age-description"
                  />
                  <div>
                    <label
                      hlmLabel
                      for="age18Confirmed"
                      class="text-sm font-medium text-foreground cursor-pointer"
                    >
                      Declaro que tenho 18 anos ou mais.
                    </label>
                    <p id="age-description" class="text-xs text-muted-foreground mt-0.5">
                      Esta autodeclaração é obrigatória. O Queimando Gordura é destinado
                      exclusivamente a adultos. Sua data de nascimento será solicitada na avaliação
                      corporal.
                    </p>
                    @if (age18Control.invalid && (age18Control.dirty || age18Control.touched)) {
                      <p class="mt-1 text-xs text-destructive">
                        É obrigatório declarar ter 18 anos ou mais para criar sua conta.
                      </p>
                    }
                  </div>
                </div>
              </div>

              <div class="pt-4">
                <button
                  hlmBtn
                  type="submit"
                  class="w-full font-semibold"
                  [disabled]="isSubmitting() || form.invalid || partialFailure()"
                >
                  {{ isSubmitting() ? 'Criando conta…' : 'Criar conta' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <p class="mt-6 text-center text-xs text-muted-foreground">
          Ao se cadastrar, você concorda com o caráter de acompanhamento consciente e educativo do
          Queimando Gordura 1.0.
        </p>
      </div>
    </div>
  `,
})
export class Register {
  protected readonly firebaseAuth = inject(FirebaseAuthService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly showPassword = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly partialFailure = signal(false);

  protected readonly form = new FormGroup(
    {
      firstName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      lastName: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(2)],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(6)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      age18Confirmed: new FormControl(false, {
        nonNullable: true,
        validators: [Validators.requiredTrue],
      }),
    },
    { validators: [passwordMatchValidator()] },
  );

  protected get firstNameControl() {
    return this.form.controls.firstName;
  }
  protected get lastNameControl() {
    return this.form.controls.lastName;
  }
  protected get emailControl() {
    return this.form.controls.email;
  }
  protected get passwordControl() {
    return this.form.controls.password;
  }
  protected get confirmPasswordControl() {
    return this.form.controls.confirmPassword;
  }
  protected get age18Control() {
    return this.form.controls.age18Confirmed;
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  protected async onSubmit(): Promise<void> {
    if (this.partialFailure()) return;
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.partialFailure.set(false);
    this.isSubmitting.set(true);

    const { firstName, lastName, email, password } = this.form.getRawValue();

    try {
      // 1. Criar usuário no Firebase
      await this.firebaseAuth.createUserWithEmailAndPassword(email, password);

      // 2. Atualizar displayName no Firebase
      try {
        await this.firebaseAuth.updateDisplayName(`${firstName} ${lastName}`);
      } catch {
        // Falha no displayName não bloqueia o fluxo
      }

      // 3. Salvar perfil na API NestJS
      try {
        await this.session.saveProfile({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          age18Confirmed: true,
        });
      } catch {
        // Falha parcial: usuário Firebase criado, gravação na API falhou
        this.partialFailure.set(true);
        this.isSubmitting.set(false);
        // Tenta enviar verificação mesmo em falha parcial
        try {
          await this.firebaseAuth.sendEmailVerification();
        } catch {
          // ignora erro de envio neste momento
        }
        return;
      }

      // 4. Enviar e-mail de confirmação
      try {
        await this.firebaseAuth.sendEmailVerification();
      } catch {
        // Se envio falhar, tela de verificação permite reenviar
      }

      // 5. Encaminhar para confirmação de e-mail
      await this.router.navigate(['/verificar-email']);
    } catch (error) {
      this.errorMessage.set(mapFirebaseAuthErrorMessage(error));
    } finally {
      if (!this.partialFailure()) {
        this.isSubmitting.set(false);
      }
    }
  }

  protected async retryProfileSync(): Promise<void> {
    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { firstName, lastName } = this.form.getRawValue();

    try {
      await this.session.saveProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age18Confirmed: true,
      });
      this.partialFailure.set(false);
      await this.router.navigate(['/verificar-email']);
    } catch {
      this.errorMessage.set(
        'Ainda não foi possível conectar com o servidor para gravar o perfil. Você pode tentar novamente ou continuar para a verificação de e-mail.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async proceedToVerification(): Promise<void> {
    await this.router.navigate(['/verificar-email']);
  }
}
