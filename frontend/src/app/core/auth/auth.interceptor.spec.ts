import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from './auth.interceptor';
import { AuthSessionService } from './auth-session.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let mockSession: Partial<AuthSessionService>;

  beforeEach(() => {
    mockSession = {
      getIdToken: vi.fn().mockResolvedValue('jwt-test-token-123'),
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthSessionService, useValue: mockSession },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('anexa o cabeçalho Authorization com Bearer token para chamadas da API local', async () => {
    http.get('/api/v1/users/me').subscribe();

    // Permite resolução da Promise do token
    await new Promise((resolve) => setTimeout(resolve, 0));

    const req = httpTesting.expectOne('/api/v1/users/me');
    expect(req.request.headers.get('Authorization')).toBe('Bearer jwt-test-token-123');
    req.flush({});
  });

  it('NÃO anexa o cabeçalho Authorization para endpoints externos', async () => {
    http.get('https://external-api.com/status').subscribe();

    await new Promise((resolve) => setTimeout(resolve, 0));

    const req = httpTesting.expectOne('https://external-api.com/status');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('mantém a requisição sem header se não houver token disponível', async () => {
    vi.mocked(mockSession.getIdToken)!.mockResolvedValueOnce(null);

    http.get('/api/v1/users/me').subscribe();

    await new Promise((resolve) => setTimeout(resolve, 0));

    const req = httpTesting.expectOne('/api/v1/users/me');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });
});
