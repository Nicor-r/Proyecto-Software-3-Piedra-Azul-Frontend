import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

/**
 * Protege las rutas del panel del medico (HE-04 y HE-05): exige sesion
 * iniciada y rol MEDICO. Sin sesion redirige al login; con otro rol, al inicio.
 * La seguridad real la garantiza el backend (MedicoAuthorizationInterceptor).
 */
export const medicoGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    return router.createUrlTree(['/auth/login']);
  }

  if (!authService.isMedico()) {
    return router.createUrlTree(['/']);
  }

  return true;
};