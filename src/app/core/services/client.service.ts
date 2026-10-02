import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ClientResponse, CreateClientRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class ClientService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/Client`;

  getAll(): Observable<ClientResponse[]> {
    return this.http.get<ClientResponse[]>(this.base).pipe(catchError(this.handleError));
  }

  create(req: CreateClientRequest): Observable<ClientResponse> {
    return this.http.post<ClientResponse>(this.base, req).pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.error ?? 'Client request failed.';
    return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
}