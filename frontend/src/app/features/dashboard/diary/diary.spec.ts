import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { Diary } from './diary';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { DiaryStateService } from '../../../core/diary/diary-state.service';
import type { DiaryDayResponse } from '../../../core/diary/diary.model';

describe('Diary Component', () => {
  let component: Diary;
  let fixture: ComponentFixture<Diary>;
  let state: DiaryStateService;

  const mockSession = {
    currentUser: () => ({ email: 'carlos@exemplo.com' }),
    userDisplayName: () => 'Carlos',
    signOut: vi.fn().mockResolvedValue(undefined),
  };

  const mockDay: DiaryDayResponse = {
    date: '2026-10-16',
    meals: [],
    waterEntries: [],
    totalWaterMl: 750,
    activities: [],
    dayTotals: { energyKcal: 1200, proteinG: 80, carbohydrateG: 140, fatG: 35, fiberG: 22 },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Diary],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthSessionService, useValue: mockSession },
        DiaryStateService,
      ],
    }).compileComponents();

    state = TestBed.inject(DiaryStateService);
    fixture = TestBed.createComponent(Diary);
    component = fixture.componentInstance;
  });

  it('inicializa e renderiza destaques e abas', () => {
    vi.spyOn(state, 'loadDay').mockReturnValue(of(mockDay));
    fixture.detectChanges();

    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Diário');
    expect(compiled.textContent).toContain('Refeições');
    expect(compiled.textContent).toContain('Água');
    expect(compiled.textContent).toContain('Atividades');
    expect(compiled.textContent).toContain('Peso Semanal');
  });

  it('permite alternar entre abas', () => {
    vi.spyOn(state, 'loadDay').mockReturnValue(of(mockDay));
    fixture.detectChanges();

    expect(component.activeTab()).toBe('meals');

    component.activeTab.set('water');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('water');

    component.activeTab.set('activities');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('activities');

    component.activeTab.set('weight');
    fixture.detectChanges();
    expect(component.activeTab()).toBe('weight');
  });

  it('chama navegação entre datas', () => {
    vi.spyOn(state, 'loadDay').mockReturnValue(of(mockDay));
    vi.spyOn(state, 'goToPreviousDay').mockReturnValue(of(mockDay));
    vi.spyOn(state, 'goToNextDay').mockReturnValue(of(mockDay));
    vi.spyOn(state, 'goToToday').mockReturnValue(of(mockDay));

    fixture.detectChanges();

    component.onPreviousDay();
    expect(state.goToPreviousDay).toHaveBeenCalled();

    component.onNextDay();
    expect(state.goToNextDay).toHaveBeenCalled();

    component.onGoToToday();
    expect(state.goToToday).toHaveBeenCalled();
  });
});
