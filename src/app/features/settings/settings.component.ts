import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

function minLength8(c: { value: string }) {
  return c.value && c.value.length < 8 ? { minLength: true } : null;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-settings"></i> Settings</h2>
          <p class="page-sub">Manage your account</p>
        </div>
      </div>

      <mat-card class="mat-elevation-z1" style="border-radius:12px;max-width:520px">
        <mat-card-content style="padding:20px">
          <div class="card-header"><i class="ti ti-user-circle"></i> Account</div>
          <div style="font-size:13px;color:var(--text-muted);margin-top:6px;margin-bottom:16px">
            {{ user()?.firstName }} {{ user()?.lastName }} · {{ user()?.email }} · {{ user()?.role }}
          </div>

          <div class="form-section-label"><i class="ti ti-lock"></i> Change password</div>
          @if (user()?.mustChangePassword) {
            <div class="info-banner warn" style="margin-top:10px">
              <i class="ti ti-alert-triangle"></i>
              You're using a temporary password. Please set your own below.
            </div>
          }

          <form [formGroup]="form" (ngSubmit)="submit()" style="margin-top:12px">
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Current password</mat-label>
              <input matInput formControlName="currentPassword" [type]="showCurrent ? 'text' : 'password'" autocomplete="current-password">
              <button mat-icon-button matSuffix type="button" (click)="showCurrent=!showCurrent">
                <mat-icon>{{ showCurrent ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (invalid('currentPassword')) { <mat-error>Required</mat-error> }
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>New password</mat-label>
              <input matInput formControlName="newPassword" [type]="showNew ? 'text' : 'password'" autocomplete="new-password">
              <button mat-icon-button matSuffix type="button" (click)="showNew=!showNew">
                <mat-icon>{{ showNew ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>Minimum 8 characters</mat-hint>
              @if (form.get('newPassword')?.errors?.['required'] && form.get('newPassword')?.touched) {
                <mat-error>Required</mat-error>
              }
              @if (form.get('newPassword')?.errors?.['minLength']) {
                <mat-error>Must be at least 8 characters</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Confirm new password</mat-label>
              <input matInput formControlName="confirmPassword" [type]="showNew ? 'text' : 'password'" autocomplete="new-password">
              @if (form.errors?.['mismatch'] && form.get('confirmPassword')?.touched) {
                <mat-error>Passwords don't match</mat-error>
              }
            </mat-form-field>

            @if (apiError) {
              <div class="api-error" style="margin-bottom:12px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
            }

            <button mat-raised-button color="primary" type="submit" style="border-radius:8px" [disabled]="form.invalid || saving()">
              @if (saving()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
              <i class="ti ti-check"></i> Update password
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `
})
export class SettingsComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  user = this.auth.currentUser;
  showCurrent = false;
  showNew = false;
  saving = signal(false);
  apiError = '';

  form = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, minLength8]],
    confirmPassword: ['', Validators.required]
  }, { validators: this.passwordsMatch });

  private passwordsMatch(group: any) {
    const a = group.get('newPassword')?.value;
    const b = group.get('confirmPassword')?.value;
    return a && b && a !== b ? { mismatch: true } : null;
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.apiError = '';
    this.saving.set(true);
    const v = this.form.value;

    this.auth.changePassword({ currentPassword: v.currentPassword!, newPassword: v.newPassword! }).subscribe({
      next: () => {
        this.saving.set(false);
        this.form.reset();
        this.toast.show('Password updated.', 'success');
      },
      error: (err: Error) => { this.saving.set(false); this.apiError = err.message; }
    });
  }
}