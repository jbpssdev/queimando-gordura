import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';
import { HlmLabel } from '@spartan-ng/helm/label';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { DiaryStateService } from '../../../../core/diary/diary-state.service';
import type {
  ActivityIntensity,
  ActivityType,
  DiaryActivity,
} from '../../../../core/diary/diary.model';
import {
  ACTIVITY_INTENSITIES,
  ACTIVITY_INTENSITY_LABELS,
  ACTIVITY_TYPES,
  ACTIVITY_TYPE_LABELS,
} from '../../../../core/diary/diary.model';

@Component({
  selector: 'app-diary-activities',
  imports: [ReactiveFormsModule, HlmButton, HlmCardImports, HlmInput, HlmLabel, HlmAlertImports],
  template: `
    <div class="space-y-6">
      <div
        class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4"
      >
        <div>
          <h2 class="text-lg font-bold text-foreground">Atividades Físicas</h2>
          <p class="text-xs text-muted-foreground mt-0.5">
            Registro das atividades e exercícios realmente realizados nesta data.
          </p>
        </div>

        <button
          hlmBtn
          variant="default"
          size="sm"
          type="button"
          class="text-xs font-semibold self-start sm:self-auto"
          (click)="openFormForNew()"
        >
          + Adicionar Atividade
        </button>
      </div>

      <!-- Alerta Ético e Metodológico -->
      <div hlmAlert class="p-3 text-xs border-border bg-muted/20 text-muted-foreground">
        🏃 <strong>Transparência metodológica:</strong> Os exercícios registrados não geram
        estimativas fictícias de queima calórica nem são subtraídos do consumo diário de calorias,
        evitando compensações alimentares artificiais e inconsistências de contagem.
      </div>

      <!-- Formulário Inline de Inclusão/Edição -->
      @if (isFormOpen()) {
        <div hlmCard class="p-5 border-primary/30 bg-card space-y-4 animate-in fade-in">
          <div class="flex items-center justify-between border-b border-border pb-3">
            <span class="text-xs font-bold text-foreground">
              {{ editingActivity() ? 'Editar Atividade' : 'Nova Atividade Física' }}
            </span>
            <button
              type="button"
              class="text-muted-foreground hover:text-foreground text-xs p-1"
              (click)="closeForm()"
            >
              ✕
            </button>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <!-- Tipo da Atividade -->
              <div class="space-y-1">
                <label hlmLabel for="act-type" class="text-[11px] font-semibold">Tipo</label>
                <select
                  id="act-type"
                  formControlName="type"
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                >
                  @for (t of activityTypes; track t) {
                    <option [value]="t">{{ activityTypeLabels[t] }}</option>
                  }
                </select>
              </div>

              <!-- Duração -->
              <div class="space-y-1">
                <label hlmLabel for="act-duration" class="text-[11px] font-semibold">
                  Duração (minutos) <span class="text-destructive">*</span>
                </label>
                <input
                  hlmInput
                  id="act-duration"
                  type="number"
                  min="1"
                  max="720"
                  formControlName="durationMinutes"
                  placeholder="Ex.: 30"
                  class="w-full text-xs"
                />
              </div>

              <!-- Nome ou Descrição -->
              <div class="space-y-1 sm:col-span-2">
                <label hlmLabel for="act-title" class="text-[11px] font-semibold">
                  Nome ou descrição da atividade <span class="text-destructive">*</span>
                </label>
                <input
                  hlmInput
                  id="act-title"
                  type="text"
                  formControlName="title"
                  placeholder="Ex.: Caminhada leve no parque, Musculação membros superiores"
                  class="w-full text-xs"
                />
              </div>

              <!-- Intensidade Percebida -->
              <div class="space-y-1 sm:col-span-2">
                <label hlmLabel for="act-intensity" class="text-[11px] font-semibold">
                  Intensidade percebida
                </label>
                <select
                  id="act-intensity"
                  formControlName="perceivedIntensity"
                  class="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-hidden"
                >
                  @for (i of activityIntensities; track i) {
                    <option [value]="i">{{ activityIntensityLabels[i] }}</option>
                  }
                </select>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-3 border-t border-border">
              <button
                hlmBtn
                variant="outline"
                size="sm"
                type="button"
                (click)="closeForm()"
                [disabled]="state.isSaving()"
              >
                Cancelar
              </button>
              <button
                hlmBtn
                variant="default"
                size="sm"
                type="submit"
                [disabled]="form.invalid || state.isSaving()"
              >
                {{ state.isSaving() ? 'Salvando...' : 'Salvar Atividade' }}
              </button>
            </div>
          </form>
        </div>
      }

      <!-- Lista de Atividades Registradas -->
      <div hlmCard class="p-5 border-border bg-card space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-foreground">
            Atividades no Dia ({{ state.activities().length }})
          </span>
          @if (totalMinutes() > 0) {
            <span class="text-xs text-muted-foreground font-medium">
              Tempo total: <strong class="text-foreground">{{ totalMinutes() }} min</strong>
            </span>
          }
        </div>

        @if (state.activities().length === 0) {
          <p class="text-xs text-muted-foreground py-3 italic">
            Nenhuma atividade física registrada nesta data.
          </p>
        } @else {
          <div class="space-y-2.5">
            @for (act of state.activities(); track act.id) {
              <div
                class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl border border-border bg-muted/10 text-xs"
              >
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-foreground">{{ act.title }}</span>
                    <span
                      class="rounded-full bg-secondary px-2 py-0.2 text-[10px] font-medium text-secondary-foreground"
                    >
                      {{ activityTypeLabels[act.type] }}
                    </span>
                  </div>
                  <div
                    class="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground mt-1"
                  >
                    <span>⏱️ {{ act.durationMinutes }} minutos</span>
                    <span
                      >• Intensidade: {{ activityIntensityLabels[act.perceivedIntensity] }}</span
                    >
                  </div>
                </div>

                <div class="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    hlmBtn
                    variant="outline"
                    size="sm"
                    type="button"
                    class="text-[11px] h-7 px-2"
                    (click)="openFormForEdit(act)"
                  >
                    Editar
                  </button>
                  <button
                    hlmBtn
                    variant="outline"
                    size="sm"
                    type="button"
                    class="text-[11px] h-7 px-2 text-destructive hover:bg-destructive/10"
                    (click)="onDelete(act.id)"
                    [disabled]="state.isSaving()"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class DiaryActivities {
  protected readonly state = inject(DiaryStateService);

  public readonly activityTypes = ACTIVITY_TYPES;
  public readonly activityTypeLabels = ACTIVITY_TYPE_LABELS;

  public readonly activityIntensities = ACTIVITY_INTENSITIES;
  public readonly activityIntensityLabels = ACTIVITY_INTENSITY_LABELS;

  public readonly isFormOpen = signal<boolean>(false);
  public readonly editingActivity = signal<DiaryActivity | null>(null);

  public readonly form = new FormGroup({
    type: new FormControl<ActivityType>('cardio', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    title: new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    durationMinutes: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(1),
      Validators.max(720),
    ]),
    perceivedIntensity: new FormControl<ActivityIntensity>('moderate', {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  public totalMinutes(): number {
    return this.state.activities().reduce((acc, a) => acc + a.durationMinutes, 0);
  }

  public openFormForNew(): void {
    this.editingActivity.set(null);
    this.form.reset({
      type: 'cardio',
      title: '',
      durationMinutes: null,
      perceivedIntensity: 'moderate',
    });
    this.isFormOpen.set(true);
  }

  public openFormForEdit(act: DiaryActivity): void {
    this.editingActivity.set(act);
    this.form.setValue({
      type: act.type,
      title: act.title,
      durationMinutes: act.durationMinutes,
      perceivedIntensity: act.perceivedIntensity,
    });
    this.isFormOpen.set(true);
  }

  public closeForm(): void {
    this.isFormOpen.set(false);
    this.editingActivity.set(null);
  }

  public onSubmit(): void {
    if (this.form.invalid || this.state.isSaving()) return;
    const val = this.form.getRawValue();
    if (!val.durationMinutes) return;

    const editing = this.editingActivity();
    if (editing) {
      this.state
        .updateActivity(editing.id, {
          type: val.type,
          title: val.title.trim(),
          durationMinutes: val.durationMinutes,
          perceivedIntensity: val.perceivedIntensity,
          version: editing.version,
        })
        .subscribe({
          error: () => undefined,
          next: () => this.closeForm(),
        });
    } else {
      this.state
        .addActivity({
          type: val.type,
          title: val.title.trim(),
          durationMinutes: val.durationMinutes,
          perceivedIntensity: val.perceivedIntensity,
        })
        .subscribe({
          error: () => undefined,
          next: () => this.closeForm(),
        });
    }
  }

  public onDelete(id: string): void {
    this.state.deleteActivity(id).subscribe({ error: () => undefined });
  }
}
