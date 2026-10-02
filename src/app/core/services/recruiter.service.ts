import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, map, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RecruiterResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class RecruiterService {
  private http = inject(HttpClient);

  getAll(): Observable<RecruiterResponse[]> {
    return this.http.get<RecruiterResponse[]>(`${environment.apiUrl}/Recruiter`);
  }

  // No dedicated "my recruiter profile" endpoint exists yet — resolve it client-side
  // by matching the logged-in user's userId against the recruiter list.
  getMyRecruiterId(userId: number): Observable<number | null> {
    return this.getAll().pipe(
      map(list => list.find(r => r.userId === userId)?.recruiterId ?? null)
    );
  }
  create(req: { userId: number; jobTitle: string }): Observable<RecruiterResponse> {
  return this.http.post<RecruiterResponse>(`${environment.apiUrl}/Recruiter`, req)
    .pipe(catchError((err: HttpErrorResponse) => {
      const message = err.error?.message ?? err.error ?? 'Recruiter request failed.';
      return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
    }));
}
}
