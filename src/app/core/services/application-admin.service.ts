import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApplicationResponse, ApplicationStatusHistoryResponse, UpdateApplicationStatusRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class ApplicationAdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/Applications`;

  getAll(): Observable<ApplicationResponse[]> {
    return this.http.get<ApplicationResponse[]>(this.base).pipe(catchError(this.handleError));
  }

  updateStatus(id: number, req: UpdateApplicationStatusRequest): Observable<ApplicationResponse> {
    return this.http.put<ApplicationResponse>(`${this.base}/${id}/status`, req).pipe(catchError(this.handleError));
  }

  getHistory(id: number): Observable<ApplicationStatusHistoryResponse[]> {
    return this.http.get<ApplicationStatusHistoryResponse[]>(`${this.base}/${id}/history`).pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.error ?? 'Application request failed.';
    return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
}