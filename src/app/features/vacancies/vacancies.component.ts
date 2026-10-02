import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { VacancyService } from '../../core/services/vacancy.service';
import { ApplicationService } from '../../core/services/application.service';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { DocumentService, DOCUMENT_TYPE_LABELS } from '../../core/services/document.service';
import { ToastService } from '../../core/services/toast.service';
import { VacancyResponse, ApplicationResponse, CandidateDocumentResponse } from '../../core/models';

@Component({
  selector: 'app-vacancies',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatChipsModule, MatProgressSpinnerModule, MatTooltipModule, MatDividerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-briefcase"></i> Vacancies</h2>
          <p class="page-sub">{{ filtered().length }} published vacancies · Browse and apply</p>
        </div>
      </div>

      @if (!state.profile()) {
        <div class="info-banner warn">
          <i class="ti ti-alert-triangle"></i>
          Complete your <a routerLink="/profile">candidate profile</a> and
          <a routerLink="/documents">upload documents</a> before applying.
        </div>
      }

      <!-- Search & filter bar -->
      <div class="search-row">
        <div class="search-wrap">
          <i class="ti ti-search search-icon"></i>
          <input [(ngModel)]="searchQ" (ngModelChange)="applyFilters()"
                 type="search" class="search-input"
                 placeholder="Search by title, type or location…">
        </div>
        <select [(ngModel)]="typeFilter" (ngModelChange)="applyFilters()" style="min-width:140px">
          <option value="">All types</option>
          <option>FullTime</option>
          <option>Contract</option>
          <option>Internship</option>
          <option>PartTime</option>
        </select>
      </div>

      @if (loading()) {
        <div class="empty-state"><i class="ti ti-loader"></i><p>Loading vacancies…</p></div>
      } @else if (loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      } @else if (!filtered().length) {
        <div class="empty-state">
          <i class="ti ti-zoom-question"></i>
          <p>No published vacancies match your search.</p>
        </div>
      } @else {
        <div class="vacancy-list">
          @for (v of filtered(); track v.vacancyId) {
            <mat-card class="mat-elevation-z1 vacancy-card"
                      [class.applied-card]="hasApplied(v.vacancyId)"
                      style="border-radius:12px;padding:0">
              <mat-card-content style="padding:18px 20px">
                <div class="vc-header">
                  <div class="vc-left">
                    <a [routerLink]="['/vacancies', v.vacancyId]" class="vc-title vc-title-link">{{ v.title }}</a>
                    <div class="vc-ref">JDF-VAC-{{ v.vacancyId }}</div>
                  </div>
                  <div class="vc-pills">
                    <span class="pill pill-pub">
                      <i class="ti ti-circle" style="font-size:7px"></i> Published
                    </span>
                    <span class="pill pill-type">{{ v.employmentType }}</span>
                    @if (v.vacancyType) {
                      <span class="pill pill-dept">{{ v.vacancyType }}</span>
                    }
                  </div>
                </div>

                <div class="vc-meta">
                  @if (v.location) {
                    <span><i class="ti ti-map-pin"></i> {{ v.location }}</span>
                  }
                  @if (v.salaryMin || v.salaryMax) {
                    <span>
                      <i class="ti ti-currency-rand"></i>
                      R{{ v.salaryMin?.toLocaleString() }}
                      {{ v.salaryMax ? ' – R' + v.salaryMax.toLocaleString() : '' }} pm
                    </span>
                  }
                  @if (v.closingDate) {
                    <span><i class="ti ti-calendar-event"></i> Closes {{ formatDate(v.closingDate) }}</span>
                  }
                  @if (v.minYearsExperience) {
                    <span><i class="ti ti-briefcase"></i> {{ v.minYearsExperience }}+ yrs experience</span>
                  }
                </div>

                <p class="vc-desc">{{ v.description }}</p>

                @if (v.requirements) {
                  <p class="vc-desc" style="margin-top:4px">
                    <strong>Requirements:</strong> {{ v.requirements }}
                  </p>
                }

                <!-- Vacancy-specific required documents -->
                @if (v.requiredDocuments.length) {
                  <div class="vc-requirements">
                    @for (rd of v.requiredDocuments; track rd.documentType) {
                      <span class="req-tag"
                            [class.icon-ok]="hasDoc(rd.documentType)"
                            [style.background]="hasDoc(rd.documentType) ? 'var(--green-bg)' : ''"
                            [style.color]="hasDoc(rd.documentType) ? '#0F6E56' : ''">
                        <i class="ti" [class.ti-circle-check]="hasDoc(rd.documentType)" [class.ti-file]="!hasDoc(rd.documentType)"></i>
                        {{ docLabel(rd.documentType) }}
                        @if (rd.isMandatory) { <span class="req">*</span> }
                      </span>
                    }
                  </div>
                }

                <mat-divider style="margin:12px 0"></mat-divider>

                <div class="vc-footer">
                  <a [routerLink]="['/vacancies', v.vacancyId]" class="card-link" style="font-size:12px">
                    View details <i class="ti ti-arrow-right"></i>
                  </a>

                  @if (hasApplied(v.vacancyId)) {
                    <span class="applied-tag">
                      <i class="ti ti-circle-check"></i> Applied
                    </span>
                  } @else {
                    <div style="display:flex;align-items:center;gap:12px">
                      <button class="btn-apply"
                              (click)="apply(v)"
                              [disabled]="!canApply(v) || applying() === v.vacancyId"
                              [matTooltip]="applyTooltip(v)">
                        @if (applying() === v.vacancyId) {
                          <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                          Submitting…
                        } @else {
                          <i class="ti ti-send"></i> Apply now
                        }
                      </button>
                      @if (!state.profile()) {
                        <span class="apply-hint"><a routerLink="/profile">Create profile</a> to apply</span>
                      } @else if (missingDocsFor(v).length) {
                        <span class="apply-hint">
                          Missing: {{ missingDocsFor(v).map(docLabel).join(', ') }} —
                          <a routerLink="/documents">upload now</a>
                        </span>
                      }
                    </div>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
    <style>
      .vc-title-link { color: var(--text); text-decoration: none; cursor: pointer; }
      .vc-title-link:hover { color: var(--navy); text-decoration: underline; }
      .vc-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    </style>
  `
})
export class VacanciesComponent implements OnInit {
  state = inject(CandidateStateService);
  private vacancyService = inject(VacancyService);
  private appService = inject(ApplicationService);
  private docService = inject(DocumentService);
  private toast = inject(ToastService);

  allVacancies   = signal<VacancyResponse[]>([]);
  filtered       = signal<VacancyResponse[]>([]);
  myApplications = signal<ApplicationResponse[]>([]);
  myDocs         = signal<CandidateDocumentResponse[]>([]);

  loading   = signal(false);
  loadError = signal('');
  applying  = signal<number | null>(null);

  searchQ    = '';
  typeFilter = '';

  ngOnInit(): void {
    this.loading.set(true);
    this.vacancyService.getAll().subscribe({
      next: v => {
        this.allVacancies.set(v);
        this.applyFilters();
        this.loading.set(false);
      },
      error: (err: Error) => { this.loadError.set(err.message); this.loading.set(false); }
    });
    const p = this.state.profile();
    if (p) {
      this.appService.getByCandidate(p.candidateId).subscribe({ next: a => this.myApplications.set(a) });
      this.docService.getAll(p.candidateId).subscribe({ next: d => this.myDocs.set(d) });
    }
  }

  applyFilters(): void {
    const q = this.searchQ.toLowerCase();
    let list = this.allVacancies().filter(v => v.status === 'Published');
    if (q) list = list.filter(v =>
      v.title.toLowerCase().includes(q) ||
      (v.location ?? '').toLowerCase().includes(q) ||
      v.employmentType.toLowerCase().includes(q)
    );
    if (this.typeFilter) list = list.filter(v => v.employmentType === this.typeFilter);
    this.filtered.set(list);
  }

  hasApplied(vacancyId: number): boolean {
    return this.myApplications().some(a => a.vacancyId === vacancyId);
  }

  hasDoc(type: string): boolean {
    return this.myDocs().some(d => d.documentType === type);
  }

  docLabel(type: string): string {
    return (DOCUMENT_TYPE_LABELS as Record<string, string>)[type] ?? type;
  }

  missingDocsFor(v: VacancyResponse): string[] {
    return (v.requiredDocuments ?? [])
      .filter(rd => rd.isMandatory && !this.hasDoc(rd.documentType))
      .map(rd => rd.documentType);
  }

  canApply(v: VacancyResponse): boolean {
    return !!this.state.profile() && this.missingDocsFor(v).length === 0;
  }

  applyTooltip(v: VacancyResponse): string {
    if (!this.state.profile()) return 'Create your profile first';
    const missing = this.missingDocsFor(v);
    if (missing.length) return `Missing: ${missing.map(t => this.docLabel(t)).join(', ')}`;
    return '';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { day:'numeric', month:'short', year:'numeric' });
  }

  apply(v: VacancyResponse): void {
    const p = this.state.profile();
    if (!p) { this.toast.show('Complete your profile before applying.', 'warn'); return; }
    const missing = this.missingDocsFor(v);
    if (missing.length) {
      this.toast.show(`Upload required documents first: ${missing.map(t => this.docLabel(t)).join(', ')}`, 'error');
      return;
    }
    this.applying.set(v.vacancyId);
    this.appService.apply({ candidateId: p.candidateId, vacancyId: v.vacancyId }).subscribe({
      next: app => {
        this.myApplications.update(l => [...l, app]);
        this.applying.set(null);
        this.toast.show(`Applied to ${v.title} — status: ${app.status}`, 'success');
      },
      error: (err: Error) => { this.applying.set(null); this.toast.show(err.message, 'error'); }
    });
  }
}