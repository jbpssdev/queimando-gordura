import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HealthService } from '../../core/health.service';

@Component({
  selector: 'app-foundation',
  imports: [HlmButton, HlmCardImports],
  template: `
    <div class="min-h-dvh bg-background text-foreground">
      <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
      <header class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-6 sm:px-10">
        <span class="flex items-center gap-3 font-semibold">
          <span
            aria-hidden="true"
            class="grid size-10 place-items-center rounded-xl bg-primary text-sm text-primary-foreground"
            >QG</span
          >
          <span>Queimando Gordura <span class="text-muted-foreground">1.0</span></span>
        </span>
        <span class="hidden text-sm text-muted-foreground sm:inline">Checkpoint 0</span>
      </header>
      <main
        id="conteudo"
        class="mx-auto grid max-w-5xl gap-10 px-6 py-12 sm:px-10 sm:py-20 md:grid-cols-[1.2fr_1fr] md:items-center"
      >
        <section aria-labelledby="titulo">
          <p class="mb-5 text-sm font-semibold tracking-widest text-primary uppercase">
            Fundação técnica
          </p>
          <h1 id="titulo" class="text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">
            Um começo simples.<br />Uma base sólida.
          </h1>
          <p class="mt-6 max-w-md text-base leading-relaxed text-muted-foreground">
            Queimando Gordura 1.0. Ambiente inicial de desenvolvimento, preparado para os próximos
            passos.
          </p>
          <p class="mt-4 text-sm text-muted-foreground">
            Esta página verifica a instalação. As funcionalidades do produto serão construídas nos
            próximos checkpoints.
          </p>
        </section>
        <section hlmCard aria-labelledby="verificacao" class="gap-5 shadow-none">
          <div hlmCardHeader>
            <h2 hlmCardTitle id="verificacao">Verificação do ambiente</h2>
            <p hlmCardDescription>Angular, Tailwind CSS e componentes Spartan UI.</p>
          </div>
          <div hlmCardContent>
            <p class="text-sm leading-relaxed text-muted-foreground">
              O botão abaixo consulta o endpoint de saúde da API local.
            </p>
            <p role="status" aria-live="polite" class="mt-4 min-h-12 text-sm font-medium">
              {{ status() }}
            </p>
          </div>
          <div hlmCardFooter>
            <button
              hlmBtn
              type="button"
              class="w-full sm:w-auto"
              [disabled]="checking()"
              (click)="checkApi()"
            >
              {{ checking() ? 'Verificando…' : 'Verificar API' }}
            </button>
          </div>
        </section>
      </main>
      <footer class="mx-auto max-w-5xl px-6 py-8 text-xs text-muted-foreground sm:px-10">
        Desenvolvimento local · Firebase desativado por padrão
      </footer>
    </div>
  `,
})
export class Foundation {
  private readonly health = inject(HealthService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly checking = signal(false);
  protected readonly status = signal('API ainda não verificada.');

  protected checkApi(): void {
    if (this.checking()) return;
    this.checking.set(true);
    this.status.set('Consultando a API…');
    this.health
      .check()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.checking.set(false)),
      )
      .subscribe({
        next: (response) =>
          this.status.set(
            response.status === 'ok' ? 'API em funcionamento.' : 'Resposta inesperada da API.',
          ),
        error: () => this.status.set('API indisponível. Verifique o backend local.'),
      });
  }
}
