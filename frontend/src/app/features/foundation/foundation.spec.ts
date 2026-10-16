import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Foundation } from './foundation';

describe('Foundation', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Foundation],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('verifica a API somente após ação do usuário e evita consultas duplicadas', () => {
    const fixture = TestBed.createComponent(Foundation);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('h1')?.textContent).toContain('Uma base sólida.');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('ainda não verificada');
    http.expectNone('/api/v1/health');
    const button = element.querySelector('button')!;
    button.click();
    fixture.detectChanges();
    expect(button.disabled).toBe(true);
    http.expectOne('/api/v1/health').flush({ status: 'ok' });
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'API em funcionamento.',
    );
    expect(button.disabled).toBe(false);
  });

  it('informa indisponibilidade sem apresentar sucesso fictício', () => {
    const fixture = TestBed.createComponent(Foundation);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    element.querySelector('button')!.click();
    http.expectOne('/api/v1/health').flush({}, { status: 503, statusText: 'Unavailable' });
    fixture.detectChanges();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('API indisponível');
    expect(element.querySelector('button')!.disabled).toBe(false);
  });
});
