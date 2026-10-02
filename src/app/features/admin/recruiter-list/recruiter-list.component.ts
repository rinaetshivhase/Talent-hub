import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { RecruiterService } from '../../../core/services/recruiter.service';
import { ToastService } from '../../../core/services/toast.service';
import { RecruiterResponse } from '../../../core/models';

function generateTempPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%';
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  const rest = Array.from({ length: 8 }, () => pick(upper + lower + digits)).join('');
  // Guarantee at least one of each character class, then shuffle
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols), ...rest].sort(() => Math.random() - 0.5);
  return chars.join('');
}

@Component({
  selector: 'app-recruiter-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-user-star"></i> Recruiters</h2>
          <p class="page-sub">{{ isAdmin() ? 'Onboard a new recruiter' : 'Recruiters on the team' }}</p>
        </div>
      </div>

      @if (isAdmin()) {
        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:20px">
          <mat-card-content style="padding:18px 20px">
            <div class="form-section-label"><i class="ti ti-plus"></i> Add a recruiter</div>
            <form [formGroup]="form" (ngSubmit)="add()">
              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>First name</mat-label>
                  <input matInput formControlName="firstName">
                  @if (invalid('firstName')) { <mat-error>Required</mat-error> }
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Last name</mat-label>
                  <input matInput formControlName="lastName">
                  @if (invalid('lastName')) { <mat-error>Required</mat-error> }
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Email address</mat-label>
                  <input matInput type="email" formControlName="email">
                  @if (invalid('email')) { <mat-error>Enter a valid email</mat-error> }
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Job title</mat-label>
                  <input matInput formControlName="jobTitle" placeholder="e.g. Senior Recruiter">
                  @if (invalid('jobTitle')) { <mat-error>Required</mat-error> }
                </mat-form-field>
              </div>
              <p class="form-note" style="margin-top:4px">
                <i class="ti ti-info-circle"></i> A temporary password will be generated automatically — you'll see it once after creating the account, to share with the new recruiter.
              </p>
              <button mat-raised-button color="primary" type="submit" style="border-radius:8px;margin-top:10px" [disabled]="form.invalid || saving()">
                @if (saving()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
                <i class="ti ti-plus"></i> Add recruiter
              </button>
            </form>
            @if (apiError) {
              <div class="api-error" style="margin-top:12px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
            }
          </mat-card-content>
        </mat-card>

        @if (lastCreated(); as created) {
          <div class="temp-password-banner">
            <i class="ti ti-key" style="font-size:20px"></i>
            <div style="flex:1">
              <div style="font-weight:700;font-size:13px">{{ created.name }}'s account is ready</div>
              <div style="font-size:12px;margin-top:2px">
                Temp password: <code class="temp-pw">{{ created.password }}</code>
                <button class="btn-copy" (click)="copyPassword(created.password)"><i class="ti ti-copy"></i> Copy</button>
              </div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px">
                Share this with them directly — it won't be shown again. They'll be asked to set their own password on first login.
              </div>
            </div>
            <button class="btn-dismiss" (click)="lastCreated.set(null)"><i class="ti ti-x"></i></button>
          </div>
        }
      }

      @if (!loading()) {
        <div class="search-wrap" style="max-width:340px;margin-bottom:16px">
          <i class="ti ti-search search-icon"></i>
          <input [ngModel]="searchQ()" (ngModelChange)="searchQ.set($event)" type="search" class="search-input" placeholder="Search recruiters…">
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!filtered().length) {
        <div class="empty-state"><i class="ti ti-user-star"></i><p>{{ searchQ() ? 'No recruiters match your search.' : 'No recruiters added yet.' }}</p></div>
      } @else {
        <div class="directory-grid">
          @for (r of filtered(); track r.recruiterId) {
            <div class="directory-card">
              <div class="directory-avatar">{{ initials(r) }}</div>
              <div class="directory-info">
                <div class="directory-name">{{ r.fullName || r.email }}</div>
                <div class="directory-meta">
                  @if (r.jobTitle) { <span><i class="ti ti-briefcase"></i> {{ r.jobTitle }}</span> }
                  <span><i class="ti ti-mail"></i> {{ r.email }}</span>
                  <span><i class="ti ti-hash"></i> Recruiter #{{ r.recruiterId }}</span>
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <style>
      .directory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
      .directory-card {
        display: flex; align-items: flex-start; gap: 12px; padding: 16px;
        background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px;
      }
      .directory-avatar {
        width: 42px; height: 42px; border-radius: 50%;
        background: linear-gradient(135deg, #1A2744 0%, #2a3a5c 100%); color: #fff;
        display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; flex-shrink: 0;
      }
      .directory-info { flex: 1; min-width: 0; }
      .directory-name { font-size: 14px; font-weight: 600; color: var(--text); }
      .directory-meta { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; font-size: 12px; color: var(--text-muted); }
      .directory-meta span { display: flex; align-items: center; gap: 6px; }

      .temp-password-banner {
        display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; margin-bottom: 20px;
        background: var(--green-bg); border: 1px solid var(--green-mid); border-radius: 12px; color: #1a5c35;
      }
      .temp-pw {
        background: rgba(255,255,255,0.7); padding: 2px 8px; border-radius: 6px; font-weight: 700;
        font-family: monospace; font-size: 13px; margin: 0 6px;
      }
      .btn-copy {
        background: none; border: 1px solid #1a5c35; color: #1a5c35; border-radius: 6px;
        font-size: 11px; padding: 2px 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
      }
      .btn-copy:hover { background: rgba(255,255,255,0.5); }
      .btn-dismiss { background: none; border: none; cursor: pointer; color: inherit; opacity: 0.6; }
      .btn-dismiss:hover { opacity: 1; }
    </style>
  `
})
export class RecruiterListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private recruiterService = inject(RecruiterService);
  private toast = inject(ToastService);

  recruiters = signal<RecruiterResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  apiError = '';
  searchQ = signal('');

  lastCreated = signal<{ name: string; password: string } | null>(null);

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    jobTitle: ['', Validators.required]
  });

  filtered = computed(() => {
    const q = this.searchQ().trim().toLowerCase();
    if (!q) return this.recruiters();
    return this.recruiters().filter(r =>
      (r.fullName ?? '').toLowerCase().includes(q) ||
      (r.email ?? '').toLowerCase().includes(q) ||
      (r.jobTitle ?? '').toLowerCase().includes(q)
    );
  });

  isAdmin(): boolean {
    return this.auth.currentUser()?.role === 'Admin';
  }

  initials(r: RecruiterResponse): string {
    const name = r.fullName ?? r.email ?? '?';
    const parts = name.trim().split(/\s+/);
    return parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  copyPassword(pw: string): void {
    navigator.clipboard?.writeText(pw);
    this.toast.show('Password copied to clipboard.', 'success');
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.recruiterService.getAll().subscribe({
      next: r => { this.recruiters.set(r); this.loading.set(false); },
      error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
    });
  }

  add(): void {
    if (this.form.invalid) return;
    this.apiError = '';
    this.saving.set(true);
    this.lastCreated.set(null);

    const v = this.form.value;
    const tempPassword = generateTempPassword();

    this.auth.createRecruiter({
      firstName: v.firstName!,
      lastName: v.lastName!,
      email: v.email!,
      password: tempPassword,
      jobTitle: v.jobTitle!
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.lastCreated.set({ name: `${v.firstName} ${v.lastName}`, password: tempPassword });
        this.form.reset();
        this.toast.show('Recruiter account created.', 'success');
        this.load(); // create-recruiter doesn't return the Recruiter object, so refresh the list
      },
      error: (err: Error) => { this.saving.set(false); this.apiError = err.message; }
    });
  }
}