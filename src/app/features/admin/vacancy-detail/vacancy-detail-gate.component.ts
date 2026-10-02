import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { VacancyAdminDetailComponent } from './vacancy-admin-detail.component';
import { AdminVacancyDetailComponent } from './admin-vacancy-detail.component';

@Component({
  selector: 'app-vacancy-detail-gate',
  standalone: true,
  imports: [VacancyAdminDetailComponent, AdminVacancyDetailComponent],
  template: `
    @if (isAdmin()) { <app-admin-vacancy-detail /> } @else { <app-vacancy-admin-detail /> }
  `
})
export class VacancyDetailGateComponent {
  private auth = inject(AuthService);
  isAdmin(): boolean { return this.auth.currentUser()?.role === 'Admin'; }
}