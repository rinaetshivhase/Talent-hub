import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, LoginRequest, RegisterRequest, CreateRecruiterRequest, ChangePasswordRequest } from '../models';

export interface SessionUser {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/auth`;

  private _session = signal<SessionUser | null>(this.loadSession());

  isLoggedIn = computed(() => !!this._session());
  currentUser = computed(() => this._session());

  register(req: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/register`, req).pipe(
      catchError(this.handleError)
    );
  }

  // Admin only - creates the User account AND the Recruiter profile together in one call.
  createRecruiter(req: CreateRecruiterRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/create-recruiter`, req).pipe(
      catchError(this.handleError)
    );
  }

  login(req: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.base}/login`, req).pipe(
      tap(res => this.persistSession(res)),
      catchError(this.handleError)
    );
  }

  changePassword(req: ChangePasswordRequest): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/change-password`, req).pipe(
      tap(() => this.clearMustChangePasswordFlag()),
      catchError(this.handleError)
    );
  }

  // Updates the flag locally after a successful password change, so the reminder
  // banner disappears immediately without needing the person to log in again.
  private clearMustChangePasswordFlag(): void {
    const current = this._session();
    if (!current) return;
    const updated: SessionUser = { ...current, mustChangePassword: false };
    localStorage.setItem('rms_auth', JSON.stringify(updated));
    this._session.set(updated);
  }

  logout(): void {
    localStorage.removeItem('rms_token');
    localStorage.removeItem('rms_auth');
    this._session.set(null);
  }

  private persistSession(res: AuthResponse): void {
    localStorage.setItem('rms_token', res.token);
    const session: SessionUser = {
      userId: res.userId,
      firstName: res.firstName,
      lastName: res.lastName,
      email: res.email,
      role: res.role,
      mustChangePassword: res.mustChangePassword
    };
    localStorage.setItem('rms_auth', JSON.stringify(session));
    this._session.set(session);
  }

  private loadSession(): SessionUser | null {
    try {
      const raw = localStorage.getItem('rms_auth');
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(message));
  }
}