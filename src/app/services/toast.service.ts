import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  toast = signal<ToastMessage | null>(null);

  show(message: string, type: 'success' | 'error' | 'info' = 'success'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 3000);
  }
}
