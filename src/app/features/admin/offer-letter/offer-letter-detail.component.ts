import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { ApplicationService } from '../../../core/services/application.service';
import { VacancyService } from '../../../core/services/vacancy.service';
import { ToastService } from '../../../core/services/toast.service';
import { OfferLetterService, OfferLetterResponse, OfferLetterTemplateResponse } from '../../../core/services/offer-letter.service';
import { ApplicationResponse, VacancyResponse } from '../../../core/models';

@Component({
  selector: 'app-offer-letter-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="page-container ol-page">
      <div class="ol-top-bar">
        <a [routerLink]="['/admin/applications', applicationId]" class="back-link">
          <i class="ti ti-arrow-left"></i> Back to application
        </a>
        @if (application(); as topApp) {
          <a class="btn-secondary doc-view-btn ol-top-btn"
             [routerLink]="['/admin/applications', topApp.applicationId, 'candidate']">
            <i class="ti ti-user"></i> Candidate details
          </a>
        }
      </div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      } @else {
        @if (application(); as app) {

        <mat-card class="mat-elevation-z1 ol-card">
          <mat-card-content style="padding:28px 32px">
            <!-- Header - styled to match the Manage Vacancy detail page -->
            <div class="vd-header">
              <div class="ol-header-info">
                <div class="ol-avatar">{{ initials(app.candidateName) }}</div>
                <div>
                  <div class="vd-title">Offer letter</div>
                  <div class="vd-ref">{{ app.candidateName }} · {{ app.vacancyTitle }}</div>
                </div>
              </div>
              @if (offer(); as o) {
                <span class="pill" [class.pill-pub]="o.status === 'Sent' || o.status === 'Accepted'"
                      [class.pill-type]="o.status === 'Declined'">
                  {{ o.status }} · v{{ o.versionNumber }}
                </span>
              }
            </div>

            <mat-divider style="margin:18px 0"></mat-divider>

            @if (!offer() || offer()!.status === 'Declined') {

              @if (!template() && !templateLoading()) {
                <div class="tmpl-warning">
                  <i class="ti ti-alert-triangle"></i>
                  No offer letter template has been created yet. Add one below before generating an offer.
                </div>
              }

              @if (!template() || editingTemplate()) {
                <div class="vd-section-label">{{ template() ? 'Edit' : 'Create' }} offer letter template</div>
                <p class="vd-body">Paste the HTML for the offer letter. Wrap each of these field names in double curly braces as placeholders - CandidateName, JobTitle, Salary, StartDate, ClosingDate, Location, EmploymentType - and they'll be filled in automatically.</p>
                <textarea class="assess-comment" rows="8" placeholder="&lt;html&gt;…&lt;/html&gt;"
                          style="margin-top:10px;font-family:'SFMono-Regular',Consolas,monospace;font-size:12px"
                          [(ngModel)]="templateDraft"></textarea>
                <div class="assess-footer">
                  <span></span>
                  <div style="display:flex;gap:10px">
                    @if (template()) {
                      <button class="btn-secondary" (click)="cancelEditTemplate()">Cancel</button>
                    }
                    <button class="btn-primary" [disabled]="!templateDraft.trim() || savingTemplate()" (click)="saveTemplate()">
                      @if (savingTemplate()) { <mat-spinner diameter="14" class="move-btn-spinner"></mat-spinner> } @else { <i class="ti ti-device-floppy"></i> }
                      Save template
                    </button>
                  </div>
                </div>
                <mat-divider style="margin:18px 0"></mat-divider>
              } @else {
                <div class="tmpl-ready">
                  <span><i class="ti ti-file-check"></i> Offer letter template ready ({{ formatDateTime(template()!.uploadedAt) }})</span>
                  <button class="btn-secondary" (click)="startEditTemplate()"><i class="ti ti-edit"></i> Edit template</button>
                </div>
              }

              <div class="vd-section-label">{{ offer() ? 'Send a new offer' : 'Generate offer' }}</div>
              <p class="vd-body">
                @if (offer()) {
                  The previous offer was declined. Fill in the terms for a new offer letter to send.
                } @else {
                  Fill in the terms below. The offer letter is generated from the template and sent to the candidate immediately.
                }
              </p>
              <div class="offer-form" style="margin-top:10px">
                <mat-form-field appearance="outline" class="compact-select">
                  <mat-label>Job title</mat-label>
                  <input matInput [(ngModel)]="draftJobTitle">
                </mat-form-field>
                <mat-form-field appearance="outline" class="compact-select">
                  <mat-label>Employment type</mat-label>
                  <input matInput [(ngModel)]="draftEmploymentType">
                </mat-form-field>
                <mat-form-field appearance="outline" class="compact-select">
                  <mat-label>Location</mat-label>
                  <input matInput [(ngModel)]="draftLocation">
                </mat-form-field>
                <mat-form-field appearance="outline" class="compact-select">
                  <mat-label>Annual salary (ZAR)</mat-label>
                  <input matInput type="number" placeholder="Enter salary" [(ngModel)]="draftSalary">
                </mat-form-field>
                <mat-form-field appearance="outline" class="compact-select">
                  <mat-label>Start date</mat-label>
                  <input matInput type="date" [(ngModel)]="draftStartDate">
                </mat-form-field>
                <mat-form-field appearance="outline" class="compact-select">
                  <mat-label>Closing date</mat-label>
                  <input matInput type="date" [(ngModel)]="draftClosingDate">
                </mat-form-field>
              </div>

              @if (generateError()) {
                <div class="api-error" style="margin-top:12px"><i class="ti ti-alert-circle"></i> {{ generateError() }}</div>
              }

              <div class="assess-footer">
                <span class="form-note"><i class="ti ti-info-circle"></i> Sends to the candidate immediately - there's no draft step</span>
                <button class="btn-primary" [disabled]="!canGenerate() || sendingOffer()" (click)="generateOffer()">
                  @if (sendingOffer()) { <mat-spinner diameter="14" class="move-btn-spinner"></mat-spinner> } @else { <i class="ti ti-send-2"></i> }
                  Generate &amp; send offer letter
                </button>
              </div>

            } @else {
              <div class="vd-section-label">Offer terms</div>
              <div class="kv-grid" style="grid-template-columns:1fr 1fr;margin-top:10px">
                <div class="kv"><span class="kv-icon"><i class="ti ti-briefcase"></i></span><div><span class="kv-label">Position</span><span class="kv-val">{{ offer()!.jobTitle }}</span></div></div>
                <div class="kv"><span class="kv-icon"><i class="ti ti-clock"></i></span><div><span class="kv-label">Employment type</span><span class="kv-val">{{ offer()!.employmentType || '—' }}</span></div></div>
                <div class="kv"><span class="kv-icon"><i class="ti ti-map-pin"></i></span><div><span class="kv-label">Location</span><span class="kv-val">{{ offer()!.location || '—' }}</span></div></div>
                <div class="kv"><span class="kv-icon"><i class="ti ti-currency-dollar"></i></span><div><span class="kv-label">Salary</span><span class="kv-val">ZAR {{ offer()!.salary.toLocaleString('en-ZA') }}</span></div></div>
                <div class="kv"><span class="kv-icon"><i class="ti ti-calendar-event"></i></span><div><span class="kv-label">Start date</span><span class="kv-val">{{ formatDate(offer()!.startDate) }}</span></div></div>
                <div class="kv"><span class="kv-icon"><i class="ti ti-calendar-due"></i></span><div><span class="kv-label">Closing date</span><span class="kv-val">{{ formatDate(offer()!.closingDate) }}</span></div></div>
              </div>

              <mat-divider style="margin:18px 0"></mat-divider>

              @if (offer()!.status === 'Sent') {
                <p class="form-note"><i class="ti ti-hourglass"></i> Sent {{ formatDateTime(offer()!.sentAt) }} — waiting for the candidate to accept or decline the offer.</p>
              } @else if (offer()!.status === 'Accepted') {
                <p class="form-note" style="color:#1a5c35">
                  <i class="ti ti-circle-check"></i> Accepted {{ formatDateTime(offer()!.respondedAt!) }}.
                  Move the application to <strong>Hired</strong> from the
                  <a [routerLink]="['/admin/applications', applicationId]">application page</a> to finish onboarding.
                </p>
              }

              <div class="assess-footer">
                <button class="btn-secondary doc-view-btn" (click)="openPreview()"><i class="ti ti-eye"></i> View letter</button>
                <button class="btn-secondary doc-view-btn" (click)="downloadOffer()"><i class="ti ti-download"></i> Download letter</button>
              </div>
            }
          </mat-card-content>
        </mat-card>
      }
    }
    </div>

    @if (previewOpen()) {
      <div class="ps-modal-backdrop" (click)="closePreview()">
        <div class="ps-modal" (click)="$event.stopPropagation()">
          <div class="ps-modal-header">
            <div><i class="ti ti-file-certificate"></i> Offer letter — {{ offer()?.jobTitle }}</div>
            <button class="ps-modal-close" (click)="closePreview()"><i class="ti ti-x"></i></button>
          </div>
          <div class="ps-modal-body">
            <iframe class="ps-modal-frame" [srcdoc]="offer()?.generatedHtml ?? ''"></iframe>
          </div>
          <div class="ps-modal-footer">
            <button class="btn-secondary" (click)="closePreview()">Close</button>
            <button class="btn-primary" (click)="downloadOffer()"><i class="ti ti-download"></i> Download</button>
          </div>
        </div>
      </div>
    }

    <style>
      .ol-page { max-width: 900px; }
      .ol-top-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
      .ol-top-btn { text-decoration: none; font-weight: 700; padding: 9px 18px; }
      .back-link {
        display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500;
        color: var(--text-muted); text-decoration: none;
      }
      .back-link:hover { color: var(--navy); }

      .ol-card { border-radius: 16px !important; }
      .ol-header-info { display: flex; align-items: center; gap: 16px; }
      .ol-avatar {
        width: 52px; height: 52px; border-radius: 50%;
        background: linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%); color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 18px; font-weight: 700; letter-spacing: 0.02em; flex-shrink: 0;
        box-shadow: 0 3px 12px rgba(26,39,68,0.3);
      }

      .vd-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
      .vd-title { font-size: 20px; font-weight: 800; color: var(--text); letter-spacing: -0.2px; }
      .vd-ref { font-size: 13px; color: var(--text-muted); margin-top: 3px; }
      .vd-section-label { font-size: 11.5px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
      .vd-body { font-size: 13px; color: var(--text-muted); line-height: 1.6; }
      .kv-grid { display: grid; gap: 16px; }
      .kv { display: flex; gap: 10px; align-items: flex-start; }
      .kv-icon { width: 32px; height: 32px; border-radius: 9px; background: var(--surface-2); display: flex; align-items: center; justify-content: center; color: var(--navy); flex-shrink: 0; }
      .kv-label { display: block; font-size: 10.5px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
      .kv-val { display: block; font-size: 13.5px; color: var(--text); font-weight: 600; margin-top: 2px; }
      .pill { font-size: 12px; font-weight: 700; padding: 6px 12px; border-radius: 20px; background: var(--surface-2); color: var(--text-muted); white-space: nowrap; }
      .pill-pub { background: var(--green-bg, #e8f5e9); color: #1a5c35; }
      .pill-type { background: #fdecea; color: var(--red, #c62828); }

      .tmpl-warning {
        display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #8a5a00;
        background: #fff8e1; border: 1px solid #ffe4a3; border-radius: 10px; padding: 10px 12px; margin-bottom: 16px;
      }
      .tmpl-ready {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        font-size: 12.5px; color: #1a5c35; background: var(--green-bg, #e8f5e9);
        border-radius: 10px; padding: 10px 12px; margin-bottom: 18px;
      }
      .tmpl-ready i { margin-right: 4px; }

      .offer-form { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
      .compact-select { width: 100%; }
      .assess-comment {
        width: 100%; font-size: 13px; padding: 10px 12px; resize: vertical;
        border-radius: var(--radius); border: 1.5px solid rgba(0,0,0,0.15);
        background: #fff; color: var(--text); font-family: inherit;
      }
      .assess-comment:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgba(26,39,68,0.08); }
      .assess-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
      .assess-footer .btn-primary { padding: 9px 16px; }
      .move-btn-spinner { display: inline-block; }
      .move-btn-spinner ::ng-deep circle { stroke: #fff; }

      /* ── Letter preview modal ── */
      .ps-modal-backdrop {
        position: fixed; inset: 0; background: rgba(15,23,42,0.55); z-index: 1000;
        display: flex; align-items: center; justify-content: center; padding: 24px;
      }
      .ps-modal {
        background: #fff; border-radius: 14px; width: min(680px, 100%); max-height: 86vh;
        display: flex; flex-direction: column; box-shadow: var(--shadow-lg); overflow: hidden;
      }
      .ps-modal-header {
        display: flex; align-items: center; justify-content: space-between; padding: 14px 18px;
        border-bottom: 1px solid var(--border); font-size: 13px; font-weight: 700; color: var(--text);
      }
      .ps-modal-header i { color: var(--navy); margin-right: 6px; }
      .ps-modal-close { background: transparent; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 6px; }
      .ps-modal-close:hover { background: var(--surface-2); color: var(--text); }
      .ps-modal-body { flex: 1; overflow: auto; background: var(--surface-2); min-height: 300px; }
      .ps-modal-frame { width: 100%; height: 60vh; border: none; background: #fff; }
      .ps-modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 18px; border-top: 1px solid var(--border); background: #fff; }
    </style>
  `
})
export class OfferLetterDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private appService = inject(ApplicationService);
  private vacancyService = inject(VacancyService);
  private offerLetter = inject(OfferLetterService);
  private toast = inject(ToastService);

  loading = signal(true);
  loadError = signal<string | null>(null);

  application = signal<ApplicationResponse | null>(null);
  vacancy = signal<VacancyResponse | null>(null);

  applicationId = 0;

  // ── Template ───────────────────────────────────────────────────
  template = signal<OfferLetterTemplateResponse | null>(null);
  templateLoading = signal(true);
  templateDraft = '';
  editingTemplate = signal(false);
  savingTemplate = signal(false);

  // ── Generate form - nothing here is pre-filled; the recruiter enters it ──
  draftJobTitle = '';
  draftEmploymentType = '';
  draftLocation = '';
  draftSalary: number | null = null;
  draftStartDate = '';
  draftClosingDate = '';
  sendingOffer = signal(false);
  generateError = signal<string | null>(null);

  previewOpen = signal(false);
  openPreview(): void { this.previewOpen.set(true); }
  closePreview(): void { this.previewOpen.set(false); }

  ngOnInit(): void {
    this.applicationId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.applicationId) { this.loadError.set('Invalid application.'); this.loading.set(false); return; }

    this.appService.getById(this.applicationId).subscribe({
      next: app => {
        this.application.set(app);
        this.vacancyService.getById(app.vacancyId).pipe(catchError(() => of(null))).subscribe(v => {
          this.vacancy.set(v);
          this.offerLetter.getLatest(this.applicationId).pipe(catchError(() => of(null))).subscribe(() => {
            this.loading.set(false);
            this.syncFormDefaults();
          });
        });
      },
      error: (err: Error) => { this.loadError.set(err.message); this.loading.set(false); }
    });

    this.offerLetter.getTemplate().subscribe({
      next: t => { this.template.set(t); this.templateLoading.set(false); if (t) this.templateDraft = t.htmlContent; },
      error: () => { this.template.set(null); this.templateLoading.set(false); }
    });
  }

  offer(): OfferLetterResponse | undefined {
    return this.offerLetter.peek(this.applicationId);
  }

  /** Job title/employment type/location are seeded from the vacancy purely as a convenience override -
   *  salary, start date and closing date are always left blank for the recruiter to fill in. */
  private syncFormDefaults(): void {
    const vac = this.vacancy();
    const app = this.application();
    this.draftJobTitle = vac?.title ?? app?.vacancyTitle ?? '';
    this.draftEmploymentType = vac?.employmentType ?? '';
    this.draftLocation = vac?.location ?? '';
    this.draftSalary = null;
    this.draftStartDate = '';
    this.draftClosingDate = '';
  }

  canGenerate(): boolean {
    return !!this.draftSalary && this.draftSalary > 0 && !!this.draftStartDate && !!this.draftClosingDate;
  }

  generateOffer(): void {
    const app = this.application();
    if (!app || !this.canGenerate() || this.draftSalary == null) return;

    this.sendingOffer.set(true);
    this.generateError.set(null);
    this.offerLetter.generate(this.applicationId, {
      salary: this.draftSalary,
      startDate: this.draftStartDate,
      closingDate: this.draftClosingDate,
      jobTitle: this.draftJobTitle || undefined,
      employmentType: this.draftEmploymentType || undefined,
      location: this.draftLocation || undefined
    }).subscribe({
      next: () => {
        this.sendingOffer.set(false);
        this.syncFormDefaults();
        this.toast.show(`Offer letter sent to ${app.candidateName}.`, 'success');
      },
      error: (err: Error) => {
        this.sendingOffer.set(false);
        this.generateError.set(err.message);
      }
    });
  }

  startEditTemplate(): void {
    this.templateDraft = this.template()?.htmlContent ?? '';
    this.editingTemplate.set(true);
  }
  cancelEditTemplate(): void { this.editingTemplate.set(false); }

  saveTemplate(): void {
    if (!this.templateDraft.trim()) return;
    this.savingTemplate.set(true);
    this.offerLetter.uploadTemplate(this.templateDraft).subscribe({
      next: t => {
        this.template.set(t);
        this.savingTemplate.set(false);
        this.editingTemplate.set(false);
        this.toast.show('Offer letter template saved.', 'success');
      },
      error: (err: Error) => { this.savingTemplate.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  downloadOffer(): void {
    const o = this.offer();
    if (o) this.offerLetter.downloadLetter(o);
  }

  initials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    const first = parts[0][0] ?? '';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return (first + last).toUpperCase();
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  formatDateTime(d: string): string {
    return new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
}
