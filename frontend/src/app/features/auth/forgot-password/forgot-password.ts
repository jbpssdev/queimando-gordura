import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { mapFirebaseAuthErrorMessage } from '../../../core/auth/auth-error.util';
import { FirebaseAuthService } from '../../../core/auth/firebase-auth.service';

@Component({
  selector: 'app-forgot-password',
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
      <a class="skip-link" href="#forgot-form">Pular para o formulário de recuperação de senha</a>

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
          <h1 class="mt-6 text-2xl font-bold tracking-tight text-foreground">
            Recuperar sua senha
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Informe o e-mail cadastrado para enviarmos o link de redefinição.
          </p>
        </div>

        <div class="mt-8" hlmCard>
          <div hlmCardContent class="p-6 sm:p-8">
            @if (successMessage()) {
              <div
                hlmAlert
                class="mb-6 border-emerald-300/60 bg-emerald-50 text-emerald-950"
                role="status"
              >
                <h4 hlmAlertTitle class="font-semibold">Instruções enviadas</h4>
                <p hlmAlertDescription class="text-xs mt-1 leading-relaxed">
                  {{ successMessage() }}
                </p>
              </div>

              <div class="pt-2">
                <a
                  routerLink="/entrar"
                  hlmBtn
                  variant="default"
                  class="w-full text-center font-semibold"
                >
                  Voltar para o login
                </a>
              </div>
            } @else {
              @if (errorMessage()) {
                <div hlmAlert variant="destructive" class="mb-6" role="alert">
                  <h4 hlmAlertTitle class="font-semibold">Atenção</h4>
                  <p hlmAlertDescription class="text-xs mt-1">{{ errorMessage() }}</p>
                </div>
              }

              <form id="forgot-form" [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-5">
                <div>
                  <label hlmLabel for="email" class="block text-sm font-medium text-foreground">
                    E-mail cadastrado
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
                          Informe o seu e-mail.
                        } @else if (emailControl.hasError('email')) {
                          Informe um e-mail válido.
                        }
                      </p>
                    }
                  </div>
                </div>

                <div class="pt-2 space-y-3">
                  <button
                    hlmBtn
                    type="submit"
                    class="w-full font-semibold"
                    [disabled]="isSubmitting() || form.invalid"
                  >
                    {{
                      isSubmitting() ? 'Enviando instruções…' : 'Enviar instruções de recuperação'
                    }}
                  </button>

                  <a
                    routerLink="/entrar"
                    hlmBtn
                    variant="outline"
                    class="w-full text-center text-sm"
                  >
                    Voltar para o login
                  </a>
                </div>
              </form>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ForgotPassword {
  private readonly firebaseAuth = inject(FirebaseAuthService);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected get emailControl() {
    return this.form.controls.email;
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const email = this.form.getRawValue().email;

    try {
      await this.firebaseAuth.sendPasswordResetEmail(email);
      // Mensagem neutra que não confirma existência prévia da conta
      this.successMessage.set(
        'Se o e-mail informado estiver cadastrado em nossa base, enviamos um link com as instruções para redefinição da sua senha. Verifique sua caixa de entrada e pasta de lixo eletrônico.',
      );
    } catch (error) {
      this.errorMessage.set(mapFirebaseAuthErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
