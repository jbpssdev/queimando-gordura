import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { mapFirebaseAuthErrorMessage } from '../../../core/auth/auth-error.util';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { FirebaseAuthService } from '../../../core/auth/firebase-auth.service';

@Component({
  selector: 'app-verify-email',
  imports: [HlmButton, HlmCardImports, HlmAlertImports],
  template: `

    <div class="min-h-dvh bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <a class="skip-link" href="#verify-card">Pular para as opções de verificação</a>

      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <div class="text-center">
          <div
            aria-hidden="true"
            class="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground shadow-xs"
          >
            <svg
              class="size-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              stroke-width="2"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Confirme seu endereço de e-mail
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Enviamos um link de confirmação para
            <span class="font-semibold text-foreground">{{ userEmail() }}</span
            >.
          </p>
        </div>

        <div id="verify-card" class="mt-8" hlmCard>
          <div hlmCardContent class="p-6 sm:p-8 space-y-6">
            <!-- Mensagem de feedback de reenvio -->
            @if (resendFeedback()) {
              <div
                hlmAlert
                class="border-emerald-300/60 bg-emerald-50 text-emerald-950"
                role="status"
              >
                <h4 hlmAlertTitle class="font-semibold">E-mail reenviado</h4>
                <p hlmAlertDescription class="text-xs mt-1">{{ resendFeedback() }}</p>
              </div>
            }

            <!-- Mensagem de erro -->
            @if (errorMessage()) {
              <div hlmAlert variant="destructive" role="alert">
                <h4 hlmAlertTitle class="font-semibold">Atenção</h4>
                <p hlmAlertDescription class="text-xs mt-1">{{ errorMessage() }}</p>
              </div>
            }

            <p class="text-sm leading-relaxed text-muted-foreground">
              Para garantir a segurança da sua conta e liberar o acesso às funcionalidades, clique
              no link de confirmação recebido em sua caixa de entrada.
            </p>

            <div class="space-y-3 pt-2">
              <button
                hlmBtn
                type="button"
                class="w-full font-semibold"
                [disabled]="isChecking()"
                (click)="checkVerificationStatus()"
              >
                {{ isChecking() ? 'Verificando status…' : 'Já confirmei meu e-mail' }}
              </button>

              <button
                hlmBtn
                variant="outline"
                type="button"
                class="w-full text-sm"
                [disabled]="isResending() || resendCooldown() > 0"
                (click)="resendVerificationEmail()"
              >
                @if (resendCooldown() > 0) {
                  Reenviar e-mail em {{ resendCooldown() }}s
                } @else if (isResending()) {
                  Enviando…
                } @else {
                  Reenviar e-mail de confirmação
                }
              </button>
            </div>

            <div
              class="pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground"
            >
              <span>Não é o seu e-mail?</span>
              <button
                type="button"
                (click)="onSignOut()"
                class="font-medium text-destructive hover:underline"
              >
                Sair da conta
              </button>
            </div>
          </div>
        </div>

        <p class="mt-6 text-center text-xs text-muted-foreground">
          Caso não encontre a mensagem, verifique a pasta de spam ou lixo eletrônico.
        </p>
      </div>
    </div>
  `,
})
export class VerifyEmail {
  private readonly firebaseAuth = inject(FirebaseAuthService);
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly isChecking = signal(false);
  protected readonly isResending = signal(false);
  protected readonly resendCooldown = signal(0);
  protected readonly resendFeedback = signal<string | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly userEmail = computed(
    () => this.session.currentUser()?.email ?? 'seu e-mail',
  );

  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
      }
    });
  }

  protected async checkVerificationStatus(): Promise<void> {
    if (this.isChecking()) {
      return;
    }

    this.isChecking.set(true);
    this.errorMessage.set(null);
    this.resendFeedback.set(null);

    try {
      const state = await this.session.refreshSession();
      const user = state.user;

      if (!user) {
        await this.router.navigate(['/entrar']);
        return;
      }

      if (user.emailVerified) {
        // E-mail confirmado com sucesso! Checa se o perfil existe
        const profile = state.profile;
        if (!profile || !profile.firstName || !profile.age18Confirmed) {
          await this.router.navigate(['/completar-perfil']);
        } else {
          await this.router.navigate(['/painel']);
        }
      } else {
        this.errorMessage.set(
          'Seu e-mail ainda não consta como confirmado. Se você acabou de clicar no link, aguarde alguns instantes e tente novamente.',
        );
      }
    } catch (error) {
      this.errorMessage.set(mapFirebaseAuthErrorMessage(error));
    } finally {
      this.isChecking.set(false);
    }
  }

  protected async resendVerificationEmail(): Promise<void> {
    if (this.isResending() || this.resendCooldown() > 0) {
      return;
    }

    this.isResending.set(true);
    this.errorMessage.set(null);
    this.resendFeedback.set(null);

    try {
      await this.firebaseAuth.sendEmailVerification();
      this.resendFeedback.set(
        'Um novo e-mail de confirmação foi enviado para sua caixa de entrada.',
      );
      this.startCooldown(30);
    } catch (error) {
      this.errorMessage.set(mapFirebaseAuthErrorMessage(error));
    } finally {
      this.isResending.set(false);
    }
  }

  protected async onSignOut(): Promise<void> {
    await this.session.signOut();
    await this.router.navigate(['/entrar']);
  }

  private startCooldown(seconds: number): void {
    this.resendCooldown.set(seconds);
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
    this.cooldownTimer = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        this.resendCooldown.set(0);
        if (this.cooldownTimer) {
          clearInterval(this.cooldownTimer);
        }
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }
}
