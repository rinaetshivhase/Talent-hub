import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { CandidateService } from '../../core/services/candidate.service';
import { CandidateStateService } from '../../core/services/candidate-state.service';
import { AddressService } from '../../core/services/address.service';
import { ToastService } from '../../core/services/toast.service';
import { AddressResponse, AddressType } from '../../core/models';
import { AddressAutocompleteService } from '../../core/services/address-autocomplete.service';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { Subject, of } from 'rxjs';


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatCardModule,
    MatProgressSpinnerModule, MatDividerModule
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-user-check"></i> Candidate profile</h2>
          <p class="page-sub">
            {{ (isEdit || !state.profile()) ? 'Fill in your details to apply for vacancies' : 'Your registered candidate profile' }}
          </p>
        </div>
        @if (state.profile() && !isEdit) {
          <span class="status-pill s-offer">Active</span>
        }
      </div>

      @if (loadError()) {
        <div class="api-error"><i class="ti ti-alert-circle"></i> {{ loadError() }}</div>
      }

      @if (initialLoading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner><p style="margin-top:12px">Loading profile…</p></div>

      } @else if (state.profile() && !isEdit) {
        <!-- ── READ VIEW ── -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px;margin-bottom:16px">
          <mat-card-content style="padding:18px 20px">
            <div class="profile-view-header">
              <div class="pv-avatar">{{ initials() }}</div>
              <div>
                <div class="pv-name">{{ state.profile()!.firstName }} {{ state.profile()!.lastName }}</div>
                <div class="pv-sub">{{ state.profile()!.email }}</div>
              </div>
              <button mat-stroked-button (click)="startEdit()" style="margin-left:auto;border-radius:8px">
                <i class="ti ti-pencil"></i>&nbsp;Edit profile
              </button>
            </div>
            <div class="pv-grid">
              <div class="pv-field"><span class="pv-label">Phone</span><span>{{ state.profile()!.phone || '—' }}</span></div>
              <div class="pv-field"><span class="pv-label">Date of birth</span><span>{{ formatDate(state.profile()!.dateOfBirth) }}</span></div>
              <div class="pv-field"><span class="pv-label">Gender</span><span>{{ state.profile()!.gender || '—' }}</span></div>
              <div class="pv-field"><span class="pv-label">Nationality</span><span>{{ state.profile()!.nationality || '—' }}</span></div>
              <div class="pv-field"><span class="pv-label">Race</span><span>{{ state.profile()!.race || '—' }}</span></div>
              <div class="pv-field"><span class="pv-label">Candidate ID</span>
                <span class="ref-chip"><i class="ti ti-hash"></i> {{ state.profile()!.candidateId }}</span>
              </div>
            </div>

            @if (!profileComplete()) {
              <div class="info-banner warn" style="margin-top:14px">
                <i class="ti ti-alert-circle"></i>
                <span>Some fields are missing. A complete profile improves your chances when recruiters review your application.</span>
              </div>
            }

            @if (state.profile()!.uploadedDocumentTypes.length) {
              <div class="pv-bio">
                <span class="pv-label">Uploaded documents</span>
                <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px">
                  @for (t of state.profile()!.uploadedDocumentTypes; track t) {
                    <span class="ref-chip"><i class="ti ti-file-check"></i> {{ t }}</span>
                  }
                </div>
              </div>
            }
          </mat-card-content>
        </mat-card>

        <!-- ── ADDRESSES CARD ── -->
        <mat-card class="mat-elevation-z1" style="border-radius:12px">
          <mat-card-content style="padding:18px 20px">
            <div class="card-header"><i class="ti ti-map-pin"></i> Addresses</div>

            @if (addressLoading()) {
              <mat-spinner diameter="24"></mat-spinner>
            } @else if (!addresses().length) {
              <div class="empty-state" style="padding:1.5rem">
                <i class="ti ti-map-pin-off"></i>
                <p>No address on file yet.</p>
              </div>
            } @else {
              <div style="display:flex;flex-direction:column;gap:10px">
                @for (a of addresses(); track a.addressId) {
                  <div class="doc-slot uploaded">
                    <i class="ti ti-map-pin doc-icon icon-ok"></i>
                    <div class="doc-info">
                      <div class="doc-name">{{ a.addressType }} address</div>
                      <div class="doc-meta">
                        {{ a.line1 }}{{ a.line2 ? ', ' + a.line2 : '' }}, {{ a.city }}, {{ a.province }} {{ a.postalCode }}, {{ a.country }}
                      </div>
                    </div>
                    <div class="doc-actions" style="display:flex;gap:6px">
                      <button mat-stroked-button style="border-radius:8px;font-size:12px" (click)="startEditAddress(a)">
                        <i class="ti ti-pencil"></i>&nbsp;Edit
                      </button>
                      @if (addresses().length > 1 || a.addressType !== 'Residential') {
                        <button mat-icon-button color="warn" (click)="deleteAddress(a)">
                          <i class="ti ti-trash"></i>
                        </button>
                      }
                    </div>
                  </div>
                }
              </div>
            }

            @if (!addressForm.editing && missingAddressTypes().length) {
              <div style="margin-top:14px;display:flex;gap:8px;flex-wrap:wrap">
                @for (t of missingAddressTypes(); track t) {
                  <button mat-stroked-button style="border-radius:8px" (click)="startAddAddress(t)">
                    <i class="ti ti-plus"></i>&nbsp;Add {{ t }} address
                  </button>
                }
              </div>
            }

            @if (addressForm.editing) {
              <form [formGroup]="addrForm" (ngSubmit)="submitAddress()" style="margin-top:16px">
                <mat-divider style="margin-bottom:16px"></mat-divider>
                <div class="form-section-label">
                  <i class="ti ti-map-pin"></i> {{ addressForm.mode === 'add' ? 'Add ' + addressForm.type : 'Edit ' + addressForm.type }} address
                </div>

                <div class="field-grid">
                  <div style="position:relative;width:100%">
                    <mat-form-field appearance="outline" style="width:100%">
                      <mat-label>Address line 1</mat-label>
                      <input matInput formControlName="line1"
                        placeholder="Start typing your street address..."
                        (input)="onAddressInput($any($event.target).value)"
                        (blur)="hideSuggestionsDelayed()"
                        autocomplete="off">
                      @if (addrInvalid('line1')) { <mat-error>Required</mat-error> }
                    </mat-form-field>

                    @if (showSuggestions() && suggestions().length) {
                      <div class="suggestions-dropdown">
                        @for (s of suggestions(); track s.placeId) {
                          <div class="suggestion-item"
                            (mousedown)="selectSuggestion(s)">
                            <i class="ti ti-map-pin" style="color:#1565c0;margin-right:8px"></i>
                            <div>
                              <div style="font-size:14px;font-weight:500">
                                {{ s.placePrediction?.text?.text ?? s.description }}
                              </div>
                              @if (s.placePrediction?.structuredFormat?.secondaryText?.text) {
                                <div style="font-size:12px;color:#888">
                                  {{ s.placePrediction.structuredFormat.secondaryText.text }}
                                </div>
                              }
                            </div>
                          </div>
                        }
                      </div>
                    }
                  </div>

                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>Address line 2</mat-label>
                    <input matInput formControlName="line2" placeholder="Unit, complex (optional)">
                  </mat-form-field>

                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>City</mat-label>
                    <input matInput formControlName="city">
                    @if (addrInvalid('city')) { <mat-error>Required</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>Province</mat-label>
                    <mat-select formControlName="province">
                      <mat-option value="">Select…</mat-option>
                      <mat-option value="Gauteng">Gauteng</mat-option>
                      <mat-option value="Western Cape">Western Cape</mat-option>
                      <mat-option value="KwaZulu-Natal">KwaZulu-Natal</mat-option>
                      <mat-option value="Eastern Cape">Eastern Cape</mat-option>
                      <mat-option value="Free State">Free State</mat-option>
                      <mat-option value="Limpopo">Limpopo</mat-option>
                      <mat-option value="Mpumalanga">Mpumalanga</mat-option>
                      <mat-option value="North West">North West</mat-option>
                      <mat-option value="Northern Cape">Northern Cape</mat-option>
                    </mat-select>
                    @if (addrInvalid('province')) { <mat-error>Required</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>Postal code</mat-label>
                    <input matInput formControlName="postalCode" maxlength="4" placeholder="e.g. 2196">
                    @if (addrInvalid('postalCode')) { <mat-error>4-digit SA postal code required</mat-error> }
                  </mat-form-field>

                  <mat-form-field appearance="outline" style="width:100%">
                    <mat-label>Country</mat-label>
                    <input matInput formControlName="country">
                  </mat-form-field>
                </div>

                @if (addressApiError) {
                  <div class="api-error" style="margin-top:10px"><i class="ti ti-alert-circle"></i> {{ addressApiError }}</div>
                }

                <div class="form-footer" style="margin-top:12px">
                  <span></span>
                  <div style="display:flex;gap:8px">
                    <button type="button" mat-stroked-button style="border-radius:8px" (click)="cancelAddressEdit()">
                      <i class="ti ti-x"></i>&nbsp;Cancel
                    </button>
                    <button type="submit" mat-raised-button color="primary" style="border-radius:8px"
                            [disabled]="addressSaving || addrForm.invalid">
                      @if (addressSaving) {
                        <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                      }
                      {{ addressSaving ? 'Saving…' : addressForm.mode === 'add' ? 'Add address' : 'Update address' }}
                    </button>
                  </div>
                </div>
              </form>
            }
          </mat-card-content>
        </mat-card>

      } @else {
        <!-- ── CANDIDATE FORM VIEW ── -->
        <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
          <mat-card class="mat-elevation-z1" style="border-radius:12px">
            <mat-card-content style="padding:18px 20px">
              <div class="form-section-label"><i class="ti ti-user"></i> Personal information</div>

              <div class="field-grid">
                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Phone number</mat-label>
                  <input matInput formControlName="phone" type="tel" placeholder="+27 XX XXX XXXX">
                  @if (isInvalid('phone')) {
                    <mat-error>Enter a valid phone number, e.g. +27 82 123 4567</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Date of birth</mat-label>
                  <input matInput formControlName="dateOfBirth" type="date" [max]="maxDob">
                  @if (isInvalid('dateOfBirth')) {
                    <mat-error>Date of birth can't be in the future</mat-error>
                  }
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Gender</mat-label>
                  <mat-select formControlName="gender">
                    <mat-option value="">Select…</mat-option>
                    <mat-option value="Male">Male</mat-option>
                    <mat-option value="Female">Female</mat-option>
                    <mat-option value="Non-binary">Non-binary</mat-option>
                    <mat-option value="Prefer not to say">Prefer not to say</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Nationality</mat-label>
                  <input matInput formControlName="nationality" placeholder="e.g. South African">
                </mat-form-field>

                <mat-form-field appearance="outline" style="width:100%">
                  <mat-label>Race (EE reporting)</mat-label>
                  <mat-select formControlName="race">
                    <mat-option value="">Select…</mat-option>
                    <mat-option value="African">African</mat-option>
                    <mat-option value="Coloured">Coloured</mat-option>
                    <mat-option value="Indian/Asian">Indian/Asian</mat-option>
                    <mat-option value="White">White</mat-option>
                    <mat-option value="Prefer not to say">Prefer not to say</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <p class="form-note" style="margin-top:4px">
                <i class="ti ti-info-circle"></i> You'll be able to add your address once your profile is created.
              </p>

              @if (apiError) {
                <div class="api-error" style="margin-top:12px">
                  <i class="ti ti-alert-circle"></i> {{ apiError }}
                </div>
              }

              <div class="form-footer" style="margin-top:14px">
                <span class="form-note"><i class="ti ti-info-circle"></i> Profile is linked to your registered user account</span>
                <div style="display:flex;gap:8px">
                  @if (isEdit) {
                    <button type="button" mat-stroked-button style="border-radius:8px" (click)="cancelEdit()">
                      <i class="ti ti-x"></i>&nbsp;Cancel
                    </button>
                  }
                  <button type="submit" mat-raised-button color="primary" style="border-radius:8px"
                          [disabled]="loading || form.invalid || (isEdit && form.pristine)">
                    @if (loading) {
                      <mat-spinner diameter="16" style="display:inline-block;margin-right:6px"></mat-spinner>
                    }
                    {{ loading ? 'Saving…' : isEdit ? 'Update profile' : 'Create profile' }}
                  </button>
                </div>
              </div>
            </mat-card-content>
          </mat-card>
        </form>
      }
    </div>
    <style>
      .suggestions-dropdown {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.12);
        z-index: 1000;
        max-height: 240px;
        overflow-y: auto;
      }
      .suggestion-item {
        display: flex;
        align-items: center;
        padding: 10px 14px;
        cursor: pointer;
        border-bottom: 1px solid #f5f5f5;
        transition: background 0.1s;
      }
      .suggestion-item:last-child { border-bottom: none; }
      .suggestion-item:hover { background: #f0f7ff; }
    </style>
  `
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private candidateService = inject(CandidateService);
  private addressService = inject(AddressService);
  state = inject(CandidateStateService);
  private toast = inject(ToastService);
  private autocomplete = inject(AddressAutocompleteService);

  suggestions = signal<any[]>([]);
  showSuggestions = signal(false);
  private searchInput$ = new Subject<string>();

  isEdit = false;
  loading = false;
  apiError = '';
  loadError = signal('');
  initialLoading = signal(true);

  maxDob = new Date().toISOString().substring(0, 10);

  form = this.fb.group({
    phone: ['', [Validators.pattern(/^\+?[0-9\s-]{7,15}$/)]],
    gender: [''],
    race: [''],
    nationality: [''],
    dateOfBirth: ['', [this.notFutureDate]]
  });

  // ── Addresses ──────────────────────────────────────────────────
  addresses = signal<AddressResponse[]>([]);
  addressLoading = signal(false);
  addressSaving = false;
  addressApiError = '';

  addressForm: { editing: boolean; mode: 'add' | 'edit'; type: AddressType; id?: number } =
    { editing: false, mode: 'add', type: 'Residential' };

  addrForm = this.fb.group({
    line1: ['', Validators.required],
    line2: [''],
    city: ['', Validators.required],
    province: ['', Validators.required],
    postalCode: ['', [Validators.required, Validators.pattern(/^\d{4}$/)]],
    country: ['South Africa']
  });

  ALL_ADDRESS_TYPES: AddressType[] = ['Residential', 'Postal'];

  missingAddressTypes(): AddressType[] {
    const existing = this.addresses().map(a => a.addressType);
    return this.ALL_ADDRESS_TYPES.filter(t => !existing.includes(t));
  }

  ngOnInit(): void {
    if (!this.state.loaded()) {
      this.state.loadMyProfile().subscribe({
        next: () => { this.initialLoading.set(false); this.loadAddresses(); },
        error: (err: Error) => {
          this.loadError.set(err.message);
          this.initialLoading.set(false);
        }
      });
    } else {
      this.initialLoading.set(false);
      this.loadAddresses();
    }

    this.searchInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(input => input.length >= 3
        ? this.autocomplete.getSuggestions(input)
        : of({ suggestions: [] }))
    ).subscribe(response => {
      this.suggestions.set(response?.suggestions ?? []);
      this.showSuggestions.set(this.suggestions().length > 0);
    });
  }

  private loadAddresses(): void {
    const p = this.state.profile();
    if (!p) return;
    this.addressLoading.set(true);
    this.addressService.getAll(p.candidateId).subscribe({
      next: a => { this.addresses.set(a); this.addressLoading.set(false); },
      error: () => this.addressLoading.set(false)
    });
  }

  startAddAddress(type: AddressType): void {
    this.addrForm.reset({ line1: '', line2: '', city: '', province: '', postalCode: '', country: 'South Africa' });
    this.addressForm = { editing: true, mode: 'add', type };
    this.addressApiError = '';
  }

  startEditAddress(a: AddressResponse): void {
    this.addrForm.reset({
      line1: a.line1, line2: a.line2 ?? '', city: a.city,
      province: a.province, postalCode: a.postalCode, country: a.country
    });
    this.addressForm = { editing: true, mode: 'edit', type: a.addressType as AddressType, id: a.addressId };
    this.addressApiError = '';
  }

  cancelAddressEdit(): void {
    this.addressForm = { editing: false, mode: 'add', type: 'Residential' };
    this.addressApiError = '';
  }

  onAddressInput(value: string): void {
    this.addrForm.patchValue({ line1: value });
    this.searchInput$.next(value);
  }

  hideSuggestionsDelayed(): void {
    // Small delay so mousedown on suggestion fires before blur hides the list
    setTimeout(() => this.showSuggestions.set(false), 200);
  }

  selectSuggestion(suggestion: any): void {
    const text = suggestion.placePrediction?.text?.text
      ?? suggestion.description
      ?? '';

    // Extract structured parts if available
    const structured = suggestion.placePrediction?.structuredFormat;
    const mainText = structured?.mainText?.text ?? text;
    const secondaryText = structured?.secondaryText?.text ?? '';

    // Auto-fill line1 from the suggestion's main text (street + number)
    this.addrForm.patchValue({ line1: mainText });

    // Try to extract city and province from secondary text
    // Google formats this as "City, Province, South Africa"
    if (secondaryText) {
      const parts = secondaryText.split(',').map((p: string) => p.trim());
      if (parts.length >= 1) this.addrForm.patchValue({ city: parts[0] });
      if (parts.length >= 2) {
        // Match against known SA provinces
        const provinces = ['Gauteng','Western Cape','KwaZulu-Natal','Eastern Cape',
          'Free State','Limpopo','Mpumalanga','North West','Northern Cape'];
        const matchedProvince = provinces.find(p =>
          parts[1].toLowerCase().includes(p.toLowerCase())
        );
        if (matchedProvince) this.addrForm.patchValue({ province: matchedProvince });
      }
    }

    this.showSuggestions.set(false);
    this.suggestions.set([]);
  }

  addrInvalid(field: string): boolean {
    const c = this.addrForm.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  submitAddress(): void {
    if (this.addrForm.invalid) { this.addrForm.markAllAsTouched(); return; }
    const p = this.state.profile();
    if (!p) return;

    const v = this.addrForm.value;
    this.addressSaving = true;
    this.addressApiError = '';

    if (this.addressForm.mode === 'add') {
      this.addressService.create(p.candidateId, {
        addressType: this.addressForm.type,
        line1: v.line1!, line2: v.line2 || undefined, city: v.city!,
        province: v.province!, postalCode: v.postalCode!, country: v.country || undefined
      }).subscribe({
        next: created => {
          this.addresses.update(list => [...list, created]);
          this.addressSaving = false;
          this.cancelAddressEdit();
          this.toast.show(`${created.addressType} address added.`, 'success');
        },
        error: (err: Error) => { this.addressSaving = false; this.addressApiError = err.message; }
      });
    } else {
      this.addressService.update(p.candidateId, this.addressForm.id!, {
        line1: v.line1!, line2: v.line2 || undefined, city: v.city!,
        province: v.province!, postalCode: v.postalCode!, country: v.country || undefined
      }).subscribe({
        next: updated => {
          this.addresses.update(list => list.map(a => a.addressId === updated.addressId ? updated : a));
          this.addressSaving = false;
          this.cancelAddressEdit();
          this.toast.show('Address updated.', 'success');
        },
        error: (err: Error) => { this.addressSaving = false; this.addressApiError = err.message; }
      });
    }
  }

  deleteAddress(a: AddressResponse): void {
    const p = this.state.profile();
    if (!p) return;
    if (!confirm(`Delete this ${a.addressType} address?`)) return;

    this.addressService.delete(p.candidateId, a.addressId).subscribe({
      next: () => {
        this.addresses.update(list => list.filter(x => x.addressId !== a.addressId));
        this.toast.show('Address removed.', 'success');
      },
      error: (err: Error) => this.toast.show(err.message, 'error')
    });
  }

  private notFutureDate(control: { value: string }) {
    if (!control.value) return null;
    return new Date(control.value) > new Date() ? { futureDate: true } : null;
  }

  isInvalid(field: string): boolean {
    const c = this.form.get(field);
    return !!c && c.invalid && (c.dirty || c.touched);
  }

  profileComplete(): boolean {
    const p = this.state.profile();
    if (!p) return false;
    return !!(p.phone && p.dateOfBirth && p.gender && p.nationality && p.race) && this.addresses().length > 0;
  }

  initials(): string {
    const p = this.state.profile();
    return p ? (p.firstName[0] + p.lastName[0]).toUpperCase() : '';
  }

  formatDate(d?: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  startEdit(): void {
    const p = this.state.profile()!;
    this.form.patchValue({
      phone: p.phone ?? '',
      gender: p.gender ?? '',
      race: p.race ?? '',
      nationality: p.nationality ?? '',
      dateOfBirth: p.dateOfBirth ? p.dateOfBirth.substring(0, 10) : ''
    });
    this.form.markAsPristine();
    this.isEdit = true;
    this.apiError = '';
  }

  cancelEdit(): void {
    if (this.form.dirty && !confirm('Discard unsaved changes?')) return;
    this.isEdit = false;
    this.apiError = '';
    this.form.reset();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.apiError = '';
    const v = this.form.value;
    const payload = {
      phone: v.phone || undefined,
      gender: v.gender || undefined,
      race: v.race || undefined,
      nationality: v.nationality || undefined,
      dateOfBirth: v.dateOfBirth ? new Date(v.dateOfBirth).toISOString() : undefined
    };

    const userId = this.auth.currentUser()!.userId;
    this.loading = true;

    if (this.isEdit) {
      this.candidateService.update(this.state.profile()!.candidateId, payload).subscribe({
        next: updated => {
          this.state.setProfile(updated);
          this.loading = false;
          this.isEdit = false;
          this.form.reset();
          this.toast.show('Profile updated.', 'success');
        },
        error: (err: Error) => { this.loading = false; this.apiError = err.message; }
      });
    } else {
      this.candidateService.create({ userId, ...payload }).subscribe({
        next: created => {
          this.state.setProfile(created);
          this.loading = false;
          this.form.reset();
          this.loadAddresses();
          this.toast.show(`Profile created — Candidate #${created.candidateId}`, 'success');
        },
        error: (err: Error) => { this.loading = false; this.apiError = err.message; }
      });
    }
  }
}