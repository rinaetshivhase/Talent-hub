import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { ApplicationService } from '../../../core/services/application.service';
import { ToastService } from '../../../core/services/toast.service';
import { ApplicationReviewResponse } from '../../../core/models';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-application-review',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    FormsModule,
  ],
  template: `
    <div class="review-shell">
      <!-- TOP BAR -->
      <div class="review-topbar">
        <button mat-stroked-button (click)="goBack()">
          <i class="ti ti-arrow-left"></i> Back
        </button>

        <div class="topbar-center">
          @if (data()) {
            <div class="topbar-name">
              {{ data()!.candidate.firstName }} {{ data()!.candidate.lastName }}
            </div>
            <div class="topbar-meta">
              Applied {{ formatDate(data()!.application.appliedAt) }}
              &nbsp;·&nbsp;
              <span
                class="status-pill s-{{
                  statusClass(data()!.application.status)
                }}"
              >
                {{ data()!.application.status }}
              </span>
            </div>
          }
        </div>

        <div style="display:flex;gap:8px">
          <button
            mat-stroked-button
            color="warn"
            [disabled]="actioning()"
            (click)="showDropConfirm.set(true)"
          >
            <i class="ti ti-user-x"></i> Drop
          </button>
          <button
            mat-raised-button
            color="primary"
            [disabled]="actioning()"
            (click)="shortlist()"
          >
            <i class="ti ti-user-check"></i> Shortlist
          </button>
        </div>
      </div>

      <!-- LOADING -->
      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!data()) {
        <div class="empty-state">
          <i class="ti ti-alert-circle"></i>
          <p>Could not load application.</p>
        </div>
      } @else {
        <div class="split-container">
          <!-- ── LEFT PANEL — Candidate ── -->
          <div class="split-panel">
            <div class="panel-label">
              <i class="ti ti-user"></i> Candidate Profile
            </div>

            <mat-tab-group class="fill-tabs" animationDuration="150ms">
              <!-- TAB 1 — Profile Info -->
              <mat-tab label="Profile Info">
                <div class="panel-scroll">
                  <!-- Contact -->
                  <div class="info-section">
                    <div class="section-heading">Contact</div>
                    <div class="info-row">
                      <span class="info-label">Name</span>
                      <span class="info-val">
                        {{ data()!.candidate.firstName }}
                        {{ data()!.candidate.lastName }}
                      </span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Email</span>
                      <span class="info-val">{{
                        data()!.candidate.email
                      }}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Phone</span>
                      <span class="info-val">{{
                        data()!.candidate.phone ?? '—'
                      }}</span>
                    </div>
                  </div>

                  <!-- Skills -->
                  <div class="info-section">
                    <div class="section-heading">Skills</div>
                    @if (data()!.candidate.skills.length) {
                      <div class="tag-wrap">
                        @for (s of data()!.candidate.skills; track s.skillId) {
                          <span
                            class="tag"
                            [class.tag-match]="isSkillMatch(s.skillId)"
                          >
                            {{ s.skillName }}
                            <span class="tag-sub">{{
                              s.proficiencyLevel
                            }}</span>
                            @if (isSkillMatch(s.skillId)) {
                              <i class="ti ti-check tag-check"></i>
                            }
                          </span>
                        }
                      </div>
                      <div class="match-hint">
                        <i class="ti ti-info-circle"></i>
                        Green skills match vacancy requirements
                      </div>
                    } @else {
                      <span class="info-empty">No skills listed</span>
                    }
                  </div>

                  <!-- Qualifications -->
                  <div class="info-section">
                    <div class="section-heading">Qualifications</div>
                    @if (data()!.candidate.qualifications.length) {
                      @for (
                        q of data()!.candidate.qualifications;
                        track q.name
                      ) {
                        <div class="qual-card">
                          <div class="qual-name">{{ q.name }}</div>
                          <div class="qual-sub">
                            {{ q.institution }} ·
                            {{ q.yearCompleted | date: 'yyyy' }}
                          </div>
                        </div>
                      }
                    } @else {
                      <span class="info-empty">None listed</span>
                    }
                  </div>

                  <!-- Certifications -->
                  <div class="info-section">
                    <div class="section-heading">Certifications</div>
                    @if (data()!.candidate.certifications.length) {
                      @for (
                        c of data()!.candidate.certifications;
                        track c.name
                      ) {
                        <div class="qual-card">
                          <div class="qual-name">{{ c.name }}</div>
                          <div class="qual-sub">
                            {{ c.institution }} ·
                            {{ c.yearCompleted | date: 'yyyy' }}
                          </div>
                        </div>
                      }
                    } @else {
                      <span class="info-empty">None listed</span>
                    }
                  </div>

                  <!-- Experience -->
                  <div class="info-section">
                    <div class="section-heading">Experience</div>
                    @if (data()!.candidate.experiences.length) {
                      @for (
                        e of data()!.candidate.experiences;
                        track e.company
                      ) {
                        <div class="exp-card">
                          <div class="exp-role">{{ e.role }}</div>
                          <div class="exp-company">{{ e.company }}</div>
                          <div class="exp-dates">
                            {{ e.startDate | date: 'MMM yyyy' }} —
                            {{
                              e.endDate
                                ? (e.endDate | date: 'MMM yyyy')
                                : 'Present'
                            }}
                          </div>
                          @if (e.projectsAndDuties) {
                            <p class="exp-duties">{{ e.projectsAndDuties }}</p>
                          }
                        </div>
                      }
                    } @else {
                      <span class="info-empty">No experience listed</span>
                    }
                  </div>
                </div>
              </mat-tab>

              <!-- TAB 2 — CV -->
              <mat-tab label="CV Document">
                <ng-template matTabContent>
                  <div class="cv-wrap">
                    @if (safeCvUrl()) {
                      <iframe
                        [src]="safeCvUrl()"
                        class="cv-iframe"
                        title="Candidate CV"
                      >
                      </iframe>
                    } @else {
                      <div class="empty-state">
                        <i class="ti ti-file-off"></i>
                        <p>No CV uploaded</p>
                      </div>
                    }
                  </div>
                </ng-template>
              </mat-tab>
            </mat-tab-group>
          </div>

          <!-- DIVIDER -->
          <div class="split-divider"></div>

          <!-- ── RIGHT PANEL — Vacancy ── -->
          <div class="split-panel">
            <div class="panel-label">
              <i class="ti ti-briefcase"></i> Vacancy Requirements
            </div>
            <div class="panel-scroll">
              <!-- Position -->
              <div class="info-section">
                <div class="section-heading">Position</div>
                <div class="info-row">
                  <span class="info-label">Title</span>
                  <span class="info-val">{{ data()!.vacancy.title }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Type</span>
                  <span class="info-val">{{
                    data()!.vacancy.employmentType
                  }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Location</span>
                  <span class="info-val">{{
                    data()!.vacancy.location ?? '—'
                  }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Posted for</span>
                  <span class="info-val">{{
                    data()!.vacancy.postedFor ?? '—'
                  }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Min. Experience</span>
                  <span class="info-val">
                    {{
                      data()!.vacancy.minYearsExperience != null
                        ? data()!.vacancy.minYearsExperience + ' year(s)'
                        : '—'
                    }}
                  </span>
                </div>
              </div>

              <!-- Description -->
              <div class="info-section">
                <div class="section-heading">Job Description</div>
                <p class="info-val description-text">
                  {{ data()!.vacancy.description }}
                </p>
              </div>

              <!-- Required Skills -->
              <div class="info-section">
                <div class="section-heading">Required Skills</div>
                @if (data()!.vacancy.requiredSkills.length) {
                  <div class="tag-wrap">
                    @for (
                      s of data()!.vacancy.requiredSkills;
                      track s.skillId
                    ) {
                      <span class="tag tag-required">
                        {{ s.skillName }}
                        <span class="tag-sub">{{ s.proficiencyLevel }}</span>
                        @if (s.isRequired) {
                          <span class="tag-required-badge">Required</span>
                        }
                      </span>
                    }
                  </div>
                } @else {
                  <span class="info-empty">Not specified</span>
                }
              </div>

              <!-- Required Qualifications -->
              <div class="info-section">
                <div class="section-heading">Required Qualifications</div>
                @if (data()!.vacancy.requiredQualifications) {
                  <p class="info-val">
                    {{ data()!.vacancy.requiredQualifications }}
                  </p>
                } @else {
                  <span class="info-empty">Not specified</span>
                }
              </div>

              <!-- Additional Requirements -->
              @if (data()!.vacancy.requirements) {
                <div class="info-section">
                  <div class="section-heading">Additional Requirements</div>
                  <p class="info-val description-text">
                    {{ data()!.vacancy.requirements }}
                  </p>
                </div>
              }
            </div>
          </div>
        </div>
      }

      <!-- DROP CONFIRMATION OVERLAY -->
      @if (showDropConfirm()) {
        <div class="confirm-backdrop">
          <div class="confirm-card">
            <div class="confirm-title">Drop this candidate?</div>
            <p class="confirm-body">
              {{ data()!.candidate.firstName }} {{ data()!.candidate.lastName }}
              will be marked as Not Selected and saved to the talent pool.
            </p>
            <textarea
              class="confirm-notes"
              [(ngModel)]="dropNotes"
              placeholder="Reason for dropping (optional)..."
              rows="3"
            >
            </textarea>
            <div class="confirm-actions">
              <button mat-stroked-button (click)="showDropConfirm.set(false)">
                Cancel
              </button>
              <button
                mat-raised-button
                color="warn"
                [disabled]="actioning()"
                (click)="drop()"
              >
                Confirm Drop
              </button>
            </div>
          </div>
        </div>
      }
    </div>

    <style>
      .review-shell {
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow: hidden;
        background: var(--surface);
        position: relative;
      }
      .review-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 24px;
        gap: 16px;
        background: var(--surface-2);
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
      }
      .topbar-center {
        flex: 1;
        text-align: center;
      }
      .topbar-name {
        font-size: 15px;
        font-weight: 700;
        color: var(--text);
      }
      .topbar-meta {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .split-container {
        display: flex;
        flex: 1;
        overflow: hidden;
        min-height: 0;
      }
      .split-panel {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        min-width: 0;
        min-height: 0;
      }
      .panel-label {
        padding: 10px 20px;
        font-size: 12px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        background: var(--surface-2);
        border-bottom: 1px solid var(--border);
        flex-shrink: 0;
      }
      .fill-tabs {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      }
      ::ng-deep .fill-tabs .mat-mdc-tab-body-wrapper {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      ::ng-deep .fill-tabs .mat-mdc-tab-body {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
      }
      ::ng-deep .fill-tabs .mat-mdc-tab-body-content {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        width: 100%;
      }
      .panel-scroll {
        flex: 1;
        overflow-y: auto;
        padding: 20px 24px;
        min-height: 0;
      }
      .cv-wrap {
        flex: 1;
        min-height: 0;
        width: 100%;
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }
      .cv-iframe {
        flex: 1;
        min-height: 0;
        width: 100%;
        height: 100%;
        border: none;
        display: block;
      }
      .split-divider {
        width: 1px;
        background: var(--border);
        flex-shrink: 0;
      }
      .info-section {
        margin-bottom: 24px;
      }
      .section-heading {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: var(--text-muted);
        margin-bottom: 10px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--border);
      }
      .info-row {
        display: flex;
        gap: 12px;
        padding: 5px 0;
      }
      .info-label {
        font-size: 13px;
        color: var(--text-muted);
        min-width: 110px;
        flex-shrink: 0;
      }
      .info-val {
        font-size: 13px;
        color: var(--text);
      }
      .info-empty {
        font-size: 13px;
        color: var(--text-muted);
        font-style: italic;
      }
      .description-text {
        line-height: 1.7;
        white-space: pre-wrap;
        margin: 0;
        font-size: 13px;
      }
      .tag-wrap {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 6px;
      }
      .tag {
        background: var(--surface-2);
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 4px 10px;
        font-size: 12px;
        color: var(--text);
        display: flex;
        align-items: center;
        gap: 5px;
      }
      .tag-match {
        background: #e8f5e9;
        border-color: #a5d6a7;
        color: #1b5e20;
      }
      .tag-required {
        background: #e3f2fd;
        border-color: #90caf9;
        color: #0d47a1;
      }
      .tag-sub {
        font-size: 10px;
        opacity: 0.7;
      }
      .tag-check {
        font-size: 11px;
      }
      .tag-required-badge {
        font-size: 9px;
        font-weight: 700;
        background: #0d47a1;
        color: #fff;
        border-radius: 4px;
        padding: 1px 5px;
        margin-left: 2px;
      }
      .match-hint {
        font-size: 11px;
        color: var(--text-muted);
        display: flex;
        align-items: center;
        gap: 4px;
        margin-top: 6px;
      }
      .qual-card {
        padding: 8px 0;
        border-bottom: 1px solid var(--border);
      }
      .qual-card:last-child {
        border-bottom: none;
      }
      .qual-name {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }
      .qual-sub {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .exp-card {
        padding: 10px 0;
        border-bottom: 1px solid var(--border);
      }
      .exp-card:last-child {
        border-bottom: none;
      }
      .exp-role {
        font-size: 13px;
        font-weight: 600;
        color: var(--text);
      }
      .exp-company {
        font-size: 12px;
        color: var(--text-muted);
        margin-top: 1px;
      }
      .exp-dates {
        font-size: 11px;
        color: var(--text-muted);
        margin-top: 2px;
      }
      .exp-duties {
        font-size: 12px;
        color: var(--text);
        margin-top: 6px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
      .confirm-backdrop {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100;
      }
      .confirm-card {
        background: var(--surface);
        border-radius: 12px;
        padding: 28px;
        width: 420px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      }
      .confirm-title {
        font-size: 16px;
        font-weight: 700;
        color: var(--text);
        margin-bottom: 8px;
      }
      .confirm-body {
        font-size: 13px;
        color: var(--text-muted);
        margin-bottom: 14px;
        line-height: 1.6;
      }
      .confirm-notes {
        width: 100%;
        border: 1px solid var(--border);
        border-radius: 8px;
        padding: 10px;
        font-size: 13px;
        color: var(--text);
        background: var(--surface-2);
        resize: none;
        box-sizing: border-box;
        margin-bottom: 16px;
      }
      .confirm-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
    </style>
  `,
})
export class ApplicationReviewComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appService = inject(ApplicationService);
  private sanitizer = inject(DomSanitizer);
  private toast = inject(ToastService);

  data = signal<ApplicationReviewResponse | null>(null);
  loading = signal(true);
  actioning = signal(false);
  showDropConfirm = signal(false);
  dropNotes = '';

  // Set of vacancy skill IDs for O(1) lookup when highlighting candidate skills
  private vacancySkillIds = computed(
    () =>
      new Set(this.data()?.vacancy.requiredSkills.map((s) => s.skillId) ?? []),
  );

  private readonly STATUS_CLASS: Record<string, string> = {
    Applied: 'applied',
    UnderReview: 'shortlisted',
    Shortlisted: 'interview',
    OfferExtended: 'offer',
    Hired: 'offer',
    NotSelected: 'rejected',
  };

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.appService.getReview(id).subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
        console.log('cvUrl from API:', d.candidate.cvUrl);
      },
      error: (err: Error) => {
        this.toast.show(err.message, 'error');
        this.loading.set(false);
      },
    });
  }

  isSkillMatch(skillId: number): boolean {
    return this.vacancySkillIds().has(skillId);
  }

  safeCvUrl(): SafeResourceUrl | null {
    const url = this.data()?.candidate.cvUrl;
    if (!url) return null;
    const full = `${environment.apiUrl.replace('/api', '')}${url}#toolbar=0&navpanes=0&zoom=page-width`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(full);
  }

  shortlist(): void {
    const app = this.data()?.application;
    if (!app) return;
    this.actioning.set(true);
    this.appService
      .updateStatus(app.applicationId, { newStatus: 'Shortlisted' })
      .subscribe({
        next: () => {
          this.toast.show('Candidate shortlisted successfully.', 'success');
          this.router.navigate(['/admin/applications']);
        },
        error: (err: Error) => {
          this.actioning.set(false);
          this.toast.show(err.message, 'error');
        },
      });
  }

  drop(): void {
    const app = this.data()?.application;
    if (!app) return;
    this.actioning.set(true);
    this.appService
      .updateStatus(app.applicationId, {
        newStatus: 'NotSelected',
        // notes: this.dropNotes || undefined
      })
      .subscribe({
        next: () => {
          this.toast.show(
            'Candidate dropped and saved to talent pool.',
            'warn',
          );
          this.router.navigate(['/admin/applications']);
        },
        error: (err: Error) => {
          this.actioning.set(false);
          this.toast.show(err.message, 'error');
        },
      });
  }

  statusClass(s?: string): string {
    return this.STATUS_CLASS[s ?? ''] ?? 'applied';
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/applications']);
  }
}
