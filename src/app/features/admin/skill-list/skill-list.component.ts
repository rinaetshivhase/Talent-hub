import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../core/services/auth.service';
import { SkillService } from '../../../core/services/skill.service';
import { ToastService } from '../../../core/services/toast.service';
import { SkillResponse } from '../../../core/models';

@Component({
  selector: 'app-skill-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-tools"></i> Skills</h2>
          <p class="page-sub">
            {{ isAdmin() ? 'Add and manage the master skill list used across vacancies' : 'Skills used when building vacancy requirements' }}
          </p>
        </div>
      </div>

      @if (isAdmin()) {
        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:20px">
          <mat-card-content style="padding:18px 20px">
            <div class="form-section-label"><i class="ti ti-plus"></i> Add a skill</div>
            <form [formGroup]="form" (ngSubmit)="add()" style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
              <mat-form-field appearance="outline" style="flex:1;min-width:200px">
                <mat-label>Skill name</mat-label>
                <input matInput formControlName="name" placeholder="e.g. C#">
                @if (invalid('name')) { <mat-error>Required</mat-error> }
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:180px">
                <mat-label>Category</mat-label>
                <mat-select formControlName="category">
                  <mat-option value="Technical">Technical</mat-option>
                  <mat-option value="SoftSkill">Soft Skill</mat-option>
                </mat-select>
                @if (invalid('category')) { <mat-error>Required</mat-error> }
              </mat-form-field>

              <button mat-raised-button color="primary" type="submit" style="height:56px;border-radius:8px"
                      [disabled]="form.invalid || saving()">
                @if (saving()) { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
                <i class="ti ti-plus"></i> Add skill
              </button>
            </form>
            @if (apiError) {
              <div class="api-error" style="margin-top:12px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
            }
          </mat-card-content>
        </mat-card>
      }

      @if (!loading()) {
        <div class="search-wrap" style="max-width:340px;margin-bottom:20px">
          <i class="ti ti-search search-icon"></i>
          <input [(ngModel)]="searchTermModel" (ngModelChange)="searchTerm.set($event)" type="search" class="search-input" placeholder="Search skills…">
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {

        <!-- ── TECHNICAL ─────────────────────────── -->
        <div class="section-label" style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <i class="ti ti-code"></i> Technical <span class="skill-count">{{ filteredTechnical().length }}</span>
        </div>

        @if (filteredTechnical().length) {
          <div class="directory-grid" style="margin-bottom:24px">
            @for (s of filteredTechnical(); track s.skillId) {
              <div class="directory-card">
                <div class="directory-avatar directory-avatar--technical"><i class="ti ti-code"></i></div>
                <div class="directory-info">
                  <div class="directory-name">{{ s.name }}</div>
                  <div class="directory-meta"><span><i class="ti ti-tag"></i> Technical</span></div>
                </div>
                @if (isAdmin()) {
                  <button class="card-remove" (click)="remove(s)" [disabled]="deletingId() === s.skillId" title="Delete">
                    <i class="ti ti-trash"></i>
                  </button>
                }
              </div>
            }
          </div>
        } @else {
          <div class="empty-state" style="padding:1.5rem 0;margin-bottom:24px">
            <p>{{ searchTerm() ? 'No technical skills match "' + searchTerm() + '"' : 'No technical skills yet.' }}</p>
          </div>
        }

        <!-- ── SOFT SKILLS ───────────────────────── -->
        <div class="section-label" style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <i class="ti ti-users"></i> Soft Skills <span class="skill-count">{{ filteredSoft().length }}</span>
        </div>

        @if (filteredSoft().length) {
          <div class="directory-grid">
            @for (s of filteredSoft(); track s.skillId) {
              <div class="directory-card">
                <div class="directory-avatar directory-avatar--soft"><i class="ti ti-users"></i></div>
                <div class="directory-info">
                  <div class="directory-name">{{ s.name }}</div>
                  <div class="directory-meta"><span><i class="ti ti-tag"></i> Soft Skill</span></div>
                </div>
                @if (isAdmin()) {
                  <button class="card-remove" (click)="remove(s)" [disabled]="deletingId() === s.skillId" title="Delete">
                    <i class="ti ti-trash"></i>
                  </button>
                }
              </div>
            }
          </div>
        } @else {
          <div class="empty-state" style="padding:1.5rem 0">
            <p>{{ searchTerm() ? 'No soft skills match "' + searchTerm() + '"' : 'No soft skills yet.' }}</p>
          </div>
        }
      }
    </div>

    <style>
      .skill-count {
        font-size: 11px; font-weight: 700; color: var(--text-muted);
        background: var(--surface-2); border-radius: 20px; padding: 2px 9px;
      }

      .directory-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; }
      .directory-card {
        display: flex; align-items: flex-start; gap: 12px; padding: 16px;
        background: var(--surface); border: 1.5px solid var(--border); border-radius: 12px;
        position: relative;
      }
      .directory-avatar {
        width: 42px; height: 42px; border-radius: 10px;
        display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
      }
      .directory-avatar--technical { background: #e8f4fd; color: #1565c0; }
      .directory-avatar--soft { background: #f3e5f5; color: #6a1b9a; }
      .directory-info { flex: 1; min-width: 0; }
      .directory-name { font-size: 14px; font-weight: 600; color: var(--text); }
      .directory-meta { display: flex; flex-direction: column; gap: 3px; margin-top: 6px; font-size: 12px; color: var(--text-muted); }
      .directory-meta span { display: flex; align-items: center; gap: 6px; }

      .card-remove {
        background: none; border: none; cursor: pointer; color: var(--text-muted);
        opacity: 0.5; transition: opacity 0.15s, color 0.15s; padding: 4px; flex-shrink: 0;
      }
      .card-remove:hover:not(:disabled) { opacity: 1; color: var(--red); }
      .card-remove:disabled { opacity: 0.25; cursor: not-allowed; }
    </style>
  `
})
export class SkillListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private skillService = inject(SkillService);
  private toast = inject(ToastService);

  skills = signal<SkillResponse[]>([]);
  loading = signal(false);
  saving = signal(false);
  deletingId = signal<number | null>(null);
  searchTerm = signal('');
  searchTermModel = '';
  apiError = '';

  form = this.fb.group({
    name: ['', Validators.required],
    category: ['Technical', Validators.required]
  });

  filteredTechnical = computed(() => this.filterByCategory('Technical'));
  filteredSoft = computed(() => this.filterByCategory('SoftSkill'));

  private filterByCategory(category: string): SkillResponse[] {
    const term = this.searchTerm().toLowerCase();
    return this.skills()
      .filter(s => s.category === category)
      .filter(s => !term || s.name.toLowerCase().includes(term))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

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
    this.skillService.getAll().subscribe({
      next: s => { this.skills.set(s); this.loading.set(false); },
      error: (err: Error) => { this.toast.show(err.message, 'error'); this.loading.set(false); }
    });
  }

  add(): void {
    if (this.form.invalid) return;
    this.apiError = '';
    this.saving.set(true);
    this.skillService.create(this.form.value as { name: string; category: string }).subscribe({
      next: created => {
        this.skills.update(list => [...list, created]);
        this.saving.set(false);
        this.form.reset({ name: '', category: 'Technical' });
        this.toast.show(`"${created.name}" added.`, 'success');
      },
      error: (err: Error) => { this.saving.set(false); this.apiError = err.message; }
    });
  }

  remove(s: SkillResponse): void {
    if (!confirm(`Delete "${s.name}"?`)) return;
    this.deletingId.set(s.skillId);
    this.skillService.delete(s.skillId).subscribe({
      next: () => {
        this.skills.update(list => list.filter(x => x.skillId !== s.skillId));
        this.deletingId.set(null);
        this.toast.show('Skill deleted.', 'success');
      },
      error: (err: Error) => {
        this.deletingId.set(null);
        this.toast.show(err.message, 'error'); // backend blocks delete if skill is in use — this surfaces that message
      }
    });
  }
}