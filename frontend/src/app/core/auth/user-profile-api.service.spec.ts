import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserProfileApiService } from './user-profile-api.service';
import type { CreateOrUpdateUserProfileDto, UserProfile } from './user-profile.model';

describe('UserProfileApiService', () => {
  let service: UserProfileApiService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(UserProfileApiService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('consulta o perfil com GET /api/v1/users/me sem enviar uid no endpoint', () => {
    const mockProfile: UserProfile = {
      uid: 'user-xyz',
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana@example.com',
      emailVerified: true,
      age18Confirmed: true,
      createdAt: '2026-10-16T00:00:00Z',
      updatedAt: '2026-10-16T00:00:00Z',
    };

    service.getProfile().subscribe((res) => {
      expect(res).toEqual(mockProfile);
    });

    const req = httpTesting.expectOne('/api/v1/users/me');
    expect(req.request.method).toBe('GET');
    req.flush(mockProfile);
  });

  it('cria ou atualiza perfil com PUT /api/v1/users/me enviando DTO no corpo', () => {
    const dto: CreateOrUpdateUserProfileDto = {
      firstName: 'Ana',
      lastName: 'Silva',
      age18Confirmed: true,
    };

    const mockResponse: UserProfile = {
      uid: 'user-xyz',
      firstName: 'Ana',
      lastName: 'Silva',
      email: 'ana@example.com',
      emailVerified: false,
      age18Confirmed: true,
      createdAt: '2026-10-16T00:00:00Z',
      updatedAt: '2026-10-16T00:00:00Z',
    };

    service.saveProfile(dto).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpTesting.expectOne('/api/v1/users/me');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(dto);
    req.flush(mockResponse);
  });
});
