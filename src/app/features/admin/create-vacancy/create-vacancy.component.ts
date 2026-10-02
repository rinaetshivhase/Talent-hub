import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { VacancyAdminService } from '../../../core/services/vacancy-admin.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { ALL_DOC_TYPES, DOCUMENT_TYPE_LABELS } from '../../../core/services/document.service';
import {
  VacancySkillInput,
  RequiredDocumentInput,
  SkillResponse, DepartmentResponse, ClientResponse
} from '../../../core/models';
import { SkillService } from '../../../core/services/skill.service';
import { DepartmentService } from '../../../core/services/department.service';
import { ClientService } from '../../../core/services/client.service';
import { RecruiterService } from '../../../core/services/recruiter.service';

@Component({
  selector: 'app-create-vacancy',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatCheckboxModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-briefcase"></i> {{ vacancyId ? 'Edit vacancy' : 'Create vacancy' }}</h2>
          <p class="page-sub">Recruitment opportunities are created in Draft and stay hidden from candidates until published</p>
        </div>
        @if (vacancyId) {
          <span class="status-pill" [class.s-applied]="status() === 'Draft'" [class.s-offer]="status() === 'Published'">
            {{ status() }}
          </span>
        }
      </div>

      @if (status() && status() !== 'Draft') {
        <div class="info-banner warn">
          <i class="ti ti-lock"></i>
          This vacancy is {{ status() }} and can no longer be edited — only Draft vacancies are editable.
        </div>
      }

      @if (apiError && !form.dirty) {
        <div class="api-error" style="margin-bottom:14px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else {
        <form [formGroup]="form" (ngSubmit)="save('draft')">
          <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
            <mat-card-content style="padding:18px 20px">
              <div class="form-section-label"><i class="ti ti-info-circle"></i> Vacancy details</div>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Vacancy title</mat-label>
                <input matInput formControlName="title" placeholder="e.g. Senior Software Developer">
                @if (invalid('title')) { <mat-error>Vacancy title is required</mat-error> }
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Job description</mat-label>
                <textarea matInput formControlName="description" rows="4"></textarea>
                @if (invalid('description')) { <mat-error>Job description is required</mat-error> }
              </mat-form-field>

              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Vacancy type</mat-label>
                  <mat-select formControlName="vacancyType">
                    <mat-option value="Internal">Internal</mat-option>
                   <mat-option value="ClientPlacement">External</mat-option>
                  </mat-select>
                </mat-form-field>

                @if (form.value.vacancyType === 'Internal') {
                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>Department</mat-label>
                    <mat-select formControlName="departmentId">
                      @for (d of departments(); track d.departmentId) {
                        <mat-option [value]="d.departmentId">{{ d.name }}</mat-option>
                      }
                    </mat-select>
                    @if (invalid('departmentId')) { <mat-error>Department is required</mat-error> }
                  </mat-form-field>
                } @else {
                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>Client</mat-label>
                    <mat-select formControlName="clientId">
                      @for (c of clients(); track c.clientId) {
                        <mat-option [value]="c.clientId">{{ c.clientName }}</mat-option>
                      }
                    </mat-select>
                    @if (invalid('clientId')) { <mat-error>Client is required</mat-error> }
                  </mat-form-field>
                }

              <mat-form-field appearance="outline" style="width:100%">
  <mat-label>Employment type</mat-label>
  <mat-select formControlName="employmentType">
    <mat-option value="FullTime">Full-time</mat-option>
    <mat-option value="PartTime">Part-time</mat-option>
    <mat-option value="Contract">Contract</mat-option>
  </mat-select>
  @if (invalid('employmentType')) { <mat-error>Employment type is required</mat-error> }
</mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Location</mat-label>
                  <input matInput formControlName="location" placeholder="e.g. Midrand">
                  @if (invalid('location')) { <mat-error>Location is required</mat-error> }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Salary min (optional)</mat-label>
                  <input matInput type="number" formControlName="salaryMin">
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Salary max (optional)</mat-label>
                  <input matInput type="number" formControlName="salaryMax">
                  @if (form.errors?.['salaryRange']) { <mat-error>Max salary must be greater than min</mat-error> }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Minimum years experience</mat-label>
                  <input matInput type="number" formControlName="minYearsExperience">
                  @if (invalid('minYearsExperience')) { <mat-error>Experience is required</mat-error> }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Closing date</mat-label>
                  <input matInput type="date" formControlName="closingDate" [min]="minClosingDate">
                  @if (invalid('closingDate')) { <mat-error>Closing date is required and must be in the future</mat-error> }
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Qualifications</mat-label>
                <textarea matInput formControlName="requiredQualifications" rows="2" placeholder="e.g. Bachelor's degree in Computer Science"></textarea>
                @if (invalid('requiredQualifications')) { <mat-error>Qualifications are required</mat-error> }
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Additional requirements (optional)</mat-label>
                <textarea matInput formControlName="requirements" rows="2"></textarea>
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          <!-- Required skills -->
          <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
            <mat-card-content style="padding:18px 20px">
              <div class="form-section-label"><i class="ti ti-tools"></i> Required skills</div>
              @if (skillsArray.length === 0) {
                <p class="form-note" style="margin-bottom:10px"><i class="ti ti-alert-circle"></i> At least one skill is required</p>
              }
              <div style="display:flex;flex-direction:column;gap:8px">
                @for (skill of skillsArray.controls; track $index) {
                  <div [formGroup]="asGroup(skill)" style="display:flex;gap:8px;align-items:center">
                    <mat-form-field appearance="outline" style="width:220px">
                      <mat-label>Skill</mat-label>
                      <mat-select formControlName="skillId">
                        @for (s of skills(); track s.skillId) {
                          <mat-option [value]="s.skillId">{{ s.name }} <span style="opacity:.5">· {{ s.category }}</span></mat-option>
                        }
                      </mat-select>
                    </mat-form-field>
                    <mat-form-field appearance="outline" style="width:180px">
                      <mat-label>Proficiency level</mat-label>
                      <mat-select formControlName="proficiencyLevel">
                        <mat-option value="Beginner">Beginner</mat-option>
                        <mat-option value="Intermediate">Intermediate</mat-option>
                        <mat-option value="Advanced">Advanced</mat-option>
                      </mat-select>
                    </mat-form-field>
                    <mat-checkbox formControlName="isRequired">Mandatory</mat-checkbox>
                    <button type="button" class="btn-remove" (click)="removeSkill($index)"><i class="ti ti-trash"></i></button>
                  </div>
                }
              </div>
              <button type="button" class="btn-secondary" style="margin-top:10px" (click)="addSkill()">
                <i class="ti ti-plus"></i> Add skill
              </button>
            </mat-card-content>
          </mat-card>

          <!-- Required documents -->
          <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
            <mat-card-content style="padding:18px 20px">
              <div class="form-section-label"><i class="ti ti-files"></i> Required documents (optional)</div>
              <div style="display:flex;flex-direction:column;gap:8px">
                @for (t of allDocTypes; track t) {
                  <div style="display:flex;align-items:center;gap:10px">
                    <mat-checkbox [checked]="isDocSelected(t)" (change)="toggleDoc(t, $event.checked)">
                      {{ docLabel(t) }}
                    </mat-checkbox>
                    @if (isDocSelected(t)) {
                      <mat-checkbox [checked]="isDocMandatory(t)" (change)="setDocMandatory(t, $event.checked)">
                        Mandatory
                      </mat-checkbox>
                    }
                  </div>
                }
              </div>
            </mat-card-content>
          </mat-card>

          @if (apiError && form.dirty) {
            <div class="api-error" style="margin-bottom:14px"><i class="ti ti-alert-circle"></i> {{ apiError }}</div>
          }

          <div class="form-footer">
            <a routerLink="/admin/vacancies" class="form-note"><i class="ti ti-arrow-left"></i> Back to vacancies</a>
            <div style="display:flex;gap:8px">
              @if (vacancyId && status() === 'Draft') {
                <button type="button" mat-raised-button color="primary" style="border-radius:8px"
                        [disabled]="saving() === 'publish'" (click)="save('publish')">
                  @if (saving() === 'publish') { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
                  <i class="ti ti-send"></i> Publish
                </button>
              }
              <button type="submit" mat-stroked-button style="border-radius:8px"
                      [disabled]="form.invalid || saving() === 'draft'">
                @if (saving() === 'draft') { <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner> }
                <i class="ti ti-device-floppy"></i> {{ vacancyId ? 'Save changes' : 'Save as draft' }}
              </button>
            </div>
          </div>
        </form>
      }
    </div>
  `
})
export class CreateVacancyComponent implements OnInit {
  private fb = inject(FormBuilder);
  private vacancyService = inject(VacancyAdminService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private skillService = inject(SkillService);
  private departmentService = inject(DepartmentService);
  private clientService = inject(ClientService);
  private recruiterService = inject(RecruiterService);

  vacancyId: number | null = null;
  status = signal<string>('Draft');
  loading = signal(false);
  saving = signal<'draft' | 'publish' | null>(null);
  apiError = '';

  minClosingDate = new Date().toISOString().substring(0, 10);
  allDocTypes = ALL_DOC_TYPES;

  skills = signal<SkillResponse[]>([]);
  departments = signal<DepartmentResponse[]>([]);
  clients = signal<ClientResponse[]>([]);
  private recruiterId: number | null = null;

  form = this.fb.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    vacancyType: ['Internal', Validators.required],
    departmentId: [null as number | null],
    clientId: [null as number | null],
    employmentType: ['FullTime', Validators.required],
    location: ['', Validators.required],
    salaryMin: [null as number | null],
    salaryMax: [null as number | null],
    minYearsExperience: [null as number | null, Validators.required],
    closingDate: ['', [Validators.required, this.futureDate]],
    requiredQualifications: ['', Validators.required],
    requirements: [''],
    skills: this.fb.array([]),
    requiredDocuments: this.fb.array([])
  }, { validators: this.salaryRangeValidator });

  get skillsArray(): FormArray { return this.form.get('skills') as FormArray; }
  get docsArray(): FormArray { return this.form.get('requiredDocuments') as FormArray; }

  asGroup(c: any) { return c; }

  private futureDate(control: { value: string }) {
    if (!control.value) return null;
    return new Date(control.value) <= new Date() ? { pastDate: true } : null;
  }

  private salaryRangeValidator(group: any) {
    const min = group.get('salaryMin')?.value;
    const max = group.get('salaryMax')?.value;
    return min && max && min > max ? { salaryRange: true } : null;
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  ngOnInit(): void {
    // Lookups for dropdowns
    this.skillService.getAll().subscribe({ next: s => this.skills.set(s) });
    this.departmentService.getAll().subscribe({ next: d => this.departments.set(d.filter(x => x.isActive)) });
    this.clientService.getAll().subscribe({ next: c => this.clients.set(c) });

    // Resolve the logged-in user's recruiterId (no dedicated "me" endpoint exists yet)
    // this.recruiterService.getMyRecruiterId(this.auth.currentUser()!.userId).subscribe({
    //   next: id => {
    //     this.recruiterId = id;
    //     if (!id) this.apiError = 'Your recruiter profile could not be found. Contact an admin.';
    //   },
    //   error: () => this.apiError = 'Could not resolve your recruiter profile.'
    // });
   this.recruiterId = 1;
    this.addSkill(); // start with one skill row

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.vacancyId = Number(idParam);
      this.loading.set(true);
      this.vacancyService.getById(this.vacancyId).subscribe({
        next: v => {
          this.status.set(v.status);
          this.skillsArray.clear();
          this.docsArray.clear();
          this.form.patchValue({
            title: v.title, description: v.description, vacancyType: v.vacancyType as any,
            employmentType: v.employmentType, location: v.location,
            salaryMin: v.salaryMin ?? null, salaryMax: v.salaryMax ?? null,
            minYearsExperience: v.minYearsExperience ?? null,
            closingDate: v.closingDate ? v.closingDate.substring(0, 10) : '',
            requiredQualifications: v.requiredQualifications, requirements: v.requirements,
            departmentId: v.departmentId ?? null, clientId: v.clientId ?? null
          });
          
          v.requiredDocuments?.forEach(rd => {
            this.docsArray.push(this.fb.group({ documentType: [rd.documentType], isMandatory: [rd.isMandatory] }));
          });
          this.loading.set(false);
        },
        error: (err: Error) => { this.apiError = err.message; this.loading.set(false); }
      });
    }
  }

  addSkill(): void {
    this.skillsArray.push(this.fb.group({
      skillId: [null, Validators.required],
      isRequired: [true],
      proficiencyLevel: ['Intermediate']
    }));
  }
  removeSkill(i: number): void { this.skillsArray.removeAt(i); }

  isDocSelected(t: string): boolean {
    return this.docsArray.controls.some(c => c.value.documentType === t);
  }
  isDocMandatory(t: string): boolean {
    return this.docsArray.controls.find(c => c.value.documentType === t)?.value.isMandatory ?? false;
  }
  toggleDoc(t: string, checked: boolean): void {
    if (checked) {
      this.docsArray.push(this.fb.group({ documentType: [t], isMandatory: [false] }));
    } else {
      const idx = this.docsArray.controls.findIndex(c => c.value.documentType === t);
      if (idx > -1) this.docsArray.removeAt(idx);
    }
  }
  setDocMandatory(t: string, checked: boolean): void {
    const ctrl = this.docsArray.controls.find(c => c.value.documentType === t);
    ctrl?.patchValue({ isMandatory: checked });
  }
  docLabel(t: string): string { return (DOCUMENT_TYPE_LABELS as Record<string, string>)[t] ?? t; }

  save(mode: 'draft' | 'publish'): void {
    if (this.form.invalid || this.skillsArray.length === 0) {
      this.form.markAllAsTouched();
      this.apiError = this.skillsArray.length === 0 ? 'At least one required skill must be specified.' : '';
      return;
    }

    if (!this.recruiterId) {
      this.apiError = 'Your recruiter profile could not be found. Contact an admin.';
      return;
    }

    this.apiError = '';
    const v = this.form.value;

    const payload = {
      title: v.title!, description: v.description!,
      vacancyType: v.vacancyType as 'Internal' | 'ClientPlacement',
      departmentId: v.vacancyType === 'Internal' ? v.departmentId ?? undefined : undefined,
      clientId: v.vacancyType === 'ClientPlacement' ? v.clientId ?? undefined : undefined,
      employmentType: v.employmentType!,
      salaryMin: v.salaryMin ?? undefined, salaryMax: v.salaryMax ?? undefined,
      location: v.location!, closingDate: new Date(v.closingDate!).toISOString(),
      minYearsExperience: v.minYearsExperience!,
      requiredQualifications: v.requiredQualifications!, requirements: v.requirements ?? undefined,
      skills: v.skills as VacancySkillInput[],
      requiredDocuments: v.requiredDocuments as RequiredDocumentInput[]
    };

    this.saving.set(mode === 'publish' ? 'publish' : 'draft');

    const afterSave = (id: number) => {
      if (mode === 'publish') {
        this.vacancyService.publish(id).subscribe({
          next: () => {
            this.saving.set(null);
            this.toast.show('Vacancy published — now visible to candidates.', 'success');
            this.router.navigate(['/admin/vacancies']);
          },
          error: (err: Error) => { this.saving.set(null); this.apiError = err.message; }
        });
      } else {
        this.saving.set(null);
        this.toast.show('Vacancy saved as draft.', 'success');
        this.router.navigate(['/admin/vacancies']);
      }
    };

    if (this.vacancyId) {
      this.vacancyService.update(this.vacancyId, payload).subscribe({
        next: updated => afterSave(updated.vacancyId),
        error: (err: Error) => { this.saving.set(null); this.apiError = err.message; }
      });
    } else {
      this.vacancyService.create({ recruiterId: this.recruiterId, ...payload }).subscribe({
        next: created => afterSave(created.vacancyId),
        error: (err: Error) => { this.saving.set(null); this.apiError = err.message; }
      });
    }
  }
}