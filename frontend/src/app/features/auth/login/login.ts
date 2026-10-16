import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { mapFirebaseAuthErrorMessage } from '../../../core/auth/auth-error.util';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { FirebaseAuthService } from '../../../core/auth/firebase-auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmButton,
    HlmInput,
    HlmLabel,
    HlmCardImports,
    HlmAlertImports,
    HlmSeparator,
  ],
  template: `
    <div class="min-h-dvh bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <a class="skip-link" href="#login-form">Pular para o formulário de login</a>

      <div class="sm:mx-auto sm:w-full sm:max-w-md">
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
          <h1 class="mt-6 text-2xl font-bold tracking-tight text-foreground">Acesse sua conta</h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Ou
            <a routerLink="/cadastrar" class="font-medium text-primary hover:underline">
              crie uma nova conta gratuita
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
                  estão disponíveis para teste de interface, mas o login requer credenciais ativas.
                </p>
              </div>
            }

            <!-- Mensagem de erro de autenticação -->
            @if (errorMessage()) {
              <div hlmAlert variant="destructive" class="mb-6" role="alert">
                <h4 hlmAlertTitle class="font-semibold">Erro ao entrar</h4>
                <p hlmAlertDescription class="text-xs mt-1">{{ errorMessage() }}</p>
              </div>
            }

            <form id="login-form" [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
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
                    placeholder="seu.email@exemplo.com"
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
                        Informe o seu endereço de e-mail.
                      } @else if (emailControl.hasError('email')) {
                        Informe um endereço de e-mail válido.
                      }
                    </p>
                  }
                </div>
              </div>

              <div>
                <div class="flex items-center justify-between">
                  <label hlmLabel for="password" class="block text-sm font-medium text-foreground">
                    Senha
                  </label>
                  <a
                    routerLink="/recuperar-senha"
                    class="text-xs font-medium text-primary hover:underline"
                  >
                    Esqueceu a senha?
                  </a>
                </div>
                <div class="mt-1.5 relative">
                  <input
                    hlmInput
                    id="password"
                    [type]="showPassword() ? 'text' : 'password'"
                    autocomplete="current-password"
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
                    class="absolute inset-y-0 right-0 flex items-center px-3 text-xs text-muted-foreground hover:text-foreground focus-visible:outline-ring"
                    [attr.aria-label]="showPassword() ? 'Ocultar senha' : 'Exibir senha'"
                  >
                    {{ showPassword() ? 'Ocultar' : 'Exibir' }}
                  </button>
                  @if (
                    passwordControl.invalid && (passwordControl.dirty || passwordControl.touched)
                  ) {
                    <p id="password-error" class="mt-1 text-xs text-destructive">
                      Informe sua senha.
                    </p>
                  }
                </div>
              </div>

              <div class="pt-2">
                <button
                  hlmBtn
                  type="submit"
                  class="w-full font-semibold"
                  [disabled]="isSubmitting() || form.invalid"
                >
                  {{ isSubmitting() ? 'Entrando…' : 'Entrar' }}
                </button>
              </div>
            </form>

            <div class="relative my-6">
              <div hlmSeparator></div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-card px-2 text-muted-foreground">ou continue com</span>
              </div>
            </div>

            <div>
              <button
                hlmBtn
                variant="outline"
                type="button"
                (click)="onGoogleLogin()"
                [disabled]="isGoogleSubmitting() || isSubmitting()"
                class="w-full flex items-center justify-center gap-2 text-sm font-medium"
              >
                <svg class="size-4 shrink-0" aria-hidden="true" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.27 21.41 7.34 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.27 2.59 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
                  />
                </svg>
                <span>{{
                  isGoogleSubmitting() ? 'Conectando ao Google…' : 'Entrar com Google'
                }}</span>
              </button>
            </div>
          </div>
        </div>

        <p class="mt-6 text-center text-xs text-muted-foreground">
          Ao entrar, você concorda com os termos de organização consciente do Queimando Gordura 1.0.
        </p>
      </div>
    </div>
  `,
})
export class Login {
  protected readonly firebaseAuth = inject(FirebaseAuthService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly showPassword = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly isGoogleSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected get emailControl() {
    return this.form.controls.email;
  }

  protected get passwordControl() {
    return this.form.controls.password;
  }

  protected togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(true);

    try {
      const { email, password } = this.form.getRawValue();
      await this.firebaseAuth.signInWithEmailAndPassword(email, password);
      await this.handlePostLoginRouting();
    } catch (error) {
      this.errorMessage.set(mapFirebaseAuthErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async onGoogleLogin(): Promise<void> {
    if (this.isGoogleSubmitting() || this.isSubmitting()) {
      return;
    }

    this.errorMessage.set(null);
    this.isGoogleSubmitting.set(true);

    try {
      await this.firebaseAuth.signInWithGoogle();
      await this.handlePostLoginRouting();
    } catch (error) {
      this.errorMessage.set(mapFirebaseAuthErrorMessage(error));
    } finally {
      this.isGoogleSubmitting.set(false);
    }
  }

  private async handlePostLoginRouting(): Promise<void> {
    const sessionState = await this.session.refreshSession();
    const user = sessionState.user;

    if (!user) {
      return;
    }

    if (!user.emailVerified) {
      await this.router.navigate(['/verificar-email']);
      return;
    }

    const profile = sessionState.profile;
    if (!profile || !profile.firstName || !profile.age18Confirmed) {
      await this.router.navigate(['/completar-perfil']);
      return;
    }

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/painel';
    await this.router.navigateByUrl(returnUrl);
  }
}
