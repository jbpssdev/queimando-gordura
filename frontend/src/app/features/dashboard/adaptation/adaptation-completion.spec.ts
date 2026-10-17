import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdaptationCompletion } from './adaptation-completion';
import { AdaptationApiService } from '../../../core/adaptation/adaptation-api.service';
import type { AdaptationProgressResponse } from '../../../core/adaptation/adaptation.model';

describe('AdaptationCompletion', () => {
  let component: AdaptationCompletion;
  let fixture: ComponentFixture<AdaptationCompletion>;
  let apiServiceMock: {
    getProgress: ReturnType<typeof vi.fn>;
    getReportPdf: ReturnType<typeof vi.fn>;
  };

  const createMockCompletedProgress = (
    overrides: Partial<AdaptationProgressResponse> = {},
  ): AdaptationProgressResponse => ({
    planStatus: 'completed',
    mode: 'standard',
    currentDay: 31,
    totalDays: 30,
    startDate: '2026-10-01',
    endDate: '2026-10-30',
    timeZone: 'America/Sao_Paulo',
    reportAvailable: true,
    calorieTargetKcal: null,
    summary: {
      totalDaysMonitored: 30,
      daysWithMeals: 28,
      daysWithWater: 30,
      daysWithActivities: 20,
      daysWithWeight: 4,
    },
    weightEvolution: {
      initialWeightKg: 85.0,
      initialWeightDate: '2026-10-01',
      latestWeightKg: 83.5,
      latestWeightDate: '2026-10-30',
      weightDeltaKg: -1.5,
      weighIns: [
        { date: '2026-10-01', weightKg: 85.0, source: 'assessment' },
        { date: '2026-10-08', weightKg: 84.7, source: 'diary' },
        { date: '2026-10-15', weightKg: 84.2, source: 'diary' },
        { date: '2026-10-30', weightKg: 83.5, source: 'diary' },
      ],
      currentBmi: 27.2,
      initialBmi: 27.8,
      updatedMetabolicEstimates: { tmbKcal: 1740, getKcal: 2330 },
    },
    weeklyPeriods: [],
    achievements: [
      {
        id: 'cycle_completed',
        title: '30 Dias Concluídos',
        description: 'Ciclo completo de 30 dias de adaptação finalizado.',
        icon: '🏅',
        unlocked: true,
        unlockedAt: '2026-10-30T18:00:00Z',
      },
      {
        id: 'not_unlocked',
        title: 'Outra Conquista',
        description: 'Não conquistada.',
        icon: '🔒',
        unlocked: false,
        unlockedAt: null,
      },
    ],
    notices: [],
    ...overrides,
  });

  beforeEach(async () => {
    apiServiceMock = {
      getProgress: vi.fn(),
      getReportPdf: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [AdaptationCompletion],
      providers: [provideRouter([]), { provide: AdaptationApiService, useValue: apiServiceMock }],
    }).compileComponents();
  });

  it('exibe orientação para plano em andamento quando status não é completed', () => {
    const inProgressData = createMockCompletedProgress({
      planStatus: 'in_progress',
      currentDay: 18,
    });
    apiServiceMock.getProgress.mockReturnValue(of(inProgressData));

    fixture = TestBed.createComponent(AdaptationCompletion);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isCompleted()).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Adaptação em Andamento');
    expect(compiled.textContent).toContain('Dia 18 de 30');
    expect(compiled.textContent).toContain('Acompanhar Progresso Atual');
  });

  it('exibe celebração positiva de encerramento quando status é completed', () => {
    const completedData = createMockCompletedProgress();
    apiServiceMock.getProgress.mockReturnValue(of(completedData));

    fixture = TestBed.createComponent(AdaptationCompletion);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isCompleted()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Parabéns pelos 30 Dias de Adaptação!');
    expect(compiled.textContent).toContain('Ciclo Oficial Concluído');
    expect(compiled.textContent).toContain('28'); // Dias com refeições
    expect(compiled.textContent).toContain('30'); // Dias com hidratação
    expect(compiled.textContent).toContain('83.5 kg'); // Peso final
    expect(compiled.textContent).toContain(
      '1.5 kg a menos entre a primeira e a última pesagem do diário',
    );
  });

  it('filtra e exibe apenas conquistas desbloqueadas', () => {
    const completedData = createMockCompletedProgress();
    apiServiceMock.getProgress.mockReturnValue(of(completedData));

    fixture = TestBed.createComponent(AdaptationCompletion);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.unlockedAchievements().length).toBe(1);
    expect(component.unlockedAchievements()[0]?.id).toBe('cycle_completed');

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('30 Dias Concluídos');
    expect(compiled.textContent).not.toContain('Outra Conquista');
  });

  it('lida graciosamente com ciclo concluído sem pesagens registradas', () => {
    const completedNoWeighIns = createMockCompletedProgress({
      weightEvolution: {
        initialWeightKg: null,
        initialWeightDate: null,
        latestWeightKg: null,
        latestWeightDate: null,
        weightDeltaKg: null,
        weighIns: [],
        currentBmi: null,
        initialBmi: null,
        updatedMetabolicEstimates: null,
      },
    });
    apiServiceMock.getProgress.mockReturnValue(of(completedNoWeighIns));

    fixture = TestBed.createComponent(AdaptationCompletion);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.hasWeighIns()).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Sem novas pesagens registradas no período');
  });

  it('dispara download do PDF do relatório final dos 30 dias', () => {
    const completedData = createMockCompletedProgress();
    apiServiceMock.getProgress.mockReturnValue(of(completedData));
    const mockBlob = new Blob(['%PDF-completed'], { type: 'application/pdf' });
    apiServiceMock.getReportPdf.mockReturnValue(of(mockBlob));

    fixture = TestBed.createComponent(AdaptationCompletion);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.onDownloadReport();
    expect(apiServiceMock.getReportPdf).toHaveBeenCalledWith(false);
    expect(component.isDownloadingPdf()).toBe(false);
  });

  it('exibe erro caso o download falhe', () => {
    const completedData = createMockCompletedProgress();
    apiServiceMock.getProgress.mockReturnValue(of(completedData));
    apiServiceMock.getReportPdf.mockReturnValue(throwError(() => new Error('PDF failed')));

    fixture = TestBed.createComponent(AdaptationCompletion);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.onDownloadReport();
    expect(component.downloadError()).toContain('Não foi possível baixar o relatório PDF');
  });
});
