import { Component, effect, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { DiaryStateService } from '../../../../core/diary/diary-state.service';
import { formatPtBrWeight } from '../../../../core/diary/diary-helpers';

@Component({
  selector: 'app-diary-weight',
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
        <h2 class="text-lg font-bold text-foreground">Acompanhamento de Peso</h2>
        <p class="text-xs text-muted-foreground mt-0.5">
          Registro consciente em intervalos preferencialmente semanais.
        </p>
      </div>

      <!-- Orientação Clínica sobre Pesagem Semanal -->
      <div hlmAlert class="p-4 text-xs border-primary/20 bg-primary/5 text-foreground space-y-2">
        <span class="font-bold text-primary block">
          ⚖️ Por que incentivamos pesagens semanais e não diárias?
        </span>
        <p class="leading-relaxed text-muted-foreground">
          O peso corporal oscila naturalmente de 1 a 2 kg todos os dias devido a retenção de água, ingestão de sódio, digestão e sono. Essas variações diárias <strong>não refletem ganho ou perda real de gordura</strong>. Uma aferição semanal, sempre no mesmo dia e em condições semelhantes, fornece uma visão muito mais precisa e sustentável da sua evolução.
        </p>
      </div>

      <!-- Card do Peso do Dia Selecionado -->
      <div hlmCard class="p-6 bg-card border-border space-y-4">
        <div class="flex items-center justify-between border-b border-border pb-3">
          <div>
            <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Registro para {{ state.formattedDateLong() }}
            </span>
            <div class="text-3xl font-black text-foreground mt-1">
              {{ formatPtBrWeight(state.weight()?.weightKg) }}
            </div>
          </div>

          @if (state.weight()) {
            <span class="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold">
              Registrado nesta data
            </span>
          } @else {
            <span class="text-xs text-muted-foreground italic">
              Sem pesagem registrada
            </span>
          }
        </div>

        <!-- Formulário de Registro / Atualização -->
        <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
          <div class="space-y-1.5 max-w-xs">
            <label hlmLabel for="weight-input" class="text-xs font-semibold">
              Peso corporal (kg) <span class="text-destructive">*</span>
            </label>
            <div class="relative">
              <input
                hlmInput
                id="weight-input"
                type="number"
                step="0.1"
                min="30"
                max="400"
                formControlName="weightKg"
                placeholder="Ex.: 82.5"
                class="w-full text-xs pr-10"
              />
              <span class="absolute right-3 top-2.5 text-xs text-muted-foreground font-medium">
                kg
              </span>
            </div>
            @if (form.controls.weightKg.invalid && form.controls.weightKg.touched) {
              <span class="text-[11px] text-destructive block">
                Informe um peso válido entre 30 e 400 kg.
              </span>
            }
          </div>

          <div class="flex items-center gap-3 pt-2">
            <button
              hlmBtn
              variant="default"
              size="sm"
              type="submit"
              [disabled]="form.invalid || state.isSaving()"
              class="text-xs font-semibold"
            >
              {{ state.isSaving() ? 'Salvando...' : (state.weight() ? 'Atualizar Peso' : 'Salvar Peso') }}
            </button>

            @if (state.weight()) {
              <button
                hlmBtn
                variant="outline"
                size="sm"
                type="button"
                (click)="onDeleteWeight()"
                [disabled]="state.isSaving()"
                class="text-xs text-destructive hover:bg-destructive/10"
              >
                Remover Registro
              </button>
            }
          </div>
        </form>
      </div>

      <!-- Aviso Tranquilizador -->
      <div class="text-[11px] text-muted-foreground leading-relaxed p-2 text-center">
        Lembre-se: ausência de pesagem não é penalizada. O foco está na construção sustentável de hábitos saudáveis, não em números na balança.
      </div>
    </div>
  `,
})
export class DiaryWeight {
  protected readonly state = inject(DiaryStateService);

  public readonly form = new FormGroup({
    weightKg: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(30),
      Validators.max(400),
    ]),
  });

  constructor() {
    effect(() => {
      const w = this.state.weight();
      if (w) {
        this.form.patchValue({ weightKg: w.weightKg });
      } else {
        this.form.reset();
      }
    });
  }

  public onSubmit(): void {
    if (this.form.invalid) return;
    const kg = this.form.controls.weightKg.value;
    if (!kg) return;

    this.state.upsertWeight(kg).subscribe();
  }

  public onDeleteWeight(): void {
    this.state.deleteWeight().subscribe();
  }

  public formatPtBrWeight(val: number | null | undefined): string {
    return formatPtBrWeight(val);
  }
}
