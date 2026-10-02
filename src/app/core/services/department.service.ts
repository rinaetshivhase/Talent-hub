import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DepartmentResponse } from '../models';

export interface CreateDepartmentRequest {
  name: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService {
  private http = inject(HttpClient);

  getAll(): Observable<DepartmentResponse[]> {
    return this.http.get<DepartmentResponse[]>(
      `${environment.apiUrl}/Department`
    );
  }

  create(request: CreateDepartmentRequest): Observable<DepartmentResponse> {
    return this.http.post<DepartmentResponse>(
      `${environment.apiUrl}/Department`,
      request
    );
  }
}