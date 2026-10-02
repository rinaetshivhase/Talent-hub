import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApplicationService } from '../../../core/services/application.service';
import { CandidateService } from '../../../core/services/candidate.service';
import { DocumentService, DOCUMENT_TYPE_LABELS } from '../../../core/services/document.service';
import { CandidateSkillService } from '../../../core/services/candidate-skill.service';
import { CandidateExperienceService } from '../../../core/services/candidate-experience.service';
import { CandidateQualificationService } from '../../../core/services/candidate-qualification.service';
import { environment } from '../../../../environments/environment';
import {
  ApplicationResponse, CandidateResponse, CandidateDocumentResponse,
  CandidateSkillResponse, ExperienceResponse, QualificationResponse
} from '../../../core/models';

@Component({
  selector: 'app-candidate-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatProgressSpinnerModule, MatDividerModule],
  template: `
    <div class="page-container cp-page">
      <a [routerLink]="['/admin/applications', applicationId]" class="back-link">
        <i class="ti ti-arrow-left"></i> Back to application
      </a>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      } @else {
        @if (application(); as app) {

        <mat-card class="mat-elevation-z1 ad-card">
          <div class="ad-header-inline">
            <div class="ad-avatar">{{ initials(app.candidateName) }}</div>
            <div class="ad-header-info">
              <div class="ad-name">{{ app.candidateName }}</div>
              <div class="ad-sub">
                <i class="ti ti-briefcase"></i>
                Applied for <strong>{{ app.vacancyTitle }}</strong>
              </div>
            </div>
          </div>

          <mat-divider style="margin:20px 0"></mat-divider>

          <div class="vd-section-label">Candidate details</div>
          @if (candidate(); as c) {
            <div class="kv-grid" style="margin-top:10px">
              <div class="kv"><span class="kv-icon"><i class="ti ti-mail"></i></span><div><span class="kv-label">Email</span><span class="kv-val">{{ c.email }}</span></div></div>
              <div class="kv"><span class="kv-icon"><i class="ti ti-phone"></i></span><div><span class="kv-label">Phone</span><span class="kv-val">{{ c.phone || '—' }}</span></div></div>
              <div class="kv"><span class="kv-icon"><i class="ti ti-gender-bigender"></i></span><div><span class="kv-label">Gender</span><span class="kv-val">{{ c.gender || '—' }}</span></div></div>
              <div class="kv"><span class="kv-icon"><i class="ti ti-flag"></i></span><div><span class="kv-label">Nationality</span><span class="kv-val">{{ c.nationality || '—' }}</span></div></div>
              <div class="kv"><span class="kv-icon"><i class="ti ti-cake"></i></span><div><span class="kv-label">Date of birth</span><span class="kv-val">{{ c.dateOfBirth ? formatDate(c.dateOfBirth) : '—' }}</span></div></div>
              <div class="kv"><span class="kv-icon"><i class="ti ti-calendar-event"></i></span><div><span class="kv-label">Registered</span><span class="kv-val">{{ formatDate(c.registeredAt) }}</span></div></div>
            </div>
          } @else {
            <p class="form-note" style="margin-top:8px">Candidate profile unavailable.</p>
          }

          <mat-divider style="margin:18px 0"></mat-divider>

          <div class="vd-section-label">Experience</div>
          @if (experience().length) {
            <div class="exp-list" style="margin-top:10px">
              @for (e of experience(); track e.candidateExperienceId) {
                <div class="exp-row">
                  <span class="exp-icon"><i class="ti ti-briefcase-2"></i></span>
                  <div class="exp-body">
                    <div class="exp-role">{{ e.role }} <span class="exp-at">at {{ e.company }}</span></div>
                    <div class="exp-dates"><i class="ti ti-calendar"></i>{{ formatDate(e.startDate) }} – {{ e.endDate ? formatDate(e.endDate) : 'Present' }}</div>
                    @if (e.projectsAndDuties) { <div class="exp-notes">{{ e.projectsAndDuties }}</div> }
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="form-note" style="margin-top:8px">No experience captured.</p>
          }

          <mat-divider style="margin:18px 0"></mat-divider>

          <div class="vd-section-label">Qualifications</div>
          @if (qualifications().length) {
            <div class="qual-list" style="margin-top:10px">
              @for (q of qualifications(); track q.candidateQualificationId) {
                <div class="qual-row">
                  <span class="qual-icon">
                    <i class="ti" [class.ti-certificate]="q.qualificationType === 'Certification'" [class.ti-books]="q.qualificationType !== 'Certification'"></i>
                  </span>
                  <div>
                    <div class="qual-name">{{ q.name }}</div>
                    <div class="qual-sub">{{ q.institution }} · {{ formatDate(q.yearCompleted) }}</div>
                  </div>
                </div>
              }
            </div>
          } @else {
            <p class="form-note" style="margin-top:8px">No qualifications captured.</p>
          }

          <mat-divider style="margin:18px 0"></mat-divider>

          <div class="vd-section-label">Skills</div>
          @if (skills().length) {
            <div class="skill-chips" style="margin-top:10px">
              @for (s of skills(); track s.candidateSkillId) {
                <span class="skill-chip"><span class="skill-dot" [ngClass]="skillClass(s.proficiencyLevel)"></span>{{ s.skillName }}<span class="skill-level">{{ s.proficiencyLevel }}</span></span>
              }
            </div>
          } @else {
            <p class="form-note" style="margin-top:8px">No skills captured.</p>
          }

          <mat-divider style="margin:18px 0"></mat-divider>

          <div class="vd-section-label">Submitted documents</div>
          @if (documents().length) {
            <div class="doc-list" style="margin-top:10px">
              @for (d of documents(); track d.candidateDocumentId) {
                <div class="doc-row">
                  <span class="doc-icon"><i class="ti ti-file-text"></i></span>
                  <div class="doc-meta">
                    <div class="doc-name">{{ docLabel(d.documentType) }}</div>
                    <div class="doc-sub">{{ d.originalFileName }} · uploaded {{ formatDate(d.uploadedAt) }}</div>
                  </div>
                  <a class="btn-secondary doc-view-btn" [href]="fileHref(d.fileUrl)" target="_blank" rel="noopener">
                    <i class="ti ti-eye"></i> View
                  </a>
                </div>
              }
            </div>
          } @else {
            <p class="form-note" style="margin-top:8px">No documents on file.</p>
          }
        </mat-card>
        }
      }
    </div>

    <style>
      .cp-page { max-width: 820px; }
      .back-link {
        display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500;
        color: var(--text-muted); text-decoration: none; margin-bottom: 16px;
      }
      .back-link:hover { color: var(--navy); }

      /* ── Header (nested inline at the top of the card) ── */
      .ad-header-inline {
        display: flex; align-items: center; gap: 18px;
      }
      .ad-avatar {
        width: 58px; height: 58px; border-radius: 50%;
        background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%); color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 20px; font-weight: 700; letter-spacing: 0.02em; flex-shrink: 0;
        box-shadow: 0 3px 12px rgba(26,39,68,0.35);
      }
      .ad-header-info { flex: 1; min-width: 0; }
      .ad-name { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; }
      .ad-sub {
        font-size: 13px; color: var(--text-muted); margin-top: 4px;
        display: flex; align-items: center; gap: 5px; flex-wrap: wrap;
      }
      .ad-sub i { font-size: 13px; color: var(--text-muted); }
      .ad-sub strong { color: var(--text); font-weight: 600; }

      .ad-card { border-radius: 14px !important; padding: 20px 22px; }
      .ad-card ::ng-deep .mat-mdc-card-content { padding: 0; }

      .vd-section-label { font-size: 11px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
      .form-note { font-size: 12.5px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }

      /* ── Candidate details ── */
      .kv-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; }
      .kv {
        display: flex; align-items: flex-start; gap: 10px;
        padding: 11px 0; border-bottom: 1px solid var(--border);
      }
      .kv:nth-last-child(-n+2) { border-bottom: none; padding-bottom: 0; }
      .kv-icon {
        width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0; margin-top: 1px;
        background: var(--surface-2); color: var(--navy);
        display: flex; align-items: center; justify-content: center; font-size: 13px;
      }
      .kv-label { display: block; font-size: 10.5px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
      .kv-val { display: block; font-size: 13px; color: var(--text); font-weight: 600; margin-top: 3px; word-break: break-word; }

      /* ── Experience ── */
      .exp-list { display: flex; flex-direction: column; }
      .exp-row { display: flex; gap: 12px; padding-bottom: 16px; margin-bottom: 16px; border-bottom: 1px solid var(--border); }
      .exp-row:last-child { border-bottom: none; padding-bottom: 0; margin-bottom: 0; }
      .exp-icon {
        width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
        background: var(--blue-bg); color: var(--blue);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .exp-body { flex: 1; min-width: 0; }
      .exp-role { font-size: 13.5px; font-weight: 700; color: var(--text); }
      .exp-at { font-weight: 500; color: var(--text-muted); }
      .exp-dates { font-size: 11px; color: var(--text-muted); margin-top: 3px; display: flex; align-items: center; gap: 4px; }
      .exp-dates i { font-size: 12px; }
      .exp-notes { font-size: 12.5px; color: var(--text-muted); margin-top: 7px; white-space: pre-line; line-height: 1.6; }

      /* ── Qualifications ── */
      .qual-list { display: flex; flex-direction: column; }
      .qual-row { display: flex; align-items: flex-start; gap: 12px; padding: 11px 0; border-bottom: 1px solid var(--border); }
      .qual-row:last-child { border-bottom: none; padding-bottom: 0; }
      .qual-row:first-child { padding-top: 0; }
      .qual-icon {
        width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
        background: var(--purple-bg); color: var(--purple);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .qual-name { font-size: 13px; font-weight: 700; color: var(--text); }
      .qual-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

      /* ── Skills ── */
      .skill-chips { display: flex; gap: 8px; flex-wrap: wrap; }
      .skill-chip {
        display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600;
        background: var(--surface-2); border: 1px solid var(--border); border-radius: 20px;
        padding: 7px 12px; color: var(--text);
      }
      .skill-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
      .skill-dot.lvl-expert { background: var(--green); }
      .skill-dot.lvl-intermediate { background: var(--blue); }
      .skill-dot.lvl-beginner { background: var(--amber); }
      .skill-level { color: var(--text-muted); font-weight: 500; }
      .skill-level::before { content: '·'; margin-right: 7px; color: rgba(0,0,0,0.2); }

      /* ── Documents ── */
      .doc-list { display: flex; flex-direction: column; gap: 8px; }
      .doc-row {
        display: flex; align-items: center; gap: 12px; padding: 12px;
        border: 1px solid var(--border); border-radius: 10px; transition: all 0.15s;
      }
      .doc-row:hover { border-color: rgba(0,0,0,0.18); box-shadow: var(--shadow-sm); }
      .doc-icon {
        width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
        background: var(--blue-bg); color: var(--blue);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .doc-meta { flex: 1; min-width: 0; }
      .doc-name { font-size: 13px; font-weight: 700; color: var(--text); }
      .doc-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
      .doc-view-btn { padding: 6px 12px; font-size: 12px; flex-shrink: 0; }
    </style>
  `
})
export class CandidateProfileComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private appService = inject(ApplicationService);
  private candidateService = inject(CandidateService);
  private documentService = inject(DocumentService);
  private skillService = inject(CandidateSkillService);
  private experienceService = inject(CandidateExperienceService);
  private qualificationService = inject(CandidateQualificationService);

  loading = signal(true);
  loadError = signal<string | null>(null);

  application = signal<ApplicationResponse | null>(null);
  candidate = signal<CandidateResponse | null>(null);
  skills = signal<CandidateSkillResponse[]>([]);
  experience = signal<ExperienceResponse[]>([]);
  qualifications = signal<QualificationResponse[]>([]);
  documents = signal<CandidateDocumentResponse[]>([]);

  applicationId = 0;

  ngOnInit(): void {
    this.applicationId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.applicationId) { this.loadError.set('Invalid application.'); this.loading.set(false); return; }

    this.appService.getById(this.applicationId).subscribe({
      next: app => {
        this.application.set(app);
        forkJoin({
          candidate: this.candidateService.getById(app.candidateId).pipe(catchError(() => of(null))),
          skills: this.skillService.getAll(app.candidateId).pipe(catchError(() => of([]))),
          experience: this.experienceService.getAll(app.candidateId).pipe(catchError(() => of([]))),
          qualifications: this.qualificationService.getAll(app.candidateId).pipe(catchError(() => of([]))),
          documents: this.documentService.getAll(app.candidateId).pipe(catchError(() => of([])))
        }).subscribe(res => {
          this.candidate.set(res.candidate);
          this.skills.set(res.skills);
          this.experience.set(res.experience);
          this.qualifications.set(res.qualifications);
          this.documents.set(res.documents);
          this.loading.set(false);
        });
      },
      error: (err: Error) => { this.loadError.set(err.message); this.loading.set(false); }
    });
  }

  docLabel(t: string): string { return (DOCUMENT_TYPE_LABELS as Record<string, string>)[t] ?? t; }

  initials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  skillClass(level: string): string {
    const l = (level || '').toLowerCase();
    if (l.includes('expert') || l.includes('advanced')) return 'lvl-expert';
    if (l.includes('intermediate')) return 'lvl-intermediate';
    return 'lvl-beginner';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  fileHref(fileUrl: string): string {
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    const origin = environment.apiUrl.replace(/\/api\/?$/, '');
    return fileUrl.startsWith('/') ? origin + fileUrl : `${origin}/${fileUrl}`;
  }
}
