import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdaptationJourney } from './adaptation-journey';
import { build30DaysTimeline } from '../../../../core/adaptation/adaptation-helpers';
import type { AdaptationPlanResponse } from '../../../../core/adaptation/adaptation.model';

describe('AdaptationJourney Component', () => {
  let component: AdaptationJourney;
  let fixture: ComponentFixture<AdaptationJourney>;

  const mockPlan: AdaptationPlanResponse = {
    uid: 'user-123',
    status: 'in_progress',
    mode: 'standard',
    timeZone: 'America/Sao_Paulo',
    startDate: '2026-10-16',
    endDate: '2026-11-14',
    currentDay: 5,
    totalDays: 30,
    days: [],
    calorieTargetKcal: 2100,
    calorieTargetExplanation: 'Meta calórica de referência oficial.',
    createdAt: '2026-10-16T00:00:00Z',
    updatedAt: '2026-10-16T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdaptationJourney],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdaptationJourney);
    component = fixture.componentInstance;
  });

  it('exibe o dia atual e o período oficial da jornada', () => {
    expect(component).toBeTruthy();
    const days = build30DaysTimeline('2026-10-16', 5);
    fixture.componentRef.setInput('plan', mockPlan);
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Dia 5 de 30');
    expect(compiled.textContent).toContain('Modalidade Padrão');
    expect(compiled.textContent).toContain('16 de outubro de 2026 a 14 de novembro de 2026');
  });

  it('renderiza o calendário completo com 30 dias e destaca o dia atual', () => {
    const days = build30DaysTimeline('2026-10-16', 5);
    fixture.componentRef.setInput('plan', mockPlan);
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Hoje');
    expect(compiled.textContent).toContain('Dia 1');
    expect(compiled.textContent).toContain('Dia 30');

    // Verifica que não há checkmarks falsos ou gamificação infantilizada
    expect(compiled.textContent).not.toContain('streak');
    expect(compiled.textContent).not.toContain('conquista desbloqueada');
  });

  it('destaca visualmente os marcos dos dias 7, 14, 21 e 30', () => {
    const days = build30DaysTimeline('2026-10-16', 5);
    fixture.componentRef.setInput('plan', mockPlan);
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Dia 7 • 1ª Semana');
    expect(compiled.textContent).toContain('Dia 14 • 2ª Semana');
    expect(compiled.textContent).toContain('Dia 21 • Consolidação');
    expect(compiled.textContent).toContain('Dia 30 • Conclusão');
  });

  it('exibe a meta calórica oficial quando fornecida pela API', () => {
    const days = build30DaysTimeline('2026-10-16', 5);
    fixture.componentRef.setInput('plan', mockPlan);
    fixture.componentRef.setInput('days', days);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('2100');
    expect(compiled.textContent).toContain('kcal/dia');
    expect(compiled.textContent).toContain('Meta calórica de referência oficial');
  });
  it('distingue período encerrado de hábitos concluídos mesmo com currentDay limitado a 30', () => {
    fixture.componentRef.setInput('plan', {
      ...mockPlan,
      status: 'completed',
      currentDay: 30,
      calendarProgressPercent: 100,
    });
    fixture.componentRef.setInput('days', []);
    fixture.detectChanges();
    expect(component.currentPhaseMessage()).toContain('não comprova adesão');
    expect(component.currentPhaseMessage()).not.toContain('Reta final');
    expect(component.progressPercentage()).toBe(100);
  });
});
