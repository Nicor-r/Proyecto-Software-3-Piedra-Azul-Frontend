import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { medicoGuard } from './medico.guard';
import { Auth } from '../services/auth';

describe('medicoGuard', () => {
  let authFalso: { isLoggedIn: () => boolean; isMedico: () => boolean };

  function ejecutarGuard() {
    return TestBed.runInInjectionContext(() =>
      medicoGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );
  }

  beforeEach(() => {
    authFalso = { isLoggedIn: () => true, isMedico: () => true };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Auth, useValue: authFalso }],
    });
  });

  it('deja pasar a un medico con sesion iniciada', () => {
    expect(ejecutarGuard()).toBe(true);
  });

  it('sin sesion redirige al login', () => {
    authFalso.isLoggedIn = () => false;

    const resultado = ejecutarGuard() as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(resultado)).toBe('/auth/login');
  });

  it('con sesion de otro rol redirige al inicio', () => {
    authFalso.isMedico = () => false;

    const resultado = ejecutarGuard() as UrlTree;

    expect(TestBed.inject(Router).serializeUrl(resultado)).toBe('/');
  });
});