import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const authGuard: CanActivateFn = () => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  // Si no está autenticado, redirige al login
  return router.createUrlTree(['/auth/login']);
};

//Verifica que el usuario es admin para poder acceder a la pagina
export const adminGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return auth.isLoggedIn() && auth.isAdmin() ? true : router.createUrlTree(['/']);
};