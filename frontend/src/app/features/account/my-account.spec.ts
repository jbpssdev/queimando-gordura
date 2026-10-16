import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { signal } from '@angular/core';
import { MyAccount } from './my-account';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import type { UserProfile } from '../../core/auth/user-profile.model';
import type { User } from 'firebase/auth';

describe('MyAccount Component', () => {
  let router: Router;
  let mockAuthSession: Partial<AuthSessionService>;

  beforeEach(() => {
    mockAuthSession = {
      currentUser: signal({
        email: 'ana.silva@exemplo.com',
      } as unknown as User),
      currentProfile: signal({
        uid: 'u-123',
        firstName: 'Ana',
        lastName: 'Silva',
        email: 'ana.silva@exemplo.com',
        emailVerified: true,
        age18Confirmed: true,
        createdAt: '2026-10-16T12:00:00.000Z',
        updatedAt: '2026-10-16T12:00:00.000Z',
      } as unknown as UserProfile),
      userDisplayName: signal('Ana Silva'),
      signOut: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      imports: [MyAccount],
      providers: [
        provideRouter([]),
        { provide: AuthSessionService, useValue: mockAuthSession },
      ],
    });

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
  });

  it('renderiza os dados reais do perfil obtidos da sessão', () => {
    const fixture = TestBed.createComponent(MyAccount);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Ana');
    expect(element.textContent).toContain('Silva');
    expect(element.textContent).toContain('ana.silva@exemplo.com');
    expect(element.textContent).toContain('Confirmado');
    expect(element.textContent).toContain('18 anos ou mais');
  });

  it('executa logout com segurança ao clicar no botão de encerrar sessão', async () => {
    const fixture = TestBed.createComponent(MyAccount);
    fixture.detectChanges();

    const component = fixture.componentInstance;
    await component['onSignOut']();

    expect(mockAuthSession.signOut).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/entrar']);
  });
});
