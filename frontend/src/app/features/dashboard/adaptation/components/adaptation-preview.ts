import { Component, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import type {
  AdaptationMode,
  AdaptationPreviewResponse,
} from '../../../../core/adaptation/adaptation.model';

@Component({
  selector: 'app-adaptation-preview',
  imports: [RouterLink, HlmCardImports, HlmButton, HlmAlertImports],
  template: `
    <div class="space-y-8">
      <!-- Se a avaliação inicial não estiver concluída -->
      @if (!hasValidAssessment()) {
        <div hlmCard class="p-6 sm:p-10 text-center space-y-4">
          <div class="inline-flex size-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-800 dark:text-amber-300 text-xl mx-auto">
            📋
          </div>
          <h2 class="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Avaliação Inicial Necessária
          </h2>
          <p class="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Para iniciar seus 30 dias de Adaptação, precisamos primeiro conhecer seus dados corporais, condições de saúde e hábitos cotidianos na Avaliação Inicial.
          </p>
          <div class="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <a routerLink="/avaliacao" hlmBtn variant="default" class="font-semibold">
              Realizar Avaliação Inicial →
            </a>
            <a routerLink="/painel" hlmBtn variant="outline">
              Voltar ao Painel
            </a>
          </div>
        </div>
      } @else {
        <!-- Cabeçalho de Seleção de Modalidade -->
        <div class="border-b border-border pb-6">
          <div class="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-3">
            Passo Obrigatório
          </div>
          <h1 class="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Escolha sua Modalidade de Adaptação
          </h1>
          <p class="text-sm text-muted-foreground mt-2 max-w-2xl leading-relaxed">
            O Programa Adaptação organiza sua alimentação e consistência ao longo de 30 dias consecutivos. O Queimando Gordura preza pela sua integridade e pela consolidação segura de novos hábitos.
          </p>
        </div>

        <!-- Feedback de Erro de Início se houver -->
        @if (startError()) {
          <div hlmAlert variant="destructive" class="border-destructive/40 bg-destructive/10 text-destructive p-4">
            <h4 hlmAlertTitle class="text-xs font-bold">Não foi possível iniciar o plano</h4>
            <p hlmAlertDescription class="text-xs mt-1">
              {{ startError() }}
            </p>
          </div>
        }

        <!-- Cards das Modalidades: Padrão vs Intensificada -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- 1. Modalidade Padrão -->
          @if (preview()?.modes?.standard; as standard) {
            <div
              hlmCard
              class="relative flex flex-col justify-between p-6 rounded-2xl transition-all border-2 cursor-pointer shadow-xs"
              [class.border-primary]="selectedMode() === 'standard' && standard.available"
              [class.bg-primary/5]="selectedMode() === 'standard' && standard.available"
              [class.border-border]="selectedMode() !== 'standard' || !standard.available"
              [class.opacity-60]="!standard.available"
              [class.cursor-not-allowed]="!standard.available"
              (click)="onSelectMode('standard', standard.available)"
              (keydown.enter)="onSelectMode('standard', standard.available)"
              (keydown.space)="onSelectMode('standard', standard.available)"
              tabindex="0"
              role="radio"
              [attr.aria-checked]="selectedMode() === 'standard'"
              [attr.aria-disabled]="!standard.available"
            >
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  <span class="text-xs font-bold tracking-wide uppercase text-primary">
                    Transição Gradual
                  </span>
                  @if (standard.recommended) {
                    <span class="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                      ★ Recomendada
                    </span>
                  }
                </div>

                <h2 class="text-lg font-bold text-foreground sm:text-xl">
                  {{ standard.title }}
                </h2>
                <p class="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {{ standard.description }}
                </p>

                <div class="mt-4 rounded-xl border border-border/60 bg-background/60 p-3.5 space-y-1.5 text-xs text-muted-foreground">
                  <div class="font-medium text-foreground">Características:</div>
                  <ul class="space-y-1 list-disc list-inside">
                    <li>30 dias consecutivos com foco em adesão diária.</li>
                    <li>Ajustes graduais e sem restrições severas.</li>
                    <li>Estratégia segura para consolidação sustentável.</li>
                  </ul>
                </div>
              </div>

              <div class="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <span class="text-xs font-semibold"
                  [class.text-primary]="selectedMode() === 'standard'"
                  [class.text-muted-foreground]="selectedMode() !== 'standard'"
                >
                  @if (selectedMode() === 'standard') {
                    ● Selecionada
                  } @else {
                    ○ Clique para selecionar
                  }
                </span>
                <span class="text-[11px] font-medium text-muted-foreground">
                  30 dias
                </span>
              </div>
            </div>
          }

          <!-- 2. Modalidade Intensificada -->
          @if (preview()?.modes?.intensified; as intensified) {
            <div
              hlmCard
              class="relative flex flex-col justify-between p-6 rounded-2xl transition-all border-2 shadow-xs"
              [class.border-primary]="selectedMode() === 'intensified' && intensified.available"
              [class.bg-primary/5]="selectedMode() === 'intensified' && intensified.available"
              [class.border-border]="selectedMode() !== 'intensified' || !intensified.available"
              [class.opacity-60]="!intensified.available"
              [class.cursor-not-allowed]="!intensified.available"
              [class.cursor-pointer]="intensified.available"
              (click)="onSelectMode('intensified', intensified.available)"
              (keydown.enter)="onSelectMode('intensified', intensified.available)"
              (keydown.space)="onSelectMode('intensified', intensified.available)"
              tabindex="0"
              role="radio"
              [attr.aria-checked]="selectedMode() === 'intensified'"
              [attr.aria-disabled]="!intensified.available"
            >
              <div>
                <div class="flex items-center justify-between gap-2 mb-3">
                  <span class="text-xs font-bold tracking-wide uppercase text-foreground">
                    Validação Adicional
                  </span>
                  @if (intensified.available && intensified.recommended) {
                    <span class="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                      ★ Recomendada
                    </span>
                  } @else if (!intensified.available) {
                    <span class="rounded-full bg-secondary border border-border px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                      Bloqueada por Segurança
                    </span>
                  }
                </div>

                <h2 class="text-lg font-bold text-foreground sm:text-xl">
                  {{ intensified.title }}
                </h2>
                <p class="text-xs text-muted-foreground mt-2 leading-relaxed">
                  {{ intensified.description }}
                </p>

                <!-- Motivos Reais de Indisponibilidade retornados pela API -->
                @if (!intensified.available && intensified.restrictionReasons && intensified.restrictionReasons.length > 0) {
                  <div class="mt-4 rounded-xl border border-destructive/20 bg-destructive/5 p-3.5 space-y-1.5 text-xs text-destructive">
                    <div class="font-semibold flex items-center gap-1.5">
                      Critérios de segurança da API:
                    </div>
                    <ul class="space-y-1 list-disc list-inside">
                      @for (reason of intensified.restrictionReasons; track reason) {
                        <li>{{ reason }}</li>
                      }
                    </ul>
                  </div>
                } @else {
                  <div class="mt-4 rounded-xl border border-border/60 bg-background/60 p-3.5 space-y-1.5 text-xs text-muted-foreground">
                    <div class="font-medium text-foreground">Critérios:</div>
                    <ul class="space-y-1 list-disc list-inside">
                      <li>Sujeita a critérios adicionais de validação clínica.</li>
                      <li>Para quem já possui rotina estruturada prévia.</li>
                      <li>Restrita para condições clínicas importantes ou obesidade grau III.</li>
                    </ul>
                  </div>
                }
              </div>

              <div class="mt-6 pt-4 border-t border-border flex items-center justify-between">
                @if (intensified.available) {
                  <span class="text-xs font-semibold"
                    [class.text-primary]="selectedMode() === 'intensified'"
                    [class.text-muted-foreground]="selectedMode() !== 'intensified'"
                  >
                    @if (selectedMode() === 'intensified') {
                      ● Selecionada
                    } @else {
                      ○ Clique para selecionar
                    }
                  </span>
                } @else {
                  <span class="text-xs font-semibold text-muted-foreground">
                    ✕ Indisponível para seu perfil
                  </span>
                }
                <span class="text-[11px] font-medium text-muted-foreground">
                  30 dias
                </span>
              </div>
            </div>
          }
        </div>

        <!-- Informação sobre Meta Calórica da API -->
        <div class="rounded-xl border border-border bg-muted/20 p-5 space-y-2">
          <h3 class="text-sm font-semibold text-foreground">
            Acompanhamento Energético e Nutricional
          </h3>
          @if (preview()?.calorieTargetKcal; as target) {
            <p class="text-xs text-muted-foreground leading-relaxed">
              Meta calórica oficial de referência informada pelo backend: <strong>{{ target }} kcal/dia</strong>.
            </p>
          } @else {
            <p class="text-xs text-muted-foreground leading-relaxed">
              {{ preview()?.calorieTargetExplanation || 'O acompanhamento temporal e a organização de hábitos estão ativos. Metas calóricas individuais específicas serão informadas com base nas diretrizes clínicas da API.' }}
            </p>
          }
          <div class="text-[11px] text-muted-foreground pt-1">
            ⚠️ O Queimando Gordura não incentiva restrição severa ou metas calóricas agressivas.
          </div>
        </div>

        <!-- Ação Principal: Botão para Iniciar Manualmente -->
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div class="text-xs text-muted-foreground">
            Modalidade escolhida: <strong class="text-foreground font-semibold">{{ selectedMode() === 'standard' ? 'Padrão' : 'Intensificada' }}</strong>
          </div>

          <button
            hlmBtn
            variant="default"
            size="lg"
            class="w-full sm:w-auto font-bold px-8 shadow-xs"
            [disabled]="isStarting() || !isCurrentModeAvailable()"
            (click)="openConfirmModal()"
          >
            @if (isStarting()) {
              Iniciando seus 30 dias...
            } @else {
              Iniciar meus 30 dias →
            }
          </button>
        </div>
      }

      <!-- Modal de Confirmação Explícita de Início -->
      @if (showConfirmModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title">
          <div hlmCard class="w-full max-w-lg p-6 sm:p-8 space-y-6 bg-card border-border shadow-lg animate-in fade-in-50 zoom-in-95">
            <div class="border-b border-border pb-3">
              <h3 id="confirm-modal-title" class="text-lg font-bold text-foreground">
                Confirmar Início da Adaptação de 30 Dias
              </h3>
              <p class="text-xs text-muted-foreground mt-1">
                Por favor, leia atentamente como funciona a contagem da sua jornada:
              </p>
            </div>

            <div class="rounded-xl border border-primary/20 bg-primary/5 p-4 text-xs space-y-2.5 text-foreground leading-relaxed">
              <div class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span><strong>Data local de hoje:</strong> O primeiro dia será registrado com a data local do seu navegador.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span><strong>Dias consecutivos:</strong> Os 30 dias correrão consecutivamente sem interrupções.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span><strong>Sem pausa por ausências:</strong> Faltas ocasionais não pausam o calendário da jornada.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span><strong>Sem dados não significa zero:</strong> Dias sem registros não significam zero calorias ou zero exercícios.</span>
              </div>
              <div class="flex items-start gap-2">
                <span class="text-primary font-bold">•</span>
                <span><strong>Sem reinício automático:</strong> O plano não reinicia sozinho; a jornada é vivida com honestidade e constância.</span>
              </div>
            </div>

            <div class="flex flex-col sm:flex-row justify-end gap-3 pt-2">
              <button
                hlmBtn
                variant="outline"
                type="button"
                [disabled]="isStarting()"
                (click)="closeConfirmModal()"
              >
                Voltar e Revisar
              </button>
              <button
                hlmBtn
                variant="default"
                type="button"
                class="font-semibold"
                [disabled]="isStarting()"
                (click)="onConfirmStart()"
              >
                @if (isStarting()) {
                  Registrando início...
                } @else {
                  Confirmar e Iniciar Meus 30 Dias
                }
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class AdaptationPreview {
  public readonly preview = input<AdaptationPreviewResponse | null>(null);
  public readonly selectedMode = input<AdaptationMode>('standard');
  public readonly isStarting = input<boolean>(false);
  public readonly startError = input<string | null>(null);

  public readonly modeSelected = output<AdaptationMode>();
  public readonly startConfirmed = output<void>();

  public readonly showConfirmModal = signal<boolean>(false);

  public hasValidAssessment(): boolean {
    const p = this.preview();
    return Boolean(p && p.hasAssessment && p.assessmentCompleted);
  }

  public isCurrentModeAvailable(): boolean {
    const p = this.preview();
    if (!p) return false;
    const mode = this.selectedMode();
    const opt = mode === 'standard' ? p.modes.standard : p.modes.intensified;
    return Boolean(opt && opt.available);
  }

  public onSelectMode(mode: AdaptationMode, available: boolean): void {
    if (available) {
      this.modeSelected.emit(mode);
    }
  }

  public openConfirmModal(): void {
    if (this.isCurrentModeAvailable() && !this.isStarting()) {
      this.showConfirmModal.set(true);
    }
  }

  public closeConfirmModal(): void {
    this.showConfirmModal.set(false);
  }

  public onConfirmStart(): void {
    this.showConfirmModal.set(false);
    this.startConfirmed.emit();
  }
}
