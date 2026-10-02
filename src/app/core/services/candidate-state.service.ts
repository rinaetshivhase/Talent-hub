import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { CandidateResponse } from '../models';
import { CandidateService } from './candidate.service';

/**
 * Thin reactive cache layer over CandidateService.
 * Components inject this instead of CandidateService directly so they
 * get a signal-based profile without triggering duplicate HTTP calls.
 */
@Injectable({ providedIn: 'root' })
export class CandidateStateService {
  private candidateService = inject(CandidateService);

  private _profile = signal<CandidateResponse | null>(null);
  private _loaded = signal(false);

  profile = computed(() => this._profile());
  loaded = computed(() => this._loaded());

  /**
   * Call once on login / app init to resolve and cache the profile.
   * Uses GET /candidates/me - resolves the logged-in Candidate's own record via their token,
   * no candidateId needed and no Recruiter/Admin role required (unlike GetAll, which is
   * Recruiter/Admin only on the backend).
   *
   * A 404 here just means "hasn't created a profile yet" - that's a normal state for a
   * brand-new candidate, not an error, so it resolves successfully with profile = null
   * rather than surfacing an error banner in the UI.
   */
  loadMyProfile(): Observable<CandidateResponse | null> {
    return this.candidateService.getMyProfile().pipe(
      tap(profile => {
        this._profile.set(profile);
        this._loaded.set(true);
      }),
      catchError((err: HttpErrorResponse) => {
        if (err.status === 404) {
          this._profile.set(null);
          this._loaded.set(true);
          return of(null);
        }
        // Any other error (401, 500, etc.) is a real failure - let it propagate
        // so the component can show an actual error message.
        throw err;
      })
    );
  }

  /** Refresh after create / update. */
  refresh(): Observable<CandidateResponse | null> {
    return this.loadMyProfile();
  }

  setProfile(p: CandidateResponse): void {
    this._profile.set(p);
    this._loaded.set(true);
  }

  clear(): void {
    this._profile.set(null);
    this._loaded.set(false);
  }
}