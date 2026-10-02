import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
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
import { ToastService } from '../../../core/services/toast.service';
import {
  PrescreeningService, PrescreeningResponse, PrescreeningTemplateResponse,
  PrescreeningOutcome, previewKindFor, FilePreviewKind
} from '../../../core/services/prescreening.service';
import { OfferLetterService, OfferLetterResponse } from '../../../core/services/offer-letter.service';
import { VacancyService } from '../../../core/services/vacancy.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import {
  ApplicationResponse, CandidateResponse, CandidateDocumentResponse,
  CandidateSkillResponse, ExperienceResponse, QualificationResponse, VacancyResponse
} from '../../../core/models';
import { getValidNextStatuses, STATUS_LABELS, ApplicationStatusKey } from '../../../core/utils/application-status';

const STATUS_CLASS: Record<string, string> = {
  Applied: 'applied', UnderReview: 'shortlisted', Shortlisted: 'prescreen',
  PrescreeningStage: 'interview', InterviewStage: 'interview',
  OfferExtended: 'offer', Hired: 'offer', NotSelected: 'rejected',
  OfferSent: 'offer', OfferAccepted: 'offer', OfferDeclined: 'rejected'
};


@Component({
  selector: 'app-application-detail',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink, MatCardModule,
    MatButtonModule, MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="page-container ad-page">
      <div class="ad-top-bar">
        <a routerLink="/admin/applications" class="back-link">
          <i class="ti ti-arrow-left"></i> Back to applications
        </a>
        @if (application(); as topApp) {
          <a class="btn-secondary doc-view-btn ad-top-btn"
             [routerLink]="['/admin/applications', topApp.applicationId, 'candidate']">
            <i class="ti ti-user"></i> Candidate details
          </a>
        }
      </div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      } @else if (application()) {
        @if (application(); as app) {

        <div class="ad-grid">
          <!-- Candidate header + Pre-screening + offer letter + status actions -->
          <div class="ad-col">

            <mat-card class="mat-elevation-z1 ad-card">
              <div class="ad-header-inline">
                <div class="ad-avatar">{{ initials(app.candidateName) }}</div>
                <div class="ad-header-info">
                  <div class="ad-name">{{ app.candidateName }}</div>
                  <div class="ad-sub">
                    <i class="ti ti-briefcase"></i>
                    Applied for <strong>{{ app.vacancyTitle }}</strong>
                    <span class="ad-sub-dot">·</span>
                    <i class="ti ti-calendar"></i>
                    {{ formatDate(app.appliedAt) }}
                  </div>
                </div>
                <div class="ad-header-actions">
                  <span class="status-pill-lg s-{{ statusClass(effectiveStatus()) }}">
                    <span class="status-dot"></span>{{ label(effectiveStatus()) }}
                  </span>
                </div>
              </div>

              <mat-divider style="margin:20px 0"></mat-divider>

              <!-- Pre-screening assessment (full, inline) -->
              <div class="vd-section-label">Pre-screening assessment</div>
              <div class="vd-ref" style="margin-bottom:14px">Candidate-submitted screening documentation</div>

              <div class="tmpl-row">
                @if (template(); as t) {
                  <span class="form-note"><i class="ti ti-file-text"></i> Template: <a [href]="fileHref(t.fileUrl)" target="_blank" rel="noopener">{{ t.originalFileName }}</a></span>
                } @else {
                  <span class="form-note"><i class="ti ti-alert-triangle"></i> No pre-screening template has been uploaded yet.</span>
                }
                <a class="btn-secondary tmpl-upload-btn tmpl-manage-btn" routerLink="/admin/templates" title="Templates are managed on their own page, not per-candidate">
                  <i class="ti ti-settings"></i> Manage templates
                </a>
              </div>

              @if (psLoading()) {
                <div class="empty-state" style="padding:1.5rem 0"><mat-spinner diameter="24"></mat-spinner></div>
              } @else {
                @if (!doc()) {
                  <div class="empty-state" style="padding:1.5rem 0">
                    <i class="ti ti-clipboard-off"></i>
                    <p>No pre-screening assessment has been sent for this application yet.</p>
                  </div>
                  @if (app.status === 'Shortlisted') {
                    <div class="assess-footer" style="justify-content:flex-end">
                      <button class="btn-primary" [disabled]="sendingPrescreening()" (click)="sendPrescreening()">
                        @if (sendingPrescreening()) { <mat-spinner diameter="14" class="move-btn-spinner"></mat-spinner> } @else { <i class="ti ti-send-2"></i> }
                        Send pre-screening form
                      </button>
                    </div>
                  } @else {
                    <p class="form-note"><i class="ti ti-info-circle"></i> A pre-screening form can only be sent once the candidate is Shortlisted.</p>
                  }
                } @else {
                  <div class="vc-meta" style="margin-top:14px">
                    <span><i class="ti ti-send-2"></i> Sent {{ formatDateTime(doc()!.sentAt) }}</span>
                    @if (doc()!.status !== 'Sent') {
                      <span><i class="ti ti-circle-check"></i> Received {{ formatDateTime(doc()!.submittedAt!) }}</span>
                    } @else {
                      <span><i class="ti ti-hourglass"></i> Not yet received</span>
                    }
                  </div>

                  @if (doc()!.status !== 'Sent') {
                    <mat-divider style="margin:16px 0"></mat-divider>

                    <div class="vd-section-label">Submitted document</div>
                    <div class="doc-row" style="margin-top:10px">
                      <span class="doc-icon"><i class="ti ti-file-description"></i></span>
                      <div class="doc-meta">
                        <div class="doc-name">{{ doc()!.completedOriginalFileName }}</div>
                        <div class="doc-sub">Submitted assessment document</div>
                      </div>
                      <div style="display:flex;gap:8px;flex-shrink:0">
                        <button type="button" class="btn-secondary doc-view-btn"
                                [disabled]="isFileActionLoading('submitted-view')"
                                (click)="viewFile(doc()!.completedFileUrl, doc()!.completedOriginalFileName || 'document', 'submitted-view')">
                          @if (isFileActionLoading('submitted-view')) { <mat-spinner diameter="14" style="display:inline-block;margin-right:2px"></mat-spinner> } @else { <i class="ti ti-eye"></i> }
                          View
                        </button>
                        <button type="button" class="btn-secondary doc-view-btn"
                                [disabled]="isFileActionLoading('submitted-dl')"
                                (click)="downloadFile(doc()!.completedFileUrl, doc()!.completedOriginalFileName || 'document', 'submitted-dl')">
                          @if (isFileActionLoading('submitted-dl')) { <mat-spinner diameter="14" style="display:inline-block;margin-right:2px"></mat-spinner> } @else { <i class="ti ti-download"></i> }
                          Download
                        </button>
                      </div>
                    </div>

                    @if (doc()!.status === 'Submitted') {
                      <div class="vd-section-label" style="margin-top:20px">Assessment</div>
                      <div class="assess-toggle">
                        <button type="button" class="assess-btn assess-pass" [class.active]="assessmentDraftResult() === 'Passed'" (click)="setAssessmentResult('Passed')">
                          <i class="ti ti-circle-check"></i> Pass
                        </button>
                        <button type="button" class="assess-btn assess-fail" [class.active]="assessmentDraftResult() === 'Failed'" (click)="setAssessmentResult('Failed')">
                          <i class="ti ti-circle-x"></i> Fail
                        </button>
                      </div>
                      <textarea class="assess-comment" rows="3" placeholder="Add a comment about this candidate's assessment (optional)…"
                                [ngModel]="assessmentDraftComment()" (ngModelChange)="assessmentDraftComment.set($event)"></textarea>
                      <div class="assess-footer">
                        <span class="form-note"><i class="ti ti-info-circle"></i> Not assessed yet</span>
                        <button class="btn-primary" [disabled]="!assessmentDraftResult() || savingAssessment()" (click)="saveAssessment()">
                          @if (savingAssessment()) { <mat-spinner diameter="14" class="move-btn-spinner"></mat-spinner> } @else { <i class="ti ti-device-floppy"></i> }
                          Save assessment
                        </button>
                      </div>
                    } @else {
                      <div class="vd-section-label" style="margin-top:20px">Assessment</div>
                      <p class="form-note">
                        <i class="ti" [class.ti-circle-check]="doc()!.outcome === 'Passed'" [class.ti-circle-x]="doc()!.outcome === 'Failed'"></i>
                        Reviewed as <strong>{{ doc()!.outcome }}</strong>@if (doc()!.reviewedAt) { on {{ formatDateTime(doc()!.reviewedAt!) }} }
                      </p>
                      @if (doc()!.recruiterNotes) {
                        <p class="form-note" style="white-space:pre-line">{{ doc()!.recruiterNotes }}</p>
                      }
                    }
                  } @else {
                    <p class="form-note"><i class="ti ti-hourglass"></i> The candidate hasn't uploaded their completed assessment yet.</p>
                  }
                }
              }

            </mat-card>

            @if (app.status === 'OfferExtended' || offer()) {
              <!-- Offer letter: kept in its own card, separate from the pre-screening card above -->
              <mat-card class="mat-elevation-z1 ad-card">
                <div class="section-summary">
                  <div class="section-summary-info">
                    <div class="section-summary-icon"><i class="ti ti-file-certificate"></i></div>
                    <div>
                      <div class="vd-title-sm">Offer letter</div>
                      <div class="vd-ref">
                        @if (offer(); as o) { {{ o.jobTitle }} · {{ o.location || '—' }} } @else { No offer letter has been generated yet }
                      </div>
                    </div>
                  </div>
                  <div class="section-summary-actions">
                    @if (offer(); as o) {
                      <span class="pill" [class.pill-pub]="o.status === 'Sent' || o.status === 'Accepted'"
                            [class.pill-type-fail]="o.status === 'Declined'">
                        {{ o.status }}
                      </span>
                    }
                    <a class="btn-primary" style="text-decoration:none"
                       [routerLink]="['/admin/applications', app.applicationId, 'offer']">
                      <i class="ti ti-arrow-right"></i>
                      {{ offer() ? 'View offer letter' : 'Generate offer letter' }}
                    </a>
                  </div>
                </div>
              </mat-card>
            }

          </div>
        </div>
        }
      }
    </div>

    @if (previewingFile(); as pf) {
      <div class="ps-modal-backdrop" (click)="closeFilePreview()">
        <div class="ps-modal" (click)="$event.stopPropagation()">
          <div class="ps-modal-header">
            <div><i class="ti ti-file-description"></i> {{ pf.fileName }}</div>
            <button class="ps-modal-close" (click)="closeFilePreview()"><i class="ti ti-x"></i></button>
          </div>
          <div class="ps-modal-body">
            @if (pf.kind === 'pdf') {
              <iframe [src]="pf.safeUrl" class="ps-modal-iframe"></iframe>
            } @else {
              <div class="empty-state">
                <i class="ti ti-file-unknown"></i>
                <p>Preview isn't available for this file type. Download it to view the contents.</p>
              </div>
            }
          </div>
          <div class="ps-modal-footer">
            <button class="btn-secondary" (click)="closeFilePreview()">Close</button>
            <button class="btn-primary" (click)="downloadFromPreview()">
              <i class="ti ti-download"></i> Download
            </button>
          </div>
        </div>
      </div>
    }

    <style>
      .ad-page { max-width: 1320px; }

      .back-link { display: inline-flex; align-items: center; gap: 6px; }
      .back-link:hover { color: var(--navy); }

      .ad-top-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 18px; }
      .ad-top-btn { text-decoration: none; font-weight: 700; padding: 9px 18px; }

      /* ── Header (now nested inline at the top of the pre-screening card) ── */
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
      .ad-sub-dot { color: rgba(0,0,0,0.2); margin: 0 2px; }

      .status-pill-lg {
        font-size: 12px; font-weight: 700; padding: 8px 16px 8px 12px; border-radius: 20px;
        white-space: nowrap; display: inline-flex; align-items: center; gap: 7px; letter-spacing: 0.02em;
        flex-shrink: 0;
      }
      .status-dot { width: 7px; height: 7px; border-radius: 50%; background: currentColor; flex-shrink: 0; }

      .ad-header-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
      .btn-sm { padding: 7px 14px !important; font-size: 12px !important; }

      /* ── Layout ── */
      .ad-grid { display: grid; grid-template-columns: 1fr; max-width: 920px; margin: 0 auto; gap: 18px; align-items: start; }
      .ad-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }

      .ad-card { border-radius: 16px !important; padding: 26px 30px; }
      .ad-card ::ng-deep .mat-mdc-card-content { padding: 0; }

      /* ── Pre-screening / offer letter summary rows ── */
      .section-summary {
        display: flex; align-items: center; justify-content: space-between; gap: 16px;
        flex-wrap: wrap;
      }
      .section-summary-info { display: flex; align-items: center; gap: 14px; min-width: 0; }
      .section-summary-icon {
        width: 40px; height: 40px; border-radius: 11px; flex-shrink: 0;
        background: var(--surface-2); border: 1px solid var(--border); color: var(--navy);
        display: flex; align-items: center; justify-content: center; font-size: 17px;
      }
      .section-summary-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
      .section-summary-actions .btn-primary { padding: 9px 18px; }
      .pill-type-pass { background: var(--green-bg); color: #1a5c35; }
      .pill-type-fail { background: var(--red-bg); color: var(--red); }

      /* ── Section headers ── */
      .sec-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
      .sec-icon {
        width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
        background: var(--surface-2); border: 1px solid var(--border); color: var(--navy);
        display: flex; align-items: center; justify-content: center; font-size: 15px;
      }
      .sec-title { font-size: 14.5px; font-weight: 700; color: var(--text); }

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

      /* ── Offer letter card ── */
      .offer-form { display: flex; flex-direction: column; gap: 4px; }
      .offer-form mat-form-field { width: 100%; }

      /* ── Move forward card ── */
      .move-select { width: 100%; }
      .move-btn {
        border-radius: 9px !important; width: 100%; height: 46px !important;
        display: inline-flex !important; align-items: center; justify-content: center; gap: 7px;
      }
      .move-btn-spinner { display: inline-block; }
      .move-btn-spinner ::ng-deep circle { stroke: #fff; }

      /* ── Pre-screening / offer letter section labels ── */
      .vd-title-sm { font-size: 15px; font-weight: 700; color: var(--text); }
      .vd-ref { font-size: 11.5px; color: var(--text-muted); margin-top: 2px; }
      .vd-section-label { font-size: 11px; font-weight: 700; color: var(--navy); text-transform: uppercase; letter-spacing: 0.05em; }

      /* ── Pre-screening template + assessment (inline) ── */
      .tmpl-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 10px; padding-bottom: 14px; border-bottom: 1px dashed var(--border); }
      .tmpl-row .form-note { margin: 0; }
      .tmpl-upload-btn { padding: 5px 10px; font-size: 11.5px; flex-shrink: 0; margin-left: auto; cursor: pointer; }
      .tmpl-manage-btn {
        background: var(--purple-bg); border: 1px solid rgba(69,39,160,0.25); color: var(--purple); text-decoration: none;
      }
      .tmpl-manage-btn:hover { background: #e0d5f5; border-color: var(--purple); color: var(--purple); }
      .tmpl-manage-btn i { color: inherit; }
      .ps-file-input { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }

      .assess-toggle { display: flex; gap: 10px; margin-top: 10px; }
      .assess-btn {
        flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        font-size: 13px; font-weight: 600; padding: 10px; border-radius: 9px; cursor: pointer;
        background: var(--surface-2); border: 1.5px solid var(--border); color: var(--text-muted);
        transition: all 0.15s; font-family: inherit;
      }
      .assess-btn:hover { border-color: rgba(0,0,0,0.25); }
      .assess-pass.active { background: var(--green-bg); border-color: #1a5c35; color: #1a5c35; }
      .assess-fail.active { background: var(--red-bg); border-color: var(--red); color: var(--red); }

      .assess-comment {
        width: 100%; margin-top: 12px; font-size: 13px; padding: 10px 12px; resize: vertical;
        border-radius: var(--radius); border: 1.5px solid rgba(0,0,0,0.15);
        background: #fff; color: var(--text); font-family: inherit;
      }
      .assess-comment:focus { outline: none; border-color: var(--navy); box-shadow: 0 0 0 3px rgba(26,39,68,0.08); }

      .assess-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
      .assess-footer .btn-primary { padding: 9px 16px; }

      /* ── Preview modal ── */
      .ps-modal-backdrop {
        position: fixed; inset: 0; background: rgba(15,20,30,0.55); z-index: 1000;
        display: flex; align-items: center; justify-content: center; padding: 24px;
      }
      .ps-modal {
        background: #fff; border-radius: 14px; width: min(760px, 100%); max-height: 86vh;
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
      .ps-modal-iframe { width: 100%; height: 65vh; border: none; display: block; background: #fff; }
      .ps-modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 18px; border-top: 1px solid var(--border); background: #fff; }
    </style>
  `
})
export class ApplicationDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private appService = inject(ApplicationService);
  private candidateService = inject(CandidateService);
  private documentService = inject(DocumentService);
  private skillService = inject(CandidateSkillService);
  private experienceService = inject(CandidateExperienceService);
  private qualificationService = inject(CandidateQualificationService);
  private prescreening = inject(PrescreeningService);
  private vacancyService = inject(VacancyService);
  private offerLetter = inject(OfferLetterService);
  private toast = inject(ToastService);
  private sanitizer = inject(DomSanitizer);
  auth = inject(AuthService);

  loading = signal(true);
  loadError = signal<string | null>(null);
  updating = signal(false);

  application = signal<ApplicationResponse | null>(null);
  candidate = signal<CandidateResponse | null>(null);
  skills = signal<CandidateSkillResponse[]>([]);
  experience = signal<ExperienceResponse[]>([]);
  qualifications = signal<QualificationResponse[]>([]);
  documents = signal<CandidateDocumentResponse[]>([]);
  vacancy = signal<VacancyResponse | null>(null);

  pendingStatus: ApplicationStatusKey | '' = '';

  psDoc = signal<PrescreeningResponse | null>(null);
  psLoading = signal(false);
  sendingPrescreening = signal(false);

  template = signal<PrescreeningTemplateResponse | null>(null);

  // ── File view/download (submitted assessment) ─────────────────────
  // Plain `<a href>` navigation doesn't go through the auth interceptor,
  // so if the file endpoint needs the bearer token it just silently fails.
  // Fetching via HttpClient (through PrescreeningService) attaches the
  // token and gives a real object URL to preview/download instead - the
  // same approach used on the candidate-facing applications page.
  private fileActionKey = signal<string | null>(null);
  previewingFile = signal<{
    fileName: string;
    kind: FilePreviewKind;
    safeUrl: SafeResourceUrl;
    objectUrl: string;
  } | null>(null);

  assessmentDraftResult = signal<PrescreeningOutcome | null>(null);
  assessmentDraftComment = signal('');
  savingAssessment = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) { this.loadError.set('Invalid application.'); this.loading.set(false); return; }
    this.load(id);
    this.prescreening.getTemplate().subscribe({ next: t => this.template.set(t), error: () => this.template.set(null) });
  }

  private load(id: number): void {
    this.loading.set(true);
    this.psLoading.set(true);
    this.appService.getById(id).subscribe({
      next: app => {
        this.application.set(app);
        forkJoin({
          candidate: this.candidateService.getById(app.candidateId).pipe(catchError(() => of(null))),
          skills: this.skillService.getAll(app.candidateId).pipe(catchError(() => of([]))),
          experience: this.experienceService.getAll(app.candidateId).pipe(catchError(() => of([]))),
          qualifications: this.qualificationService.getAll(app.candidateId).pipe(catchError(() => of([]))),
          documents: this.documentService.getAll(app.candidateId).pipe(catchError(() => of([]))),
          vacancy: this.vacancyService.getById(app.vacancyId).pipe(catchError(() => of(null))),
          prescreening: this.prescreening.getByApplication(app.applicationId).pipe(catchError(() => of(null))),
          offer: this.offerLetter.getLatest(app.applicationId).pipe(catchError(() => of(null)))
        }).subscribe(res => {
          this.candidate.set(res.candidate);
          this.skills.set(res.skills);
          this.experience.set(res.experience);
          this.qualifications.set(res.qualifications);
          this.documents.set(res.documents);
          this.vacancy.set(res.vacancy);
          this.psDoc.set(res.prescreening);
          this.loading.set(false);
          this.psLoading.set(false);
          this.syncAssessmentDraft();
        });
      },
      error: (err: Error) => { this.loadError.set(err.message); this.loading.set(false); this.psLoading.set(false); }
    });
  }

  doc(): PrescreeningResponse | null {
    return this.psDoc();
  }

  effectiveStatus(): string {
    const app = this.application();
    if (!app) return '';
    const base = this.prescreening.effectiveStatus(app.applicationId, app.status);
    // The offer overlay only applies while the real backend status is still
    // 'OfferExtended' - once the recruiter moves it on to Hired/NotSelected,
    // that real status should take over so the app doesn't get stuck showing
    // "Offer Accepted" forever.
    return base === 'OfferExtended' ? this.offerLetter.effectiveStatus(app.applicationId, base) : base;
  }

  nextOptions(): ApplicationStatusKey[] { return getValidNextStatuses(this.effectiveStatus()); }
  label(s: string): string { return (STATUS_LABELS as Record<string, string>)[s] ?? s; }
  statusClass(s: string): string { return STATUS_CLASS[s] ?? 'applied'; }
  docLabel(t: string): string { return (DOCUMENT_TYPE_LABELS as Record<string, string>)[t] ?? t; }

  // ── Schedule / view interview quick action ───────────────────────
  showScheduleInterview(app: ApplicationResponse): boolean {
    if (app.status === 'InterviewStage') return true;
    const d = this.doc();
    return app.status === 'PrescreeningStage' && !!d && d.status === 'Reviewed' && d.outcome === 'Passed';
  }

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
  formatDateTime(d: string): string {
    return new Date(d).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  fileHref(fileUrl: string): string {
    if (/^https?:\/\//i.test(fileUrl)) return fileUrl;
    const origin = environment.apiUrl.replace(/\/api\/?$/, '');
    return fileUrl.startsWith('/') ? origin + fileUrl : `${origin}/${fileUrl}`;
  }

  updateStatus(): void {
    const app = this.application();
    if (!app || !this.pendingStatus) return;
    const newStatus = this.pendingStatus;

    this.updating.set(true);
    this.appService.updateStatus(app.applicationId, { newStatus }).subscribe({
      next: updated => {
        this.application.set(updated);
        this.updating.set(false);
        this.pendingStatus = '';
        this.toast.show(`${app.candidateName} moved to ${this.label(newStatus)}.`, 'success');
      },
      error: (err: Error) => { this.updating.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  // ── Offer letter ────────────────────────────────────────────────
  offer(): OfferLetterResponse | undefined {
    const app = this.application();
    return app ? this.offerLetter.peek(app.applicationId) : undefined;
  }

  // ── Send / review the pre-screening form ────────────────────────
  sendPrescreening(): void {
    const app = this.application();
    if (!app) return;

    this.sendingPrescreening.set(true);
    this.prescreening.send(app.applicationId).subscribe({
      next: doc => {
        this.psDoc.set(doc);
        // The backend transitions the application itself to 'PrescreeningStage'
        // as part of Send() - reflect that immediately without a full reload.
        this.application.set({ ...app, status: 'PrescreeningStage' });
        this.sendingPrescreening.set(false);
        this.toast.show(`Pre-screening form sent to ${app.candidateName}.`, 'success');
      },
      error: (err: Error) => { this.sendingPrescreening.set(false); this.toast.show(err.message, 'error'); }
    });
  }

  // ── File view/download ──────────────────────────────────────────
  isFileActionLoading(key: string): boolean {
    return this.fileActionKey() === key;
  }

  viewFile(relativeUrl: string | null | undefined, fileName: string, key: string): void {
    if (!relativeUrl) return;
    this.fileActionKey.set(key);
    this.prescreening.getFileBlob(relativeUrl).subscribe({
      next: (blob) => {
        this.fileActionKey.set(null);
        const objectUrl = URL.createObjectURL(blob);
        this.previewingFile.set({
          fileName,
          kind: previewKindFor(fileName),
          safeUrl: this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl),
          objectUrl
        });
      },
      error: (err: Error) => {
        this.fileActionKey.set(null);
        this.toast.show(err.message || 'Could not open the document.', 'error');
      }
    });
  }

  downloadFile(relativeUrl: string | null | undefined, fileName: string, key: string): void {
    if (!relativeUrl) return;
    this.fileActionKey.set(key);
    this.prescreening.downloadFile(relativeUrl, fileName).subscribe({
      next: () => this.fileActionKey.set(null),
      error: (err: Error) => {
        this.fileActionKey.set(null);
        this.toast.show(err.message || 'Could not download the document.', 'error');
      }
    });
  }

  downloadFromPreview(): void {
    const pf = this.previewingFile();
    if (!pf) return;
    const a = document.createElement('a');
    a.href = pf.objectUrl;
    a.download = pf.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  closeFilePreview(): void {
    const pf = this.previewingFile();
    if (pf) URL.revokeObjectURL(pf.objectUrl);
    this.previewingFile.set(null);
  }

  // ── Assessment (Pass/Fail + comment) ───────────────────────────
  private syncAssessmentDraft(): void {
    this.assessmentDraftResult.set(null);
    this.assessmentDraftComment.set('');
  }

  setAssessmentResult(result: PrescreeningOutcome): void {
    if (result === 'Pending') return;
    this.assessmentDraftResult.set(result);
  }

  saveAssessment(): void {
    const app = this.application();
    const result = this.assessmentDraftResult();
    if (!app || !result || result === 'Pending') return;

    this.savingAssessment.set(true);
    this.prescreening.setOutcome(app.applicationId, result, this.assessmentDraftComment()).subscribe({
      next: doc => {
        this.psDoc.set(doc);
        // The backend auto-transitions the application to 'NotSelected' when
        // the outcome is Failed (see PrescreeningController.SetOutcome) -
        // reflect that immediately without a full reload. On Passed, the
        // status stays at 'PrescreeningStage' until the recruiter moves it
        // forward manually via "Schedule interview".
        if (result === 'Failed') {
          this.application.set({ ...app, status: 'NotSelected' });
        }
        this.savingAssessment.set(false);
        this.toast.show(`Assessment saved: ${result}.`, 'success');
      },
      error: (err: Error) => { this.savingAssessment.set(false); this.toast.show(err.message, 'error'); }
    });
  }
}
