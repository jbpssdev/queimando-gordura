import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { CompleteProfile } from './complete-profile';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../../../core/auth/user-profile.model';

describe('CompleteProfile Component', () => {
  let router: Router;
  let mockAuthSession: Partial<AuthSessionService>;

  beforeEach(() => {
    mockAuthSession = {
      currentUser: signal({ displayName: 'Mariana Costa' } as unknown as User),
      saveProfile: vi.fn().mockResolvedValue({
        uid: '123',
        firstName: 'Mariana',
        lastName: 'Costa',
        age18Confirmed: true,
      } as unknown as UserProfile),
    };

    TestBed.configureTestingModule({
      imports: [CompleteProfile],
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: mockAuthSession },
      ],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('pré-preenche nome e sobrenome a partir do displayName do usuário autenticado', () => {
    const fixture = TestBed.createComponent(CompleteProfile);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    expect(component['firstNameControl'].value).toBe('Mariana');
    expect(component['lastNameControl'].value).toBe('Costa');
    expect(component['age18Control'].value).toBe(false);
    expect(component['form'].valid).toBe(false); // age18Confirmed ainda pendente
  });

  it('salva o perfil após autodeclaração de maioridade e encaminha ao painel', async () => {
    const fixture = TestBed.createComponent(CompleteProfile);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    component['form'].patchValue({ age18Confirmed: true });
    expect(component['form'].valid).toBe(true);

    await component['onSubmit']();

    expect(mockAuthSession.saveProfile).toHaveBeenCalledWith({
      firstName: 'Mariana',
      lastName: 'Costa',
      age18Confirmed: true,
    });
    expect(router.navigate).toHaveBeenCalledWith(['/painel']);
  });
});
