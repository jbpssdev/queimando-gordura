import { inject } from '@angular/core';
import type { HttpInterceptorFn } from '@angular/common/http';
import { from, switchMap } from 'rxjs';
import { AuthSessionService } from './auth-session.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(AuthSessionService);

  // Anexa token exclusivamente a chamadas da API local (/api/ ou api/)
  const isInternalApi = req.url.startsWith('/api/') || req.url.startsWith('api/');
  if (!isInternalApi) {
    return next(req);
  }

  return from(session.getIdToken()).pipe(
    switchMap((token) => {
      if (token) {
        const authorizedRequest = req.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`,
          },
        });
        return next(authorizedRequest);
      }
      return next(req);
    }),
  );
};
