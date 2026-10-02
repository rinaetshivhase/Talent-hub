import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InterviewResponse,
  ScheduleInterviewRequest,
  RescheduleInterviewRequest,
  SetInterviewOutcomeRequest,
} from '../models';

@Injectable({ providedIn: 'root' })
export class InterviewService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/interviews`;

  schedule(
    applicationId: number,
    req: ScheduleInterviewRequest,
  ): Observable<InterviewResponse> {
    return this.http
      .post<InterviewResponse>(`${this.base}/${applicationId}/schedule`, req)
      .pipe(catchError(this.handleError));
  }

  reschedule(
    interviewId: number,
    req: RescheduleInterviewRequest,
  ): Observable<InterviewResponse> {
    return this.http
      .put<InterviewResponse>(`${this.base}/${interviewId}/reschedule`, req)
      .pipe(catchError(this.handleError));
  }

  cancel(interviewId: number): Observable<InterviewResponse> {
    return this.http
      .put<InterviewResponse>(`${this.base}/${interviewId}/cancel`, {})
      .pipe(catchError(this.handleError));
  }

  setOutcome(
    interviewId: number,
    req: SetInterviewOutcomeRequest,
  ): Observable<InterviewResponse> {
    return this.http
      .put<InterviewResponse>(`${this.base}/${interviewId}/outcome`, req)
      .pipe(catchError(this.handleError));
  }

  getById(interviewId: number): Observable<InterviewResponse> {
    return this.http
      .get<InterviewResponse>(`${this.base}/${interviewId}`)
      .pipe(catchError(this.handleError));
  }

  getByApplication(applicationId: number): Observable<InterviewResponse[]> {
    return this.http
      .get<
        InterviewResponse[]
      >(`${environment.apiUrl}/applications/${applicationId}/interviews`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const msg = err.error?.message ?? 'An error occurred.';
    return throwError(() => new Error(msg));
  }
}
