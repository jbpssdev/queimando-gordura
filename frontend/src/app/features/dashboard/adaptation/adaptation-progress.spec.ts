import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AdaptationProgress } from './adaptation-progress';
import { AdaptationApiService } from '../../../core/adaptation/adaptation-api.service';
import type { AdaptationProgressResponse } from '../../../core/adaptation/adaptation.model';

describe('AdaptationProgress', () => {
  let component: AdaptationProgress;
  let fixture: ComponentFixture<AdaptationProgress>;
  let apiServiceMock: {
    getProgress: ReturnType<typeof vi.fn>;
    getReportPdf: ReturnType<typeof vi.fn>;
  };

  const createMockProgress = (
    overrides: Partial<AdaptationProgressResponse> = {},
  ): AdaptationProgressResponse => ({
    planStatus: 'in_progress',
    mode: 'standard',
    currentDay: 14,
    totalDays: 30,
    startDate: '2026-10-01',
    endDate: '2026-10-30',
    timeZone: 'America/Sao_Paulo',
    reportAvailable: true,
    calorieTargetKcal: null,
    summary: {
      totalDaysMonitored: 14,
      daysWithMeals: 12,
      daysWithWater: 14,
      daysWithActivities: 8,
      daysWithWeight: 2,
    },
    weightEvolution: {
      initialWeightKg: 85.0,
      initialWeightDate: '2026-09-30',
      latestWeightKg: 84.2,
      latestWeightDate: '2026-10-14',
      weightDeltaKg: -0.8,
      weighIns: [
        { date: '2026-09-30', weightKg: 85.0, source: 'assessment' },
        { date: '2026-10-07', weightKg: 84.7, source: 'diary' },
        { date: '2026-10-14', weightKg: 84.2, source: 'diary' },
      ],
      currentBmi: 27.5,
      initialBmi: 27.8,
      updatedMetabolicEstimates: { tmbKcal: 1750, getKcal: 2350 },
    },
    weeklyPeriods: [
      {
        periodNumber: 1,
        title: 'Semana 1 (Dias 1–7)',
        startDay: 1,
        endDay: 7,
        milestoneDay: 7,
        milestoneTitle: '1ª semana',
        days: [
          {
            dayNumber: 1,
            date: '2026-10-01',
            isPast: true,
            isToday: false,
            isFuture: false,
            hasMeals: true,
            hasWater: true,
            hasActivities: true,
            hasWeight: false,
          },
        ],
      },
    ],
    achievements: [
      {
        id: 'first_diary_entry',
        title: 'Primeiro Registro',
        description: 'Primeiro registro realizado no diário.',
        icon: '📝',
        unlocked: true,
        unlockedAt: '2026-10-01T12:00:00Z',
      },
      {
        id: 'seven_days_consistency',
        title: '7 Dias Consecutivos',
        description: 'Sete dias com registros no diário.',
        icon: '🌱',
        unlocked: false,
        unlockedAt: null,
        progress: 5,
        target: 7,
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
      imports: [AdaptationProgress],
      providers: [provideRouter([]), { provide: AdaptationApiService, useValue: apiServiceMock }],
    }).compileComponents();
  });

  it('exibe estado de plano não iniciado quando API retorna 404', () => {
    apiServiceMock.getProgress.mockReturnValue(
      throwError(() => ({ status: 404, error: { code: 'ADAPTATION_NOT_FOUND' } })),
    );
    fixture = TestBed.createComponent(AdaptationProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isNotStarted()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Plano de Adaptação Não Iniciado');
    expect(compiled.textContent).toContain('Iniciar Programa Adaptação');
    expect(compiled.textContent).toContain('Acessar Diário de Hábitos');
  });

  it('exibe estado de erro amigável quando a API falha com 500', () => {
    apiServiceMock.getProgress.mockReturnValue(throwError(() => ({ status: 500 })));
    fixture = TestBed.createComponent(AdaptationProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.errorMessage()).toBeTruthy();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Falha ao Consultar Progresso');
    expect(compiled.textContent).toContain('Tentar novamente');
  });

  it('renderiza jornada ativa com pesagens reais, baseline e marcas no diário', () => {
    const mockData = createMockProgress();
    apiServiceMock.getProgress.mockReturnValue(of(mockData));
    fixture = TestBed.createComponent(AdaptationProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isNotStarted()).toBe(false);
    expect(component.isCompleted()).toBe(false);

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Dia 14 de 30');
    expect(compiled.textContent).toContain('Modalidade Padrão');
    expect(compiled.textContent).toContain('84.2 kg');
    expect(compiled.textContent).toContain(
      '0.8 kg a menos entre a primeira e a última pesagem do diário',
    );

    // Gráfico de linha contém pontos
    expect(component.chartData().hasData).toBe(true);
    expect(component.chartData().hasSinglePoint).toBe(false);
    expect(component.chartData().points.length).toBe(3);
    expect(component.chartData().polylinePoints).toBeTruthy();
  });

  it('exibe estado de 0 pesagens sem quebrar a tela', () => {
    const mockData = createMockProgress({
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
    apiServiceMock.getProgress.mockReturnValue(of(mockData));
    fixture = TestBed.createComponent(AdaptationProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.chartData().hasData).toBe(false);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Nenhuma pesagem registrada no período');
  });

  it('exibe mensagem explicativa quando existe apenas uma pesagem', () => {
    const mockData = createMockProgress({
      weightEvolution: {
        initialWeightKg: 85.0,
        initialWeightDate: '2026-10-01',
        latestWeightKg: 85.0,
        latestWeightDate: '2026-10-01',
        weightDeltaKg: 0,
        weighIns: [{ date: '2026-10-01', weightKg: 85.0, source: 'assessment' }],
        currentBmi: 27.8,
        initialBmi: 27.8,
        updatedMetabolicEstimates: null,
      },
    });
    apiServiceMock.getProgress.mockReturnValue(of(mockData));
    fixture = TestBed.createComponent(AdaptationProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.chartData().hasData).toBe(true);
    expect(component.chartData().hasSinglePoint).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Uma única pesagem registrada');
    expect(compiled.textContent).toContain(
      'Ainda não há histórico suficiente para traçar uma linha',
    );
  });

  it('exibe conquistas desbloqueadas e em progresso com base na API', () => {
    const mockData = createMockProgress();
    apiServiceMock.getProgress.mockReturnValue(of(mockData));
    fixture = TestBed.createComponent(AdaptationProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Primeiro Registro');
    expect(compiled.textContent).toContain('Conquistada');
    expect(compiled.textContent).toContain('7 Dias Consecutivos');
    expect(compiled.textContent).toContain('Em progresso');
    expect(compiled.textContent).toContain('5 / 7');
  });

  it('permite alternar tabela acessível de pesagens', () => {
    const mockData = createMockProgress();
    apiServiceMock.getProgress.mockReturnValue(of(mockData));
    fixture = TestBed.createComponent(AdaptationProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.showAccessibleTable()).toBe(false);
    component.toggleAccessibleTable();
    expect(component.showAccessibleTable()).toBe(true);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('table')).toBeTruthy();
  });

  it('chama download do PDF com o parâmetro includeHealthDetails selecionado', () => {
    const mockData = createMockProgress();
    apiServiceMock.getProgress.mockReturnValue(of(mockData));
    const mockBlob = new Blob(['%PDF-test'], { type: 'application/pdf' });
    apiServiceMock.getReportPdf.mockReturnValue(of(mockBlob));

    fixture = TestBed.createComponent(AdaptationProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.includeHealthDetails()).toBe(false);
    component.includeHealthDetails.set(true);
    component.onDownloadReport();

    expect(apiServiceMock.getReportPdf).toHaveBeenCalledWith(true);
    expect(component.isDownloadingPdf()).toBe(false);
  });

  it('exibe feedback de erro caso o download do PDF falhe', () => {
    const mockData = createMockProgress();
    apiServiceMock.getProgress.mockReturnValue(of(mockData));
    apiServiceMock.getReportPdf.mockReturnValue(throwError(() => new Error('Download failed')));

    fixture = TestBed.createComponent(AdaptationProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.onDownloadReport();
    expect(component.downloadError()).toContain('Não foi possível baixar o relatório PDF');
  });

  it('exibe banner de conclusão e link para /adaptacao/conclusao quando ciclo está encerrado', () => {
    const mockData = createMockProgress({ planStatus: 'completed', currentDay: 31 });
    apiServiceMock.getProgress.mockReturnValue(of(mockData));
    fixture = TestBed.createComponent(AdaptationProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.isCompleted()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Período dos 30 Dias Concluído!');
    expect(compiled.textContent).toContain('Ver Encerramento dos 30 Dias');
  });
  it('não oferece download quando a API informa relatório indisponível', () => {
    apiServiceMock.getProgress.mockReturnValue(of(createMockProgress({ reportAvailable: false })));
    fixture = TestBed.createComponent(AdaptationProgress);
    component = fixture.componentInstance;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'após o encerramento do Dia 30',
    );
    component.onDownloadReport();
    expect(apiServiceMock.getReportPdf).not.toHaveBeenCalled();
  });
});
