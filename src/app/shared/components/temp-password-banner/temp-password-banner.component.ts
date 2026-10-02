import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-temp-password-banner',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    @if (shouldShow()) {
      <div class="tpb">
        <i class="ti ti-alert-triangle"></i>
        <span>You're using a temporary password.</span>
        <a routerLink="/settings" class="tpb-link">Change it now</a>
        <button class="tpb-dismiss" (click)="dismissed.set(true)" title="Dismiss">
          <i class="ti ti-x"></i>
        </button>
      </div>
    }
  `,
  styles: [`
    .tpb {
      display: flex; align-items: center; gap: 10px; padding: 8px 20px;
      background: #fff3e0; color: #7a4a00; border-bottom: 1px solid #ffd699;
      font-size: 13px; font-weight: 500;
    }
    .tpb i:first-child { font-size: 16px; }
    .tpb-link { color: #7a4a00; font-weight: 700; text-decoration: underline; margin-left: 4px; }
    .tpb-dismiss { background: none; border: none; cursor: pointer; color: inherit; opacity: 0.6; margin-left: auto; padding: 2px; }
    .tpb-dismiss:hover { opacity: 1; }
  `]
})
export class TempPasswordBannerComponent {
  private auth = inject(AuthService);

  // Component instance lives in app.component.ts alongside the sidebar/topbar, so it
  // persists across route navigation - dismissing it "sticks" until a full page reload
  // or a fresh login, without needing any backend/localStorage state for the dismissal itself.
  dismissed = signal(false);

  shouldShow(): boolean {
    return !this.dismissed() && !!this.auth.currentUser()?.mustChangePassword;
  }
}