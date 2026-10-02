import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, forkJoin, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

// ── Backed by the real /api/offers endpoints ────────────────────────
// Mirrors TalentHub.Controllers.OffersController on the backend.
//
// Important: unlike pre-screening, the backend has no separate "draft, then
// send" step for offer letters - OffersController.Generate fills the
// template AND sends the offer in one call (the application must already be
// 'OfferExtended', and the resulting OfferLetter is created with status
// 'Sent' straight away). So the old client-only 'Draft' status no longer
// exists; an offer is always 'Sent', 'Accepted' or 'Declined'.
//
// Same overlay pattern as PrescreeningService/the old client-only version
// though: the 'OfferSent' / 'OfferAccepted' / 'OfferDeclined' stages shown
// in the UI are a display-only overlay on top of the real 'OfferExtended'
// backend status, driven by whether an OfferLetter record exists for the
// application. It is never sent to the backend as an application status
// itself.

export type OfferLetterStatus = 'Sent' | 'Accepted' | 'Declined';

export interface OfferLetterResponse {
  offerLetterId: number;
  applicationId: number;
  candidateId: number;
  candidateName: string;
  vacancyId: number;
  versionNumber: number;
  salary: number;
  startDate: string;      // ISO date
  closingDate: string;    // ISO date
  jobTitle: string;
  employmentType: string;
  location: string;
  generatedHtml: string;
  status: OfferLetterStatus;
  sentAt: string;
  respondedAt?: string;
}

// Fields the recruiter fills in by hand at generate time - nothing here is
// pre-filled/defaulted by the frontend. JobTitle/EmploymentType/Location are
// optional overrides; when omitted the backend pulls them from the Vacancy.
export interface GenerateOfferRequest {
  salary: number;
  startDate: string;      // ISO date, e.g. "2026-09-01"
  closingDate: string;    // ISO date
  jobTitle?: string;
  employmentType?: string;
  location?: string;
}

export interface OfferLetterTemplateResponse {
  offerLetterTemplateId: number;
  htmlContent: string;
  uploadedAt: string;
}

@Injectable({ providedIn: 'root' })
export class OfferLetterService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/offers`;

  // Last-known (latest) offer letter per applicationId, keyed for
  // synchronous reads (populated whenever any of the calls below resolve).
  private cache = signal<Map<number, OfferLetterResponse>>(new Map());

  // ── Template (recruiter/admin writes the HTML once; Generate fills it in) ──
  getTemplate(): Observable<OfferLetterTemplateResponse | null> {
    return this.http.get<OfferLetterTemplateResponse>(`${this.base}/template`).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) return of(null);
        return throwError(() => new Error(err.error?.message ?? 'Failed to load the offer letter template.'));
      })
    );
  }

  uploadTemplate(htmlContent: string): Observable<OfferLetterTemplateResponse> {
    return this.http.post<OfferLetterTemplateResponse>(`${this.base}/template`, { htmlContent })
      .pipe(catchError(this.handleError));
  }

  // ── Offer letter lifecycle ──────────────────────────────────────
  /**
   * Recruiter/Admin generates the offer letter from the template AND sends
   * it to the candidate in one step (this is what the backend does - there
   * is no separate draft/edit/send flow). Application must be OfferExtended,
   * and a template must already exist.
   */
  generate(applicationId: number, request: GenerateOfferRequest): Observable<OfferLetterResponse> {
    return this.http.post<OfferLetterResponse>(`${this.base}/${applicationId}/generate`, request).pipe(
      tap(res => this.updateCache(res)),
      catchError(this.handleError)
    );
  }

  /** Fetches (and caches) the latest offer letter for an application, or null if none has been generated yet. */
  getLatest(applicationId: number): Observable<OfferLetterResponse | null> {
    return this.http.get<OfferLetterResponse>(`${this.base}/${applicationId}/latest`).pipe(
      tap(res => this.updateCache(res)),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) { this.removeFromCache(applicationId); return of(null); }
        return throwError(() => new Error(err.error?.message ?? 'Failed to load the offer letter.'));
      })
    );
  }

  /** Fetches the full version history for an application (oldest first). */
  getHistory(applicationId: number): Observable<OfferLetterResponse[]> {
    return this.http.get<OfferLetterResponse[]>(`${this.base}/${applicationId}`).pipe(
      catchError(this.handleError)
    );
  }

  /** Fetches several applications' latest offer letters at once and warms the cache. Errors per-item are swallowed to null. */
  preload(applicationIds: number[]): Observable<(OfferLetterResponse | null)[]> {
    const unique = [...new Set(applicationIds)];
    if (!unique.length) return of([]);
    return forkJoin(unique.map(id => this.getLatest(id).pipe(catchError(() => of(null)))));
  }

  /** Candidate accepts or declines the currently-sent offer. */
  respond(offerLetterId: number, response: 'Accepted' | 'Declined'): Observable<OfferLetterResponse> {
    return this.http.put<OfferLetterResponse>(`${this.base}/${offerLetterId}/respond`, { response }).pipe(
      tap(res => this.updateCache(res)),
      catchError(this.handleError)
    );
  }

  /** Synchronous read of the last-fetched offer for this application (populated by the calls above). */
  peek(applicationId: number): OfferLetterResponse | undefined {
    return this.cache().get(applicationId);
  }

  /** The status to *display* on top of the real backend application status while an offer is sent/resolved. */
  effectiveStatus(applicationId: number, backendStatus: string): string {
    const offer = this.peek(applicationId);
    if (!offer) return backendStatus;
    if (offer.status === 'Sent') return 'OfferSent';
    if (offer.status === 'Accepted') return 'OfferAccepted';
    return 'OfferDeclined';
  }

  /** Triggers a browser download of the backend-generated offer letter (HTML, since PDF export isn't wired up on the backend yet). */
  downloadLetter(offer: OfferLetterResponse): void {
    const blob = new Blob([offer.generatedHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Offer-Letter-${offer.candidateName.replace(/\s+/g, '-')}-v${offer.versionNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  private updateCache(res: OfferLetterResponse): void {
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
    return throwError(() => new Error(typeof message === 'string' ? message : JSON.stringify(message)));
  }
}
