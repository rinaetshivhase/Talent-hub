import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SkillResponse } from '../models';

export interface CreateSkillRequest {
  name: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class SkillService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/Skills`;

 getAll(): Observable<SkillResponse[]> {
  return this.http.get<SkillResponse[]>(this.base).pipe(catchError(this.handleError));
}

getByCategory(category: 'Technical' | 'SoftSkill'): Observable<SkillResponse[]> {
  return this.http.get<SkillResponse[]>(`${this.base}?category=${category}`).pipe(catchError(this.handleError));
}

  create(req: CreateSkillRequest): Observable<SkillResponse> {
    return this.http.post<SkillResponse>(this.base, req).pipe(catchError(this.handleError));
  }

  update(id: number, req: CreateSkillRequest): Observable<SkillResponse> {
    return this.http.put<SkillResponse>(`${this.base}/${id}`, req).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`).pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.error ?? 'Skill request failed.';
    return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
}