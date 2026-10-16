import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () =>
      import('./features/foundation/foundation').then((module) => module.Foundation),
  },
  { path: '**', redirectTo: '' },
];
