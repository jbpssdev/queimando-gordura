import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthSessionService } from '../auth-session.service';

export const guestGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  return session.ensureInitialized().pipe(
    map(({ user, profile }) => {
      if (!user) {
        return true;
      }

      if (!user.emailVerified) {
        return router.createUrlTree(['/verificar-email']);
      }

      if (!profile || !profile.firstName || !profile.age18Confirmed) {
        return router.createUrlTree(['/completar-perfil']);
      }

      return router.createUrlTree(['/painel']);
    }),
  );
};
