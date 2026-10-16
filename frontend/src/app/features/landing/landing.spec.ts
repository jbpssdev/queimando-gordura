import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Landing } from './landing';

describe('Landing Component', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Landing],
      providers: [provideRouter([])],
    });
  });

  it('renderiza o título principal e a mensagem do hero', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain(
      'Acompanhe sua evolução.',
    );
    expect(element.querySelector('h1')?.textContent).toContain(
      'Entenda seus hábitos.',
    );
    expect(element.textContent).toContain(
      'Organize sua alimentação, acompanhe seu peso e visualize sua evolução com um plano de adaptação de 30 dias.',
    );
  });

  it('contém botão com texto exato "Começar agora!" apontando para /entrar', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const buttons = Array.from(element.querySelectorAll('a'));
    const startButton = buttons.find(
      (btn) => btn.textContent?.trim().includes('Começar agora!'),
    );

    expect(startButton).toBeDefined();
    expect(startButton?.getAttribute('href') || startButton?.getAttribute('ng-reflect-router-link')).toBeTruthy();
  });

  it('apresenta as 4 etapas da seção "Como funciona"', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Crie sua conta');
    expect(element.textContent).toContain('Faça sua avaliação inicial');
    expect(element.textContent).toContain('Inicie o programa Adaptação');
    expect(element.textContent).toContain('Registre e acompanhe');
  });

  it('apresenta a seção Programa Adaptação com duração de 30 dias', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('O Programa Adaptação');
    expect(element.textContent).toContain('Duração de 30 dias');
  });

  it('exibe aviso de caráter educativo voltado a adultos', () => {
    const fixture = TestBed.createComponent(Landing);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('adultos (18+)');
    expect(element.textContent).toContain('não substituindo orientação profissional médica');
  });
});
