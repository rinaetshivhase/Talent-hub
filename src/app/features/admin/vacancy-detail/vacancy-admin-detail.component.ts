import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { VacancyAdminService, VacancyChangeHistoryEntry } from '../../../core/services/vacancy-admin.service';
import { ApplicationService } from '../../../core/services/application.service';
import { SkillService } from '../../../core/services/skill.service';
import { ToastService } from '../../../core/services/toast.service';
import { PrescreeningService, PrescreeningResponse } from '../../../core/services/prescreening.service';
import { VacancyResponse, ApplicationResponse, SkillResponse } from '../../../core/models';
import { STATUS_LABELS } from '../../../core/utils/application-status';

const STATUS_CLASS: Record<string, string> = {
  Applied: 'applied', UnderReview: 'shortlisted', Shortlisted: 'prescreen',
  PrescreeningStage: 'interview', InterviewStage: 'interview',
  OfferExtended: 'offer', Hired: 'offer', NotSelected: 'rejected'
};

@Component({
  selector: 'app-vacancy-admin-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule,
    MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="page-container">
      <a routerLink="/admin/vacancies" class="back-link">
        <i class="ti ti-arrow-left"></i> Back to Manage Vacancies
      </a>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      }

      @if (!loading() && loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      }

      @if (!loading() && !loadError() && vacancy(); as v) {

        <!-- Vacancy info card -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
          <mat-card-content style="padding:24px">
            <div class="vd-header">
              <div>
                <div class="vd-title">{{ v.title }}</div>
                <div class="vd-ref">JDF-VAC-{{ v.vacancyId }}</div>
              </div>
              <span class="pill" [class.pill-pub]="v.status==='Published'" [class.pill-dept]="v.status==='Draft'" [class.pill-type]="v.status==='Closed'">
                {{ v.status }}
              </span>
            </div>

            <div class="vc-meta" style="margin-top:14px">
              @if (v.location) { <span><i class="ti ti-map-pin"></i> {{ v.location }}</span> }
              <span><i class="ti ti-briefcase-2"></i> {{ v.employmentType }} · {{ v.vacancyType }}</span>
              @if (v.salaryMin || v.salaryMax) {
                <span><i class="ti ti-currency-rand"></i> R{{ v.salaryMin?.toLocaleString() }}{{ v.salaryMax ? ' – R' + v.salaryMax.toLocaleString() : '' }} pm</span>
              }
              @if (v.closingDate) { <span><i class="ti ti-calendar-event"></i> Closes {{ formatDate(v.closingDate) }}</span> }
              @if (v.minYearsExperience) { <span><i class="ti ti-briefcase"></i> {{ v.minYearsExperience }}+ yrs experience</span> }
            </div>

            <mat-divider style="margin:18px 0"></mat-divider>

            <div class="vd-section-label">Description</div>
            <p class="vd-body">{{ v.description }}</p>

            @if (v.requirements) {
              <div class="vd-section-label" style="margin-top:14px">Requirements</div>
              <p class="vd-body">{{ v.requirements }}</p>
            }

            @if (v.skills.length) {
              <div class="vd-section-label" style="margin-top:14px">Required skills</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                @for (s of v.skills; track s.skillId) {
                  <span class="skill-chip" [class.skill-chip--technical]="s.isRequired" [class.skill-chip--soft]="!s.isRequired">
                    {{ skillName(s.skillId) }}
                    <span class="chip-level">{{ s.proficiencyLevel }}{{ s.isRequired ? ' · Required' : ' · Preferred' }}</span>
                  </span>
                }
              </div>
            }

            @if (v.requiredDocuments.length) {
              <div class="vd-section-label" style="margin-top:14px">Required documents</div>
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                @for (rd of v.requiredDocuments; track rd.documentType) {
                  <span class="req-tag">{{ rd.documentType }}{{ rd.isMandatory ? ' *' : ' (optional)' }}</span>
                }
              </div>
            }

            <!-- Actions -->
            <mat-divider style="margin:18px 0"></mat-divider>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              @if (v.status === 'Draft') {
                <a [routerLink]="['/admin/vacancies', v.vacancyId, 'edit']" class="btn-secondary" style="text-decoration:none">
                  <i class="ti ti-pencil"></i> Edit
                </a>
                <button class="btn-primary" (click)="publish(v)" [disabled]="busy()">
                  <i class="ti ti-send"></i> Publish
                </button>
                <button class="btn-remove" (click)="remove(v)" [disabled]="busy()">
                  <i class="ti ti-trash"></i> Delete draft
                </button>
              } @else if (v.status === 'Published') {
                <button class="btn-secondary" (click)="close(v)" [disabled]="busy()">
                  <i class="ti ti-lock"></i> Close vacancy
                </button>
              } @else {
                <span class="form-note"><i class="ti ti-lock"></i> This vacancy is closed — no further actions available</span>
              }
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Change history -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
          <mat-card-content style="padding:18px 20px">
            <div class="card-header" style="cursor:pointer" (click)="historyOpen.set(!historyOpen())">
              <i class="ti ti-history"></i> Change history
              <i class="ti ti-chevron-down" style="margin-left:auto;transition:transform 0.2s" [style.transform]="historyOpen() ? 'rotate(180deg)' : 'none'"></i>
            </div>
            @if (historyOpen()) {
              @if (!history().length) {
                <p style="font-size:12px;color:var(--text-muted);margin-top:8px">No history recorded yet.</p>
              } @else {
                <div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
                  @for (h of history(); track h.vacancyChangeHistoryId) {
                    <div style="padding:8px 0;border-bottom:1px solid var(--border)">
                      <div style="display:flex;align-items:center;gap:10px;font-size:12px">
                        <span class="pill pill-type">{{ h.action }}</span>
                        <span style="color:var(--text-muted)"><i class="ti ti-user"></i> {{ h.changedByName }}</span>
                        <span style="color:var(--text-muted);margin-left:auto"><i class="ti ti-clock"></i> {{ formatDateTime(h.changedAt) }}</span>
                      </div>
                      @if (h.details) {
                        <div style="font-size:12px;color:var(--text);margin-top:4px;padding-left:2px">{{ h.details }}</div>
                      }
                    </div>
                  }
                </div>
              }
            }
          </mat-card-content>
        </mat-card>

        <!-- Applications for this vacancy -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-content style="padding:18px 20px">
            <div class="card-header"><i class="ti ti-users"></i> Applications ({{ applications().length }})</div>

            @if (appsLoading()) {
              <div class="empty-state" style="padding:1.5rem 0"><mat-spinner diameter="28"></mat-spinner></div>
            } @else if (!applications().length) {
              <div class="empty-state" style="padding:1.5rem 0"><i class="ti ti-inbox"></i><p>No one has applied yet.</p></div>
            } @else {
              <div style="margin-top:8px">
                @for (a of applications(); track a.applicationId; let i = $index) {
                  <div class="app-row">
                    <div class="app-rank">#{{ i + 1 }}</div>
                    <div class="app-icon-wrap" [class]="'app-icon-' + statusClass(effectiveStatus(a))">
                      <i class="ti ti-user"></i>
                    </div>
                    <div class="app-main">
                      <div class="app-title">{{ a.candidateName }}</div>
                      <div class="app-sub">Applied {{ formatDate(a.appliedAt) }}{{ i === 0 ? ' · First to apply' : '' }}</div>
                    </div>
                    <a class="status-pill s-{{ statusClass(effectiveStatus(a)) }} status-pill-link"
                       [routerLink]="['/admin/applications', a.applicationId]"
                       title="View application & pre-screening">
                      {{ label(effectiveStatus(a)) }}
                    </a>

                    <a class="btn-secondary app-row-open" style="margin-left:12px;white-space:nowrap"
                       [routerLink]="['/admin/applications', a.applicationId]">
                      <i class="ti ti-clipboard-text"></i> View details
                    </a>
                  </div>

                  @if (prescreeningDoc(a.applicationId); as doc) {
                    <div class="prescreen-panel">
                      <div class="prescreen-summary">
                        <i class="ti ti-clipboard-text"></i>
                        <span>
                          Pre-screening document —
                          @if (doc.status === 'Reviewed') {
                            <strong>reviewed — {{ doc.outcome }}</strong>
                          } @else if (doc.status === 'Submitted') {
                            <strong>submitted {{ formatDate(doc.submittedAt) }}</strong>
                          } @else {
                            <strong>awaiting candidate upload</strong> (sent {{ formatDate(doc.sentAt) }})
                          }
                        </span>
                        @if (doc.status !== 'Sent') {
                          <a class="btn-secondary doc-view-btn" style="margin-left:auto;padding:4px 10px;font-size:12px"
                             [href]="fileHref(doc.completedFileUrl!)" [download]="doc.completedOriginalFileName">
                            <i class="ti ti-download"></i> Download {{ doc.completedOriginalFileName }}
                          </a>
                        }
                      </div>
                    </div>
                  }
                }
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>

    <style>
      .back-link {
        display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500;
        color: var(--text-muted); text-decoration: none; margin-bottom: 16px;
      }
      .back-link:hover { color: var(--navy); }
      .vd-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
      .vd-title { font-size: 20px; font-weight: 700; color: var(--text); }
      .vd-ref { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
      .vd-section-label { font-size: 13px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.03em; }
      .vd-body { font-size: 14px; color: var(--text); line-height: 1.6; margin-top: 6px; white-space: pre-line; }
      .skill-chip {
        display: inline-flex; align-items: center; gap: 6px; padding: 6px 10px; border-radius: 20px;
        font-size: 13px; font-weight: 500;
      }
      .skill-chip--technical { background:#e8f4fd; color:#1565c0; border:1px solid #90caf9; }
      .skill-chip--soft { background:#f3e5f5; color:#6a1b9a; border:1px solid #ce93d8; }
      .chip-level { font-size:11px; opacity:0.75; font-weight:400; }
      .req-tag {
        font-size: 12px; padding: 5px 10px; border-radius: 8px; background: var(--surface-2);
        border: 1px solid var(--border); color: var(--text);
      }
      .app-row {
        display: flex; align-items: center; gap: 12px; padding: 12px 0;
        border-bottom: 1px solid var(--border);
      }
      .app-row:last-child { border-bottom: none; }
      .status-pill-link {
        text-decoration: none; cursor: pointer; border: 1px solid transparent;
        transition: box-shadow 0.15s, transform 0.1s;
      }
      .status-pill-link:hover { box-shadow: 0 0 0 1px currentColor inset; }
      .status-pill-link:active { transform: scale(0.97); }
      .app-row-open {
        display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px;
        font-size: 12px; text-decoration: none; flex-shrink: 0;
      }
      .app-rank {
        width: 26px; height: 26px; border-radius: 50%; background: var(--navy); color: #fff;
        font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
        flex-shrink: 0;
      }
      .prescreen-panel { margin: 0 0 4px 38px; padding: 8px 0 12px; }
      .prescreen-summary {
        display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-muted);
        cursor: pointer; user-select: none;
      }
      .prescreen-summary strong { color: var(--text); font-weight: 600; }
      .prescreen-answers {
        margin-top: 8px; padding: 12px 14px; background: var(--surface-2); border-radius: 10px;
        border: 1px solid var(--border); display: flex; flex-direction: column; gap: 10px;
      }
      .pa-q { font-size: 12px; font-weight: 700; color: var(--navy); }
      .pa-a { font-size: 13px; color: var(--text); margin-top: 2px; white-space: pre-line; }
    </style>
  `
})
export class VacancyAdminDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private vacancyService = inject(VacancyAdminService);
  private appService = inject(ApplicationService);
  private skillService = inject(SkillService);
  private toast = inject(ToastService);
  private prescreening = inject(PrescreeningService);

  vacancy   = signal<VacancyResponse | null>(null);
  loading   = signal(true);
  loadError = signal('');
  busy      = signal(false);

  applications = signal<ApplicationResponse[]>([]);
  appsLoading  = signal(false);

  history     = signal<VacancyChangeHistoryEntry[]>([]);
  historyOpen = signal(false);

  allSkills = signal<SkillResponse[]>([]);

  private vacancyId = 0;

  ngOnInit(): void {
    this.vacancyId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.vacancyId) { this.loadError.set('Invalid vacancy.'); this.loading.set(false); return; }

    this.skillService.getAll().subscribe({ next: s => this.allSkills.set(s) });
    this.vacancyService.getHistory(this.vacancyId).subscribe({ next: h => this.history.set(h) });

    this.vacancyService.getById(this.vacancyId).subscribe({
      next: v => { this.vacancy.set(v); this.loading.set(false); this.loadApplications(); },
      error: (err: Error) => { this.loadError.set(err.message); this.loading.set(false); }
    });
  }

  private loadApplications(): void {
    this.appsLoading.set(true);
    this.appService.getByVacancy(this.vacancyId).subscribe({
      next: apps => {
        const sorted = [...apps].sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime());
        this.applications.set(sorted);
        this.appsLoading.set(false);
        // Preload pre-screening records for every application so the assessment
        // panel and status pill can read them synchronously in the template.
        this.prescreening.preload(sorted.map(a => a.applicationId)).subscribe();
      },
      error: () => this.appsLoading.set(false)
    });
  }

  skillName(skillId: number): string {
    return this.allSkills().find(s => s.skillId === skillId)?.name ?? `Skill #${skillId}`;
  }

  label(s: string): string { return (STATUS_LABELS as Record<string, string>)[s] ?? s; }
  statusClass(s: string): string { return STATUS_CLASS[s] ?? 'applied'; }

  formatDate(d?: string): string {
    return d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  }

  formatDateTime(d: string): string {
    return new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  effectiveStatus(a: ApplicationResponse): string {
    return this.prescreening.effectiveStatus(a.applicationId, a.status);
  }

  prescreeningDoc(applicationId: number): PrescreeningResponse | undefined {
    return this.prescreening.peek(applicationId);
  }

  fileHref(relativeUrl: string): string {
    return this.prescreening.fileHref(relativeUrl);
  }

  publish(v: VacancyResponse): void {
    this.busy.set(true);
    this.vacancyService.publish(v.vacancyId).subscribe({
      next: updated => { this.vacancy.set(updated); this.busy.set(false); this.toast.show('Vacancy published.', 'success'); },
      error: (err: Error) => { this.busy.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  close(v: VacancyResponse): void {
    if (!confirm(`Close "${v.title}"? This cannot be undone.`)) return;
    this.busy.set(true);
    this.vacancyService.close(v.vacancyId).subscribe({
      next: updated => { this.vacancy.set(updated); this.busy.set(false); this.toast.show('Vacancy closed.', 'success'); },
      error: (err: Error) => { this.busy.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  remove(v: VacancyResponse): void {
    if (!confirm(`Delete draft "${v.title}"? This cannot be undone.`)) return;
    this.busy.set(true);
    this.vacancyService.delete(v.vacancyId).subscribe({
      next: () => { this.toast.show('Draft deleted.', 'success'); this.router.navigate(['/admin/vacancies']); },
      error: (err: Error) => { this.busy.set(false); this.toast.show(err.message, 'error'); }
    });
  }
}