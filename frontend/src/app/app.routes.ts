import { Routes } from '@angular/router';
import { authGuard } from './core/auth/guards/auth.guard';
import { completeProfileGuard } from './core/auth/guards/complete-profile.guard';
import { guestGuard } from './core/auth/guards/guest.guard';
import { verifyEmailGuard } from './core/auth/guards/verify-email.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./features/landing/landing').then((m) => m.Landing),
  },
  {
    path: 'entrar',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'cadastrar',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'recuperar-senha',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./features/auth/forgot-password/forgot-password').then((m) => m.ForgotPassword),
  },
  {
    path: 'verificar-email',
    canActivate: [verifyEmailGuard],
    loadComponent: () =>
      import('./features/auth/verify-email/verify-email').then((m) => m.VerifyEmail),
  },
  {
    path: 'completar-perfil',
    canActivate: [completeProfileGuard],
    loadComponent: () =>
      import('./features/auth/complete-profile/complete-profile').then((m) => m.CompleteProfile),
  },
  {
    path: 'painel',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'minha-conta',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/account/my-account').then((m) => m.MyAccount),
  },

  {
    path: 'avaliacao',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/assessment/assessment').then((m) => m.Assessment),
  },
  {
    path: 'adaptacao',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/adaptation/adaptation').then((m) => m.Adaptation),
  },
  {
    path: 'verificacao-ambiente',
    loadComponent: () => import('./features/foundation/foundation').then((m) => m.Foundation),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
