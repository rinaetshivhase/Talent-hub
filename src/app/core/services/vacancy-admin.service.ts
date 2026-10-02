import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateVacancyRequest, UpdateVacancyRequest, VacancyResponse } from '../models';

export interface VacancyChangeHistoryEntry {
  vacancyChangeHistoryId: number;
  vacancyId: number;
  vacancyTitle: string;
  action: string;
  details?: string;
  changedByName: string;
  changedAt: string;
}

@Injectable({ providedIn: 'root' })
export class VacancyAdminService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/Vacancy`;

  create(req: CreateVacancyRequest): Observable<VacancyResponse> {
    return this.http.post<VacancyResponse>(`${this.base}/create`, req)
      .pipe(catchError(this.handleError));
  }

  update(id: number, req: UpdateVacancyRequest): Observable<VacancyResponse> {
    return this.http.put<VacancyResponse>(`${this.base}/${id}/edit`, req)
      .pipe(catchError(this.handleError));
  }

  publish(id: number): Observable<VacancyResponse> {
    return this.http.patch<VacancyResponse>(`${this.base}/${id}/publish`, {})
      .pipe(catchError(this.handleError));
  }

  close(id: number): Observable<VacancyResponse> {
    return this.http.patch<VacancyResponse>(`${this.base}/${id}/close`, {})
      .pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<VacancyResponse> {
    return this.http.get<VacancyResponse>(`${this.base}/${id}`)
      .pipe(catchError(this.handleError));
  }

  getHistory(id: number): Observable<VacancyChangeHistoryEntry[]> {
    return this.http.get<VacancyChangeHistoryEntry[]>(`${this.base}/${id}/history`)
      .pipe(catchError(this.handleError));
  }

 
  // NOTE: this route really does have a trailing period — confirmed from the controller:
  // [HttpGet("GetVacancyByStatus.")]
  getAllByStatus(status?: string): Observable<VacancyResponse[]> {
    const url = status
      ? `${this.base}/GetVacancyByStatus.?status=${status}`
      : `${this.base}/GetVacancyByStatus.`;
    return this.http.get<VacancyResponse[]>(url)
      .pipe(catchError(this.handleError));
  }

   getRecentHistory(take = 20): Observable<VacancyChangeHistoryEntry[]> {
  return this.http.get<VacancyChangeHistoryEntry[]>(`${this.base}/history/recent?take=${take}`)
    .pipe(catchError(this.handleError));
}

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.error ?? 'Vacancy request failed.';
    return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
}