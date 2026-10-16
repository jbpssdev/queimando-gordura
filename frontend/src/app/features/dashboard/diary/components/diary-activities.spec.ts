import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { DiaryActivities } from './diary-activities';
import { DiaryStateService } from '../../../../core/diary/diary-state.service';
import type { DiaryActivity } from '../../../../core/diary/diary.model';

describe('DiaryActivities Component', () => {
  let component: DiaryActivities;
  let fixture: ComponentFixture<DiaryActivities>;
  let state: DiaryStateService;

  const mockActivity: DiaryActivity = {
    id: 'act-1',
    date: '2026-10-16',
    type: 'cardio',
    title: 'Caminhada matinal',
    durationMinutes: 30,
    perceivedIntensity: 'moderate',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiaryActivities],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        DiaryStateService,
      ],
    }).compileComponents();

    state = TestBed.inject(DiaryStateService);
    fixture = TestBed.createComponent(DiaryActivities);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inicializa e exibe estado vazio', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Atividades Físicas');
    expect(compiled.textContent).toContain('Nenhuma atividade física registrada nesta data.');
  });

  it('exibe atividades quando presentes no estado', () => {
    state.dayData.set({
      date: '2026-10-16',
      meals: [],
      waterEntries: [],
      totalWaterMl: 0,
      activities: [mockActivity],
      dayTotals: { energyKcal: null, proteinG: null, carbohydrateG: null, fatG: null, fiberG: null },
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Caminhada matinal');
    expect(compiled.textContent).toContain('30 minutos');
    expect(compiled.textContent).toContain('Cardio / Aeróbico');
  });

  it('abre formulário, cadastra nova atividade e fecha', () => {
    vi.spyOn(state, 'addActivity').mockReturnValue(of(mockActivity));

    component.openFormForNew();
    expect(component.isFormOpen()).toBe(true);

    component.form.setValue({
      type: 'cardio',
      title: 'Caminhada matinal',
      durationMinutes: 30,
      perceivedIntensity: 'moderate',
    });

    component.onSubmit();
    expect(state.addActivity).toHaveBeenCalled();
    expect(component.isFormOpen()).toBe(false);
  });

  it('permite excluir atividade', () => {
    vi.spyOn(state, 'deleteActivity').mockReturnValue(of(undefined));
    component.onDelete('act-1');
    expect(state.deleteActivity).toHaveBeenCalledWith('act-1');
  });
});
