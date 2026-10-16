import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSeparator } from '@spartan-ng/helm/separator';
import { AuthSessionService } from '../../core/auth/auth-session.service';

@Component({
  selector: 'app-my-account',
  imports: [DatePipe, RouterLink, HlmButton, HlmCardImports, HlmSeparator],
  template: `
    <div class="min-h-dvh bg-background text-foreground flex flex-col">
      <a class="skip-link" href="#account-content">Pular para o conteúdo de Minha Conta</a>

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
            <nav
              aria-label="Navegação do painel"
              class="hidden sm:flex items-center gap-4 text-sm font-medium"
            >
              <a
                routerLink="/painel"
                class="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Início
              </a>
              <a
                routerLink="/minha-conta"
                class="rounded-md px-3 py-1.5 text-foreground bg-secondary font-semibold"
              >
                Minha conta
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
              <span class="text-xs font-semibold text-foreground">{{
                session.userDisplayName()
              }}</span>
              <span class="text-[11px] text-muted-foreground">{{
                session.currentUser()?.email
              }}</span>
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

      <main id="account-content" class="flex-1 mx-auto max-w-3xl w-full px-4 py-8 sm:px-8">
        <div class="mb-6">
          <p class="text-xs font-semibold uppercase tracking-wider text-primary">
            Perfil do Usuário
          </p>
          <h1 class="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Minha Conta
          </h1>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed">
            Consulte os dados cadastrais da sua conta obtidos diretamente da API oficial do
            Queimando Gordura 1.0.
          </p>
        </div>

        <div hlmCard class="p-6 sm:p-8">
          <div hlmCardHeader class="pb-4 border-b border-border">
            <h2 hlmCardTitle class="text-lg font-bold text-foreground">
              Dados Cadastrais
            </h2>
            <p hlmCardDescription class="text-xs text-muted-foreground">
              Informações do perfil autenticado pelo Firebase e persistidas no servidor.
            </p>
          </div>

          <div hlmCardContent class="py-6 space-y-6">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
              <div>
                <span class="block text-xs font-medium text-muted-foreground">Nome</span>
                <span class="mt-1 block text-base font-semibold text-foreground">
                  {{ session.currentProfile()?.firstName ?? 'Não informado' }}
                </span>
              </div>

              <div>
                <span class="block text-xs font-medium text-muted-foreground">Sobrenome</span>
                <span class="mt-1 block text-base font-semibold text-foreground">
                  {{ session.currentProfile()?.lastName ?? 'Não informado' }}
                </span>
              </div>

              <div>
                <span class="block text-xs font-medium text-muted-foreground">Endereço de e-mail</span>
                <span class="mt-1 block text-sm font-semibold text-foreground">
                  {{ session.currentProfile()?.email ?? session.currentUser()?.email ?? 'Não informado' }}
                </span>
              </div>

              <div>
                <span class="block text-xs font-medium text-muted-foreground">Status do e-mail</span>
                <div class="mt-1.5">
                  @if (session.currentProfile()?.emailVerified ?? session.currentUser()?.emailVerified) {
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800"
                    >
                      <span class="size-1.5 rounded-full bg-emerald-600" aria-hidden="true"></span>
                      Confirmado
                    </span>
                  } @else {
                    <span
                      class="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800"
                    >
                      <span class="size-1.5 rounded-full bg-amber-600" aria-hidden="true"></span>
                      Pendente
                    </span>
                  }
                </div>
              </div>

              <div>
                <span class="block text-xs font-medium text-muted-foreground">Autodeclaração de maioridade</span>
                <span class="mt-1 block text-sm font-medium text-foreground">
                  {{ session.currentProfile()?.age18Confirmed ? '18 anos ou mais (Confirmada)' : 'Pendente' }}
                </span>
              </div>

              <div>
                <span class="block text-xs font-medium text-muted-foreground">Data de cadastro</span>
                <span class="mt-1 block text-sm font-medium text-foreground">
                  {{ (session.currentProfile()?.createdAt | date: 'dd/MM/yyyy, HH:mm') ?? 'Não disponível' }}
                </span>
              </div>
            </div>

            <div hlmSeparator class="my-4"></div>

            <div class="rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground leading-relaxed">
              <strong class="text-foreground font-semibold">Privacidade e Segurança:</strong>
              Identificadores técnicos de infraestrutura e tokens de autorização não são expostos. A edição de dados e exclusão de conta serão disponibilizadas em etapas futuras conforme os contratos de domínio do backend.
            </div>
          </div>

          <div hlmCardFooter class="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <a routerLink="/painel" hlmBtn variant="default" class="w-full sm:w-auto font-semibold">
              Voltar ao Painel
            </a>
            <button
              hlmBtn
              variant="outline"
              type="button"
              (click)="onSignOut()"
              class="w-full sm:w-auto text-xs text-destructive hover:bg-destructive/10"
            >
              Encerrar sessão
            </button>
          </div>
        </div>
      </main>

      <footer class="border-t border-border bg-card py-6 text-xs text-muted-foreground">
        <div
          class="mx-auto max-w-6xl px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <span>Queimando Gordura 1.0 · Minha Conta</span>
          <span>Sessão protegida por autenticação</span>
        </div>
      </footer>
    </div>
  `,
})
export class MyAccount {
  protected readonly session = inject(AuthSessionService);
  private readonly router = inject(Router);

  protected async onSignOut(): Promise<void> {
    await this.session.signOut();
    await this.router.navigate(['/entrar']);
  }
}
