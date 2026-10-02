import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { ClientService } from '../../../core/services/client.service';
import { ToastService } from '../../../core/services/toast.service';
import { ClientResponse } from '../../../core/models';

@Component({
  selector: 'app-client-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-building-bank"></i> Clients</h2>
          <p class="page-sub">{{ isAdmin() ? 'Add and manage clients used for external placements' : 'Clients used for external vacancy placements' }}</p>
        </div>
      </div>

      @if (isAdmin()) {
        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:20px">
          <mat-card-content style="padding:18px 20px">
            <div class="form-section-label"><i class="ti ti-plus"></i> Add a client</div>
            <form [formGroup]="form" (ngSubmit)="add()">
              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Client name</mat-label>
                  <input matInput formControlName="clientName" placeholder="e.g. Acme Corp">
                  @if (invalid('clientName')) { <mat-error>Required</mat-error> }
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Contact person</mat-label>
                  <input matInput formControlName="contactPerson">
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Contact email</mat-label>
                  <input matInput type="email" formControlName="contactEmail">
                </mat-form-field>
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Contact phone</mat-label>
                  <input matInput formControlName="contactPhone">
                </mat-form-field>
              </div>
              <button mat-raised-button color="primary" type="submit" style="border-radius:8px" [disabled]="form.invalid || saving()">
                @if (saving()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
                <i class="ti ti-plus"></i> Add client
              </button>
            </form>
            @if (apiError) {
              <div class="api-error" style="margin-top:12px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
            }
          </mat-card-content>
        </mat-card>
      }

      @if (!loading()) {
        <div class="search-wrap" style="max-width:340px;margin-bottom:16px">
          <i class="ti ti-search search-icon"></i>
          <input [ngModel]="searchQ()" (ngModelChange)="searchQ.set($event)" type="search" class="search-input" placeholder="Search clients…">
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!filtered().length) {
        <div class="empty-state"><i class="ti ti-building-bank"></i><p>{{ searchQ() ? 'No clients match your search.' : 'No clients added yet.' }}</p></div>
      } @else {
        <div class="directory-grid">
          @for (c of filtered(); track c.clientId) {
            <div class="directory-card">
              <div class="directory-avatar"><i class="ti ti-building-bank"></i></div>
              <div class="directory-info">
                <div class="directory-name">{{ c.clientName }}</div>
                <div class="directory-meta">
                  @if (c.contactPerson) { <span><i class="ti ti-user"></i> {{ c.contactPerson }}</span> }
                  @if (c.contactEmail) { <span><i class="ti ti-mail"></i> {{ c.contactEmail }}</span> }
                  @if (c.contactPhone) { <span><i class="ti ti-phone"></i> {{ c.contactPhone }}</span> }
                </div>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <style>
      .directory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
      .directory-card {
        display: flex; align-items: flex-start; gap: 12px; padding: 16px;
        background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px;
      }
      .directory-avatar {
        width: 42px; height: 42px; border-radius: 10px; background: var(--surface-2); color: var(--navy);
        display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
      }
      .directory-info { flex: 1; min-width: 0; }
      .directory-name { font-size: 14px; font-weight: 600; color: var(--text); }
      .directory-meta { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; font-size: 12px; color: var(--text-muted); }
      .directory-meta span { display: flex; align-items: center; gap: 6px; }
    </style>
  `
})
export class ClientListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private clientService = inject(ClientService);
  private toast = inject(ToastService);

  clients = signal<ClientResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  apiError = '';
  searchQ = signal('');

  form = this.fb.group({
    clientName: ['', Validators.required],
    contactPerson: [''],
    contactEmail: ['', Validators.email],
    contactPhone: ['']
  });

  filtered = computed(() => {
    const q = this.searchQ().trim().toLowerCase();
    if (!q) return this.clients();
    return this.clients().filter(c =>
      c.clientName.toLowerCase().includes(q) ||
      (c.contactPerson ?? '').toLowerCase().includes(q) ||
      (c.contactEmail ?? '').toLowerCase().includes(q)
    );
  });

  isAdmin(): boolean {
    return this.auth.currentUser()?.role === 'Admin';
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.clientService.getAll().subscribe({
      next: c => { this.clients.set(c); this.loading.set(false); },
      error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
    });
  }

  add(): void {
    if (this.form.invalid) return;
    this.apiError = '';
    this.saving.set(true);
    this.clientService.create(this.form.value as any).subscribe({
      next: created => {
        this.clients.update(list => [...list, created]);
        this.saving.set(false);
        this.form.reset();
        this.toast.show(`"${created.clientName}" added.`, 'success');
      },
      error: (err: Error) => { this.saving.set(false); this.apiError = err.message; }
    });
  }
}