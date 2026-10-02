import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

import { ToastService } from '../../../core/services/toast.service';
import {
  PrescreeningService, PrescreeningTemplateResponse, validatePrescreeningFile
} from '../../../core/services/prescreening.service';
import { OfferLetterService, OfferLetterTemplateResponse } from '../../../core/services/offer-letter.service';

@Component({
  selector: 'app-templates',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="page-container tp-page">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-file-stack"></i> Templates</h2>
          <p class="page-sub">Manage the pre-screening assessment template and the offer letter template used across all applications.</p>
        </div>
      </div>

      <div class="tp-grid">

        <!-- Pre-screening template -->
        <mat-card class="mat-elevation-z1 tp-card">
          <mat-card-content style="padding:24px 26px">
            <div class="tp-card-header">
              <div class="tp-icon"><i class="ti ti-clipboard-list"></i></div>
              <div>
                <div class="vd-title-sm">Pre-screening assessment template</div>
                <div class="vd-ref">The blank form candidates fill in and upload back after being shortlisted</div>
              </div>
            </div>

            <mat-divider style="margin:18px 0"></mat-divider>

            @if (psLoading()) {
              <div class="empty-state" style="padding:1rem 0"><mat-spinner diameter="24"></mat-spinner></div>
            } @else {
              @if (psTemplate(); as t) {
                <div class="tmpl-ready">
                  <span><i class="ti ti-file-check"></i> {{ t.originalFileName }} · uploaded {{ formatDateTime(t.uploadedAt) }}</span>
                  <a [href]="fileHref(t.fileUrl)" target="_blank" rel="noopener" class="btn-secondary doc-view-btn">
                    <i class="ti ti-eye"></i> View
                  </a>
                </div>
              } @else {
                <div class="tmpl-warning">
                  <i class="ti ti-alert-triangle"></i>
                  No pre-screening template has been uploaded yet. Applications can't send a pre-screening form until one exists.
                </div>
              }
            }

            <div class="tmpl-upload-row">
              <input type="file" class="ps-file-input" id="ps-tmpl-file" accept=".pdf,.doc,.docx" (change)="onPsFileSelected($event)">
              <label class="btn-primary" for="ps-tmpl-file">
                @if (uploadingPs()) { <mat-spinner diameter="14" class="move-btn-spinner"></mat-spinner> } @else { <i class="ti ti-upload"></i> }
                {{ psTemplate() ? 'Replace template' : 'Upload template' }}
              </label>
              <span class="form-note">PDF, DOC or DOCX · max 5 MB</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Offer letter template -->
        <mat-card class="mat-elevation-z1 tp-card">
          <mat-card-content style="padding:24px 26px">
            <div class="tp-card-header">
              <div class="tp-icon"><i class="ti ti-file-certificate"></i></div>
              <div>
                <div class="vd-title-sm">Offer letter template</div>
                <div class="vd-ref">The HTML used to generate offer letters for accepted candidates</div>
              </div>
            </div>

            <mat-divider style="margin:18px 0"></mat-divider>

            @if (olLoading()) {
              <div class="empty-state" style="padding:1rem 0"><mat-spinner diameter="24"></mat-spinner></div>
            } @else {
              @if (olTemplate(); as t) {
                <div class="tmpl-ready">
                  <span><i class="ti ti-file-check"></i> Template ready · saved {{ formatDateTime(t.uploadedAt) }}</span>
                </div>
              } @else {
                <div class="tmpl-warning">
                  <i class="ti ti-alert-triangle"></i>
                  No offer letter template has been created yet. Offers can't be generated until one exists.
                </div>
              }

              <p class="vd-body" style="margin-top:14px">
                Paste the HTML for the offer letter. Wrap each of these field names in double curly braces as placeholders -
                CandidateName, JobTitle, Salary, StartDate, ClosingDate, Location, EmploymentType - and they'll be filled in automatically.
              </p>
              <textarea class="assess-comment" rows="10" placeholder="&lt;html&gt;…&lt;/html&gt;"
                        style="margin-top:8px;font-family:'SFMono-Regular',Consolas,monospace;font-size:12px"
                        [(ngModel)]="olTemplateDraft"></textarea>
              <div class="assess-footer">
                <span class="form-note"><i class="ti ti-info-circle"></i> Saving replaces the template for every future offer</span>
                <button class="btn-primary" [disabled]="!olTemplateDraft.trim() || savingOl()" (click)="saveOlTemplate()">
                  @if (savingOl()) { <mat-spinner diameter="14" class="move-btn-spinner"></mat-spinner> } @else { <i class="ti ti-device-floppy"></i> }
                  Save template
                </button>
              </div>
            }
          </mat-card-content>
        </mat-card>

      </div>
    </div>

    <style>
      .tp-page { max-width: 1200px; }
      .tp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: stretch; }
      @media (max-width: 900px) { .tp-grid { grid-template-columns: 1fr; } }

      .tp-card { border-radius: 16px !important; height: 100%; display: flex; flex-direction: column; }
      .tp-card mat-card-content { display: flex; flex-direction: column; flex: 1; }
      .tp-card-header { display: flex; align-items: center; gap: 14px; }
      .tp-icon {
        width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
        background: var(--surface-2); border: 1px solid var(--border); color: var(--navy);
        display: flex; align-items: center; justify-content: center; font-size: 17px;
      }
      .vd-title-sm { font-size: 15px; font-weight: 700; color: var(--text); }
      .vd-ref { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
      .vd-body { font-size: 13px; color: var(--text-muted); line-height: 1.6; }

      .tmpl-warning {
        display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #8a5a00;
        background: #fff8e1; border: 1px solid #ffe4a3; border-radius: 10px; padding: 10px 12px;
      }
      .tmpl-ready {
        display: flex; align-items: center; justify-content: space-between; gap: 12px;
        font-size: 12.5px; color: #1a5c35; background: var(--green-bg, #e8f5e9);
        border-radius: 10px; padding: 10px 12px;
      }
      .tmpl-ready i { margin-right: 4px; }

      .tmpl-upload-row { display: flex; align-items: center; gap: 12px; margin-top: 16px; flex-wrap: wrap; }
      .ps-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }

      .assess-comment {
        width: 100%; font-size: 13px; padding: 10px 12px; resize: vertical;
        border-radius: var(--radius); border: 1.5px solid rgba(0,0,0,0.15);
        background: #fff; color: var(--text); font-family: inherit;
      }
      .assess-comment:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgba(26,39,68,0.08); }
      .assess-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
      .move-btn-spinner { display: inline-block; }
      .move-btn-spinner ::ng-deep circle { stroke: #fff; }
    </style>
  `
})
export class TemplatesComponent implements OnInit {
  private prescreening = inject(PrescreeningService);
  private offerLetter = inject(OfferLetterService);
  private toast = inject(ToastService);

  psTemplate = signal<PrescreeningTemplateResponse | null>(null);
  psLoading = signal(true);
  uploadingPs = signal(false);

  olTemplate = signal<OfferLetterTemplateResponse | null>(null);
  olLoading = signal(true);
  olTemplateDraft = '';
  savingOl = signal(false);

  ngOnInit(): void {
    this.prescreening.getTemplate().subscribe({
      next: t => { this.psTemplate.set(t); this.psLoading.set(false); },
      error: () => { this.psTemplate.set(null); this.psLoading.set(false); }
    });

    this.offerLetter.getTemplate().subscribe({
      next: t => { this.olTemplate.set(t); this.olLoading.set(false); if (t) this.olTemplateDraft = t.htmlContent; },
      error: () => { this.olTemplate.set(null); this.olLoading.set(false); }
    });
  }

  fileHref(fileUrl: string): string {
    return this.prescreening.fileHref(fileUrl);
  }

  formatDateTime(d: string): string {
    return new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  onPsFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const error = validatePrescreeningFile(file);
    if (error) { this.toast.show(error, 'error'); return; }

    this.uploadingPs.set(true);
    this.prescreening.uploadTemplate(file).subscribe({
      next: t => { this.psTemplate.set(t); this.uploadingPs.set(false); this.toast.show('Pre-screening template uploaded.', 'success'); },
      error: (err: Error) => { this.uploadingPs.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  saveOlTemplate(): void {
    if (!this.olTemplateDraft.trim()) return;
    this.savingOl.set(true);
    this.offerLetter.uploadTemplate(this.olTemplateDraft).subscribe({
      next: t => { this.olTemplate.set(t); this.savingOl.set(false); this.toast.show('Offer letter template saved.', 'success'); },
      error: (err: Error) => { this.savingOl.set(false); this.toast.show(err.message, 'error'); }
    });
  }
}
