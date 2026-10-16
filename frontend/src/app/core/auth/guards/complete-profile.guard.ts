import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthSessionService } from '../auth-session.service';

export const completeProfileGuard: CanActivateFn = () => {
  const session = inject(AuthSessionService);
  const router = inject(Router);

  return session.ensureInitialized().pipe(
    map(({ user, profile }) => {
      if (!user) {
        return router.createUrlTree(['/entrar']);
      }

      if (!user.emailVerified) {
        return router.createUrlTree(['/verificar-email']);
      }

      if (profile && profile.firstName && profile.age18Confirmed) {
        return router.createUrlTree(['/painel']);
      }

      return true;
    }),
  );
};
