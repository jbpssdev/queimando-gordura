import { Component, computed, input } from '@angular/core';
import { HlmCardImports } from '@spartan-ng/helm/card';
import type { PendingAssessmentItem } from '../../../../core/assessment/assessment.model';

@Component({
  selector: 'app-assessment-pending',
  imports: [HlmCardImports],
  template: `
    <div hlmCard class="border-border/80 bg-card p-5 sm:p-6 shadow-xs">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h3 class="text-base font-semibold text-foreground">
            Acompanhamento de Informações
          </h3>
          <p class="text-xs text-muted-foreground mt-0.5">
            Você pode concluir sua avaliação mesmo sem conhecer todas as medidas opcionais.
          </p>
        </div>
      </div>

      @if (pendingItems().length === 0) {
        <div class="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-800 dark:text-emerald-300">
          <span class="text-lg">✓</span>
          <p class="text-xs font-medium leading-relaxed">
            Excelente! Todas as informações essenciais, importantes e complementares foram preenchidas.
          </p>
        </div>
      } @else {
        <div class="space-y-4">
          <!-- 1. Essenciais -->
          @if (essentialItems().length > 0) {
            <div class="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                  Essenciais ({{ essentialItems().length }})
                </span>
                <span class="text-xs text-muted-foreground">
                  Impedem cálculos matemáticos ou metabólicos de referência.
                </span>
              </div>
              <ul class="space-y-1.5 text-xs text-foreground">
                @for (item of essentialItems(); track item.key) {
                  <li class="flex items-start gap-2">
                    <span class="text-amber-600 font-bold">•</span>
                    <div>
                      <strong class="font-semibold">{{ item.label }}:</strong>
                      <span class="text-muted-foreground ml-1">{{ item.message }}</span>
                    </div>
                  </li>
                }
              </ul>
            </div>
          }

          <!-- 2. Importantes -->
          @if (importantItems().length > 0) {
            <div class="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="inline-flex items-center rounded-full bg-blue-500/20 px-2 py-0.5 text-[11px] font-semibold text-blue-900 dark:text-blue-200">
                  Importantes ({{ importantItems().length }})
                </span>
                <span class="text-xs text-muted-foreground">
                  Ajudam a contextualizar seus resultados e rotina.
                </span>
              </div>
              <ul class="space-y-1.5 text-xs text-foreground">
                @for (item of importantItems(); track item.key) {
                  <li class="flex items-start gap-2">
                    <span class="text-blue-600 font-bold">•</span>
                    <div>
                      <strong class="font-semibold">{{ item.label }}:</strong>
                      <span class="text-muted-foreground ml-1">{{ item.message }}</span>
                    </div>
                  </li>
                }
              </ul>
            </div>
          }

          <!-- 3. Opcionais -->
          @if (optionalItems().length > 0) {
            <div class="rounded-lg border border-border bg-muted/30 p-4">
              <div class="flex items-center gap-2 mb-2">
                <span class="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
                  Opcionais ({{ optionalItems().length }})
                </span>
                <span class="text-xs text-muted-foreground">
                  Fornecem acompanhamento complementar futuro.
                </span>
              </div>
              <ul class="space-y-1.5 text-xs text-foreground">
                @for (item of optionalItems(); track item.key) {
                  <li class="flex items-start gap-2">
                    <span class="text-muted-foreground">•</span>
                    <div>
                      <strong class="font-semibold">{{ item.label }}:</strong>
                      <span class="text-muted-foreground ml-1">{{ item.message }}</span>
                    </div>
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AssessmentPending {
  public readonly pendingItems = input.required<PendingAssessmentItem[]>();

  public readonly essentialItems = computed(() =>
    this.pendingItems().filter((item) => item.priority === 'essential'),
  );

  public readonly importantItems = computed(() =>
    this.pendingItems().filter((item) => item.priority === 'important'),
  );

  public readonly optionalItems = computed(() =>
    this.pendingItems().filter((item) => item.priority === 'optional'),
  );
}
