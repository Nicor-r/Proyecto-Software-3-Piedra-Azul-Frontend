import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Auth } from './auth';

/** Crea un token JWT falso (sin firma real) con el rol indicado. */
function tokenConRol(rol: string): string {
  const payload = btoa(JSON.stringify({ sub: 'usuario@piedrazul.com', role: rol }));
  return `encabezado.${payload}.firma`;
}

describe('Auth - rol MEDICO', () => {
  let auth: Auth;

  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideHttpClient()] });
    auth = TestBed.inject(Auth);
  });

  it('isMedico es verdadero cuando el token tiene rol MEDICO', () => {
    sessionStorage.setItem('auth_token', tokenConRol('MEDICO'));

    expect(auth.isMedico()).toBe(true);
    expect(auth.isAdmin()).toBe(false);
  });

  it('isMedico es falso para otros roles', () => {
    sessionStorage.setItem('auth_token', tokenConRol('AGENDADOR'));

    expect(auth.isMedico()).toBe(false);
  });

  it('isMedico es falso sin sesion', () => {
    expect(auth.isMedico()).toBe(false);
  });
});