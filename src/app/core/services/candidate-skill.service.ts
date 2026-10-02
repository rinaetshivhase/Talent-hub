import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CandidateSkillResponse, AssignSkillsRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class CandidateSkillService {
  private http = inject(HttpClient);
  private base(candidateId: number) { return `${environment.apiUrl}/candidates/${candidateId}/skills`; }

  getAll(candidateId: number): Observable<CandidateSkillResponse[]> {
    return this.http.get<CandidateSkillResponse[]>(this.base(candidateId)).pipe(catchError(this.handleError));
  }

  assign(candidateId: number, req: AssignSkillsRequest): Observable<CandidateSkillResponse[]> {
    return this.http.post<CandidateSkillResponse[]>(this.base(candidateId), req).pipe(catchError(this.handleError));
  }

  remove(candidateId: number, skillId: number): Observable<void> {
    return this.http.delete<void>(`${this.base(candidateId)}/${skillId}`).pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.error ?? 'Skill request failed.';
    return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
}