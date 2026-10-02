import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="toast-container" aria-live="polite">
      @for (t of toast.toasts(); track t.id) {
        <div class="toast toast-{{ t.type }}" role="alert">
          @if (t.type === 'success') { <i class="ti ti-circle-check"></i> }
          @if (t.type === 'error')   { <i class="ti ti-alert-circle"></i> }
          @if (t.type === 'warn')    { <i class="ti ti-alert-triangle"></i> }
          <span style="flex:1">{{ t.message }}</span>
          <button class="toast-close" (click)="toast.dismiss(t.id)" aria-label="Dismiss">
            <i class="ti ti-x" style="font-size:14px"></i>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  toast = inject(ToastService);
}
