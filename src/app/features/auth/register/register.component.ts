import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

function minLength8(c: AbstractControl): ValidationErrors | null {
  return c.value && c.value.length < 8 ? { minLength: true } : null;
}

@Component({
  selector: 'app-register',
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
          <h2>Join thousands of<br>candidates today</h2>
          <p>Create your free account, build your profile, and start applying for opportunities with JordiFlash IT.</p>
        </div>

        <div class="auth-features">
          <div class="auth-feature">
            <div class="af-icon"><i class="ti ti-user-check"></i></div>
            Build a professional candidate profile
          </div>
          <div class="auth-feature">
            <div class="af-icon"><i class="ti ti-upload"></i></div>
            Securely upload your CV and certificates
          </div>
          <div class="auth-feature">
            <div class="af-icon"><i class="ti ti-bell"></i></div>
            Get notified when your status changes
          </div>
        </div>
      </div>

      <!-- Right panel -->
      <div class="auth-right">
        <div class="auth-form-wrap">
          <div class="auth-form-title">Create your account</div>
          <div class="auth-form-sub">Fill in your details to get started</div>

          <form [formGroup]="form" (ngSubmit)="submit()" novalidate>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <mat-form-field appearance="outline">
                <mat-label>First name</mat-label>
                <input matInput formControlName="firstName" autocomplete="given-name">
                <mat-error *ngIf="form.get('firstName')?.errors?.['required']">First Name is required.</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Last name</mat-label>
                <input matInput formControlName="lastName" autocomplete="family-name">
                <mat-error *ngIf="form.get('lastName')?.errors?.['required']">Last Name is required.</mat-error>
              </mat-form-field>
            </div>

            <mat-form-field appearance="outline">
              <mat-label>Email address</mat-label>
              <input matInput formControlName="email" type="email" autocomplete="email">
              <mat-icon matPrefix>alternate_email</mat-icon>
              <mat-error *ngIf="form.get('email')?.errors?.['required']">Email is required.</mat-error>
              <mat-error *ngIf="form.get('email')?.errors?.['email']">Invalid email format.</mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Password</mat-label>
              <input matInput formControlName="password"
                     [type]="showPwd ? 'text' : 'password'"
                     autocomplete="new-password">
              <mat-icon matPrefix>lock_outline</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="showPwd=!showPwd">
                <mat-icon>{{ showPwd ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              <mat-hint>Minimum 8 characters</mat-hint>
              <mat-error *ngIf="form.get('password')?.errors?.['required']">Password is required.</mat-error>
              <mat-error *ngIf="form.get('password')?.errors?.['minLength']">Password must be at least 8 characters.</mat-error>
            </mat-form-field>

            <div *ngIf="apiError" class="api-error" style="margin-bottom:16px">
              <i class="ti ti-alert-circle"></i> {{ apiError }}
            </div>

            <button mat-raised-button color="primary" type="submit"
                    style="width:100%;height:44px;font-size:14px;font-weight:600;border-radius:8px"
                    [disabled]="loading">
              @if (loading) {
                <mat-spinner diameter="20" style="display:inline-block;margin-right:8px"></mat-spinner>
                Creating account…
              } @else {
                <i class="ti ti-user-plus" style="margin-right:6px"></i> Create account
              }
            </button>
          </form>

          <p class="auth-footer">
            Already have an account? <a routerLink="/login">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);

  showPwd = false;
  loading = false;
  apiError = '';

  form = this.fb.group({
    firstName: ['', Validators.required],
    lastName:  ['', Validators.required],
    email:     ['', [Validators.required, Validators.email]],
    password:  ['', [Validators.required, minLength8]]
  });

  submit(): void {
    this.form.markAllAsTouched();
    this.apiError = '';
    if (this.form.invalid) return;
    this.loading = true;
    const { firstName, lastName, email, password } = this.form.value;
    this.auth.register({ firstName: firstName!, lastName: lastName!, email: email!, password: password! })
      .subscribe({
        next: () => {
          this.loading = false;
          this.toast.show('Account created — please sign in.', 'success');
          this.router.navigate(['/login']);
        },
        error: (err: Error) => { this.loading = false; this.apiError = err.message; }
      });
  }
}
