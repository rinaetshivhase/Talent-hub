import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { VacancyAdminService } from '../../core/services/vacancy-admin.service';
import { ApplicationAdminService } from '../../core/services/application-admin.service';
import { VacancyResponse, ApplicationResponse } from '../../core/models';

const STATUS_LABEL: Record<string, string> = {
  Applied: 'Applied',
  UnderReview: 'Under Review',
  Shortlisted: 'Shortlisted',
  OfferExtended: 'Offer Extended',
  Hired: 'Hired',
  NotSelected: 'Not Selected',
};

@Component({
  selector: 'app-staff-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title">
            Good {{ greeting }}, {{ user()?.firstName }} 👋
          </h2>
          <p class="page-sub">
            {{ today }} &nbsp;·&nbsp; FlashTalent Recruiter Console
          </p>
        </div>
      </div>

      <!-- Vacancy status metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon" style="background:#fff3e0;color:#e65100">
            <i class="ti ti-file-pencil"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ draftCount() }}</div>
            <div class="metric-label">Draft vacancies</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#e8f5e9;color:#1b5e20">
            <i class="ti ti-briefcase"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ publishedCount() }}</div>
            <div class="metric-label">Published vacancies</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#eceff1;color:#37474f">
            <i class="ti ti-lock"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ closedCount() }}</div>
            <div class="metric-label">Closed vacancies</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#e3f2fd;color:#0d47a1">
            <i class="ti ti-send"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ totalApplications() }}</div>
            <div class="metric-label">Total applications</div>
          </div>
        </div>
      </div>

      <div class="checklist-grid" style="margin-bottom:16px">
        <!-- Pipeline breakdown -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-header style="padding:16px 16px 0">
            <mat-card-title
              style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"
            >
              <i
                class="ti ti-chart-arrows-vertical"
                style="color:var(--navy)"
              ></i>
              Application pipeline
            </mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding:14px 16px 16px">
            @if (loading()) {
              <div class="empty-state" style="padding:1rem 0">
                <p>Loading…</p>
              </div>
            } @else if (!totalApplications()) {
              <div class="empty-state" style="padding:1rem 0">
                <p>No applications yet.</p>
              </div>
            } @else {
              <div style="display:flex;flex-direction:column;gap:8px">
                @for (row of pipelineBreakdown(); track row.status) {
                  <div
                    style="display:flex;align-items:center;justify-content:space-between;font-size:13px"
                  >
                    <span>{{ row.label }}</span>
                    <span style="font-weight:700;color:var(--navy)">{{
                      row.count
                    }}</span>
                  </div>
                }
              </div>
            }
            <a
              routerLink="/admin/applications"
              class="card-link"
              style="margin-top:12px;display:block"
            >
              View all applications <i class="ti ti-arrow-right"></i>
            </a>
          </mat-card-content>
        </mat-card>

        <!-- Quick actions -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-header style="padding:16px 16px 0">
            <mat-card-title
              style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"
            >
              <i class="ti ti-bolt" style="color:var(--navy)"></i> Quick actions
            </mat-card-title>
          </mat-card-header>
          <mat-card-content
            style="padding:14px 16px 16px;display:flex;flex-direction:column;gap:10px"
          >
            <a routerLink="/admin/vacancies/new">
              <button
                mat-raised-button
                color="primary"
                style="width:100%;border-radius:8px"
              >
                <i class="ti ti-plus"></i>&nbsp;Create vacancy
              </button>
            </a>
            <a routerLink="/admin/vacancies">
              <button mat-stroked-button style="width:100%;border-radius:8px">
                <i class="ti ti-briefcase"></i>&nbsp;Manage vacancies
              </button>
            </a>
            <a routerLink="/admin/applications">
              <button mat-stroked-button style="width:100%;border-radius:8px">
                <i class="ti ti-send"></i>&nbsp;Review applications
              </button>
            </a>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Recent vacancies -->
      <mat-card class="mat-elevation-z1" style="border-radius:12px">
        <mat-card-header style="padding:16px 16px 0">
          <mat-card-title
            style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"
          >
            <i class="ti ti-briefcase" style="color:var(--navy)"></i> Recent
            vacancies
          </mat-card-title>
          <div style="margin-left:auto">
            <a routerLink="/admin/vacancies">
              <button mat-button color="primary" style="font-size:12px">
                View all →
              </button>
            </a>
          </div>
        </mat-card-header>
        <mat-card-content style="padding:14px 16px 16px">
          @if (!recentVacancies().length) {
            <div class="empty-state" style="padding:1rem 0">
              <p>No vacancies yet.</p>
            </div>
          } @else {
            <div class="vacancy-mini-grid">
              @for (v of recentVacancies(); track v.vacancyId) {
                <div class="vacancy-mini-card">
                  <div class="vmc-title">{{ v.title }}</div>
                  <div class="vmc-meta">
                    <span>{{ v.employmentType }}</span>
                    @if (v.location) {
                      <span> · {{ v.location }}</span>
                    }
                  </div>
                  <div class="vmc-footer">
                    <span
                      class="pill"
                      [class.pill-type]="v.status === 'Draft'"
                      >{{ v.status }}</span
                    >
                    <a
                      [routerLink]="['/admin/vacancies', v.vacancyId, 'edit']"
                      class="btn-apply-sm"
                      >Manage</a
                    >
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
export class StaffDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private vacancyAdmin = inject(VacancyAdminService);
  private applicationAdmin = inject(ApplicationAdminService);

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

  loading = signal(true);
  vacancies = signal<VacancyResponse[]>([]);
  applications = signal<ApplicationResponse[]>([]);

  draftCount = computed(
    () => this.vacancies().filter((v) => v.status === 'Draft').length,
  );
  publishedCount = computed(
    () => this.vacancies().filter((v) => v.status === 'Published').length,
  );
  closedCount = computed(
    () => this.vacancies().filter((v) => v.status === 'Closed').length,
  );
  totalApplications = computed(() => this.applications().length);

  recentVacancies = computed(() =>
    [...this.vacancies()]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, 3),
  );

  pipelineBreakdown = computed(() => {
    const counts: Record<string, number> = {};
    for (const a of this.applications()) {
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    }
    return Object.keys(STATUS_LABEL)
      .map((status) => ({
        status,
        label: STATUS_LABEL[status],
        count: counts[status] ?? 0,
      }))
      .filter((row) => row.count > 0);
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.vacancyAdmin.getAllByStatus().subscribe({
      next: (v) => this.vacancies.set(v),
      error: () => {},
    });
    this.applicationAdmin.getAll().subscribe({
      next: (a) => {
        this.applications.set(a);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }
}
