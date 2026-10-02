import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AddressResponse, CreateAddressRequest, UpdateAddressRequest } from '../models';

@Injectable({ providedIn: 'root' })
export class AddressService {
  private http = inject(HttpClient);

  private base(candidateId: number): string {
    return `${environment.apiUrl}/candidates/${candidateId}/addresses`;
  }

  getAll(candidateId: number): Observable<AddressResponse[]> {
    return this.http.get<AddressResponse[]>(this.base(candidateId))
      .pipe(catchError(this.handleError));
  }

  create(candidateId: number, req: CreateAddressRequest): Observable<AddressResponse> {
    return this.http.post<AddressResponse>(this.base(candidateId), req)
      .pipe(catchError(this.handleError));
  }

  update(candidateId: number, addressId: number, req: UpdateAddressRequest): Observable<AddressResponse> {
    return this.http.put<AddressResponse>(`${this.base(candidateId)}/${addressId}`, req)
      .pipe(catchError(this.handleError));
  }

  delete(candidateId: number, addressId: number): Observable<void> {
    return this.http.delete<void>(`${this.base(candidateId)}/${addressId}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.error ?? 'Address request failed.';
    return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
}