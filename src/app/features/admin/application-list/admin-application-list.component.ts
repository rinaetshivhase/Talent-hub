import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { ApplicationService } from '../../../core/services/application.service';
import { VacancyAdminService } from '../../../core/services/vacancy-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApplicationResponse } from '../../../core/models';
import {
  STATUS_LABELS,
  ApplicationStatusKey,
} from '../../../core/utils/application-status';

const STATUS_CLASS: Record<string, string> = {
  Applied: 'applied',
  UnderReview: 'underreview',
  Shortlisted: 'shortlisted',
  PrescreeningStage: 'prescreening',
  InterviewStage: 'interview',
  OfferExtended: 'offer',
  Hired: 'offer',
  NotSelected: 'rejected',
};

interface VacancyGroup {
  vacancyId: number;
  vacancyTitle: string;
  applications: ApplicationResponse[];
}

@Component({
  selector: 'app-admin-application-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title">
            <i class="ti ti-chart-arrows-vertical"></i> Applications (org-wide
            view)
          </h2>
          <p class="page-sub">Read-only oversight, grouped by vacancy</p>
        </div>
      </div>

      @if (!loading()) {
        <div
          class="metrics-grid"
          style="grid-template-columns:repeat(3,minmax(0,1fr));margin-bottom:16px"
        >
          <div class="metric-card">
            <div class="metric-icon" style="background:#e3f2fd;color:#0d47a1">
              <i class="ti ti-send"></i>
            </div>
            <div class="metric-body">
              <div class="metric-val">{{ totalApplications() }}</div>
              <div class="metric-label">Total applications</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="background:#fff3e0;color:#e65100">
              <i class="ti ti-clock"></i>
            </div>
            <div class="metric-body">
              <div class="metric-val">{{ pendingReviewCount() }}</div>
              <div class="metric-label">Awaiting review</div>
            </div>
          </div>
          <div class="metric-card">
            <div class="metric-icon" style="background:#e8f5e9;color:#1b5e20">
              <i class="ti ti-briefcase"></i>
            </div>
            <div class="metric-body">
              <div class="metric-val">{{ vacanciesWithApplicants() }}</div>
              <div class="metric-label">Vacancies with applicants</div>
            </div>
          </div>
        </div>

        <div class="filters-row">
          <div class="search-wrap" style="flex:1;min-width:220px">
            <i class="ti ti-search search-icon"></i>
            <input
              [(ngModel)]="searchQ"
              type="search"
              class="search-input"
              placeholder="Search by candidate or vacancy…"
            />
          </div>
          <mat-form-field
            appearance="outline"
            class="compact-select"
            style="width:200px"
          >
            <mat-label>Vacancy</mat-label>
            <mat-select [(ngModel)]="vacancyFilter">
              <mat-option [value]="''">All vacancies</mat-option>
              @for (v of vacancyOptions(); track v.id) {
                <mat-option [value]="v.id">{{ v.title }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
          <mat-form-field
            appearance="outline"
            class="compact-select"
            style="width:180px"
          >
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="statusFilter">
              <mat-option [value]="''">All statuses</mat-option>
              @for (s of allStatuses; track s) {
                <mat-option [value]="s">{{ label(s) }}</mat-option>
              }
            </mat-select>
          </mat-form-field>
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!rawGroups().length || !totalApplications()) {
        <div class="empty-state">
          <i class="ti ti-inbox"></i>
          <p>No applications yet.</p>
        </div>
      } @else if (!filteredGroups.length) {
        <div class="empty-state">
          <i class="ti ti-zoom-question"></i>
          <p>No applications match your filters.</p>
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:14px">
          @for (group of filteredGroups; track group.vacancyId) {
            <mat-card
              class="mat-elevation-z1"
              style="border-radius:12px;overflow:hidden"
            >
              <div class="vgroup-header">
                <div style="flex:1;min-width:0">
                  <div class="vgroup-title">{{ group.vacancyTitle }}</div>
                  <div class="vgroup-sub">
                    {{ group.applications.length }} application{{
                      group.applications.length !== 1 ? 's' : ''
                    }}
                  </div>
                </div>
                <div
                  style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"
                >
                  @for (row of statusBreakdown(group); track row.status) {
                    <span
                      class="status-pill s-{{ statusClass(row.status) }}"
                      style="font-size:11px"
                      >{{ row.count }} {{ label(row.status) }}</span
                    >
                  }
                </div>
              </div>
              <div style="padding:4px 20px 16px">
                @for (
                  a of group.applications;
                  track a.applicationId;
                  let i = $index
                ) {
                  <div class="app-row">
                    <div class="app-rank">#{{ i + 1 }}</div>
                    <div
                      class="app-icon-wrap"
                      [class]="'app-icon-' + statusClass(a.status)"
                    >
                      <i class="ti ti-user"></i>
                    </div>
                    <div class="app-main">
                      <div class="app-title">{{ a.candidateName }}</div>
                      <div class="app-sub">
                        Applied {{ formatDate(a.appliedAt)
                        }}{{ i === 0 ? ' · First to apply' : '' }}
                      </div>
                    </div>
                    <span class="status-pill s-{{ statusClass(a.status) }}">{{
                      label(a.status)
                    }}</span>
                  </div>
                }
              </div>
            </mat-card>
          }
        </div>
      }
    </div>

    <style>
      .filters-row {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        flex-wrap: wrap;
        margin-bottom: 18px;
      }
      .vgroup-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 20px;
        background: var(--surface-2);
        border-bottom: 1px solid var(--border);
      }
      .vgroup-title {
        font-size: 14px;
        font-weight: 700;
        color: var(--text);
      }
      .vgroup-sub {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 1px;
      }
      .app-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 0;
        border-bottom: 1px solid var(--border);
      }
      .app-row:last-child {
        border-bottom: none;
      }
      .app-rank {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: var(--navy);
        color: #fff;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
    </style>
  `,
})
export class AdminApplicationListComponent implements OnInit {
  private appService = inject(ApplicationService);
  private vacancyService = inject(VacancyAdminService);
  private toast = inject(ToastService);

  rawGroups = signal<VacancyGroup[]>([]);
  loading = signal(false);

  searchQ = '';
  vacancyFilter: number | '' = '';
  statusFilter: ApplicationStatusKey | '' = '';

  allStatuses: ApplicationStatusKey[] = [
    'Applied',
    'UnderReview',
    'Shortlisted',
    'PrescreeningStage',
    'InterviewStage',
    'OfferExtended',
    'Hired',
    'NotSelected',
  ];
  totalApplications = computed(() =>
    this.rawGroups().reduce((sum, g) => sum + g.applications.length, 0),
  );
  pendingReviewCount = computed(() =>
    this.rawGroups().reduce(
      (sum, g) =>
        sum +
        g.applications.filter(
          (a) => a.status === 'Applied' || a.status === 'UnderReview',
        ).length,
      0,
    ),
  );
  vacanciesWithApplicants = computed(
    () => this.rawGroups().filter((g) => g.applications.length > 0).length,
  );

  vacancyOptions = computed(() =>
    this.rawGroups()
      .filter((g) => g.applications.length > 0)
      .map((g) => ({ id: g.vacancyId, title: g.vacancyTitle })),
  );

  get filteredGroups(): VacancyGroup[] {
    const q = this.searchQ.trim().toLowerCase();
    const vf = this.vacancyFilter;
    const sf = this.statusFilter;

    return this.rawGroups()
      .filter((g) => vf === '' || g.vacancyId === vf)
      .map((g) => ({
        ...g,
        applications: g.applications.filter(
          (a) =>
            (!q ||
              a.candidateName.toLowerCase().includes(q) ||
              g.vacancyTitle.toLowerCase().includes(q)) &&
            (!sf || a.status === sf),
        ),
      }))
      .filter((g) => g.applications.length > 0);
  }

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.vacancyService.getAllByStatus().subscribe({
      next: (vacancies) => {
        if (!vacancies.length) {
          this.rawGroups.set([]);
          this.loading.set(false);
          return;
        }
        forkJoin(
          vacancies.map((v) => this.appService.getByVacancy(v.vacancyId)),
        ).subscribe({
          next: (results) => {
            const groups: VacancyGroup[] = vacancies.map((v, i) => ({
              vacancyId: v.vacancyId,
              vacancyTitle: v.title,
              applications: [...results[i]].sort(
                (a, b) =>
                  new Date(a.appliedAt).getTime() -
                  new Date(b.appliedAt).getTime(),
              ),
            }));
            this.rawGroups.set(groups);
            this.loading.set(false);
          },
          error: (err: Error) => {
            this.toast.show(err.message, 'error');
            this.loading.set(false);
          },
        });
      },
      error: (err: Error) => {
        this.toast.show(err.message, 'error');
        this.loading.set(false);
      },
    });
  }

  statusBreakdown(group: VacancyGroup) {
    const counts: Record<string, number> = {};
    for (const a of group.applications)
      counts[a.status] = (counts[a.status] ?? 0) + 1;
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }

  label(s: string): string {
    return (STATUS_LABELS as Record<string, string>)[s] ?? s;
  }
  statusClass(s: string): string {
    return STATUS_CLASS[s] ?? 'applied';
  }
  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
}
