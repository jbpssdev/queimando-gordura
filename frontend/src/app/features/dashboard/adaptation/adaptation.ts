import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { AdaptationStateService } from '../../../core/adaptation/adaptation-state.service';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { AdaptationPreview } from './components/adaptation-preview';
import { AdaptationJourney } from './components/adaptation-journey';

@Component({
  selector: 'app-adaptation',
  imports: [
    RouterLink,
    HlmButton,
    HlmCardImports,
    HlmAlertImports,
    AdaptationPreview,
    AdaptationJourney,
  ],
  template: `
    <div class="min-h-dvh bg-background text-foreground flex flex-col">
      <a class="skip-link" href="#adaptation-content">Pular para o conteúdo da adaptação</a>

      <!-- Header da Página -->
      <header class="border-b border-border bg-card/80 backdrop-blur-xs sticky top-0 z-30">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-8">
          <div class="flex items-center gap-3">
            <a routerLink="/painel" class="flex items-center gap-2.5 font-bold text-foreground">
              <span
                aria-hidden="true"
                class="grid size-9 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-xs"
              >
                QG
              </span>
              <span class="tracking-tight text-base sm:text-lg">Queimando Gordura</span>
            </a>
            <span class="hidden sm:inline-block text-xs font-medium text-muted-foreground border-l border-border pl-3">
              Programa Adaptação (30 Dias)
            </span>
          </div>

          <div class="flex items-center gap-3">
            <a routerLink="/painel" hlmBtn variant="outline" size="sm" class="text-xs">
              Painel
            </a>
          </div>
        </div>
      </header>

      <main id="adaptation-content" class="flex-1 mx-auto max-w-4xl w-full px-4 py-8 sm:px-8">
        <!-- Estado de Carregamento -->
        @if (state.loadStatus() === 'loading') {
          <div class="rounded-xl border border-border bg-card p-12 text-center space-y-3">
            <div class="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            <p class="text-sm text-muted-foreground">Consultando seu Programa Adaptação...</p>
          </div>
        } @else if (state.loadStatus() === 'error') {
          <!-- Falha de Conexão com a API -->
          <div hlmCard class="p-8 text-center space-y-4">
            <h2 class="text-lg font-bold text-foreground">Falha de Conexão com o Servidor</h2>
            <p class="text-xs text-muted-foreground max-w-md mx-auto">
              {{ state.loadError() }}
            </p>
            <div class="pt-2 flex justify-center gap-3">
              <button hlmBtn variant="default" (click)="retryLoad()">
                Tentar novamente
              </button>
              <a routerLink="/painel" hlmBtn variant="outline">
                Voltar ao Painel
              </a>
            </div>
          </div>
        } @else if (state.hasActivePlan()) {
          <!-- Jornada em Andamento ou Concluída -->
          <app-adaptation-journey
            [plan]="state.plan()"
            [days]="state.timelineDays()"
          />
        } @else {
          <!-- Seleção de Modalidade e Prévia antes de Iniciar -->
          <app-adaptation-preview
            [preview]="state.preview()"
            [selectedMode]="state.selectedMode()"
            [isStarting]="state.isStarting()"
            [startError]="state.startError()"
            (modeSelected)="state.selectMode($event)"
            (startConfirmed)="onStartPlan()"
          />
        }
      </main>
    </div>
  `,
})
export class Adaptation implements OnInit {
  protected readonly session = inject(AuthSessionService);
  protected readonly state = inject(AdaptationStateService);

  public ngOnInit(): void {
    this.state.loadState().subscribe({
      error: () => {
        // Erro gerenciado reativamente pelo state
      },
    });
  }

  public retryLoad(): void {
    this.state.loadState().subscribe();
  }

  public onStartPlan(): void {
    this.state.startPlan().subscribe();
  }
}
