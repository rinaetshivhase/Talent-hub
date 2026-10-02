import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

// Recognised inline-previewable types. Everything else falls back to
// download-only (matches the recruiter-side preview modal's behaviour).
export type FilePreviewKind = 'pdf' | 'unsupported';

export function previewKindFor(fileName: string | null | undefined): FilePreviewKind {
  return (fileName || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'unsupported';
}

// ── Backed by the real /api/prescreening endpoints ─────────────────
// Mirrors TalentHub.Controllers.PrescreeningController on the backend.
//
// Important: the backend only allows sending a pre-screening form once the
// application's real status is 'Shortlisted' (PrescreeningController.Send
// rejects anything else). So - same pattern as OfferLetterService overlaying
// 'OfferExtended' - the 'PreScreening' stage shown in the UI is a display-only
// overlay on top of the real 'Shortlisted' backend status, driven by whether
// a Prescreening record exists for the application. It is never sent to the
// backend as an application status itself.

export type PrescreeningStatus = 'Sent' | 'Submitted' | 'Reviewed';
export type PrescreeningOutcome = 'Pending' | 'Passed' | 'Failed';

export interface PrescreeningResponse {
  prescreeningId: number;
  applicationId: number;
  candidateId: number;
  candidateName: string;
  vacancyId: number;
  vacancyTitle: string;
  status: PrescreeningStatus;
  sentAt: string;
  completedFileUrl?: string;
  completedOriginalFileName?: string;
  submittedAt?: string;
  outcome: PrescreeningOutcome;
  recruiterNotes?: string;
  reviewedAt?: string;
}

export interface PrescreeningTemplateResponse {
  prescreeningTemplateId: number;
  fileUrl: string;
  originalFileName: string;
  uploadedAt: string;
}

// Mirrors PrescreeningController's AllowedExtensions + MaxFileSizeBytes.
const ALLOWED_EXT = ['.pdf', '.doc', '.docx'];
const MAX_BYTES = 5 * 1024 * 1024;

export function validatePrescreeningFile(file: File): string | null {
  const ext = '.' + (file.name.split('.').pop() ?? '').toLowerCase();
  if (!ALLOWED_EXT.includes(ext))
    return `"${file.name}" — unsupported type. Accepted: PDF, DOC, DOCX.`;
  if (file.size > MAX_BYTES)
    return `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — max 5 MB.`;
  return null;
}

@Injectable({ providedIn: 'root' })
export class PrescreeningService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/prescreening`;

  // Last-known pre-screening record per applicationId, keyed for synchronous
  // template reads (populated whenever any of the calls below resolve).
  private cache = signal<Map<number, PrescreeningResponse>>(new Map());

  // ── Template (recruiter uploads once, candidate downloads to fill in) ──
  getTemplate(): Observable<PrescreeningTemplateResponse | null> {
    return this.http
      .get<PrescreeningTemplateResponse>(`${this.base}/template`)
      .pipe(
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) return of(null);
          return throwError(
            () =>
              new Error(
                err.error?.message ??
                  'Failed to load the pre-screening template.',
              ),
          );
        }),
      );
  }

  uploadTemplate(file: File): Observable<PrescreeningTemplateResponse> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http
      .post<PrescreeningTemplateResponse>(`${this.base}/template`, form)
      .pipe(catchError(this.handleError));
  }

  // ── Prescreening lifecycle ──────────────────────────────────────
  /** Recruiter/Admin sends the pre-screening form. Application must be Shortlisted. */
  send(applicationId: number): Observable<PrescreeningResponse> {
    return this.http
      .post<PrescreeningResponse>(`${this.base}/${applicationId}/send`, {})
      .pipe(
        tap((res) => this.updateCache(res)),
        catchError(this.handleError),
      );
  }

  /** Candidate uploads their completed document back. */
  submit(applicationId: number, file: File): Observable<PrescreeningResponse> {
    const form = new FormData();
    form.append('file', file, file.name);
    return this.http
      .post<PrescreeningResponse>(`${this.base}/${applicationId}/submit`, form)
      .pipe(
        tap((res) => this.updateCache(res)),
        catchError(this.handleError),
      );
  }

  /** Fetches (and caches) the pre-screening record for an application, or null if none was sent. */
  getByApplication(
    applicationId: number,
  ): Observable<PrescreeningResponse | null> {
    return this.http
      .get<PrescreeningResponse>(`${this.base}/${applicationId}`)
      .pipe(
        tap((res) => this.updateCache(res)),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) {
            this.removeFromCache(applicationId);
            return of(null);
          }
          return throwError(
            () =>
              new Error(err.error?.message ?? 'Failed to load pre-screening.'),
          );
        }),
      );
  }

  /** Fetches several applications' pre-screening records at once and warms the cache. Errors per-item are swallowed to null. */
  preload(
    applicationIds: number[],
  ): Observable<(PrescreeningResponse | null)[]> {
    const unique = [...new Set(applicationIds)];
    if (!unique.length) return of([]);
    return forkJoin(
      unique.map((id) =>
        this.getByApplication(id).pipe(catchError(() => of(null))),
      ),
    );
  }

  /** Recruiter/Admin records a Pass/Fail outcome once the candidate has submitted. */
  setOutcome(
    applicationId: number,
    outcome: 'Passed' | 'Failed',
    recruiterNotes?: string,
  ): Observable<PrescreeningResponse> {
    return this.http
      .put<PrescreeningResponse>(`${this.base}/${applicationId}/outcome`, {
        outcome,
        recruiterNotes: recruiterNotes?.trim() || undefined,
      })
      .pipe(
        tap((res) => this.updateCache(res)),
        catchError(this.handleError),
      );
  }

  /** Synchronous read of the last-fetched record for this application (populated by the calls above). */
  peek(applicationId: number): PrescreeningResponse | undefined {
    return this.cache().get(applicationId);
  }

  /**
   * The status to *display*. Historically this overlaid a client-only
   * 'PreScreening' stage on top of 'Shortlisted'. That's no longer needed:
   * the backend now transitions the application to the real 'PrescreeningStage'
   * status itself as part of send() (see PrescreeningController.Send), and to
   * 'NotSelected' automatically on a Failed outcome (see SetOutcome). So the
   * real backend status is always authoritative here - this just passes it
   * through. Kept as a method (rather than removing call sites) in case a
   * display-only overlay is needed again later.
   */
  effectiveStatus(applicationId: number, backendStatus: string): string {
    return backendStatus;
  }

  /** Resolves a backend-relative file URL (e.g. CompletedFileUrl) to an absolute one. */
  fileHref(relativeUrl: string | null | undefined): string {
    if (!relativeUrl) return '';
    if (/^https?:\/\//i.test(relativeUrl)) return relativeUrl;
    const origin = environment.apiUrl.replace(/\/api\/?$/, '');
    return relativeUrl.startsWith('/')
      ? origin + relativeUrl
      : `${origin}/${relativeUrl}`;
  }

  /**
   * Fetches a pre-screening file (template or completed submission) as a Blob,
   * through HttpClient so the auth interceptor attaches the bearer token.
   * A plain `<a href>` navigation skips that interceptor entirely, so if the
   * file endpoint requires auth the browser gets a 401 with nothing visible -
   * it just looks like the button "does nothing". Fetching via HttpClient and
   * handing back an object URL avoids that, and surfaces a real error if the
   * request does fail.
   */
  getFileBlob(relativeUrl: string | null | undefined): Observable<Blob> {
    const href = this.fileHref(relativeUrl);
    if (!href) return throwError(() => new Error('No file is available.'));
    return this.http
      .get(href, { responseType: 'blob' })
      .pipe(catchError(this.handleError));
  }

  /** Fetches the file and triggers a real browser download of it. */
  downloadFile(relativeUrl: string | null | undefined, fileName: string): Observable<void> {
    return this.getFileBlob(relativeUrl).pipe(
      map((blob) => {
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      }),
    );
  }

  private updateCache(res: PrescreeningResponse): void {
    const next = new Map(this.cache());
    next.set(res.applicationId, res);
    this.cache.set(next);
  }

  private removeFromCache(applicationId: number): void {
    if (!this.cache().has(applicationId)) return;
    const next = new Map(this.cache());
    next.delete(applicationId);
    this.cache.set(next);
  }

  private handleError(err: HttpErrorResponse) {
    const message = err.error?.message ?? 'An error occurred.';
    return throwError(
      () =>
        new Error(
          typeof message === 'string' ? message : JSON.stringify(message),
        ),
    );
  }
}
