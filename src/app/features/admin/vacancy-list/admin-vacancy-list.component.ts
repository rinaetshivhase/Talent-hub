import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VacancyAdminService } from '../../../core/services/vacancy-admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { VacancyResponse } from '../../../core/models';

type SortMode = 'closingSoon' | 'newest';

@Component({
  selector: 'app-admin-vacancy-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-briefcase"></i> Vacancies (org-wide view)</h2>
          <p class="page-sub">{{ filtered().length }} of {{ vacancies().length }} vacancies · Read-only oversight</p>
        </div>
      </div>

      <div class="filters-row">
        <div class="search-wrap" style="flex:1;min-width:220px">
          <i class="ti ti-search search-icon"></i>
          <input [ngModel]="searchQ()" (ngModelChange)="searchQ.set($event)" type="search" class="search-input" placeholder="Search by vacancy title…">
        </div>
        <select [ngModel]="sortMode()" (ngModelChange)="sortMode.set($event)" style="min-width:170px">
          <option value="closingSoon">Closing soonest first</option>
          <option value="newest">Newest first</option>
        </select>
      </div>

      <div class="filter-chips">
        @for (f of statusFilters; track f) {
          <button class="filter-chip" [class.on]="activeFilter() === f" (click)="setFilter(f)">
            {{ f === 'all' ? 'All' : f }}
          </button>
        }
      </div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!filtered().length) {
        <div class="empty-state"><i class="ti ti-briefcase-off"></i><p>No vacancies match your search.</p></div>
      } @else {
        <div class="vacancy-list">
          @for (v of filtered(); track v.vacancyId) {
            <mat-card class="mat-elevation-z1 vacancy-list-card" style="border-radius:12px">
              <mat-card-content style="padding:16px 20px">
                <div class="vc-header">
                  <a [routerLink]="['/admin/vacancies', v.vacancyId]" class="vc-title-link">
                    <div class="vc-title">{{ v.title }}</div>
                    <div class="vc-ref">JDF-VAC-{{ v.vacancyId }} · {{ v.location }} · {{ v.employmentType }}</div>
                  </a>
                  <span class="pill" [class.pill-pub]="v.status==='Published'" [class.pill-dept]="v.status==='Draft'" [class.pill-type]="v.status==='Closed'">
                    {{ v.status }}
                  </span>
                </div>

                <div class="vc-footer" style="border-top:none;padding-top:10px">
                  <span class="apply-hint">
                    Closes {{ formatDate(v.closingDate) }} · {{ v.skills.length }} skill(s) required
                  </span>
                  <a [routerLink]="['/admin/vacancies', v.vacancyId]" class="card-link" style="font-size:12px">
                    View details <i class="ti ti-arrow-right"></i>
                  </a>
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>

    <style>
      .filters-row { display: flex; gap: 10px; align-items: flex-start; flex-wrap: wrap; margin-bottom: 12px; }
      .vc-title-link { text-decoration: none; color: inherit; display: block; }
      .vc-title-link:hover .vc-title { color: var(--navy); text-decoration: underline; }
    </style>
  `
})
export class AdminVacancyListComponent implements OnInit {
  private vacancyService = inject(VacancyAdminService);
  private toast = inject(ToastService);

  vacancies = signal<VacancyResponse[]>([]);
  loading = signal(false);
  activeFilter = signal<'all' | 'Draft' | 'Published' | 'Closed'>('all');
  statusFilters: ('all' | 'Draft' | 'Published' | 'Closed')[] = ['all', 'Draft', 'Published', 'Closed'];

  searchQ = signal('');
  sortMode = signal<SortMode>('closingSoon');

  filtered = computed(() => {
    const f = this.activeFilter();
    const q = this.searchQ().trim().toLowerCase();

    let list = f === 'all' ? this.vacancies() : this.vacancies().filter(v => v.status === f);
    if (q) list = list.filter(v => v.title.toLowerCase().includes(q));

    list = [...list].sort((a, b) => {
      if (this.sortMode() === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      const aTime = a.closingDate ? new Date(a.closingDate).getTime() : Infinity;
      const bTime = b.closingDate ? new Date(b.closingDate).getTime() : Infinity;
      return aTime - bTime;
    });

    return list;
  });

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.vacancyService.getAllByStatus().subscribe({
      next: v => { this.vacancies.set(v); this.loading.set(false); },
      error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
    });
  }

  setFilter(f: 'all' | 'Draft' | 'Published' | 'Closed'): void { this.activeFilter.set(f); }

  formatDate(d?: string): string {
    return d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  }
}