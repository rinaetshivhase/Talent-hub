import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { InterviewService } from '../../../core/services/interview.service';
import { ApplicationService } from '../../../core/services/application.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  ApplicationResponse,
  InterviewResponse,
  InterviewType,
} from '../../../core/models';

type ViewMode = 'schedule' | 'view' | 'reschedule' | 'outcome';

@Component({
  selector: 'app-schedule-interview',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatDividerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title">
            <i class="ti ti-calendar-event"></i>
            @if (mode() === 'view') {
              Interview details
            } @else if (mode() === 'reschedule') {
              Reschedule interview
            } @else if (mode() === 'outcome') {
              Record interview outcome
            } @else {
              Schedule interview
            }
          </h2>
          <p class="page-sub">
            @if (existingInterview()) {
              Round {{ existingInterview()!.roundNumber }}
            } @else if (nextRound()) {
              Round {{ nextRound() }}
            } @else {
              Schedule a new round
            }
          </p>
        </div>
      </div>

      @if (apiError) {
        <div class="api-error" style="margin-bottom:14px">
          <i class="ti ti-alert-circle"></i> {{ apiError }}
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (mode() === 'view' && existingInterview()) {
        <!-- VIEW: existing scheduled interview -->
        <mat-card
          class="mat-elevation-z1"
          style="border-radius:12px;margin-bottom:16px"
        >
          <mat-card-content style="padding:20px 24px">
            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Name</mat-label>
              <input
                matInput
                [value]="existingInterview()!.candidateName"
                disabled
              />
            </mat-form-field>

            <mat-form-field appearance="outline" style="width:100%">
              <mat-label>Job title</mat-label>
              <input
                matInput
                [value]="existingInterview()!.vacancyTitle"
                disabled
              />
            </mat-form-field>

            <mat-divider style="margin:8px 0 20px"></mat-divider>

            <div class="field-grid">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Interview type</mat-label>
                <input
                  matInput
                  [value]="typeLabel(existingInterview()!.interviewType)"
                  disabled
                />
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Scheduled for</mat-label>
                <input
                  matInput
                  [value]="formatDateTime(existingInterview()!.scheduledAt)"
                  disabled
                />
              </mat-form-field>
            </div>

            @if (existingInterview()!.location) {
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Location</mat-label>
                <input
                  matInput
                  [value]="existingInterview()!.location"
                  disabled
                />
              </mat-form-field>
            }
            @if (existingInterview()!.meetingLink) {
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Meeting link</mat-label>
                <input
                  matInput
                  [value]="existingInterview()!.meetingLink"
                  disabled
                />
              </mat-form-field>
            }
          </mat-card-content>
        </mat-card>

        <div class="form-footer">
          <a (click)="goBack()" class="form-note" style="cursor:pointer">
            <i class="ti ti-arrow-left"></i> Back
          </a>
          <div style="display:flex;gap:10px">
            @if (!interviewHasStarted()) {
              <button
                mat-stroked-button
                color="warn"
                style="border-radius:8px"
                [disabled]="cancelling()"
                (click)="cancelInterview()"
              >
                @if (cancelling()) {
                  <mat-spinner
                    diameter="16"
                    style="display:inline-block;margin-right:6px"
                  ></mat-spinner>
                }
                <i class="ti ti-x"></i> Cancel interview
              </button>
            }
            @if (interviewHasStarted()) {
              <button
                mat-stroked-button
                style="border-radius:8px"
                (click)="startOutcome()"
              >
                <i class="ti ti-clipboard-check"></i> Record outcome
              </button>
            }
            @if (!interviewHasStarted()) {
              <button
                mat-raised-button
                color="primary"
                style="border-radius:8px"
                (click)="startReschedule()"
              >
                <i class="ti ti-calendar-repeat"></i> Reschedule
              </button>
            }
          </div>
        </div>
      } @else if (mode() === 'reschedule' && existingInterview()) {
        <!-- RESCHEDULE: editable form for existing interview -->
        <form [formGroup]="rescheduleForm" (ngSubmit)="saveReschedule()">
          <mat-card
            class="mat-elevation-z1"
            style="border-radius:12px;margin-bottom:16px"
          >
            <mat-card-content style="padding:20px 24px">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Name</mat-label>
                <input
                  matInput
                  [value]="existingInterview()!.candidateName"
                  disabled
                />
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Job title</mat-label>
                <input
                  matInput
                  [value]="existingInterview()!.vacancyTitle"
                  disabled
                />
              </mat-form-field>

              <mat-divider style="margin:8px 0 20px"></mat-divider>

              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Interview type</mat-label>
                  <input
                    matInput
                    [value]="typeLabel(existingInterview()!.interviewType)"
                    disabled
                  />
                </mat-form-field>

                @if (existingInterview()!.interviewType === 'InPerson') {
                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>Location</mat-label>
                    <input
                      matInput
                      formControlName="location"
                      placeholder="e.g. Head office, 3rd floor boardroom"
                    />
                    @if (rescheduleInvalid('location')) {
                      <mat-error
                        >Location is required for an in-person
                        interview</mat-error
                      >
                    }
                  </mat-form-field>
                } @else if (existingInterview()!.interviewType === 'Virtual') {
                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>Meeting link</mat-label>
                    <input
                      matInput
                      formControlName="meetingLink"
                      placeholder="e.g. https://meet.google.com/..."
                    />
                    @if (rescheduleInvalid('meetingLink')) {
                      <mat-error
                        >Meeting link is required for a virtual
                        interview</mat-error
                      >
                    }
                  </mat-form-field>
                } @else {
                  <p class="form-note" style="align-self:center">
                    <i class="ti ti-phone"></i> No location needed for a phone
                    interview
                  </p>
                }
              </div>

              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Date</mat-label>
                  <input
                    matInput
                    type="date"
                    formControlName="scheduledDate"
                    [min]="minDate"
                    #dateInput
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="openPicker(dateInput)"
                    tabindex="-1"
                  >
                    <i class="ti ti-calendar"></i>
                  </button>
                  @if (rescheduleInvalid('scheduledDate')) {
                    <mat-error>A future date is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Time</mat-label>
                  <input
                    matInput
                    type="time"
                    formControlName="scheduledTime"
                    #timeInput
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="openPicker(timeInput)"
                    tabindex="-1"
                  >
                    <i class="ti ti-clock"></i>
                  </button>
                  @if (rescheduleInvalid('scheduledTime')) {
                    <mat-error>Time is required</mat-error>
                  }
                </mat-form-field>
              </div>
              @if (rescheduleForm.errors?.['pastDateTime']) {
                <p class="form-note" style="color:var(--warn,#c62828)">
                  <i class="ti ti-alert-circle"></i> The selected date and time
                  must be in the future
                </p>
              }
            </mat-card-content>
          </mat-card>

          @if (apiError && rescheduleForm.dirty) {
            <div class="api-error" style="margin-bottom:14px">
              <i class="ti ti-alert-circle"></i> {{ apiError }}
            </div>
          }

          <div class="form-footer">
            <a
              (click)="cancelRescheduleEdit()"
              class="form-note"
              style="cursor:pointer"
            >
              <i class="ti ti-arrow-left"></i> Back
            </a>
            <button
              type="submit"
              mat-raised-button
              color="primary"
              style="border-radius:8px"
              [disabled]="rescheduleForm.invalid || saving()"
            >
              @if (saving()) {
                <mat-spinner
                  diameter="16"
                  style="display:inline-block;margin-right:6px"
                ></mat-spinner>
              }
              <i class="ti ti-calendar-repeat"></i> Save new time
            </button>
          </div>
        </form>
      } @else if (mode() === 'outcome' && existingInterview()) {
        <!-- OUTCOME: record Passed/Failed for the existing interview -->
        <form [formGroup]="outcomeForm" (ngSubmit)="saveOutcome()">
          <mat-card
            class="mat-elevation-z1"
            style="border-radius:12px;margin-bottom:16px"
          >
            <mat-card-content style="padding:20px 24px">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Name</mat-label>
                <input
                  matInput
                  [value]="existingInterview()!.candidateName"
                  disabled
                />
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Round</mat-label>
                <input
                  matInput
                  [value]="
                    'Round ' +
                    existingInterview()!.roundNumber +
                    ' — ' +
                    formatDateTime(existingInterview()!.scheduledAt)
                  "
                  disabled
                />
              </mat-form-field>

              <mat-divider style="margin:8px 0 20px"></mat-divider>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Outcome</mat-label>
                <mat-select formControlName="outcome">
                  <mat-option value="Passed">Passed</mat-option>
                  <mat-option value="Failed">Failed</mat-option>
                </mat-select>
                @if (outcomeInvalid('outcome')) {
                  <mat-error>Select an outcome</mat-error>
                }
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Recruiter notes (optional)</mat-label>
                <textarea
                  matInput
                  formControlName="recruiterNotes"
                  rows="4"
                  placeholder="Any notes on how the interview went…"
                ></textarea>
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          @if (apiError && outcomeForm.dirty) {
            <div class="api-error" style="margin-bottom:14px">
              <i class="ti ti-alert-circle"></i> {{ apiError }}
            </div>
          }

          <div class="form-footer">
            <a
              (click)="cancelOutcomeEdit()"
              class="form-note"
              style="cursor:pointer"
            >
              <i class="ti ti-arrow-left"></i> Back
            </a>
            <button
              type="submit"
              mat-raised-button
              color="primary"
              style="border-radius:8px"
              [disabled]="outcomeForm.invalid || saving()"
            >
              @if (saving()) {
                <mat-spinner
                  diameter="16"
                  style="display:inline-block;margin-right:6px"
                ></mat-spinner>
              }
              <i class="ti ti-clipboard-check"></i> Save outcome
            </button>
          </div>
        </form>
      } @else {
        <!-- SCHEDULE: no existing interview, create a new one -->
        <form [formGroup]="form" (ngSubmit)="save()">
          <mat-card
            class="mat-elevation-z1"
            style="border-radius:12px;margin-bottom:16px"
          >
            <mat-card-content style="padding:20px 24px">
              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Name</mat-label>
                <input
                  matInput
                  [value]="application()?.candidateName"
                  disabled
                />
              </mat-form-field>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Job title</mat-label>
                <input
                  matInput
                  [value]="application()?.vacancyTitle"
                  disabled
                />
              </mat-form-field>

              <mat-divider style="margin:8px 0 20px"></mat-divider>

              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Interview type</mat-label>
                  <mat-select formControlName="interviewType">
                    <mat-option value="InPerson">In person</mat-option>
                    <mat-option value="Virtual">Virtual</mat-option>
                    <mat-option value="Phone">Phone</mat-option>
                  </mat-select>
                </mat-form-field>

                @if (form.value.interviewType === 'InPerson') {
                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>Location</mat-label>
                    <input
                      matInput
                      formControlName="location"
                      placeholder="e.g. Head office, 3rd floor boardroom"
                    />
                    @if (invalid('location')) {
                      <mat-error
                        >Location is required for an in-person
                        interview</mat-error
                      >
                    }
                  </mat-form-field>
                } @else if (form.value.interviewType === 'Virtual') {
                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>Meeting link</mat-label>
                    <input
                      matInput
                      formControlName="meetingLink"
                      placeholder="e.g. https://meet.google.com/..."
                    />
                    @if (invalid('meetingLink')) {
                      <mat-error
                        >Meeting link is required for a virtual
                        interview</mat-error
                      >
                    }
                  </mat-form-field>
                } @else {
                  <p class="form-note" style="align-self:center">
                    <i class="ti ti-phone"></i> No location needed for a phone
                    interview
                  </p>
                }
              </div>

              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Date</mat-label>
                  <input
                    matInput
                    type="date"
                    formControlName="scheduledDate"
                    [min]="minDate"
                    #dateInput
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="openPicker(dateInput)"
                    tabindex="-1"
                  >
                    <i class="ti ti-calendar"></i>
                  </button>
                  @if (invalid('scheduledDate')) {
                    <mat-error>A future date is required</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Time</mat-label>
                  <input
                    matInput
                    type="time"
                    formControlName="scheduledTime"
                    #timeInput
                  />
                  <button
                    mat-icon-button
                    matSuffix
                    type="button"
                    (click)="openPicker(timeInput)"
                    tabindex="-1"
                  >
                    <i class="ti ti-clock"></i>
                  </button>
                  @if (invalid('scheduledTime')) {
                    <mat-error>Time is required</mat-error>
                  }
                </mat-form-field>
              </div>
              @if (form.errors?.['pastDateTime']) {
                <p class="form-note" style="color:var(--warn,#c62828)">
                  <i class="ti ti-alert-circle"></i> The selected date and time
                  must be in the future
                </p>
              }

              <mat-divider style="margin:8px 0 20px"></mat-divider>

              <mat-form-field appearance="outline" style="width:100%">
                <mat-label>Scheduled by</mat-label>
                <input matInput [value]="scheduledByName()" disabled />
              </mat-form-field>
            </mat-card-content>
          </mat-card>

          @if (apiError && form.dirty) {
            <div class="api-error" style="margin-bottom:14px">
              <i class="ti ti-alert-circle"></i> {{ apiError }}
            </div>
          }

          <div class="form-footer">
            <a (click)="goBack()" class="form-note" style="cursor:pointer">
              <i class="ti ti-arrow-left"></i> Back
            </a>
            <button
              type="submit"
              mat-raised-button
              color="primary"
              style="border-radius:8px"
              [disabled]="form.invalid || saving()"
            >
              @if (saving()) {
                <mat-spinner
                  diameter="16"
                  style="display:inline-block;margin-right:6px"
                ></mat-spinner>
              }
              <i class="ti ti-calendar-plus"></i> Schedule interview
            </button>
          </div>
        </form>
      }
    </div>
  `,
})
export class ScheduleInterviewComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private interviewService = inject(InterviewService);
  private appService = inject(ApplicationService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private now = signal(Date.now());
  private clockHandle?: ReturnType<typeof setInterval>;

  applicationId!: number;
  application = signal<ApplicationResponse | null>(null);
  existingInterview = signal<InterviewResponse | null>(null);
  mode = signal<ViewMode>('schedule');
  nextRound = signal<number | null>(null);
  loading = signal(true);
  saving = signal(false);
  cancelling = signal(false);
  apiError = '';

  minDate = new Date().toISOString().substring(0, 10);

  form = this.fb.group(
    {
      interviewType: ['InPerson' as InterviewType, Validators.required],
      scheduledDate: ['', Validators.required],
      scheduledTime: ['', Validators.required],
      location: [''],
      meetingLink: [''],
    },
    { validators: this.futureDateTime },
  );

  rescheduleForm = this.fb.group(
    {
      scheduledDate: ['', Validators.required],
      scheduledTime: ['', Validators.required],
      location: [''],
      meetingLink: [''],
    },
    { validators: this.futureDateTime },
  );

  outcomeForm = this.fb.group({
    outcome: ['' as '' | 'Passed' | 'Failed', Validators.required],
    recruiterNotes: [''],
  });

  interviewHasStarted = computed(() => {
    const iv = this.existingInterview();
    if (!iv) return false;
    return new Date(iv.scheduledAt).getTime() <= this.now();
  });

  private futureDateTime(group: any) {
    const date = group.get('scheduledDate')?.value;
    const time = group.get('scheduledTime')?.value;
    if (!date || !time) return null;
    return new Date(`${date}T${time}`) <= new Date()
      ? { pastDateTime: true }
      : null;
  }

  openPicker(input: HTMLInputElement): void {
    if (typeof (input as any).showPicker === 'function') {
      (input as any).showPicker();
    } else {
      input.focus();
    }
  }

  scheduledByName(): string {
    const u = this.auth.currentUser();
    return u ? `${u.firstName} ${u.lastName}` : '';
  }

  typeLabel(type: string): string {
    return type === 'InPerson'
      ? 'In person'
      : type === 'Virtual'
        ? 'Virtual'
        : 'Phone';
  }

  formatDateTime(iso: string): string {
    return new Date(iso).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  invalid(field: string): boolean {
    const c = this.form.get(field);
    if (!c) return false;
    if (field === 'location')
      return (
        this.form.value.interviewType === 'InPerson' &&
        !this.form.value.location &&
        (c.dirty || c.touched)
      );
    if (field === 'meetingLink')
      return (
        this.form.value.interviewType === 'Virtual' &&
        !this.form.value.meetingLink &&
        (c.dirty || c.touched)
      );
    return c.invalid && (c.dirty || c.touched);
  }

  rescheduleInvalid(field: string): boolean {
    const c = this.rescheduleForm.get(field);
    if (!c) return false;
    const type = this.existingInterview()?.interviewType;
    if (field === 'location')
      return (
        type === 'InPerson' &&
        !this.rescheduleForm.value.location &&
        (c.dirty || c.touched)
      );
    if (field === 'meetingLink')
      return (
        type === 'Virtual' &&
        !this.rescheduleForm.value.meetingLink &&
        (c.dirty || c.touched)
      );
    return c.invalid && (c.dirty || c.touched);
  }

  outcomeInvalid(field: string): boolean {
    const c = this.outcomeForm.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  ngOnInit(): void {
    this.clockHandle = setInterval(() => this.now.set(Date.now()), 30_000);
    this.applicationId = Number(this.route.snapshot.paramMap.get('id'));

    this.appService.getById(this.applicationId).subscribe({
      next: (a) => this.application.set(a),
      error: (err: Error) => (this.apiError = err.message),
    });

    this.interviewService.getByApplication(this.applicationId).subscribe({
      next: (interviews) => {
        this.nextRound.set(interviews.length + 1);
        const active = interviews.find((i) => i.status === 'Scheduled');
        if (active) {
          this.existingInterview.set(active);
          this.mode.set('view');
        }
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.apiError = err.message;
        this.loading.set(false);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.clockHandle) clearInterval(this.clockHandle);
  }

  save(): void {
    const type = this.form.value.interviewType as InterviewType;
    if (type === 'InPerson' && !this.form.value.location) {
      this.form.get('location')?.markAsTouched();
      return;
    }
    if (type === 'Virtual' && !this.form.value.meetingLink) {
      this.form.get('meetingLink')?.markAsTouched();
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.apiError = '';
    this.saving.set(true);

    const scheduledAt = new Date(
      `${this.form.value.scheduledDate}T${this.form.value.scheduledTime}`,
    ).toISOString();

    this.interviewService
      .schedule(this.applicationId, {
        interviewType: type,
        scheduledAt,
        location: type === 'InPerson' ? this.form.value.location! : undefined,
        meetingLink:
          type === 'Virtual' ? this.form.value.meetingLink! : undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.show('Interview scheduled.', 'success');
          this.router.navigate(['/admin/applications']);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.apiError = err.message;
        },
      });
  }

  startReschedule(): void {
    const interview = this.existingInterview();
    if (!interview) return;

    const dt = new Date(interview.scheduledAt);
    const date = dt.toISOString().substring(0, 10);
    const time = dt.toTimeString().substring(0, 5);

    this.rescheduleForm.reset({
      scheduledDate: date,
      scheduledTime: time,
      location: interview.location ?? '',
      meetingLink: interview.meetingLink ?? '',
    });
    this.apiError = '';
    this.mode.set('reschedule');
  }

  cancelRescheduleEdit(): void {
    this.apiError = '';
    this.mode.set('view');
  }

  saveReschedule(): void {
    const interview = this.existingInterview();
    if (!interview) return;

    const type = interview.interviewType;
    if (type === 'InPerson' && !this.rescheduleForm.value.location) {
      this.rescheduleForm.get('location')?.markAsTouched();
      return;
    }
    if (type === 'Virtual' && !this.rescheduleForm.value.meetingLink) {
      this.rescheduleForm.get('meetingLink')?.markAsTouched();
      return;
    }
    if (this.rescheduleForm.invalid) {
      this.rescheduleForm.markAllAsTouched();
      return;
    }

    this.apiError = '';
    this.saving.set(true);

    const scheduledAt = new Date(
      `${this.rescheduleForm.value.scheduledDate}T${this.rescheduleForm.value.scheduledTime}`,
    ).toISOString();

    this.interviewService
      .reschedule(interview.interviewId, {
        scheduledAt,
        location:
          type === 'InPerson' ? this.rescheduleForm.value.location! : undefined,
        meetingLink:
          type === 'Virtual'
            ? this.rescheduleForm.value.meetingLink!
            : undefined,
      })
      .subscribe({
        next: (updated) => {
          this.saving.set(false);
          this.existingInterview.set(updated);
          this.mode.set('view');
          this.toast.show('Interview rescheduled.', 'success');
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.apiError = err.message;
        },
      });
  }

  startOutcome(): void {
    this.outcomeForm.reset({ outcome: '', recruiterNotes: '' });
    this.apiError = '';
    this.mode.set('outcome');
  }

  cancelOutcomeEdit(): void {
    this.apiError = '';
    this.mode.set('view');
  }

  saveOutcome(): void {
    const interview = this.existingInterview();
    if (!interview) return;

    if (this.outcomeForm.invalid) {
      this.outcomeForm.markAllAsTouched();
      return;
    }

    this.apiError = '';
    this.saving.set(true);

    const outcome = this.outcomeForm.value.outcome as 'Passed' | 'Failed';

    this.interviewService
      .setOutcome(interview.interviewId, {
        outcome,
        recruiterNotes: this.outcomeForm.value.recruiterNotes || undefined,
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.toast.show(
            outcome === 'Passed'
              ? 'Outcome recorded — candidate passed.'
              : 'Outcome recorded — candidate not selected.',
            'success',
          );
          this.router.navigate(['/admin/applications']);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.apiError = err.message;
        },
      });
  }

  cancelInterview(): void {
    const interview = this.existingInterview();
    if (!interview) return;

    if (!confirm('Cancel this interview? This cannot be undone.')) return;

    this.cancelling.set(true);
    this.interviewService.cancel(interview.interviewId).subscribe({
      next: () => {
        this.cancelling.set(false);
        this.toast.show('Interview cancelled.', 'success');
        this.router.navigate(['/admin/applications']);
      },
      error: (err: Error) => {
        this.cancelling.set(false);
        this.apiError = err.message;
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/applications']);
  }
}
