import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CandidateDocumentResponse, MandatoryDocumentsStatusResponse } from '../models';

// ── Matches the backend DocumentType enum exactly ─────────────────
export type DocumentTypeKey =
  | 'CV'
  | 'MatricCertificate'
  | 'Qualification'
  | 'Certification'
  | 'Other';

export const ALL_DOC_TYPES: DocumentTypeKey[] = [
  'CV', 'MatricCertificate', 'Qualification', 'Certification', 'Other'
];

export const DOCUMENT_TYPE_LABELS: Record<DocumentTypeKey, string> = {
  CV:                'Curriculum Vitae (CV)',
  MatricCertificate: 'Matric Certificate',
  Qualification:     'Tertiary Qualification',
  Certification:     'Certification',
  Other:             'Other Document'
};

// System-wide mandatory docs (always required, regardless of vacancy)
export const GLOBAL_MANDATORY: DocumentTypeKey[] = ['CV', 'MatricCertificate'];

// Types selectable via the generic "upload another document" dropdown on the Documents page.
// 'Qualification' and 'Certification' are deliberately excluded here - those are now uploaded
// in context from the Qualifications page (attached to a specific qualification entry) instead.
export const FREE_UPLOAD_DOC_TYPES: DocumentTypeKey[] = ['Other'];

// Client-side file validation — mirrors backend AllowedExtensions + MaxFileSizeBytes
const ALLOWED_EXT   = ['.pdf', '.doc', '.docx'];
const MAX_BYTES     = 5 * 1024 * 1024;

export function validateFileClient(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXT.includes(ext))
    return `"${file.name}" — unsupported type. Accepted: PDF, DOC, DOCX.`;
  if (file.size > MAX_BYTES)
    return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — max 5 MB.`;
  return null;
}

@Injectable({ providedIn: 'root' })
export class DocumentService {
  private http = inject(HttpClient);

  private base(candidateId: number): string {
    return `${environment.apiUrl}/candidates/${candidateId}/documents`;
  }

  // qualificationId is optional - pass it when this file is proof/attachment for a specific
  // qualification entry (e.g. a degree certificate), omit it for general standalone uploads.
  upload(candidateId: number, documentType: DocumentTypeKey, file: File, qualificationId?: number): Observable<CandidateDocumentResponse> {
    const form = new FormData();
    form.append('documentType', documentType);
    form.append('file', file, file.name);
    if (qualificationId != null) {
      form.append('qualificationId', String(qualificationId));
    }
    return this.http.post<CandidateDocumentResponse>(this.base(candidateId), form)
      .pipe(catchError(this.handleError));
  }

  // Optional qualificationId filter - pass it to get only documents attached to that qualification.
  getAll(candidateId: number, qualificationId?: number): Observable<CandidateDocumentResponse[]> {
    const url = qualificationId != null
      ? `${this.base(candidateId)}?qualificationId=${qualificationId}`
      : this.base(candidateId);
    return this.http.get<CandidateDocumentResponse[]>(url)
      .pipe(catchError(this.handleError));
  }

  getMandatoryStatus(candidateId: number): Observable<MandatoryDocumentsStatusResponse> {
    return this.http.get<MandatoryDocumentsStatusResponse>(`${this.base(candidateId)}/mandatory-status`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? err.error ?? 'Upload failed.';
    return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
}