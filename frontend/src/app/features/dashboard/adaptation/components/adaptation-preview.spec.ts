import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdaptationPreview } from './adaptation-preview';
import type { AdaptationPreviewResponse } from '../../../../core/adaptation/adaptation.model';

describe('AdaptationPreview Component', () => {
  let component: AdaptationPreview;
  let fixture: ComponentFixture<AdaptationPreview>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AdaptationPreview],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AdaptationPreview);
    component = fixture.componentInstance;
  });

  it('exibe alerta de avaliação necessária quando o usuário ainda não completou a avaliação', () => {
    fixture.componentRef.setInput('preview', {
      hasAssessment: false,
      assessmentCompleted: false,
      recommendedMode: 'standard',
      modes: {
        standard: { mode: 'standard', title: 'Padrão', description: '', available: false, recommended: true },
        intensified: { mode: 'intensified', title: 'Intensificada', description: '', available: false, recommended: false },
      },
    } as AdaptationPreviewResponse);

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Avaliação Inicial Necessária');
    expect(compiled.textContent).toContain('Realizar Avaliação Inicial');
  });

  it('exibe as modalidades com destaque para recomendada e motivos de restrição', () => {
    fixture.componentRef.setInput('preview', {
      hasAssessment: true,
      assessmentCompleted: true,
      recommendedMode: 'standard',
      modes: {
        standard: {
          mode: 'standard',
          title: 'Modalidade Padrão',
          description: 'Acompanhamento gradual e sustentável.',
          available: true,
          recommended: true,
        },
        intensified: {
          mode: 'intensified',
          title: 'Modalidade Intensificada',
          description: 'Validação clínica adicional.',
          available: false,
          restrictionReasons: ['Critérios de segurança clínica não permitem a modalidade Intensificada.'],
          recommended: false,
        },
      },
    } as AdaptationPreviewResponse);
    fixture.componentRef.setInput('selectedMode', 'standard');

    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Modalidade Padrão');
    expect(compiled.textContent).toContain('Recomendada');
    expect(compiled.textContent).toContain('Modalidade Intensificada');
    expect(compiled.textContent).toContain('Bloqueada por Segurança');
    expect(compiled.textContent).toContain('Critérios de segurança clínica não permitem a modalidade Intensificada.');
  });

  it('emite modeSelected ao clicar em uma modalidade disponível', () => {
    let selected: string | undefined;
    component.modeSelected.subscribe((m) => {
      selected = m;
    });

    component.onSelectMode('standard', true);
    expect(selected).toBe('standard');
  });

  it('não emite modeSelected ao tentar selecionar modalidade indisponível', () => {
    let selected: string | undefined;
    component.modeSelected.subscribe((m) => {
      selected = m;
    });

    component.onSelectMode('intensified', false);
    expect(selected).toBeUndefined();
  });

  it('abre modal de confirmação com explicações obrigatórias antes de iniciar', () => {
    fixture.componentRef.setInput('preview', {
      hasAssessment: true,
      assessmentCompleted: true,
      recommendedMode: 'standard',
      modes: {
        standard: { mode: 'standard', title: 'Padrão', description: '', available: true, recommended: true },
        intensified: { mode: 'intensified', title: 'Intensificada', description: '', available: false, recommended: false },
      },
    } as AdaptationPreviewResponse);
    fixture.componentRef.setInput('selectedMode', 'standard');

    fixture.detectChanges();

    expect(component.showConfirmModal()).toBe(false);

    component.openConfirmModal();
    fixture.detectChanges();

    expect(component.showConfirmModal()).toBe(true);
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Confirmar Início da Adaptação de 30 Dias');
    expect(compiled.textContent).toContain('Data local de hoje');
    expect(compiled.textContent).toContain('Dias consecutivos');
    expect(compiled.textContent).toContain('Sem pausa por ausências');
    expect(compiled.textContent).toContain('Sem dados não significa zero');
    expect(compiled.textContent).toContain('Sem reinício automático');
  });

  it('emite startConfirmed ao confirmar no modal', () => {
    let confirmed = false;
    component.startConfirmed.subscribe(() => {
      confirmed = true;
    });

    component.showConfirmModal.set(true);
    component.onConfirmStart();

    expect(confirmed).toBe(true);
    expect(component.showConfirmModal()).toBe(false);
  });
});
