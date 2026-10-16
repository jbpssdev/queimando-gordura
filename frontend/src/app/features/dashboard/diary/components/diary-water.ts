import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { DiaryStateService } from '../../../../core/diary/diary-state.service';
import { formatPtBrWater } from '../../../../core/diary/diary-helpers';

@Component({
  selector: 'app-diary-water',
  imports: [
    ReactiveFormsModule,
    HlmButton,
    HlmCardImports,
    HlmInput,
    HlmLabel,
    HlmAlertImports,
  ],
  template: `
    <div class="space-y-6">
      <div class="border-b border-border pb-4">
        <h2 class="text-lg font-bold text-foreground">Hidratação / Água</h2>
        <p class="text-xs text-muted-foreground mt-0.5">
          Registro exclusivo de ingestão de água potável ao longo do dia.
        </p>
      </div>

      <!-- Card do Total Registrado -->
      <div hlmCard class="p-6 bg-primary/5 border-primary/20 text-center space-y-2">
        <span class="text-xs font-semibold text-primary uppercase tracking-wider block">
          Água Registrada Hoje
        </span>
        <div class="text-3xl sm:text-4xl font-black text-foreground">
          {{ formatPtBrWater(state.totalWaterMl()) }}
        </div>
        <p class="text-[11px] text-muted-foreground max-w-md mx-auto">
          O aplicativo não define metas automáticas ou obrigatórias de água. Mantenha a hidratação conforme sua sede e orientações profissionais.
        </p>
      </div>

      <!-- Atalhos de Volume -->
      <div hlmCard class="p-5 border-border bg-card space-y-4">
        <div>
          <span class="text-xs font-bold text-foreground block">
            Adicionar por Atalho Prático
          </span>
          <p class="text-[11px] text-muted-foreground">
            Os botões abaixo representam volumes comuns de recipientes (copos e garrafas), não metas recomendadas.
          </p>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <button
            hlmBtn
            variant="outline"
            type="button"
            class="flex flex-col py-3 h-auto text-center"
            (click)="onAddShortcut(150)"
            [disabled]="state.isSaving()"
          >
            <span class="text-sm font-bold text-primary">+ 150 ml</span>
            <span class="text-[10px] text-muted-foreground">Copo pequeno</span>
          </button>

          <button
            hlmBtn
            variant="outline"
            type="button"
            class="flex flex-col py-3 h-auto text-center"
            (click)="onAddShortcut(250)"
            [disabled]="state.isSaving()"
          >
            <span class="text-sm font-bold text-primary">+ 250 ml</span>
            <span class="text-[10px] text-muted-foreground">Copo padrão</span>
          </button>

          <button
            hlmBtn
            variant="outline"
            type="button"
            class="flex flex-col py-3 h-auto text-center"
            (click)="onAddShortcut(500)"
            [disabled]="state.isSaving()"
          >
            <span class="text-sm font-bold text-primary">+ 500 ml</span>
            <span class="text-[10px] text-muted-foreground">Garrafa média</span>
          </button>
        </div>

        <!-- Entrada de Volume Personalizado -->
        <form [formGroup]="customForm" (ngSubmit)="onCustomSubmit()" class="pt-2 border-t border-border flex items-end gap-3">
          <div class="flex-1 space-y-1">
            <label hlmLabel for="custom-water" class="text-[11px] font-semibold text-muted-foreground">
              Ou informe outro volume em ml
            </label>
            <input
              hlmInput
              id="custom-water"
              type="number"
              step="10"
              min="10"
              max="5000"
              formControlName="amountMl"
              placeholder="Ex.: 350"
              class="w-full text-xs"
            />
          </div>
          <button
            hlmBtn
            variant="default"
            type="submit"
            size="sm"
            [disabled]="customForm.invalid || state.isSaving()"
            class="text-xs"
          >
            Registrar
          </button>
        </form>
      </div>

      <!-- Alerta Orientativo -->
      <div hlmAlert class="p-3 text-xs border-border bg-muted/20 text-muted-foreground">
        💡 <strong>Atenção:</strong> Sucos, chás adoçados, cafés com leite e bebidas calóricas devem ser registrados na seção de <strong>Refeições</strong> para acompanhamento nutricional adequado.
      </div>

      <!-- Lista de Lançamentos de Água -->
      <div hlmCard class="p-5 border-border bg-card space-y-3">
        <span class="text-xs font-bold text-foreground block">
          Lançamentos de Água no Dia ({{ state.waterEntries().length }})
        </span>

        @if (state.waterEntries().length === 0) {
          <p class="text-xs text-muted-foreground py-2 italic">
            Nenhum lançamento de água registrado nesta data.
          </p>
        } @else {
          <div class="space-y-2 max-h-56 overflow-y-auto">
            @for (entry of state.waterEntries(); track entry.id) {
              <div class="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/10 text-xs">
                <div class="flex items-center gap-2">
                  <span class="text-primary font-semibold">💧 {{ entry.amountMl }} ml</span>
                </div>
                <button
                  hlmBtn
                  variant="outline"
                  size="sm"
                  type="button"
                  class="text-[11px] h-6 px-2 text-destructive hover:bg-destructive/10"
                  (click)="onDeleteEntry(entry.id)"
                  [disabled]="state.isSaving()"
                  aria-label="Excluir lançamento de água"
                >
                  Remover
                </button>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class DiaryWater {
  protected readonly state = inject(DiaryStateService);

  public readonly customForm = new FormGroup({
    amountMl: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(10),
      Validators.max(5000),
    ]),
  });

  public onAddShortcut(ml: number): void {
    this.state.addWater(ml).subscribe();
  }

  public onCustomSubmit(): void {
    if (this.customForm.invalid) return;
    const ml = this.customForm.controls.amountMl.value;
    if (!ml) return;

    this.state.addWater(ml).subscribe({
      next: () => {
        this.customForm.reset();
      },
    });
  }

  public onDeleteEntry(id: string): void {
    this.state.deleteWater(id).subscribe();
  }

  public formatPtBrWater(ml: number | null | undefined): string {
    return formatPtBrWater(ml);
  }
}
