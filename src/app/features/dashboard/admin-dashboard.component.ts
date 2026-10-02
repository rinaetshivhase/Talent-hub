import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import {
  VacancyAdminService,
  VacancyChangeHistoryEntry,
} from '../../core/services/vacancy-admin.service';
import { ApplicationAdminService } from '../../core/services/application-admin.service';
import { CandidateService } from '../../core/services/candidate.service';
import { RecruiterService } from '../../core/services/recruiter.service';
import { SkillService } from '../../core/services/skill.service';
import { DepartmentService } from '../../core/services/department.service';
import { ClientService } from '../../core/services/client.service';
import {
  VacancyResponse,
  ApplicationResponse,
  CandidateResponse,
  RecruiterResponse,
  SkillResponse,
  DepartmentResponse,
  ClientResponse,
} from '../../core/models';

const STATUS_LABEL: Record<string, string> = {
  Applied: 'Applied',
  UnderReview: 'Under Review',
  Shortlisted: 'Shortlisted',
  OfferExtended: 'Offer Extended',
  Hired: 'Hired',
  NotSelected: 'Not Selected',
};

@Component({
  selector: 'app-admin-dashboard',
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
            {{ today }} &nbsp;·&nbsp; FlashTalent Admin Console
          </p>
        </div>
      </div>

      <!-- System-wide metrics -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-icon" style="background:#e3f2fd;color:#0d47a1">
            <i class="ti ti-users"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ candidates().length }}</div>
            <div class="metric-label">Total candidates</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#ede7f6;color:#4527a0">
            <i class="ti ti-user-star"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ recruiters().length }}</div>
            <div class="metric-label">Total recruiters</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#e8f5e9;color:#1b5e20">
            <i class="ti ti-briefcase"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ vacancies().length }}</div>
            <div class="metric-label">Total vacancies</div>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-icon" style="background:#fff3e0;color:#e65100">
            <i class="ti ti-send"></i>
          </div>
          <div class="metric-body">
            <div class="metric-val">{{ applications().length }}</div>
            <div class="metric-label">Total applications</div>
          </div>
        </div>
      </div>

      <!-- Vacancy status breakdown -->
      <div class="metrics-grid" style="margin-top:0">
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
      </div>

      <div class="checklist-grid" style="margin-bottom:16px">
        <!-- Team overview -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-header style="padding:16px 16px 0">
            <mat-card-title
              style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"
            >
              <i class="ti ti-users-group" style="color:var(--navy)"></i> Team
              overview
            </mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding:14px 16px 16px">
            @if (loading()) {
              <div class="empty-state" style="padding:1rem 0">
                <p>Loading…</p>
              </div>
            } @else {
              <div
                style="display:flex;align-items:center;justify-content:space-between;font-size:13px"
              >
                <span>Recruiters on staff</span>
                <span style="font-weight:700;color:var(--navy)">{{
                  recruiters().length
                }}</span>
              </div>
            }
            <a
              routerLink="/admin/recruiters"
              class="card-link"
              style="margin-top:12px;display:block"
            >
              Manage recruiters <i class="ti ti-arrow-right"></i>
            </a>
          </mat-card-content>
        </mat-card>

        <!-- Master data health -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-header style="padding:16px 16px 0">
            <mat-card-title
              style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"
            >
              <i class="ti ti-database" style="color:var(--navy)"></i> Master
              data health
            </mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding:14px 16px 16px">
            @if (loading()) {
              <div class="empty-state" style="padding:1rem 0">
                <p>Loading…</p>
              </div>
            } @else {
              <div style="display:flex;flex-direction:column;gap:8px">
                <div
                  style="display:flex;align-items:center;justify-content:space-between;font-size:13px"
                >
                  <span>Skills</span>
                  <span
                    style="font-weight:700;color:var(--navy)"
                    [class.pill-warn]="!skills().length"
                  >
                    {{ skills().length }}
                  </span>
                </div>
                <div
                  style="display:flex;align-items:center;justify-content:space-between;font-size:13px"
                >
                  <span>Departments</span>
                  <span
                    style="font-weight:700;color:var(--navy)"
                    [class.pill-warn]="!departments().length"
                  >
                    {{ departments().length }}
                  </span>
                </div>
                <div
                  style="display:flex;align-items:center;justify-content:space-between;font-size:13px"
                >
                  <span>Clients</span>
                  <span
                    style="font-weight:700;color:var(--navy)"
                    [class.pill-warn]="!clients().length"
                  >
                    {{ clients().length }}
                  </span>
                </div>
              </div>
            }
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
              <a routerLink="/admin/skills" class="card-link"
                >Skills <i class="ti ti-arrow-right"></i
              ></a>
              <a routerLink="/admin/departments" class="card-link"
                >Departments <i class="ti ti-arrow-right"></i
              ></a>
              <a routerLink="/admin/clients" class="card-link"
                >Clients <i class="ti ti-arrow-right"></i
              ></a>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <div class="checklist-grid" style="margin-bottom:16px">
        <!-- System-wide pipeline -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-header style="padding:16px 16px 0">
            <mat-card-title
              style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"
            >
              <i
                class="ti ti-chart-arrows-vertical"
                style="color:var(--navy)"
              ></i>
              Recruitment pipeline (org-wide)
            </mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding:14px 16px 16px">
            @if (loading()) {
              <div class="empty-state" style="padding:1rem 0">
                <p>Loading…</p>
              </div>
            } @else if (!applications().length) {
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

        <!-- Recent activity feed -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-header style="padding:16px 16px 0">
            <mat-card-title
              style="font-size:14px;font-weight:600;display:flex;align-items:center;gap:8px"
            >
              <i class="ti ti-history" style="color:var(--navy)"></i> Recent
              activity
            </mat-card-title>
          </mat-card-header>
          <mat-card-content style="padding:14px 16px 16px">
            @if (loading()) {
              <div class="empty-state" style="padding:1rem 0">
                <p>Loading…</p>
              </div>
            } @else if (!recentActivity().length) {
              <div class="empty-state" style="padding:1rem 0">
                <p>No recent activity.</p>
              </div>
            } @else {
              <div style="display:flex;flex-direction:column;gap:10px">
                @for (h of recentActivity(); track h.vacancyChangeHistoryId) {
                  <div style="font-size:12px;line-height:1.4">
                    <div>
                      <strong>{{ h.changedByName }}</strong>
                      {{ actionVerb(h.action) }}
                      <a
                        [routerLink]="['/admin/vacancies', h.vacancyId]"
                        style="color:var(--navy)"
                        >{{ h.vacancyTitle }}</a
                      >
                    </div>
                    <div style="color:#78838f">
                      {{ formatDate(h.changedAt) }}
                    </div>
                  </div>
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
})
export class AdminDashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private vacancyAdmin = inject(VacancyAdminService);
  private applicationAdmin = inject(ApplicationAdminService);
  private candidateService = inject(CandidateService);
  private recruiterService = inject(RecruiterService);
  private skillService = inject(SkillService);
  private departmentService = inject(DepartmentService);
  private clientService = inject(ClientService);

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
  candidates = signal<CandidateResponse[]>([]);
  recruiters = signal<RecruiterResponse[]>([]);
  skills = signal<SkillResponse[]>([]);
  departments = signal<DepartmentResponse[]>([]);
  clients = signal<ClientResponse[]>([]);
  recentActivity = signal<VacancyChangeHistoryEntry[]>([]);

  draftCount = computed(
    () => this.vacancies().filter((v) => v.status === 'Draft').length,
  );
  publishedCount = computed(
    () => this.vacancies().filter((v) => v.status === 'Published').length,
  );
  closedCount = computed(
    () => this.vacancies().filter((v) => v.status === 'Closed').length,
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

    this.vacancyAdmin
      .getAllByStatus()
      .subscribe({ next: (v) => this.vacancies.set(v), error: () => {} });
    this.candidateService
      .getAll()
      .subscribe({ next: (c) => this.candidates.set(c), error: () => {} });
    this.recruiterService
      .getAll()
      .subscribe({ next: (r) => this.recruiters.set(r), error: () => {} });
    this.skillService
      .getAll()
      .subscribe({ next: (s) => this.skills.set(s), error: () => {} });
    this.departmentService
      .getAll()
      .subscribe({ next: (d) => this.departments.set(d), error: () => {} });
    this.clientService
      .getAll()
      .subscribe({ next: (c) => this.clients.set(c), error: () => {} });
    this.vacancyAdmin
      .getRecentHistory(20)
      .subscribe({ next: (h) => this.recentActivity.set(h), error: () => {} });

    this.applicationAdmin.getAll().subscribe({
      next: (a) => {
        this.applications.set(a);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  actionVerb(action: string): string {
    switch (action) {
      case 'Created':
        return 'created';
      case 'Edited':
        return 'edited';
      case 'Published':
        return 'published';
      case 'Closed':
        return 'closed';
      case 'Deleted':
        return 'deleted';
      default:
        return action.toLowerCase();
    }
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
