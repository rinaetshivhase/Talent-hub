import { Injectable, signal } from '@angular/core';

export interface Toast { id: string; message: string; type: 'success' | 'error' | 'warn'; }

@Injectable({ providedIn: 'root' })
export class ToastService {
  toasts = signal<Toast[]>([]);

  show(message: string, type: Toast['type'] = 'success'): void {
    const id = Date.now().toString();
    this.toasts.update(t => [...t, { id, message, type }]);
    setTimeout(() => this.dismiss(id), 5000);
  }

  dismiss(id: string): void {
    this.toasts.update(t => t.filter(x => x.id !== id));
  }
}
