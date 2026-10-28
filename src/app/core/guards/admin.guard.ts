import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

/**
 * Protege las rutas del panel de administrador: exige sesión iniciada y
 * rol ADMIN. Si no hay sesión, redirige a login; si hay sesión pero el
 * rol no es ADMIN, redirige al inicio.
 */
export const adminGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/auth/login']);
  }

  if (!authService.isAdmin()) {
    return router.createUrlTree(['/']);
  }

  return true;
};
