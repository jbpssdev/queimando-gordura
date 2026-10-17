import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { DiaryWeight } from './diary-weight';
import { DiaryStateService } from '../../../../core/diary/diary-state.service';
import type { DiaryWeight as DiaryWeightModel } from '../../../../core/diary/diary.model';

describe('DiaryWeight Component', () => {
  let component: DiaryWeight;
  let fixture: ComponentFixture<DiaryWeight>;
  let state: DiaryStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiaryWeight],
      providers: [provideHttpClient(), provideHttpClientTesting(), DiaryStateService],
    }).compileComponents();

    state = TestBed.inject(DiaryStateService);
    fixture = TestBed.createComponent(DiaryWeight);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inicializa e exibe orientações sobre pesagem semanal', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Acompanhamento de Peso');
    expect(compiled.textContent).toContain('Por que incentivamos pesagens semanais e não diárias?');
    expect(compiled.textContent).toContain('Sem pesagem registrada');
  });

  it('permite registrar peso em kg', () => {
    const mockWeight: DiaryWeightModel = { date: '2026-10-16', weightKg: 83.2 };
    vi.spyOn(state, 'upsertWeight').mockReturnValue(of(mockWeight));

    component.form.controls.weightKg.setValue(83.2);
    component.onSubmit();

    expect(state.upsertWeight).toHaveBeenCalledWith(83.2);
  });

  it('permite excluir registro de peso existente', () => {
    state.dayData.set({
      date: '2026-10-16',
      meals: [],
      waterEntries: [],
      totalWaterMl: 0,
      activities: [],
      weight: { date: '2026-10-16', weightKg: 85 },
      dayTotals: {
        energyKcal: null,
        proteinG: null,
        carbohydrateG: null,
        fatG: null,
        fiberG: null,
      },
    });
    fixture.detectChanges();

    vi.spyOn(state, 'deleteWeight').mockReturnValue(of(undefined));
    component.onDeleteWeight();

    expect(state.deleteWeight).toHaveBeenCalled();
  });
});
