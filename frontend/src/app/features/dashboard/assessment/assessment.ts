import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { AuthSessionService } from '../../../core/auth/auth-session.service';

@Component({
  selector: 'app-assessment',
  imports: [RouterLink, HlmButton, HlmCardImports],
  template: `
    <div class="min-h-dvh bg-background text-foreground flex flex-col">
      <a class="skip-link" href="#assessment-content">Pular para o conteúdo da avaliação</a>

      <header class="border-b border-border bg-card/80 backdrop-blur-xs sticky top-0 z-30">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-8">
          <a routerLink="/painel" class="flex items-center gap-2.5 font-bold text-foreground">
            <span
              aria-hidden="true"
              class="grid size-9 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground shadow-xs"
            >
              QG
            </span>
            <span class="tracking-tight text-base sm:text-lg">Queimando Gordura</span>
          </a>

          <a routerLink="/painel" hlmBtn variant="outline" size="sm" class="text-xs">
            Voltar ao Painel
          </a>
        </div>
      </header>

      <main id="assessment-content" class="flex-1 mx-auto max-w-4xl w-full px-4 py-12 sm:px-8">
        <div hlmCard class="p-6 sm:p-10">
          <div
            class="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-secondary-foreground mb-4"
          >
            Módulo em preparação técnica
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Avaliação Inicial do Usuário
          </h1>
          <p class="mt-4 text-base leading-relaxed text-muted-foreground">
            A etapa de avaliação corporal e mapeamento de hábitos será desenvolvida no próximo
            checkpoint do Queimando Gordura 1.0.
          </p>

          <div class="mt-8 rounded-xl border border-border bg-muted/40 p-6 space-y-4">
            <h2 class="text-sm font-semibold text-foreground">O que contemplará este módulo:</h2>
            <ul class="space-y-2 text-sm text-muted-foreground list-disc list-inside">
              <li>Registro de data de nascimento para cálculo de faixa etária segura</li>
              <li>Medidas de peso, altura e circunferências corporais</li>
              <li>Mapeamento da rotina de atividade física e padrão alimentar atual</li>
              <li>
                Cálculo de taxa metabólica basal e necessidades energéticas com implementação de
                referência no backend
              </li>
            </ul>
          </div>

          <div class="mt-8 flex flex-col sm:flex-row gap-3">
            <a routerLink="/painel" hlmBtn variant="default" class="font-semibold">
              Retornar ao Painel
            </a>
            <a routerLink="/adaptacao" hlmBtn variant="outline"> Ver Programa Adaptação </a>
          </div>
        </div>
      </main>
    </div>
  `,
})
export class Assessment {
  protected readonly session = inject(AuthSessionService);
}
