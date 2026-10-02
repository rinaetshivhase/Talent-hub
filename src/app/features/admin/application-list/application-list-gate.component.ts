import { Component, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ApplicationListComponent } from './application-list.component';
import { AdminApplicationListComponent } from './admin-application-list.component';

@Component({
  selector: 'app-application-list-gate',
  standalone: true,
  imports: [ApplicationListComponent, AdminApplicationListComponent],
  template: `
    @if (isAdmin()) { <app-admin-application-list /> } @else { <app-application-list /> }
  `
})
export class ApplicationListGateComponent {
  private auth = inject(AuthService);
  isAdmin(): boolean { return this.auth.currentUser()?.role === 'Admin'; }
}