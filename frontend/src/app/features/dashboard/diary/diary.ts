import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HlmButton } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmAlertImports } from '@spartan-ng/helm/alert';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DiaryStateService } from '../../../core/diary/diary-state.service';
import {
  formatPtBrCalories,
  formatPtBrWater,
  formatPtBrWeight,
  isValidIsoDate,
} from '../../../core/diary/diary-helpers';
import { DiaryMeals } from './components/diary-meals';
import { DiaryWater } from './components/diary-water';
import { DiaryActivities } from './components/diary-activities';
import { DiaryWeight } from './components/diary-weight';

export type DiaryTab = 'meals' | 'water' | 'activities' | 'weight';

@Component({
  selector: 'app-diary',
  imports: [
    RouterLink,
    HlmButton,
    HlmCardImports,
    HlmAlertImports,
    DiaryMeals,
    DiaryWater,
    DiaryActivities,
    DiaryWeight,
  ],
  template: `
    <div class="min-h-screen flex flex-col bg-background text-foreground">
      <!-- Cabeçalho Autenticado -->
      <header class="border-b border-border bg-card sticky top-0 z-40 shadow-2xs">
        <div
          class="mx-auto max-w-6xl w-full px-4 sm:px-8 h-16 flex items-center justify-between gap-4"
        >
          <div class="flex items-center gap-6">
            <a
              routerLink="/painel"
              class="flex items-center gap-2 font-bold text-foreground hover:opacity-90 transition-opacity"
            >
              <div
                class="size-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm"
              >
                QG
              </div>
              <span class="text-sm font-bold tracking-tight hidden sm:inline">
                Queimando Gordura <span class="text-xs font-normal text-muted-foreground">1.0</span>
              </span>
            </a>

            <nav aria-label="Navegação do diário" class="hidden md:flex items-center gap-1 text-xs">
              <a
                routerLink="/painel"
                class="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              >
                Início
              </a>
              <a
                routerLink="/diario"
                class="rounded-md px-3 py-1.5 text-foreground bg-secondary font-semibold"
              >
                Diário
              </a>
              <a
                routerLink="/minha-conta"
                class="rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
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
              <span class="text-xs font-semibold text-foreground">
                {{ session.userDisplayName() }}
              </span>
              <span class="text-[11px] text-muted-foreground">
                {{ session.currentUser()?.email }}
              </span>
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

      <!-- Conteúdo Principal -->
      <main id="diary-content" class="flex-1 mx-auto max-w-5xl w-full px-4 py-6 sm:px-8 space-y-6">
        <!-- Navegação de Data -->
        <div
          class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-border bg-card shadow-2xs"
        >
          <div class="flex items-center gap-2">
            <button
              hlmBtn
              variant="outline"
              size="sm"
              type="button"
              class="text-xs h-8 px-2.5"
              (click)="onPreviousDay()"
              aria-label="Dia anterior"
            >
              ← Anterior
            </button>

            <button
              hlmBtn
              variant="outline"
              size="sm"
              type="button"
              class="text-xs h-8 px-2.5"
              (click)="onNextDay()"
              aria-label="Próximo dia"
            >
              Próximo →
            </button>

            @if (!state.isToday()) {
              <button
                hlmBtn
                variant="secondary"
                size="sm"
                type="button"
                class="text-xs h-8 px-2.5"
                (click)="onGoToToday()"
              >
                Hoje
              </button>
            }
          </div>

          <div class="flex items-center gap-3">
            <span class="text-xs font-bold text-foreground">
              {{ state.formattedDateLong() }}
            </span>
            <input
              type="date"
              class="rounded-md border border-input bg-background px-2 py-1 text-xs text-foreground focus:outline-hidden"
              [value]="state.selectedDate()"
              (change)="onDateInputChange($event)"
              aria-label="Escolher data do diário"
            />
          </div>
        </div>

        <!-- Alerta de Indisponibilidade de Conexão se houver -->
        @if (state.loadStatus() === 'error') {
          <div hlmAlert variant="destructive" class="p-4 text-xs space-y-2">
            <span class="font-bold block">Falha ao carregar registros do diário</span>
            <p>{{ state.loadError() }}</p>
            <button
              hlmBtn
              variant="outline"
              size="sm"
              type="button"
              class="mt-2 text-xs"
              (click)="retry()"
            >
              Tentar novamente
            </button>
          </div>
        }

        @if (state.loadStatus() === 'ready' && !state.hasAnyRecord()) {
          <p role="status" class="rounded-lg border border-border p-4 text-sm">
            Sem registros nesta data. A ausência de dados não significa ingestão zero ou ausência de
            atividades.
          </p>
        }
        <!-- Barra de Destaques do Dia (Resumo) -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            type="button"
            hlmCard
            class="text-left p-3.5 bg-card border-border cursor-pointer transition-colors"
            [class.border-primary]="activeTab() === 'meals'"
            (click)="activeTab.set('meals')"
          >
            <span class="text-[11px] font-medium text-muted-foreground block"> 🍽️ Refeições </span>
            <span class="text-sm sm:text-base font-bold text-foreground truncate block mt-0.5">
              {{ formatPtBrCalories(state.dayTotals().energyKcal) }}
              @if (state.dayTotals().isPartialNutrition) {
                <small class="block">Total parcial</small>
              }
            </span>
          </button>

          <button
            type="button"
            hlmCard
            class="text-left p-3.5 bg-card border-border cursor-pointer transition-colors"
            [class.border-primary]="activeTab() === 'water'"
            (click)="activeTab.set('water')"
          >
            <span class="text-[11px] font-medium text-muted-foreground block"> 💧 Água </span>
            <span class="text-sm sm:text-base font-bold text-foreground truncate block mt-0.5">
              {{ formatPtBrWater(state.totalWaterMl()) }}
            </span>
          </button>

          <button
            type="button"
            hlmCard
            class="text-left p-3.5 bg-card border-border cursor-pointer transition-colors"
            [class.border-primary]="activeTab() === 'activities'"
            (click)="activeTab.set('activities')"
          >
            <span class="text-[11px] font-medium text-muted-foreground block"> 🏃 Atividades </span>
            <span class="text-sm sm:text-base font-bold text-foreground truncate block mt-0.5">
              {{ totalActivityMinutes() }} min
            </span>
          </button>

          <button
            type="button"
            hlmCard
            class="text-left p-3.5 bg-card border-border cursor-pointer transition-colors"
            [class.border-primary]="activeTab() === 'weight'"
            (click)="activeTab.set('weight')"
          >
            <span class="text-[11px] font-medium text-muted-foreground block"> ⚖️ Peso </span>
            <span class="text-sm sm:text-base font-bold text-foreground truncate block mt-0.5">
              {{ formatPtBrWeight(state.weight()?.weightKg) }}
            </span>
          </button>
        </div>

        <!-- Seletor de Abas -->
        <div class="flex flex-wrap border-b border-border text-xs gap-1 sm:gap-2">
          <button
            type="button"
            class="py-2.5 px-3 font-semibold border-b-2 transition-colors"
            [class.border-primary]="activeTab() === 'meals'"
            [class.text-primary]="activeTab() === 'meals'"
            [class.border-transparent]="activeTab() !== 'meals'"
            [class.text-muted-foreground]="activeTab() !== 'meals'"
            (click)="activeTab.set('meals')"
          >
            Refeições ({{ state.meals().length }})
          </button>

          <button
            type="button"
            class="py-2.5 px-3 font-semibold border-b-2 transition-colors"
            [class.border-primary]="activeTab() === 'water'"
            [class.text-primary]="activeTab() === 'water'"
            [class.border-transparent]="activeTab() !== 'water'"
            [class.text-muted-foreground]="activeTab() !== 'water'"
            (click)="activeTab.set('water')"
          >
            Água ({{ state.waterEntries().length }})
          </button>

          <button
            type="button"
            class="py-2.5 px-3 font-semibold border-b-2 transition-colors"
            [class.border-primary]="activeTab() === 'activities'"
            [class.text-primary]="activeTab() === 'activities'"
            [class.border-transparent]="activeTab() !== 'activities'"
            [class.text-muted-foreground]="activeTab() !== 'activities'"
            (click)="activeTab.set('activities')"
          >
            Atividades ({{ state.activities().length }})
          </button>

          <button
            type="button"
            class="py-2.5 px-3 font-semibold border-b-2 transition-colors"
            [class.border-primary]="activeTab() === 'weight'"
            [class.text-primary]="activeTab() === 'weight'"
            [class.border-transparent]="activeTab() !== 'weight'"
            [class.text-muted-foreground]="activeTab() !== 'weight'"
            (click)="activeTab.set('weight')"
          >
            Peso Semanal
          </button>
        </div>

        <!-- Conteúdo da Aba Selecionada -->
        @if (state.loadStatus() === 'loading') {
          <div class="rounded-xl border border-border bg-card p-12 text-center space-y-3">
            <div
              class="inline-block size-6 animate-spin rounded-full border-2 border-primary border-t-transparent"
            ></div>
            <p class="text-xs text-muted-foreground">Consultando registros do diário...</p>
          </div>
        } @else if (state.loadStatus() === 'ready') {
          @switch (activeTab()) {
            @case ('meals') {
              <app-diary-meals />
            }
            @case ('water') {
              <app-diary-water />
            }
            @case ('activities') {
              <app-diary-activities />
            }
            @case ('weight') {
              <app-diary-weight />
            }
          }
        }
      </main>
    </div>
  `,
})
export class Diary implements OnInit {
  protected readonly session = inject(AuthSessionService);
  protected readonly state = inject(DiaryStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  public readonly activeTab = signal<DiaryTab>('meals');

  public ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const dateParam = params.get('date');
      if (dateParam && isValidIsoDate(dateParam)) {
        this.state.loadDay(dateParam).subscribe({ error: () => undefined });
      } else {
        this.state.loadDay().subscribe({ error: () => undefined });
      }
    });
  }

  public onPreviousDay(): void {
    this.state.goToPreviousDay().subscribe({
      next: () => this.updateDateQueryParam(),
      error: () => undefined,
    });
  }

  public onNextDay(): void {
    this.state.goToNextDay().subscribe({
      next: () => this.updateDateQueryParam(),
      error: () => undefined,
    });
  }

  public onGoToToday(): void {
    this.state.goToToday().subscribe({
      next: () => this.updateDateQueryParam(),
      error: () => undefined,
    });
  }

  public onDateInputChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (isValidIsoDate(target.value)) {
      this.state.setDate(target.value).subscribe({
        next: () => this.updateDateQueryParam(),
        error: () => undefined,
      });
    }
  }

  private updateDateQueryParam(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { date: this.state.selectedDate() },
      queryParamsHandling: 'merge',
    });
  }

  public retry(): void {
    this.state.loadDay().subscribe({ error: () => undefined });
  }

  public onSignOut(): void {
    this.session.signOut().then(() => {
      this.router.navigate(['/entrar']);
    });
  }

  public totalActivityMinutes(): number {
    return this.state.activities().reduce((acc, a) => acc + a.durationMinutes, 0);
  }

  public formatPtBrCalories(val: number | null | undefined): string {
    return formatPtBrCalories(val);
  }

  public formatPtBrWater(val: number | null | undefined): string {
    return formatPtBrWater(val);
  }

  public formatPtBrWeight(val: number | null | undefined): string {
    return formatPtBrWeight(val);
  }
}
