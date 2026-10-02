import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CandidateResponse, CreateCandidateRequest, UpdateCandidateRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class CandidateService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/candidates`;

  create(req: CreateCandidateRequest): Observable<CandidateResponse> {
    return this.http.post<CandidateResponse>(this.base, req).pipe(catchError(this.handleError));
  }

  // Resolves the logged-in Candidate's own profile - no candidateId needed, no Recruiter/Admin role required.
  getMyProfile(): Observable<CandidateResponse> {
    return this.http.get<CandidateResponse>(`${this.base}/me`).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<CandidateResponse> {
    return this.http.get<CandidateResponse>(`${this.base}/${id}`).pipe(catchError(this.handleError));
  }

  // Recruiter/Admin only on the backend - talent pool browsing, not for resolving "my own" profile.
  getAll(): Observable<CandidateResponse[]> {
    return this.http.get<CandidateResponse[]>(this.base).pipe(catchError(this.handleError));
  }

  update(id: number, req: UpdateCandidateRequest): Observable<CandidateResponse> {
    return this.http.put<CandidateResponse>(`${this.base}/${id}`, req).pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? 'An unexpected error occurred.';
    return throwError(() => new Error(message));
  }
}