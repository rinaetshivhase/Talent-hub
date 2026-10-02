import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { CandidateStateService } from '../../../core/services/candidate-state.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="auth-page">
      <!-- Left panel -->
      <div class="auth-left">
        <div class="auth-brand">
          <div class="auth-logo"><i class="ti ti-bolt"></i></div>
          <div>
            <div class="auth-brand-name">FlashTalent</div>
            <div class="auth-brand-sub">Recruitment Portal</div>
          </div>
        </div>

        <div class="auth-tagline">
          <h2>Your career journey<br>starts here</h2>
      
        </div>

        <div class="auth-features">
          <div class="auth-feature">
            <div class="af-icon"><i class="ti ti-search"></i></div>
            Browse published vacancies in real time
          </div>
          <div class="auth-feature">
            <div class="af-icon"><i class="ti ti-file-check"></i></div>
            Upload and manage your supporting documents
          </div>
          <div class="auth-feature">
            <div class="af-icon"><i class="ti ti-chart-arrows-vertical"></i></div>
            Track your application status at every stage
          </div>
        </div>
      </div>

      <!-- Right panel — form -->
      <div class="auth-right">
        <div class="auth-form-wrap">
          <div class="auth-form-title">Welcome back</div>
          <div class="auth-form-sub">Sign in to your FlashTalent account</div>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>

            <mat-form-field appearance="outline">
              <mat-label>Email address</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="email">
              <mat-icon matPrefix>alternate_email</mat-icon>
              <mat-error *ngIf="form.get('email')?.errors?.['required']">Email is required.</mat-error>
              <mat-error *ngIf="form.get('email')?.errors?.['email']">Invalid email format.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password" [type]="showPwd ? 'text' : 'password'" autocomplete="current-password">
              <mat-icon matPrefix>lock_outline</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="showPwd=!showPwd">
                <mat-icon>{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-error *ngIf="form.get('password')?.errors?.['required']">Password is required.</mat-error>
            </mat-form-field>

            <div *ngIf="apiError" class="api-error">
              <i class="ti ti-alert-circle"></i> {{ apiError }}
            </div>

            <button mat-raised-button color="primary" type="submit"
                    class="btn-full" style="width:100%;height:44px;font-size:14px;font-weight:600;border-radius:8px"
                    [disabled]="loading">
              @if (loading) {
                <mat-spinner diameter="20" style="display:inline-block;margin-right:8px"></mat-spinner>
                Signing in…
              } @else {
                <i class="ti ti-login" style="margin-right:6px"></i> Sign in
              }
            </button>
          </form>

          <p class="auth-footer">
            No account yet? <a routerLink="/register">Create one </a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private state = inject(CandidateStateService);
  private toast = inject(ToastService);
  private router = inject(Router);

  showPwd = false;
  loading = false;
  apiError = '';

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required]
  });

  submit(): void {
  this.form.markAllAsTouched();
  this.apiError = '';
  if (this.form.invalid) return;
  this.loading = true;
  const { email, password } = this.form.value;
  this.auth.login({ email: email!, password: password! }).subscribe({
    next: () => {
      const role = this.auth.currentUser()?.role;
      if (role === 'Candidate') {
        this.state.loadMyProfile().subscribe({
          next: () => { this.loading = false; this.router.navigate(['/dashboard']); },
          error: () => { this.loading = false; this.router.navigate(['/dashboard']); }
        });
      } else {
        this.loading = false;
        this.router.navigate(['/dashboard']);
      }
    },
    error: (err: Error) => { this.loading = false; this.apiError = err.message; }
  });
}
}
