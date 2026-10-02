import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../core/services/auth.service';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { DocumentService } from '../../core/services/document.service';
import { ApplicationService } from '../../core/services/application.service';
import { VacancyService } from '../../core/services/vacancy.service';
import {
  ApplicationResponse,
  VacancyResponse,
  MandatoryDocumentsStatusResponse,
} from '../../core/models';
import {
  statusLabel as sharedStatusLabel,
  statusClass as sharedStatusClass,
} from '../../core/utils/application-status';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressBarModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <!-- Welcome header -->
      <div class="page-header">
        <div>
          <h2 class="page-title">
            Good {{ greeting }}, {{ user()?.firstName }} 👋
          </h2>
          <p class="page-sub">
            {{ today }} &nbsp;·&nbsp; JordiFlash IT — FlashTalent Portal
          </p>
        </div>
        @if (state.profile()) {
          <span class="ref-chip">
            <i class="ti ti-hash"></i> Candidate #{{
              state.profile()!.candidateId
            }}
          </span>
        }
      </div>

      <!-- Metrics row -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon" style="background:#e3f2fd;color:#0d47a1">
            <i class="ti ti-send"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ myApps().length }}</div>
            <div class="metric-label">Applications</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#e8f5e9;color:#1b5e20">
            <i class="ti ti-files"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">
              {{ docStatus()?.allMandatoryDocumentsPresent ? '✓' : '✗' }}
            </div>
            <div class="metric-label">Mandatory docs</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#fff3e0;color:#e65100">
            <i class="ti ti-briefcase"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ openVacancies().length }}</div>
            <div class="metric-label">Open vacancies</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#ede7f6;color:#4527a0">
            <i class="ti ti-star"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ shortlisted() }}</div>
            <div class="metric-label">Shortlisted</div>
          </div>
        </div>
      </div>

      <!-- Checklist + Recent apps -->
      <div class="checklist-grid" style="margin-bottom:16px">
        <!-- Application readiness -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-header style="padding:16px 16px 0">
            <mat-card-title
              style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"
            >
              <i class="ti ti-list-check" style="color:var(--navy)"></i>
              Application readiness
            </mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding:14px 16px 4px">
            <div class="checklist">
              <div class="check-item" [class.done]="!!state.profile()">
                <span class="check-icon" [class.ok]="!!state.profile()">
                  <i
                    class="ti"
                    [class.ti-circle-check]="!!state.profile()"
                    [class.ti-circle]="!state.profile()"
                  ></i>
                </span>
                <div class="check-content">
                  <div class="check-title">Candidate profile</div>
                  <div class="check-sub">
                    {{
                      state.profile()
                        ? 'Candidate #' + state.profile()!.candidateId
                        : 'Create your profile to apply'
                    }}
                  </div>
                </div>
                <a routerLink="/profile" class="check-action">{{
                  state.profile() ? 'Edit' : 'Create'
                }}</a>
              </div>

              <div class="check-item" [class.done]="docStatus()?.hasCv">
                <span class="check-icon" [class.ok]="docStatus()?.hasCv">
                  <i
                    class="ti"
                    [class.ti-circle-check]="docStatus()?.hasCv"
                    [class.ti-circle]="!docStatus()?.hasCv"
                  ></i>
                </span>
                <div class="check-content">
                  <div class="check-title">
                    Curriculum Vitae <span class="req">*</span>
                  </div>
                  <div class="check-sub">
                    {{
                      docStatus()?.hasCv
                        ? 'CV uploaded'
                        : 'Required before applying'
                    }}
                  </div>
                </div>
                <a routerLink="/documents" class="check-action">{{
                  docStatus()?.hasCv ? 'Manage' : 'Upload'
                }}</a>
              </div>

              <div
                class="check-item"
                [class.done]="docStatus()?.hasMatricCertificate"
              >
                <span
                  class="check-icon"
                  [class.ok]="docStatus()?.hasMatricCertificate"
                >
                  <i
                    class="ti"
                    [class.ti-circle-check]="docStatus()?.hasMatricCertificate"
                    [class.ti-circle]="!docStatus()?.hasMatricCertificate"
                  ></i>
                </span>
                <div class="check-content">
                  <div class="check-title">
                    Matric Certificate <span class="req">*</span>
                  </div>
                  <div class="check-sub">
                    {{
                      docStatus()?.hasMatricCertificate
                        ? 'Uploaded'
                        : 'Required before applying'
                    }}
                  </div>
                </div>
                <a routerLink="/documents" class="check-action">{{
                  docStatus()?.hasMatricCertificate ? 'Manage' : 'Upload'
                }}</a>
              </div>
            </div>

            <div class="readiness-bar" style="margin-top:14px">
              <div class="readiness-label">
                <span>Readiness</span
                ><span style="font-weight:700;color:var(--navy)"
                  >{{ readinessPct() }}%</span
                >
              </div>
              <mat-progress-bar
                mode="determinate"
                [value]="readinessPct()"
                [color]="readinessPct() === 100 ? 'accent' : 'primary'"
                style="border-radius:4px;height:6px"
              >
              </mat-progress-bar>
            </div>

            @if (readinessPct() === 100) {
              <div
                style="margin-top:12px;padding:10px 12px;background:var(--green-bg);border-radius:8px;
                          border:1px solid var(--green-mid);font-size:12px;color:#1a5c35;font-weight:500;
                          display:flex;align-items:center;gap:6px"
              >
                <i class="ti ti-circle-check"></i> You are ready to apply for
                vacancies!
                <a
                  routerLink="/vacancies"
                  style="margin-left:auto;color:var(--green);font-weight:600"
                  >Browse now →</a
                >
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- Recent applications -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-header style="padding:16px 16px 0">
            <mat-card-title
              style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"
            >
              <i class="ti ti-history" style="color:var(--navy)"></i> Recent
              applications
            </mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding:14px 16px 4px">
            @if (!myApps().length) {
              <div class="empty-state" style="padding:1.5rem 0">
                <i class="ti ti-send"></i>
                <p>No applications yet.</p>
                <a routerLink="/vacancies">
                  <button
                    mat-stroked-button
                    color="primary"
                    style="margin-top:8px;font-size:12px"
                  >
                    Browse vacancies
                  </button>
                </a>
              </div>
            } @else {
              <div class="app-mini-list">
                @for (app of myApps().slice(0, 4); track app.applicationId) {
                  <div class="app-mini-row">
                    <div class="app-mini-info">
                      <div class="app-mini-title">{{ app.vacancyTitle }}</div>
                      <div class="app-mini-sub">
                        {{ formatDate(app.appliedAt) }}
                      </div>
                    </div>
                    <span class="status-pill s-{{ sClass(app.status) }}">{{
                      sLabel(app.status)
                    }}</span>
                  </div>
                }
              </div>
              <a routerLink="/applications" class="card-link">
                View all applications <i class="ti ti-arrow-right"></i>
              </a>
            }
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Latest vacancies -->
      <mat-card class="mat-elevation-z1" style="border-radius:12px">
        <mat-card-header style="padding:16px 16px 0">
          <mat-card-title
            style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"
          >
            <i class="ti ti-briefcase" style="color:var(--navy)"></i> Latest
            vacancies
          </mat-card-title>
          <div style="margin-left:auto">
            <a routerLink="/vacancies">
              <button mat-button color="primary" style="font-size:12px">
                View all →
              </button>
            </a>
          </div>
        </mat-card-header>
        <mat-card-content style="padding:14px 16px 16px">
          @if (!openVacancies().length) {
            <div class="empty-state" style="padding:1rem 0">
              <p>No published vacancies at the moment.</p>
            </div>
          } @else {
            <div class="vacancy-mini-grid">
              @for (v of openVacancies().slice(0, 3); track v.vacancyId) {
                <div class="vacancy-mini-card">
                  <div class="vmc-title">{{ v.title }}</div>
                  <div class="vmc-meta">
                    <span>{{ v.employmentType }}</span>
                    @if (v.location) {
                      <span> · {{ v.location }}</span>
                    }
                  </div>
                  <div class="vmc-footer">
                    <span class="pill pill-type">{{ v.employmentType }}</span>
                    <a routerLink="/vacancies" class="btn-apply-sm">Apply</a>
                  </div>
                </div>
              }
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  state = inject(CandidateStateService);
  private docService = inject(DocumentService);
  private appService = inject(ApplicationService);
  private vacancyService = inject(VacancyService);

  today = new Date().toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
  })();
  user = this.auth.currentUser;

  myApps = signal<ApplicationResponse[]>([]);
  openVacancies = signal<VacancyResponse[]>([]);
  docStatus = signal<MandatoryDocumentsStatusResponse | null>(null);

  shortlisted = computed(
    () =>
      this.myApps().filter(
        (a) => a.status === 'Shortlisted' || a.status === 'OfferExtended',
      ).length,
  );
  readinessPct = computed(() => {
    let s = 0;
    if (this.state.profile()) s += 34;
    if (this.docStatus()?.hasCv) s += 33;
    if (this.docStatus()?.hasMatricCertificate) s += 33;
    return s;
  });

  ngOnInit(): void {
    this.vacancyService.getAll().subscribe({
      next: (v) =>
        this.openVacancies.set(v.filter((x) => x.status === 'Published')),
    });
    const p = this.state.profile();
    if (p) {
      this.appService
        .getByCandidate(p.candidateId)
        .subscribe({ next: (a) => this.myApps.set(a) });
      this.docService
        .getMandatoryStatus(p.candidateId)
        .subscribe({ next: (s) => this.docStatus.set(s) });
    }
  }

  sClass(s: string): string {
    return sharedStatusClass(s);
  }
  sLabel(s: string): string {
    return sharedStatusLabel(s);
  }
  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
