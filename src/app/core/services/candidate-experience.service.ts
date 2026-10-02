import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ExperienceResponse, CreateExperienceRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class CandidateExperienceService {
  private http = inject(HttpClient);
  private base(candidateId: number) { return `${environment.apiUrl}/candidates/${candidateId}/experience`; }

  getAll(candidateId: number): Observable<ExperienceResponse[]> {
    return this.http.get<ExperienceResponse[]>(this.base(candidateId)).pipe(catchError(this.handleError));
  }

  create(candidateId: number, req: CreateExperienceRequest): Observable<ExperienceResponse> {
    return this.http.post<ExperienceResponse>(this.base(candidateId), req).pipe(catchError(this.handleError));
  }

  delete(candidateId: number, id: number): Observable<void> {
    return this.http.delete<void>(`${this.base(candidateId)}/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.error ?? 'Experience request failed.';
    return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
}