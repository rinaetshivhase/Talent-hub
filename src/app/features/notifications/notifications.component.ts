import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NotificationService } from '../../core/services/notification.service';
import { NotificationResponse } from '../../core/models';

const TYPE_ICON: Record<string, string> = {
  InterviewScheduled: 'ti-calendar-event',
  InterviewRescheduled: 'ti-calendar-repeat',
  InterviewCancelled: 'ti-calendar-x',
  StatusChanged: 'ti-arrows-shuffle',
  DocumentMissing: 'ti-file-alert',
  PrescreeningSent: 'ti-clipboard-list',
  PrescreeningSubmitted: 'ti-clipboard-check',
  OfferSent: 'ti-mail',
  OfferResponded: 'ti-mail-opened',
  General: 'ti-bell',
};

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="page-container">
      <div class="page-header">
        <div>
          <h2 class="page-title"><i class="ti ti-bell"></i> Notifications</h2>
          <p class="page-sub">
            {{ notifications().length }} total
            @if (unreadCount() > 0) {
              · {{ unreadCount() }} unread
            }
          </p>
        </div>
        @if (unreadCount() > 0) {
          <button
            mat-stroked-button
            style="border-radius:8px"
            [disabled]="markingAll()"
            (click)="markAllAsRead()"
          >
            @if (markingAll()) {
              <mat-spinner
                diameter="16"
                style="display:inline-block;margin-right:6px"
              ></mat-spinner>
            }
            <i class="ti ti-checks"></i> Mark all as read
          </button>
        }
      </div>

      @if (apiError) {
        <div class="api-error" style="margin-bottom:14px">
          <i class="ti ti-alert-circle"></i> {{ apiError }}
        </div>
      }

      @if (loading()) {
        <div class="empty-state"><mat-spinner diameter="32"></mat-spinner></div>
      } @else if (!notifications().length) {
        <div class="empty-state">
          <i class="ti ti-bell-off"></i>
          <p>No notifications yet.</p>
        </div>
      } @else {
        <div style="display:flex;flex-direction:column;gap:10px">
          @for (n of notifications(); track n.notificationId) {
            <mat-card
              class="mat-elevation-z1"
              style="border-radius:12px"
              [style.borderLeft]="n.isRead ? 'none' : '4px solid var(--navy)'"
            >
              <mat-card-content
                style="padding:16px 20px;display:flex;gap:14px;align-items:flex-start"
              >
                <div
                  class="app-icon-wrap"
                  [style.background]="
                    n.isRead ? 'var(--surface-2)' : 'var(--blue-bg)'
                  "
                  [style.color]="n.isRead ? 'var(--text-muted)' : 'var(--blue)'"
                  style="flex-shrink:0"
                >
                  <i class="ti {{ typeIcon(n.notificationType) }}"></i>
                </div>
                <div style="flex:1;min-width:0">
                  <div
                    style="display:flex;align-items:center;gap:8px;justify-content:space-between"
                  >
                    <div
                      style="font-size:13px"
                      [style.fontWeight]="n.isRead ? 500 : 700"
                    >
                      {{ n.subject }}
                    </div>
                    <div
                      style="font-size:11px;color:var(--text-muted);white-space:nowrap"
                    >
                      {{ formatDate(n.sentAt) }}
                    </div>
                  </div>
                  <div
                    style="font-size:12px;color:var(--text-muted);margin-top:4px;line-height:1.5"
                  >
                    {{ n.body }}
                  </div>
                  @if (!n.isRead) {
                    <button
                      mat-button
                      style="margin-top:8px;font-size:11px;padding:0;min-width:0;color:var(--navy)"
                      (click)="markAsRead(n)"
                    >
                      <i class="ti ti-check" style="margin-right:4px"></i> Mark
                      as read
                    </button>
                  }
                </div>
              </mat-card-content>
            </mat-card>
          }
        </div>
      }
    </div>
  `,
})
export class NotificationsComponent implements OnInit {
  private notificationService = inject(NotificationService);

  notifications = signal<NotificationResponse[]>([]);
  loading = signal(true);
  markingAll = signal(false);
  apiError = '';

  unreadCount = () => this.notifications().filter((n) => !n.isRead).length;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.notificationService.getAll().subscribe({
      next: (n) => {
        this.notifications.set(n);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.apiError = err.message;
        this.loading.set(false);
      },
    });
  }

  typeIcon(type: string): string {
    return TYPE_ICON[type] ?? 'ti-bell';
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  markAsRead(n: NotificationResponse): void {
    this.notificationService.markAsRead(n.notificationId).subscribe({
      next: () => {
        this.notifications.update((list) =>
          list.map((x) =>
            x.notificationId === n.notificationId ? { ...x, isRead: true } : x,
          ),
        );
      },
      error: (err: Error) => (this.apiError = err.message),
    });
  }

  markAllAsRead(): void {
    this.markingAll.set(true);
    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.markingAll.set(false);
        this.notifications.update((list) =>
          list.map((x) => ({ ...x, isRead: true })),
        );
      },
      error: (err: Error) => {
        this.markingAll.set(false);
        this.apiError = err.message;
      },
    });
  }
}
