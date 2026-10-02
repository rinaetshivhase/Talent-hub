import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { QualificationResponse, CreateQualificationRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class CandidateQualificationService {
  private http = inject(HttpClient);
  private base(candidateId: number) { return `${environment.apiUrl}/candidates/${candidateId}/qualifications`; }

  getAll(candidateId: number, type?: 'Education' | 'Certification'): Observable<QualificationResponse[]> {
    const url = type ? `${this.base(candidateId)}?type=${type}` : this.base(candidateId);
    return this.http.get<QualificationResponse[]>(url).pipe(catchError(this.handleError));
  }

  create(candidateId: number, req: CreateQualificationRequest): Observable<QualificationResponse> {
    return this.http.post<QualificationResponse>(this.base(candidateId), req).pipe(catchError(this.handleError));
  }

  delete(candidateId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(candidateId)}/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.error ?? 'Qualification request failed.';
    return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
}