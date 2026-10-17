import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { DiaryWater } from './diary-water';
import { DiaryStateService } from '../../../../core/diary/diary-state.service';
import type { DiaryWaterEntry } from '../../../../core/diary/diary.model';

describe('DiaryWater Component', () => {
  let component: DiaryWater;
  let fixture: ComponentFixture<DiaryWater>;
  let state: DiaryStateService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiaryWater],
      providers: [provideHttpClient(), provideHttpClientTesting(), DiaryStateService],
    }).compileComponents();

    state = TestBed.inject(DiaryStateService);
    fixture = TestBed.createComponent(DiaryWater);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('inicializa e exibe atalhos e zero água', () => {
    expect(component).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('0 ml');
    expect(compiled.textContent).toContain('+ 150 ml');
    expect(compiled.textContent).toContain('+ 250 ml');
    expect(compiled.textContent).toContain('+ 500 ml');
  });

  it('adiciona água por atalho prático', () => {
    const mockEntry: DiaryWaterEntry = {
      id: 'w-1',
      date: '2026-10-16',
      amountMl: 250,
      createdAt: '',
    };
    vi.spyOn(state, 'addWater').mockReturnValue(of(mockEntry));

    component.onAddShortcut(250);
    expect(state.addWater).toHaveBeenCalledWith(250);
  });

  it('adiciona água por valor personalizado', () => {
    const mockEntry: DiaryWaterEntry = {
      id: 'w-2',
      date: '2026-10-16',
      amountMl: 350,
      createdAt: '',
    };
    vi.spyOn(state, 'addWater').mockReturnValue(of(mockEntry));

    component.customForm.controls.amountMl.setValue(350);
    component.onCustomSubmit();

    expect(state.addWater).toHaveBeenCalledWith(350);
  });

  it('exclui lançamento de água', () => {
    vi.spyOn(state, 'deleteWater').mockReturnValue(of(undefined));
    component.onDeleteEntry('w-1');
    expect(state.deleteWater).toHaveBeenCalledWith('w-1');
  });
});
