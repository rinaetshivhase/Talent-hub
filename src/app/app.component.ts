import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { TopbarComponent } from './shared/components/topbar/topbar.component';
import { ToastComponent } from './shared/components/toast/toast.component';
import { TempPasswordBannerComponent } from './shared/components/temp-password-banner/temp-password-banner.component';
import { AuthService } from './core/services/auth.service';
import { CandidateStateService } from './core/services/candidate-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, TopbarComponent, ToastComponent, TempPasswordBannerComponent],
  template: `
    @if (auth.isLoggedIn()) {
      <div class="app-shell">
        <app-sidebar [collapsed]="sidebarCollapsed()" (toggleSidebar)="toggleSidebar()" />
        <div class="app-main" [class.sidebar-collapsed]="sidebarCollapsed()">
          <app-topbar [sidebarCollapsed]="sidebarCollapsed()" (toggleSidebar)="toggleSidebar()" />
          <app-temp-password-banner />
          <div class="app-content">
            <router-outlet />
          </div>
        </div>
      </div>
    } @else {
      <router-outlet />
    }
    <app-toast />
  `
})
export class AppComponent implements OnInit {
  auth = inject(AuthService);
  private state = inject(CandidateStateService);
  sidebarCollapsed = signal(false);

  ngOnInit(): void {
    if (this.auth.isLoggedIn()) {
      this.state.loadMyProfile().subscribe();
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(v => !v);
  }
}