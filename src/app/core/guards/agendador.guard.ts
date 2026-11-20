import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

/**
 * Protege las rutas del panel del agendador: exige sesión iniciada y
 * rol AGENDADOR. Sin sesión redirige al login; con otro rol, al inicio.
 * La seguridad real la garantiza el backend (rol AGENDADOR en /api/citas).
 */
export const agendadorGuard: CanActivateFn = () => {
    const authService = inject(Auth);
    const router = inject(Router);

    if (!authService.isLoggedIn()) {
        return router.createUrlTree(['/auth/login']);
    }

    if (!authService.isAgendador()) {
        return router.createUrlTree(['/']);
    }

    return true;
};