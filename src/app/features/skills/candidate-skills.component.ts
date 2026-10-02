import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { CandidateSkillService } from '../../core/services/candidate-skill.service';
import { SkillService } from '../../core/services/skill.service';
import { ToastService } from '../../core/services/toast.service';
import { CandidateSkillResponse, SkillResponse } from '../../core/models';

@Component({
  selector: 'app-candidate-skills',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-bulb"></i> My Skills</h2>
          <p class="page-sub">Skills recruiters will see on your profile</p>
        </div>
      </div>

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {

        <!-- ── TECHNICAL SKILLS ───────────────────── -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:20px">
          <mat-card-content style="padding:20px">
            <div class="form-section-label" style="margin-bottom:12px">
              <i class="ti ti-code"></i> Technical Skills
            </div>

            @if (myTechnicalSkills().length) {
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
                @for (s of myTechnicalSkills(); track s.candidateSkillId) {
                  <div class="skill-chip skill-chip--technical">
                    <span>{{ s.skillName }}</span>
                    <span class="chip-level">{{ s.proficiencyLevel }}</span>
                    <button class="chip-remove" (click)="remove(s)" title="Remove">
                      <i class="ti ti-x"></i>
                    </button>
                  </div>
                }
              </div>
            } @else {
              <p style="color:#888;font-size:13px;margin-bottom:12px">No technical skills added yet.</p>
            }

            <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
              <mat-form-field appearance="outline" style="flex:1;min-width:200px">
                <mat-label>Search technical skills</mat-label>
                <input matInput
                  [value]="technicalSearchTerm()"
                  (input)="technicalSearchTerm.set($any($event.target).value)"
                  placeholder="e.g. C#, SQL...">
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:170px">
                <mat-label>Proficiency</mat-label>
                <mat-select
                  [value]="technicalLevel()"
                  (selectionChange)="technicalLevel.set($event.value)">
                  <mat-option value="Beginner">Beginner</mat-option>
                  <mat-option value="Intermediate">Intermediate</mat-option>
                  <mat-option value="Expert">Expert</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            @if (filteredTechnical().length) {
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                @for (s of filteredTechnical(); track s.skillId) {
                  <button class="skill-pill"
                    [class.skill-pill--disabled]="isAlreadyAdded(s)"
                    (click)="add(s, technicalLevel())"
                    [disabled]="isAlreadyAdded(s) || saving()">
                    {{ s.name }}
                    @if (isAlreadyAdded(s)) {
                      <i class="ti ti-check" style="margin-left:4px"></i>
                    }
                  </button>
                }
              </div>
            } @else if (technicalSearchTerm()) {
              <p style="color:#aaa;font-size:13px;margin-top:8px">
                No technical skills match "{{ technicalSearchTerm() }}"
              </p>
            }
          </mat-card-content>
        </mat-card>

        <!-- ── SOFT SKILLS ─────────────────────────── -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-content style="padding:20px">
            <div class="form-section-label" style="margin-bottom:12px">
              <i class="ti ti-users"></i> Soft Skills
            </div>

            @if (mySoftSkills().length) {
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">
                @for (s of mySoftSkills(); track s.candidateSkillId) {
                  <div class="skill-chip skill-chip--soft">
                    <span>{{ s.skillName }}</span>
                    <span class="chip-level">{{ s.proficiencyLevel }}</span>
                    <button class="chip-remove" (click)="remove(s)" title="Remove">
                      <i class="ti ti-x"></i>
                    </button>
                  </div>
                }
              </div>
            } @else {
              <p style="color:#888;font-size:13px;margin-bottom:12px">No soft skills added yet.</p>
            }

            <div style="display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap">
              <mat-form-field appearance="outline" style="flex:1;min-width:200px">
                <mat-label>Search soft skills</mat-label>
                <input matInput
                  [value]="softSearchTerm()"
                  (input)="softSearchTerm.set($any($event.target).value)"
                  placeholder="e.g. Teamwork, Leadership...">
              </mat-form-field>
              <mat-form-field appearance="outline" style="width:170px">
                <mat-label>Proficiency</mat-label>
                <mat-select
                  [value]="softLevel()"
                  (selectionChange)="softLevel.set($event.value)">
                  <mat-option value="Beginner">Beginner</mat-option>
                  <mat-option value="Intermediate">Intermediate</mat-option>
                  <mat-option value="Expert">Expert</mat-option>
                </mat-select>
              </mat-form-field>
            </div>

            @if (filteredSoft().length) {
              <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
                @for (s of filteredSoft(); track s.skillId) {
                  <button class="skill-pill"
                    [class.skill-pill--disabled]="isAlreadyAdded(s)"
                    (click)="add(s, softLevel())"
                    [disabled]="isAlreadyAdded(s) || saving()">
                    {{ s.name }}
                    @if (isAlreadyAdded(s)) {
                      <i class="ti ti-check" style="margin-left:4px"></i>
                    }
                  </button>
                }
              </div>
            } @else if (softSearchTerm()) {
              <p style="color:#aaa;font-size:13px;margin-top:8px">
                No soft skills match "{{ softSearchTerm() }}"
              </p>
            }
          </mat-card-content>
        </mat-card>
      }
    </div>

    <style>
      .skill-chip {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 10px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 500;
      }
      .skill-chip--technical { background:#e8f4fd; color:#1565c0; border:1px solid #90caf9; }
      .skill-chip--soft { background:#f3e5f5; color:#6a1b9a; border:1px solid #ce93d8; }
      .chip-level { font-size:11px; opacity:0.75; font-weight:400; }
      .chip-remove { background:none; border:none; cursor:pointer; padding:0; color:inherit; opacity:0.6; line-height:1; }
      .chip-remove:hover { opacity:1; }
      .skill-pill { padding:6px 14px; border-radius:20px; border:1px solid #ddd; background:#f5f5f5; cursor:pointer; font-size:13px; transition:background 0.15s; }
      .skill-pill:hover:not(:disabled) { background:#e3f2fd; border-color:#90caf9; }
      .skill-pill--disabled { opacity:0.45; cursor:not-allowed; }
    </style>
  `
})
export class CandidateSkillsComponent implements OnInit {
  private state = inject(CandidateStateService);
  private skillService = inject(SkillService);
  private candidateSkillService = inject(CandidateSkillService);
  private toast = inject(ToastService);

  technicalSkills = signal<SkillResponse[]>([]);
  softSkills = signal<SkillResponse[]>([]);
  mySkills = signal<CandidateSkillResponse[]>([]);

  loading = signal(false);
  saving = signal(false);

  // Search terms as signals so computed() tracks them reactively
  technicalSearchTerm = signal('');
  softSearchTerm = signal('');

  // Proficiency levels as signals
  technicalLevel = signal('Intermediate');
  softLevel = signal('Intermediate');

  // Split assigned skills by category
  myTechnicalSkills = computed(() =>
    this.mySkills().filter(s => s.category === 'Technical')
  );
  mySoftSkills = computed(() =>
    this.mySkills().filter(s => s.category === 'SoftSkill')
  );

  // Filter available skills by search term
  filteredTechnical = computed(() => {
    const term = this.technicalSearchTerm().toLowerCase();
    return term
      ? this.technicalSkills().filter(s => s.name.toLowerCase().includes(term))
      : this.technicalSkills();
  });

  filteredSoft = computed(() => {
    const term = this.softSearchTerm().toLowerCase();
    return term
      ? this.softSkills().filter(s => s.name.toLowerCase().includes(term))
      : this.softSkills();
  });

  isAlreadyAdded(skill: SkillResponse): boolean {
    return this.mySkills().some(s => s.skillId === skill.skillId);
  }

  ngOnInit(): void {
    this.skillService.getByCategory('Technical').subscribe({
      next: skills => this.technicalSkills.set(skills)
    });
    this.skillService.getByCategory('SoftSkill').subscribe({
      next: skills => this.softSkills.set(skills)
    });
    this.load();
  }

  load(): void {
    const p = this.state.profile();
    if (!p) return;
    this.loading.set(true);
    this.candidateSkillService.getAll(p.candidateId).subscribe({
      next: s => { this.mySkills.set(s); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  add(skill: SkillResponse, proficiencyLevel: string): void {
    const p = this.state.profile();
    if (!p || this.saving()) return;
    this.saving.set(true);
    this.candidateSkillService.assign(p.candidateId, {
      skills: [{ skillId: skill.skillId, proficiencyLevel }]
    }).subscribe({
      next: updated => {
        this.mySkills.set(updated);
        this.saving.set(false);
        this.toast.show(`${skill.name} added.`, 'success');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.show(err.message, 'error');
      }
    });
  }

  remove(s: CandidateSkillResponse): void {
    const p = this.state.profile();
    if (!p) return;
    this.candidateSkillService.remove(p.candidateId, s.skillId).subscribe({
      next: () => {
        this.mySkills.update(list =>
          list.filter(x => x.candidateSkillId !== s.candidateSkillId)
        );
        this.toast.show(`${s.skillName} removed.`, 'success');
      },
      error: (err: Error) => this.toast.show(err.message, 'error')
    });
  }
}