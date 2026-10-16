import { Component, inject, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

@Component({
  selector: 'app-complete-profile',
  imports: [
    ReactiveFormsModule,
    HlmButton,
    HlmInput,
    HlmLabel,
    HlmCardImports,
    HlmAlertImports,
  ],
  template: `
    <div class="min-h-dvh bg-background flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <a class="skip-link" href="#profile-form">Pular para o formulário de conclusão de perfil</a>

      <div class="sm:mx-auto sm:w-full sm:max-w-md">
        <div class="text-center">
          <div
            aria-hidden="true"
            class="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-secondary-foreground shadow-xs font-bold text-lg"
          >
            QG
          </div>
          <h1 class="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Complete seu perfil
          </h1>
          <p class="mt-2 text-sm text-muted-foreground">
            Para personalizar seu acompanhamento, confirme seu nome e a declaração de maioridade.
          </p>
        </div>

        <div class="mt-8" hlmCard>
          <div hlmCardContent class="p-6 sm:p-8">
            @if (errorMessage()) {
              <div hlmAlert variant="destructive" class="mb-6" role="alert">
                <h4 hlmAlertTitle class="font-semibold">Atenção</h4>
                <p hlmAlertDescription class="text-xs mt-1">{{ errorMessage() }}</p>
              </div>
            }

            <form id="profile-form" [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
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
                    formControlName="firstName"
                    [attr.aria-invalid]="firstNameControl.invalid && (firstNameControl.dirty || firstNameControl.touched)"
                    aria-describedby="first-name-error"
                    class="w-full"
                  />
                  @if (firstNameControl.invalid && (firstNameControl.dirty || firstNameControl.touched)) {
                    <p id="first-name-error" class="mt-1 text-xs text-destructive">
                      Informe o seu nome.
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
                    formControlName="lastName"
                    [attr.aria-invalid]="lastNameControl.invalid && (lastNameControl.dirty || lastNameControl.touched)"
                    aria-describedby="last-name-error"
                    class="w-full"
                  />
                  @if (lastNameControl.invalid && (lastNameControl.dirty || lastNameControl.touched)) {
                    <p id="last-name-error" class="mt-1 text-xs text-destructive">
                      Informe o seu sobrenome.
                    </p>
                  }
                </div>
              </div>

              <!-- Autodeclaração de Maioridade -->
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
                    <label hlmLabel for="age18Confirmed" class="text-sm font-medium text-foreground cursor-pointer">
                      Declaro sob minha responsabilidade que tenho 18 anos ou mais.
                    </label>
                    <p id="age-description" class="text-xs text-muted-foreground mt-0.5">
                      A plataforma é destinada exclusivamente a adultos. Sua data de nascimento será solicitada na avaliação corporal.
                    </p>
                    @if (age18Control.invalid && (age18Control.dirty || age18Control.touched)) {
                      <p class="mt-1 text-xs text-destructive">
                        É obrigatório confirmar a declaração de maioridade.
                      </p>
                    }
                  </div>
                </div>
              </div>

              <div class="pt-4 space-y-3">
                <button
                  hlmBtn
                  type="submit"
                  class="w-full font-semibold"
                  [disabled]="isSubmitting() || form.invalid"
                >
                  {{ isSubmitting() ? 'Salvando dados…' : 'Salvar e acessar o painel' }}
                </button>

                <button
                  type="button"
                  (click)="onSignOut()"
                  class="w-full text-center text-xs text-muted-foreground hover:text-destructive"
                >
                  Sair desta conta
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class CompleteProfile implements OnInit {
  private readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup({
    firstName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    lastName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    age18Confirmed: new FormControl(false, {
      nonNullable: true,
      validators: [Validators.requiredTrue],
    }),
  });

  protected get firstNameControl() {
    return this.form.controls.firstName;
  }
  protected get lastNameControl() {
    return this.form.controls.lastName;
  }
  protected get age18Control() {
    return this.form.controls.age18Confirmed;
  }

  public ngOnInit(): void {
    const user = this.session.currentUser();
    if (user?.displayName) {
      const parts = user.displayName.trim().split(/\s+/);
      const firstName = parts[0] ?? '';
      const lastName = parts.slice(1).join(' ') ?? '';
      this.form.patchValue({
        firstName,
        lastName,
      });
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { firstName, lastName, age18Confirmed } = this.form.getRawValue();

    try {
      await this.session.saveProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        age18Confirmed,
      });

      await this.router.navigate(['/painel']);
    } catch {
      this.errorMessage.set(
        'Não foi possível salvar o seu perfil no momento. Verifique a conexão com a API e tente novamente.',
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected async onSignOut(): Promise<void> {
    await this.session.signOut();
    await this.router.navigate(['/entrar']);
  }
}
