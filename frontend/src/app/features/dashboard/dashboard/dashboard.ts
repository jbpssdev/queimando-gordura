import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, HlmButton, HlmCardImports],

  template: `
    <div class="min-h-dvh bg-background text-foreground flex flex-col">
      <a class="skip-link" href="#painel-content">Pular para o conteúdo do painel</a>

      <!-- Cabeçalho Autenticado -->
      <header class="border-b border-border bg-card/80 backdrop-blur-xs sticky top-0 z-30">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <div class="flex items-center gap-6">
            <a routerLink="/painel" class="flex items-center gap-2.5 font-bold text-foreground">
              <span
                aria-hidden="true"
                class="grid size-9 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-xs"
              >
                QG
              </span>
              <span class="tracking-tight text-base sm:text-lg">Queimando Gordura</span>
            </a>

            <!-- Navegação Interna -->
            <nav aria-label="Navegação do painel" class="hidden sm:flex items-center gap-4 text-sm font-medium">
              <a
                routerLink="/painel"
                class="rounded-md px-3 py-1.5 text-foreground bg-secondary font-semibold"
              >
                Início
              </a>
              <a
                routerLink="/avaliacao"
                class="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Avaliação
              </a>
              <a
                routerLink="/adaptacao"
                class="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Programa Adaptação
              </a>
            </nav>
          </div>

          <div class="flex items-center gap-3">
            <div class="hidden md:flex flex-col text-right">
              <span class="text-xs font-semibold text-foreground">{{ session.userDisplayName() }}</span>
              <span class="text-[11px] text-muted-foreground">{{ session.currentUser()?.email }}</span>
            </div>
            <button
              hlmBtn
              variant="outline"
              size="sm"
              type="button"
              (click)="onSignOut()"
              class="text-xs font-medium"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main id="painel-content" class="flex-1 mx-auto max-w-6xl w-full px-4 py-8 sm:px-8">
        <!-- Boas-vindas -->
        <section aria-labelledby="welcome-title" class="mb-8">
          <div class="rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-xs">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-wider text-primary">Painel de Acompanhamento</p>
                <h1 id="welcome-title" class="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                  Olá, {{ session.userDisplayName() }}!
                </h1>
                <p class="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">
                  Sua conta está ativa e verificada com sucesso. Os módulos de avaliação corporal e o plano de 30 dias de adaptação serão integrados nas próximas etapas de desenvolvimento.
                </p>
              </div>
              <div class="shrink-0">
                <span class="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  <span class="size-1.5 rounded-full bg-emerald-600" aria-hidden="true"></span>
                  E-mail verificado
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Cards de Módulos -->
        <section aria-label="Módulos da plataforma" class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <!-- Card Avaliação Inicial -->
          <div hlmCard class="flex flex-col justify-between p-6">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-border">
                <h2 class="text-base font-semibold text-foreground">Avaliação Inicial</h2>
                <span class="rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-800">
                  Pendente
                </span>
              </div>
              <p class="mt-4 text-sm leading-relaxed text-muted-foreground">
                Sua avaliação corporal com registro de medidas e hábitos está preparada para o próximo checkpoint de desenvolvimento.
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-border">
              <a routerLink="/avaliacao" hlmBtn variant="outline" class="w-full text-xs font-medium">
                Conhecer a Avaliação
              </a>
            </div>
          </div>

          <!-- Card Programa Adaptação -->
          <div hlmCard class="flex flex-col justify-between p-6">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-border">
                <h2 class="text-base font-semibold text-foreground">Programa Adaptação</h2>
                <span class="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  30 Dias
                </span>
              </div>
              <p class="mt-4 text-sm leading-relaxed text-muted-foreground">
                O programa estruturado de organização alimentar, movimentação e acompanhamento semanal será ativado após sua avaliação inicial.
              </p>
            </div>
            <div class="mt-6 pt-4 border-t border-border">
              <a routerLink="/adaptacao" hlmBtn variant="outline" class="w-full text-xs font-medium">
                Visualizar Estrutura
              </a>
            </div>
          </div>

          <!-- Card Status e Segurança do Usuário -->
          <div hlmCard class="flex flex-col justify-between p-6">
            <div>
              <div class="flex items-center justify-between pb-3 border-b border-border">
                <h2 class="text-base font-semibold text-foreground">Dados de Acesso</h2>
                <span class="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-medium text-emerald-800">
                  Seguro
                </span>
              </div>
              <div class="mt-4 space-y-2 text-xs text-muted-foreground">
                <p>
                  <strong class="text-foreground font-medium">Nome:</strong> {{ session.userDisplayName() }}
                </p>
                <p>
                  <strong class="text-foreground font-medium">E-mail:</strong> {{ session.currentUser()?.email }}
                </p>
                <p>
                  <strong class="text-foreground font-medium">Maioridade:</strong> 18+ (Autodeclarada)
                </p>
                <p>
                  <strong class="text-foreground font-medium">Status de autenticação:</strong> Sessão ativa via Firebase SDK
                </p>
              </div>
            </div>
            <div class="mt-6 pt-4 border-t border-border">
              <button
                hlmBtn
                variant="ghost"
                type="button"
                (click)="onSignOut()"
                class="w-full text-xs text-destructive hover:bg-destructive/10"
              >
                Encerrar sessão
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer class="border-t border-border bg-card py-6 text-xs text-muted-foreground">
        <div class="mx-auto max-w-6xl px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>Queimando Gordura 1.0 · Painel Seguro</span>
          <span>Sessão protegida por autenticação</span>
        </div>
      </footer>
    </div>
  `,
})
export class Dashboard {
  protected readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected async onSignOut(): Promise<void> {
    await this.session.signOut();
    await this.router.navigate(['/entrar']);
  }
}
