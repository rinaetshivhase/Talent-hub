import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { NotificationResponse, UnreadCountResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/notifications`;

  getAll(): Observable<NotificationResponse[]> {
    return this.http
      .get<NotificationResponse[]>(this.base)
      .pipe(catchError(this.handleError));
  }

  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http
      .get<UnreadCountResponse>(`${this.base}/unread-count`)
      .pipe(catchError(this.handleError));
  }

  markAsRead(id: number): Observable<void> {
    return this.http
      .put<void>(`${this.base}/${id}/read`, {})
      .pipe(catchError(this.handleError));
  }

  markAllAsRead(): Observable<void> {
    return this.http
      .put<void>(`${this.base}/read-all`, {})
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message ?? 'An error occurred.';
    return throwError(() => new Error(msg));
  }
}
