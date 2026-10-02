import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { CandidateStateService } from '../../../core/services/candidate-state.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar">
      <div class="nav-brand">
        <span class="brand-icon"><i class="ti ti-briefcase"></i></span>
        <span class="brand-name">RMS <span class="brand-sub">Candidate Portal</span></span>
      </div>
      <div class="nav-links">
        <a routerLink="/dashboard" routerLinkActive="active" class="nav-link"><i class="ti ti-home"></i> Dashboard</a>
        <a routerLink="/profile" routerLinkActive="active" class="nav-link"><i class="ti ti-user"></i> Profile</a>
        <a routerLink="/documents" routerLinkActive="active" class="nav-link"><i class="ti ti-file-upload"></i> Documents</a>
        <a routerLink="/vacancies" routerLinkActive="active" class="nav-link"><i class="ti ti-building"></i> Vacancies</a>
        <a routerLink="/applications" routerLinkActive="active" class="nav-link"><i class="ti ti-chart-arrows-vertical"></i> My applications</a>
      </div>
      <div class="nav-user">
        <span class="user-chip">
          <span class="user-avatar">{{ initials() }}</span>
          <span class="user-name">{{ userName() }}</span>
        </span>
        <button class="btn-logout" (click)="logout()"><i class="ti ti-logout"></i> Sign out</button>
      </div>
    </nav>
  `
})
export class NavbarComponent {
  private auth = inject(AuthService);
  private state = inject(CandidateStateService);
  private router = inject(Router);

  userName = () => { const u = this.auth.currentUser(); return u ? `${u.firstName} ${u.lastName}` : ''; };
  initials = () => { const u = this.auth.currentUser(); return u ? (u.firstName[0] + u.lastName[0]).toUpperCase() : ''; };

  logout(): void {
    this.auth.logout();
    this.state.clear();
    this.router.navigate(['/login']);
  }
}
