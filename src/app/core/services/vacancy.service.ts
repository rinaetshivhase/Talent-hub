import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { VacancyResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class VacancyService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/vacancy`;

  // Candidate portal only sees Published vacancies
 getAll(): Observable<VacancyResponse[]> {
  return this.http.get<VacancyResponse[]>(`${environment.apiUrl}/Vacancy/published`)
    .pipe(catchError(this.handleError));
}

  // Used by documents page to load vacancy-specific required docs
  getById(id: number): Observable<VacancyResponse> {
    return this.http.get<VacancyResponse>(`${this.base}/${id}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    return throwError(() => new Error(err.error?.message ?? 'Could not load vacancies.'));
  }
}
