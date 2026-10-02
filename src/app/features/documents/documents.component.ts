import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';

import { CandidateStateService } from '../../core/services/candidate-state.service';
import {
  DocumentService, DocumentTypeKey, DOCUMENT_TYPE_LABELS,
  ALL_DOC_TYPES, FREE_UPLOAD_DOC_TYPES, GLOBAL_MANDATORY, validateFileClient
} from '../../core/services/document.service';
import { VacancyService } from '../../core/services/vacancy.service';
import { ToastService } from '../../core/services/toast.service';
import { CandidateDocumentResponse, VacancyResponse } from '../../core/models';

interface RequiredSlot {
  type: DocumentTypeKey;
  label: string;
  source: 'global' | 'vacancy';
  uploaded?: CandidateDocumentResponse;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatButtonModule, MatSelectModule,
    MatFormFieldModule, MatInputModule, MatIconModule, MatDividerModule,
    MatProgressSpinnerModule, MatTooltipModule
  ],
  template: `
    <div class="page-container">

      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-files"></i> Supporting Documents</h2>
          <p class="page-sub">Upload the required documents below, or add anything else using the dropdown</p>
        </div>
        <span class="doc-status-badge" [class.doc-ok]="allRequiredOk()" [class.doc-missing]="!allRequiredOk()">
          <i class="ti" [class.ti-circle-check]="allRequiredOk()" [class.ti-alert-circle]="!allRequiredOk()"></i>
          {{ allRequiredOk() ? 'Required documents ready' : 'Required documents missing' }}
        </span>
      </div>

      @if (!state.profile()) {
        <div class="info-banner warn">
          <i class="ti ti-alert-triangle"></i>
          Create your <a routerLink="/profile">candidate profile</a> first.
        </div>
      } @else if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner><p style="margin-top:12px">Loading documents…</p></div>
      } @else {

        @if (vacancyContext()) {
          <div class="vacancy-context-banner">
            <div class="vcb-left">
              <i class="ti ti-briefcase"></i>
              <div>
                <div class="vcb-title">Documents required for: <strong>{{ vacancyContext()!.title }}</strong></div>
                <div class="vcb-sub">Mandatory items are marked with <span class="req">*</span></div>
              </div>
            </div>
            <button mat-stroked-button (click)="clearVacancyContext()" style="font-size:12px;border-radius:8px">
              <i class="ti ti-x"></i> Clear
            </button>
          </div>
        }

        <div class="progress-row">
          <div class="progress-wrap" style="flex:1">
            <div class="progress-fill" [style.width.%]="uploadPct()" [class.ready]="uploadPct() === 100"></div>
          </div>
          <span class="progress-label">{{ uploadedRequiredCount() }} / {{ requiredSlots().length }} required uploaded</span>
        </div>

        <!-- ── REQUIRED SLOTS: fixed type, asterisk, no dropdown ── -->
        <div class="doc-slots">
          @for (slot of requiredSlots(); track slot.type) {
            <div class="doc-slot"
                 [class.slot-uploaded]="slot.uploaded"
                 [class.slot-dragover]="dragOverType() === slot.type"
                 (dragover)="onDragOver($event, slot.type)"
                 (dragleave)="dragOverType.set(null)"
                 (drop)="onDrop($event, slot.type)">

              @if (dragOverType() === slot.type) {
                <div class="drop-overlay"><i class="ti ti-cloud-upload"></i> Drop to upload</div>
              }

              <div class="slot-type-bar" [class.bar-global]="slot.source === 'global'" [class.bar-vacancy]="slot.source === 'vacancy'"></div>

              <div class="slot-body">
                <div class="slot-icon-wrap" [class.icon-uploaded]="slot.uploaded" [class.icon-missing]="!slot.uploaded">
                  <i class="ti" [class]="docIcon(slot.type)"></i>
                </div>

                <div class="slot-info">
                  <div class="slot-name">
                    {{ slot.label }} <span class="req">*</span>
                    @if (slot.source === 'vacancy') {
                      <span class="badge-vacancy-req">Required for this role</span>
                    }
                  </div>
                  @if (slot.uploaded) {
                    <div class="slot-filename"><i class="ti ti-file-check" style="color:#2D7A4F"></i> {{ slot.uploaded.originalFileName }}</div>
                    <div class="slot-meta">Uploaded {{ formatDate(slot.uploaded.uploadedAt) }}</div>
                  } @else {
                    <div class="slot-empty-hint">Click Upload or drag a file here · PDF, DOC, DOCX · max 5 MB</div>
                  }
                </div>

                <div class="slot-actions">
                  @if (uploading() === slot.type) {
                    <mat-spinner diameter="24"></mat-spinner>
                  } @else {
                    <button mat-raised-button color="primary" class="btn-upload-slot" (click)="triggerRequiredUpload(slot.type)">
                      <i class="ti" [class.ti-upload]="!slot.uploaded" [class.ti-refresh]="slot.uploaded"></i>
                      {{ slot.uploaded ? 'Replace' : 'Upload' }}
                    </button>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <!-- ── OTHER UPLOADED DOCS (already-uploaded items not in the required list) ── -->
        @if (extraUploadedDocs().length) {
          <div class="section-label" style="margin-top:20px">Other uploaded documents</div>
          <div class="doc-slots">
            @for (d of extraUploadedDocs(); track d.candidateDocumentId) {
              <div class="doc-slot slot-uploaded">
                <div class="slot-type-bar bar-optional"></div>
                <div class="slot-body">
                 <div class="slot-icon-wrap icon-uploaded"><i class="ti" [class]="docIcon(asType(d.documentType))"></i></div>
                  <div class="slot-info">
                    <div class="slot-name">{{ typeLabel(asType(d.documentType)) }}</div>
                    <div class="slot-filename"><i class="ti ti-file-check" style="color:#2D7A4F"></i> {{ d.originalFileName }}</div>
                    <div class="slot-meta">Uploaded {{ formatDate(d.uploadedAt) }}</div>
                  </div>
                </div>
              </div>
            }
          </div>
        }

        <!-- ── SINGLE DROPDOWN: upload anything else ── -->
        <mat-card class="mat-elevation-z1 additional-card" style="border-radius:12px;margin-top:20px">
          <mat-card-content style="padding:18px 20px">
            <div class="card-header"><i class="ti ti-plus"></i> Upload another document</div>
            <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px">
              Select what type of document this is, then choose a file.
              <span style="display:block;margin-top:4px">
                <i class="ti ti-info-circle"></i> Uploading a qualification certificate or transcript? Add it from the
                <a routerLink="/qualifications">Qualifications</a> page instead, attached to that specific entry.
              </span>
            </p>

            <div class="additional-upload-row">
              <mat-form-field appearance="outline" style="flex:1" class="compact-select">
                <mat-label>What is this document?</mat-label>
                <mat-select [(ngModel)]="freeUploadType">
                  @for (t of dropdownTypes(); track t) {
                    <mat-option [value]="t">{{ typeLabel(t) }}</mat-option>
                  }
                </mat-select>
              </mat-form-field>

              @if (freeUploadType === 'Other') {
                <mat-form-field appearance="outline" style="flex:1" class="compact-select">
                  <mat-label>Describe this document</mat-label>
                  <input matInput [(ngModel)]="otherDescription" placeholder="e.g. Reference letter, Police clearance">
                </mat-form-field>
              }

              <button mat-raised-button color="primary"
                      style="height:56px;border-radius:8px;padding:0 20px;font-weight:600"
                      (click)="triggerFreeUpload()"
                      [disabled]="!canFreeUpload() || uploading() === '__free'">
                @if (uploading() === '__free') {
                  <mat-spinner diameter="18" style="display:inline-block;margin-right:8px"></mat-spinner>
                }
                <i class="ti ti-upload"></i> Upload
              </button>

              <div class="drop-zone-mini" [class.dragover]="dragOverType() === '__free'"
                   (dragover)="onDragOver($event, '__free')" (dragleave)="dragOverType.set(null)" (drop)="onDrop($event, '__free')">
                <i class="ti ti-drag-drop"></i> or drop here
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <input type="file" id="file-input" accept=".pdf,.doc,.docx" (change)="onFileChange($event)" style="display:none">

        <p class="upload-hint">
          <i class="ti ti-info-circle"></i>
          Accepted formats: PDF, DOC, DOCX &nbsp;·&nbsp; Max 5 MB per file
        </p>
      }
    </div>
  `,
  styles: [`
    .vacancy-context-banner {
      background: linear-gradient(135deg, #e3f2fd 0%, #e8f5e9 100%);
      border: 1px solid rgba(26,39,68,0.12); border-radius: 12px; padding: 14px 18px;
      display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 20px;
    }
    .vcb-left { display: flex; align-items: center; gap: 12px; }
    .vcb-left i { font-size: 22px; color: var(--navy); flex-shrink: 0; }
    .vcb-title { font-size: 13px; font-weight: 600; color: var(--text); }
    .vcb-sub { font-size: 11px; color: var(--text-muted); margin-top: 2px; }

    .doc-slots { display: flex; flex-direction: column; gap: 10px; }
    .doc-slot {
      background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px;
      overflow: hidden; position: relative; transition: box-shadow 0.2s, border-color 0.2s; display: flex;
    }
    .doc-slot:hover { box-shadow: var(--shadow); }
    .doc-slot.slot-uploaded { border-color: #2D7A4F; background: linear-gradient(to right, rgba(230,244,236,0.4), #fff); }
    .doc-slot.slot-dragover { border-color: var(--green) !important; box-shadow: 0 0 0 3px rgba(45,122,79,0.15); }

    .slot-type-bar { width: 5px; flex-shrink: 0; }
    .bar-global { background: var(--navy); }
    .bar-vacancy { background: var(--green); }
    .bar-optional { background: #e0e0e0; }

    .slot-body { display: flex; align-items: center; gap: 14px; padding: 14px 16px; flex: 1; min-width: 0; }

    .slot-icon-wrap { width: 44px; height: 44px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 22px; flex-shrink: 0; }
    .icon-uploaded { background: var(--green-bg); color: var(--green); }
    .icon-missing { background: var(--surface-2); color: var(--text-muted); }

    .slot-info { flex: 1; min-width: 0; }
    .slot-name { font-size: 13px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .slot-filename { font-size: 12px; color: #1a5c35; font-weight: 500; margin-top: 3px; display: flex; align-items: center; gap: 5px; }
    .slot-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .slot-empty-hint { font-size: 11px; color: var(--text-muted); margin-top: 3px; }

    .badge-vacancy-req { font-size: 10px; font-weight: 700; background: var(--green-bg); color: #1a5c35; padding: 2px 8px; border-radius: 20px; border: 1px solid var(--green-mid); }

    .slot-actions { flex-shrink: 0; padding-right: 16px; }
    .btn-upload-slot { height: 40px; font-size: 12px; font-weight: 600; border-radius: 8px !important; white-space: nowrap; background-color: var(--navy) !important; color: #fff !important; }

    .compact-select .mat-mdc-form-field-infix { padding: 8px 0 !important; min-height: 40px !important; }
    .compact-select .mat-mdc-text-field-wrapper { border-radius: 8px !important; }

    .drop-overlay {
      position: absolute; inset: 0; z-index: 10; background: rgba(45,122,79,0.12);
      border: 2px dashed var(--green); border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      gap: 8px; font-size: 14px; font-weight: 600; color: #1a5c35; pointer-events: none;
    }

    .additional-upload-row { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; }
    .drop-zone-mini {
      height: 56px; min-width: 100px; border: 1.5px dashed var(--border); border-radius: 8px;
      display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 11px; color: var(--text-muted);
      cursor: pointer; transition: all 0.15s; padding: 0 12px; white-space: nowrap;
    }
    .drop-zone-mini.dragover { border-color: var(--green); background: var(--green-bg); color: #1a5c35; }

    .upload-hint { margin-top: 16px; font-size: 12px; color: var(--text-muted); display: flex; align-items: center; gap: 5px; }

    .additional-card .card-header { font-size: 14px; font-weight: 600; color: var(--text); display: flex; align-items: center; gap: 7px; margin-bottom: 8px; }
    .additional-card .card-header i { color: var(--navy); font-size: 16px; }
  `]
})
export class DocumentsComponent implements OnInit {
  state = inject(CandidateStateService);
  private doc = inject(DocumentService);
  private vac = inject(VacancyService);
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  uploadedDocs = signal<CandidateDocumentResponse[]>([]);
  vacancyContext = signal<VacancyResponse | null>(null);
  loading = signal(false);
  uploading = signal<string | null>(null);
  dragOverType = signal<string | null>(null);

  freeUploadType: DocumentTypeKey | '' = '';
  otherDescription = '';

  private pendingRequiredType: DocumentTypeKey | null = null;
  private pendingIsFree = false;

  // ── Required slots: global mandatory + vacancy-mandatory, deduped ──
  requiredSlots = computed<RequiredSlot[]>(() => {
    const uploaded = this.uploadedDocs();
    const vacancy = this.vacancyContext();
    const vacMandatoryTypes = (vacancy?.requiredDocuments ?? [])
      .filter(r => r.isMandatory)
      .map(r => r.documentType as DocumentTypeKey);

    const seen = new Set<DocumentTypeKey>();
    const slots: RequiredSlot[] = [];

    for (const t of GLOBAL_MANDATORY) {
      seen.add(t);
      slots.push({ type: t, label: DOCUMENT_TYPE_LABELS[t], source: 'global', uploaded: uploaded.find(d => d.documentType === t) });
    }
    for (const t of vacMandatoryTypes) {
      if (seen.has(t)) continue;
      seen.add(t);
      slots.push({ type: t, label: DOCUMENT_TYPE_LABELS[t], source: 'vacancy', uploaded: uploaded.find(d => d.documentType === t) });
    }
    return slots;
  });

  // Dropdown only offers types NOT already shown as a required slot, and excludes
  // Qualification/Certification - those are uploaded via the Qualifications page instead.
  dropdownTypes = computed<DocumentTypeKey[]>(() => {
    const requiredTypes = new Set(this.requiredSlots().map(s => s.type));
    return FREE_UPLOAD_DOC_TYPES.filter(t => !requiredTypes.has(t));
  });

  // Uploaded documents whose type isn't one of the required slots (shown as a read-only list)
  extraUploadedDocs = computed<CandidateDocumentResponse[]>(() => {
    const requiredTypes = new Set(this.requiredSlots().map(s => s.type));
    return this.uploadedDocs().filter(d => !requiredTypes.has(d.documentType as DocumentTypeKey));
  });

  allRequiredOk = computed(() => this.requiredSlots().every(s => !!s.uploaded));
  uploadedRequiredCount = computed(() => this.requiredSlots().filter(s => !!s.uploaded).length);
  uploadPct = computed(() => {
    const total = this.requiredSlots().length;
    return total ? Math.round((this.uploadedRequiredCount() / total) * 100) : 0;
  });

  ngOnInit(): void {
    if (this.state.profile()) {
      this.loadDocs();
      const vacId = this.route.snapshot.queryParamMap.get('vacancyId');
      if (vacId) this.loadVacancyContext(Number(vacId));
    }
  }

  private loadDocs(): void {
    this.loading.set(true);
    this.doc.getAll(this.state.profile()!.candidateId).subscribe({
      next: d => { this.uploadedDocs.set(d); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  private loadVacancyContext(vacancyId: number): void {
    this.vac.getById(vacancyId).subscribe({ next: v => this.vacancyContext.set(v), error: () => {} });
  }

  clearVacancyContext(): void { this.vacancyContext.set(null); }

  typeLabel(t: DocumentTypeKey): string { return DOCUMENT_TYPE_LABELS[t]; }
  asType(t: string): DocumentTypeKey { return t as DocumentTypeKey; }

  docIcon(t: DocumentTypeKey): string {
    const icons: Record<DocumentTypeKey, string> = {
      CV: 'ti-file-cv', MatricCertificate: 'ti-certificate',
      Qualification: 'ti-school', Certification: 'ti-award', Other: 'ti-file'
    };
    return icons[t];
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  canFreeUpload(): boolean {
    if (!this.freeUploadType) return false;
    if (this.freeUploadType === 'Other' && !this.otherDescription.trim()) return false;
    return true;
  }

  // ── Upload triggers ──────────────────────────────────────────────
  triggerRequiredUpload(type: DocumentTypeKey): void {
    this.pendingRequiredType = type;
    this.pendingIsFree = false;
    document.getElementById('file-input')?.click();
  }

  triggerFreeUpload(): void {
    if (!this.canFreeUpload()) {
      this.toast.show(
        this.freeUploadType === 'Other' ? 'Describe the document before uploading.' : 'Select a document type first.',
        'warn'
      );
      return;
    }
    this.pendingRequiredType = null;
    this.pendingIsFree = true;
    document.getElementById('file-input')?.click();
  }

  onFileChange(e: Event): void {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.handleFile(file);
    (e.target as HTMLInputElement).value = '';
  }

  onDragOver(e: DragEvent, type: string): void { e.preventDefault(); this.dragOverType.set(type); }

  onDrop(e: DragEvent, type: string): void {
    e.preventDefault(); this.dragOverType.set(null);
    const file = e.dataTransfer?.files[0];
    if (!file) return;

    if (type === '__free') {
      if (!this.canFreeUpload()) {
        this.toast.show(
          this.freeUploadType === 'Other' ? 'Describe the document before uploading.' : 'Select a document type first.',
          'warn'
        );
        return;
      }
      this.pendingRequiredType = null;
      this.pendingIsFree = true;
    } else {
      this.pendingRequiredType = type as DocumentTypeKey;
      this.pendingIsFree = false;
    }
    this.handleFile(file);
  }

  handleFile(file: File): void {
    const wasFreeUpload = this.pendingIsFree;
    const docType: DocumentTypeKey | '' = wasFreeUpload ? this.freeUploadType : (this.pendingRequiredType ?? '');

    if (!docType) { this.toast.show('Select a document type before uploading.', 'warn'); return; }

    const err = validateFileClient(file);
    if (err) { this.toast.show(err, 'error'); return; }

    // If "Other" with a typed description, rename the file so the description
    // is what gets stored as originalFileName on the backend (no dedicated label field exists).
    let fileToSend = file;
    if (wasFreeUpload && docType === 'Other' && this.otherDescription.trim()) {
      const ext = file.name.substring(file.name.lastIndexOf('.'));
      const safeName = this.otherDescription.trim().replace(/[\\/:*?"<>|]/g, '').slice(0, 100);
      fileToSend = new File([file], `${safeName}${ext}`, { type: file.type });
    }

    const uploadKey = wasFreeUpload ? '__free' : (this.pendingRequiredType ?? '__free');
    this.uploading.set(uploadKey);
    const cid = this.state.profile()!.candidateId;

    this.doc.upload(cid, docType as DocumentTypeKey, fileToSend).subscribe({
      next: uploaded => {
        this.uploadedDocs.update(list => [...list, uploaded]);
        this.uploading.set(null);
        this.pendingRequiredType = null;
        this.pendingIsFree = false;

        if (wasFreeUpload) {
          this.freeUploadType = '';
          this.otherDescription = '';
        }

        this.toast.show(`"${uploaded.originalFileName}" saved as ${this.typeLabel(uploaded.documentType as DocumentTypeKey)}.`, 'success');
        this.state.refresh().subscribe();
      },
      error: (e: Error) => { this.uploading.set(null); this.toast.show(e.message, 'error'); }
    });
  }
}