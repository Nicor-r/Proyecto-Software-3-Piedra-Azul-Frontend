import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';


export interface RegisterRequest {
  nombreCompleto: string;
  email: string;
  numeroIdentificacion: string;
  numeroTelefonico: string;
  password: string;
  confirmPassword: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  token: string;
}

/** Roles reconocidos en el token JWT emitido por el backend. */
export type Rol = 'ADMIN' | 'PACIENTE' | string;

const TOKEN_KEY = 'auth_token';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly apiUrl = `${environment.apiUrl}/auth`;

  register(request: RegisterRequest): Observable<void> {
    return this.http.post<void>(
      `${this.apiUrl}/register`,
      request
    );
  }

  login(request: LoginRequest, rememberMe: boolean): Observable<TokenResponse> {
    return this.http.post<TokenResponse>(
      `${this.apiUrl}/login`,
      request
    ).pipe(
      tap((response) => this.setToken(response.token, rememberMe))
    );
  }

  logout(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  /**
   * Obtiene el rol del usuario autenticado a partir del claim del JWT
   * (soporta las variantes `role`, `rol`, `authorities` y `roles`).
   * Devuelve null si no hay token o el token no tiene un rol reconocible.
   */
  getRole(): Rol | null {
    const claims = this.decodeToken();
    if (!claims) {
      return null;
    }

    const crudo =
      claims['role'] ??
      claims['rol'] ??
      claims['authorities'] ??
      claims['roles'];

    if (!crudo) {
      return null;
    }

    const valor = Array.isArray(crudo) ? crudo[0] : crudo;
    return typeof valor === 'string' ? valor.toUpperCase() : null;
  }

  isAdmin(): boolean {
    return this.getRole() === 'ADMIN';
  }

  private decodeToken(): Record<string, unknown> | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    const partes = token.split('.');
    if (partes.length < 2) {
      return null;
    }

    try {
      const base64 = partes[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
          .join('')
      );
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private setToken(token: string, rememberMe: boolean): void {
    if (!this.isBrowser) {
      return;
    }
    if (rememberMe) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
    }
  }
}
