import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { VacancyListComponent } from './vacancy-list.component';
import { AdminVacancyListComponent } from './admin-vacancy-list.component';

@Component({
  selector: 'app-vacancy-list-gate',
  standalone: true,
  imports: [VacancyListComponent, AdminVacancyListComponent],
  template: `
    @if (isAdmin()) { <app-admin-vacancy-list /> } @else { <app-vacancy-list /> }
  `
})
export class VacancyListGateComponent {
  private auth = inject(AuthService);
  isAdmin(): boolean { return this.auth.currentUser()?.role === 'Admin'; }
}