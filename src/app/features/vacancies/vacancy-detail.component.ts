import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { VacancyService } from '../../core/services/vacancy.service';
import { ApplicationService } from '../../core/services/application.service';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { DocumentService, DOCUMENT_TYPE_LABELS } from '../../core/services/document.service';
import { SkillService } from '../../core/services/skill.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { VacancyResponse, ApplicationResponse, CandidateDocumentResponse, SkillResponse } from '../../core/models';

const STATUS_CLASS: Record<string, string> = {
  Applied:'applied', UnderReview:'shortlisted', Shortlisted:'prescreen',
  PrescreeningStage:'interview', InterviewStage:'interview',
  OfferExtended:'offer', Hired:'offer', NotSelected:'rejected'
};
const STATUS_LABEL: Record<string, string> = {
  Applied:'Applied', UnderReview:'Under Review', Shortlisted:'Shortlisted',
  OfferExtended:'Offer Extended', Hired:'Hired', NotSelected:'Not Selected'
};

@Component({
  selector: 'app-vacancy-detail',
  standalone: true,
  imports: [
    CommonModule, RouterLink,
    MatCardModule, MatButtonModule, MatIconModule,
    MatDividerModule, MatProgressSpinnerModule, MatTooltipModule
  ],
  template: `
    <div class="page-container">
      <a routerLink="/vacancies" class="back-link">
        <i class="ti ti-arrow-left"></i> Back to vacancies
      </a>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner><p style="margin-top:12px">Loading vacancy…</p></div>
      }

      @if (!loading() && loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      }

      @if (!loading() && !loadError() && vacancy(); as v) {

        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
          <mat-card-content style="padding:24px">
            <div class="vd-header">
              <div>
                <div class="vd-title">{{ v.title }}</div>
                <div class="vd-ref">JDF-VAC-{{ v.vacancyId }}</div>
              </div>
              <div class="vc-pills">
                <span class="pill pill-pub"><i class="ti ti-circle" style="font-size:7px"></i> Published</span>
                <span class="pill pill-type">{{ v.employmentType }}</span>
                @if (v.vacancyType) { <span class="pill pill-dept">{{ v.vacancyType }}</span> }
              </div>
            </div>

            <div class="vc-meta" style="margin-top:14px">
              @if (v.location) { <span><i class="ti ti-map-pin"></i> {{ v.location }}</span> }
              @if (v.salaryMin || v.salaryMax) {
                <span>
                  <i class="ti ti-currency-rand"></i>
                  R{{ v.salaryMin?.toLocaleString() }}{{ v.salaryMax ? ' – R' + v.salaryMax.toLocaleString() : '' }} pm
                </span>
              }
              @if (v.closingDate) { <span><i class="ti ti-calendar-event"></i> Closes {{ formatDate(v.closingDate) }}</span> }
              @if (v.minYearsExperience) { <span><i class="ti ti-briefcase"></i> {{ v.minYearsExperience }}+ yrs experience</span> }
            </div>

            <mat-divider style="margin:18px 0"></mat-divider>

            <div class="vd-section-label">Description</div>
            <p class="vd-body">{{ v.description }}</p>

            @if (v.requirements) {
              <div class="vd-section-label" style="margin-top:16px">Requirements</div>
              <p class="vd-body">{{ v.requirements }}</p>
            }

            @if (v.skills.length) {
              <div class="vd-section-label" style="margin-top:16px">Required skills</div>
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
              <div class="vd-section-label" style="margin-top:16px">Required documents</div>
              <div class="vc-requirements" style="margin-top:8px">
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
          </mat-card-content>
        </mat-card>

        @if (isCandidate()) {
          <mat-card class="mat-elevation-z1" style="border-radius:12px">
            <mat-card-content style="padding:20px 24px">
              @if (myApplication(); as app) {
                <div class="vd-section-label">Your application</div>
                <div style="display:flex;align-items:center;gap:12px;margin-top:10px;flex-wrap:wrap">
                  <span class="status-pill s-{{ statusClass(app.status) }}">{{ statusLabel(app.status) }}</span>
                  <span style="font-size:12px;color:var(--text-muted)">Applied {{ formatDate(app.appliedAt) }}</span>
                  <a routerLink="/applications" class="card-link" style="margin-left:auto">
                    View full history <i class="ti ti-arrow-right"></i>
                  </a>
                </div>
              } @else {
                <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap">
                  <button class="btn-apply"
                          (click)="apply(v)"
                          [disabled]="!canApply(v) || applying()"
                          [matTooltip]="applyTooltip(v)">
                    @if (applying()) {
                      <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> Submitting…
                    } @else {
                      <i class="ti ti-send"></i> Apply now
                    }
                  </button>
                  @if (!state.profile()) {
                    <span class="apply-hint"><a routerLink="/profile">Create profile</a> to apply</span>
                  } @else if (missingDocsFor(v).length) {
                    <span class="apply-hint">
                      Missing: {{ missingDocsFor(v).map(docLabel).join(', ') }} — <a routerLink="/documents">upload now</a>
                    </span>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        }
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
    </style>
  `
})
export class VacancyDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private vacancyService = inject(VacancyService);
  private appService = inject(ApplicationService);
  private docService = inject(DocumentService);
  private skillService = inject(SkillService);
  private auth = inject(AuthService);
  state = inject(CandidateStateService);
  private toast = inject(ToastService);

  vacancy   = signal<VacancyResponse | null>(null);
  loading   = signal(true);
  loadError = signal('');
  applying  = signal(false);

  myApplications = signal<ApplicationResponse[]>([]);
  myDocs         = signal<CandidateDocumentResponse[]>([]);
  allSkills      = signal<SkillResponse[]>([]);

  myApplication = computed(() => {
    const v = this.vacancy();
    if (!v) return undefined;
    return this.myApplications().find(a => a.vacancyId === v.vacancyId);
  });

  isCandidate(): boolean {
    return this.auth.currentUser()?.role === 'Candidate';
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.loadError.set('Invalid vacancy.'); this.loading.set(false); return; }

    this.vacancyService.getById(id).subscribe({
      next: v => { this.vacancy.set(v); this.loading.set(false); },
      error: (err: Error) => { this.loadError.set(err.message); this.loading.set(false); }
    });

    this.skillService.getAll().subscribe({ next: s => this.allSkills.set(s) });

    const p = this.state.profile();
    if (p) {
      this.appService.getByCandidate(p.candidateId).subscribe({ next: a => this.myApplications.set(a) });
      this.docService.getAll(p.candidateId).subscribe({ next: d => this.myDocs.set(d) });
    }
  }

  skillName(skillId: number): string {
    return this.allSkills().find(s => s.skillId === skillId)?.name ?? `Skill #${skillId}`;
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

  statusClass(s: string): string { return STATUS_CLASS[s] ?? 'applied'; }
  statusLabel(s: string): string { return STATUS_LABEL[s] ?? s; }

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
    this.applying.set(true);
    this.appService.apply({ candidateId: p.candidateId, vacancyId: v.vacancyId }).subscribe({
      next: app => {
        this.myApplications.update(l => [...l, app]);
        this.applying.set(false);
        this.toast.show(`Applied to ${v.title} — status: ${app.status}`, 'success');
      },
      error: (err: Error) => { this.applying.set(false); this.toast.show(err.message, 'error'); }
    });
  }
}