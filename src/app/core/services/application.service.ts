import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApplicationResponse,
  ApplicationStatusHistoryResponse,
  CreateApplicationRequest,
  ApplicationReviewResponse,
  UpdateApplicationStatusRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/applications`;

  apply(req: CreateApplicationRequest): Observable<ApplicationResponse> {
    return this.http
      .post<ApplicationResponse>(this.base, req)
      .pipe(catchError(this.handleError));
  }

  getByCandidate(candidateId: number): Observable<ApplicationResponse[]> {
    return this.http
      .get<ApplicationResponse[]>(`${this.base}/candidate/${candidateId}`)
      .pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<ApplicationResponse> {
    return this.http
      .get<ApplicationResponse>(`${this.base}/${id}`)
      .pipe(catchError(this.handleError));
  }
  getByVacancy(vacancyId: number): Observable<ApplicationResponse[]> {
    return this.http
      .get<ApplicationResponse[]>(`${this.base}/vacancy/${vacancyId}`)
      .pipe(catchError(this.handleError));
  }
  getHistory(
    applicationId: number,
  ): Observable<ApplicationStatusHistoryResponse[]> {
    return this.http
      .get<
        ApplicationStatusHistoryResponse[]
      >(`${this.base}/${applicationId}/history`)
      .pipe(catchError(this.handleError));
  }
  getReview(applicationId: number): Observable<ApplicationReviewResponse> {
    return this.http
      .get<ApplicationReviewResponse>(`${this.base}/${applicationId}/review`)
      .pipe(catchError(this.handleError));
  }

  updateStatus(
    applicationId: number,
    req: UpdateApplicationStatusRequest,
  ): Observable<ApplicationResponse> {
    return this.http
      .put<ApplicationResponse>(`${this.base}/${applicationId}/status`, req)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message ?? 'An error occurred.';
    const missing: string[] = err.error?.missingDocumentTypes ?? [];
    const full = missing.length ? `${msg} Missing: ${missing.join(', ')}` : msg;
    return throwError(() => new Error(full));
  }
}
