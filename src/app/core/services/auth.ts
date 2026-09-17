import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

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

const TOKEN_KEY = 'auth_token';

@Injectable({
  providedIn: 'root'
})
export class Auth {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly apiUrl = 'http://localhost:8080/api/auth';

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
