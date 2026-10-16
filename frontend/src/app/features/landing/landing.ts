import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmSeparator } from '@spartan-ng/helm/separator';

@Component({
  selector: 'app-landing',
  imports: [RouterLink, HlmButton, HlmCardImports, HlmSeparator],
  template: `
    <div class="min-h-dvh bg-background text-foreground flex flex-col">
      <a class="skip-link" href="#conteudo-principal">Pular para o conteúdo principal</a>

      <!-- Cabeçalho de Navegação -->
      <header class="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur-xs">
        <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
          <a routerLink="/" class="flex items-center gap-3 font-semibold text-foreground focus-visible:rounded-md">
            <span
              aria-hidden="true"
              class="grid size-10 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-xs"
            >
              QG
            </span>
            <span class="text-lg tracking-tight">
              Queimando Gordura <span class="text-sm font-normal text-muted-foreground">1.0</span>
            </span>
          </a>

          <!-- Navegação Desktop -->
          <nav aria-label="Navegação principal" class="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#como-funciona" class="text-muted-foreground hover:text-foreground transition-colors">
              Como funciona
            </a>
            <a href="#programa-adaptacao" class="text-muted-foreground hover:text-foreground transition-colors">
              Programa Adaptação
            </a>
          </nav>

          <!-- Ações Desktop e Mobile -->
          <div class="flex items-center gap-2 sm:gap-3">
            <a routerLink="/entrar" hlmBtn variant="ghost" class="text-sm">
              Entrar
            </a>
            <a routerLink="/entrar" hlmBtn variant="default" class="text-sm font-semibold">
              Começar agora!
            </a>
          </div>
        </div>
      </header>

      <main id="conteudo-principal" class="flex-1">
        <!-- Hero Section -->
        <section aria-labelledby="hero-title" class="border-b border-border/40 bg-radial from-secondary/40 via-background to-background py-16 sm:py-24">
          <div class="mx-auto max-w-6xl px-4 sm:px-8">
            <div class="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <div class="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-primary">
                  <span class="size-1.5 rounded-full bg-primary" aria-hidden="true"></span>
                  Programa consciente de 30 dias
                </div>
                <h1
                  id="hero-title"
                  class="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl sm:leading-tight text-foreground"
                >
                  Acompanhe sua evolução.<br />Entenda seus hábitos.
                </h1>
                <p class="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                  Organize sua alimentação, acompanhe seu peso e visualize sua evolução com um plano de adaptação de 30 dias.
                </p>

                <div class="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <a routerLink="/entrar" hlmBtn variant="default" size="lg" class="text-base px-6 font-semibold shadow-xs">
                    Começar agora!
                  </a>
                  <a routerLink="/cadastrar" hlmBtn variant="outline" size="lg" class="text-base px-6">
                    Criar nova conta
                  </a>
                </div>

                <p class="mt-6 text-xs leading-relaxed text-muted-foreground">
                  Acompanhamento voltado para adultos (18+). As informações e registros têm caráter educativo e de organização pessoal, não substituindo orientação profissional médica ou nutricional.
                </p>
              </div>

              <!-- Cartão Representativo da Estrutura -->
              <div hlmCard class="border-border/80 bg-card/80 shadow-xs p-6 sm:p-8">
                <div class="flex items-center justify-between pb-4 border-b border-border">
                  <div>
                    <p class="text-xs font-semibold uppercase tracking-wider text-primary">Adaptação Inicial</p>
                    <h2 class="text-lg font-bold text-foreground">Ciclo Estruturado de 30 Dias</h2>
                  </div>
                  <span class="rounded-md bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                    Passo a passo
                  </span>
                </div>
                <div class="mt-6 space-y-4 text-sm">
                  <div class="flex items-start gap-3">
                    <span class="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">1</span>
                    <div>
                      <p class="font-medium text-foreground">Avaliação inicial orientada</p>
                      <p class="text-xs text-muted-foreground">Medidas antropométricas e ponto de partida real.</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-3">
                    <span class="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">2</span>
                    <div>
                      <p class="font-medium text-foreground">Acompanhamento alimentar diário</p>
                      <p class="text-xs text-muted-foreground">Organização simples de refeições e hidratação.</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-3">
                    <span class="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">3</span>
                    <div>
                      <p class="font-medium text-foreground">Estímulo a atividades regulares</p>
                      <p class="text-xs text-muted-foreground">Construção gradual de consistência no seu ritmo.</p>
                    </div>
                  </div>
                  <div class="flex items-start gap-3">
                    <span class="grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">4</span>
                    <div>
                      <p class="font-medium text-foreground">Registro semanal de medidas</p>
                      <p class="text-xs text-muted-foreground">Tendência clara sem a ansiedade da balança diária.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Seção Como Funciona -->
        <section id="como-funciona" aria-labelledby="como-funciona-title" class="py-16 sm:py-24">
          <div class="mx-auto max-w-6xl px-4 sm:px-8">
            <div class="max-w-2xl">
              <p class="text-xs font-semibold uppercase tracking-wider text-primary">Método estruturado</p>
              <h2 id="como-funciona-title" class="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Como funciona a sua jornada
              </h2>
              <p class="mt-4 text-base leading-relaxed text-muted-foreground">
                Um processo gradual em quatro etapas desenhado para transformar intenções em hábitos consolidados.
              </p>
            </div>

            <div class="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <div hlmCard class="flex flex-col justify-between p-6">
                <div>
                  <span class="inline-flex size-9 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-secondary-foreground">
                    01
                  </span>
                  <h3 class="mt-4 text-base font-semibold text-foreground">Crie sua conta</h3>
                  <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Acesso seguro por e-mail ou Google para proteger suas informações de perfil e histórico.
                  </p>
                </div>
                <p class="mt-6 text-xs text-muted-foreground">Cadastro rápido e seguro</p>
              </div>

              <div hlmCard class="flex flex-col justify-between p-6">
                <div>
                  <span class="inline-flex size-9 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-secondary-foreground">
                    02
                  </span>
                  <h3 class="mt-4 text-base font-semibold text-foreground">Faça sua avaliação inicial</h3>
                  <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Defina sua base corporal e rotina para calibrar os parâmetros de acompanhamento futuros.
                  </p>
                </div>
                <p class="mt-6 text-xs text-muted-foreground">Parâmetros personalizados</p>
              </div>

              <div hlmCard class="flex flex-col justify-between p-6">
                <div>
                  <span class="inline-flex size-9 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-secondary-foreground">
                    03
                  </span>
                  <h3 class="mt-4 text-base font-semibold text-foreground">Inicie o programa Adaptação</h3>
                  <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Um período de 30 dias voltado à consistência alimentar e de movimentação, sem radicalismos.
                  </p>
                </div>
                <p class="mt-6 text-xs text-muted-foreground">Foco em sustentabilidade</p>
              </div>

              <div hlmCard class="flex flex-col justify-between p-6">
                <div>
                  <span class="inline-flex size-9 items-center justify-center rounded-lg bg-secondary text-sm font-bold text-secondary-foreground">
                    04
                  </span>
                  <h3 class="mt-4 text-base font-semibold text-foreground">Registre e acompanhe</h3>
                  <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Monitore sua evolução através de registros regulares para entender as respostas do seu corpo.
                  </p>
                </div>
                <p class="mt-6 text-xs text-muted-foreground">Visão clara da evolução</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Seção Programa Adaptação -->
        <section id="programa-adaptacao" aria-labelledby="programa-title" class="border-t border-border/40 bg-card/40 py-16 sm:py-24">
          <div class="mx-auto max-w-6xl px-4 sm:px-8">
            <div class="max-w-2xl">
              <p class="text-xs font-semibold uppercase tracking-wider text-primary">Plano de 30 dias</p>
              <h2 id="programa-title" class="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                O Programa Adaptação
              </h2>
              <p class="mt-4 text-base leading-relaxed text-muted-foreground">
                Criado para estabelecer uma base sólida de rotina, o programa integra avaliação, rotina alimentar e monitoramento constante.
              </p>
            </div>

            <div class="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <div class="rounded-xl border border-border bg-card p-6 shadow-xs">
                <h3 class="text-base font-semibold text-foreground">Duração de 30 dias</h3>
                <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Ciclo dimensionado para superar a fase inicial de adaptação e consolidar padrões repetíveis.
                </p>
              </div>

              <div class="rounded-xl border border-border bg-card p-6 shadow-xs">
                <h3 class="text-base font-semibold text-foreground">Avaliação inicial</h3>
                <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Diagnóstico consciente das medidas e da rotina atual para guiar suas metas de forma segura.
                </p>
              </div>

              <div class="rounded-xl border border-border bg-card p-6 shadow-xs">
                <h3 class="text-base font-semibold text-foreground">Acompanhamento alimentar</h3>
                <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Registro de refeições e hábitos para conscientização do consumo diário e equilíbrio de nutrientes.
                </p>
              </div>

              <div class="rounded-xl border border-border bg-card p-6 shadow-xs">
                <h3 class="text-base font-semibold text-foreground">Atividades físicas</h3>
                <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Estímulo à prática regular de exercícios físicos adequados ao seu condicionamento e rotina.
                </p>
              </div>

              <div class="rounded-xl border border-border bg-card p-6 shadow-xs">
                <h3 class="text-base font-semibold text-foreground">Registro semanal de peso</h3>
                <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Pesagens em intervalos estratégicos para avaliar tendências consistentes e evitar ruídos diários.
                </p>
              </div>

              <div class="rounded-xl border border-border bg-card p-6 shadow-xs">
                <h3 class="text-base font-semibold text-foreground">Visualização de evolução</h3>
                <p class="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Informações organizadas para você compreender os avanços reais e realizar ajustes com confiança.
                </p>
              </div>
            </div>
          </div>
        </section>

        <!-- Chamada Final para Ação -->
        <section aria-labelledby="cta-title" class="py-16 sm:py-20 border-t border-border">
          <div class="mx-auto max-w-4xl px-4 text-center sm:px-8">
            <h2 id="cta-title" class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Pronto para construir hábitos consistentes?
            </h2>
            <p class="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Cadastre-se gratuitamente para iniciar seu processo de acompanhamento e começar sua adaptação.
            </p>
            <div class="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a routerLink="/entrar" hlmBtn variant="default" size="lg" class="w-full sm:w-auto px-8 font-semibold">
                Começar agora!
              </a>
              <a routerLink="/cadastrar" hlmBtn variant="outline" size="lg" class="w-full sm:w-auto px-8">
                Criar conta gratuita
              </a>
            </div>
          </div>
        </section>
      </main>

      <!-- Rodapé -->
      <footer class="border-t border-border bg-card py-12 text-sm text-muted-foreground">
        <div class="mx-auto max-w-6xl px-4 sm:px-8">
          <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <p class="font-semibold text-foreground">Queimando Gordura 1.0</p>
              <p class="mt-1 text-xs text-muted-foreground">
                Plataforma de acompanhamento e conscientização de hábitos de saúde.
              </p>
            </div>
            <nav aria-label="Links do rodapé" class="flex flex-wrap gap-6 text-xs">
              <a href="#como-funciona" class="hover:text-foreground transition-colors">Como funciona</a>
              <a href="#programa-adaptacao" class="hover:text-foreground transition-colors">Programa Adaptação</a>
              <a routerLink="/entrar" class="hover:text-foreground transition-colors">Entrar</a>
              <a routerLink="/cadastrar" class="hover:text-foreground transition-colors">Cadastrar</a>
            </nav>
          </div>
          <div hlmSeparator class="my-6"></div>
          <p class="text-xs leading-relaxed text-muted-foreground">
            Aviso educativo: O Queimando Gordura 1.0 é uma ferramenta de acompanhamento e auto-organização. Os conteúdos e dados apresentados não substituem orientações, consultas, diagnósticos ou prescrições médicas e nutricionais especializadas.
          </p>
          <p class="mt-4 text-xs text-muted-foreground">
            &copy; 2026 Queimando Gordura 1.0. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  `,
})
export class Landing {}
