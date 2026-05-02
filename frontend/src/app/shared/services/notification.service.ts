import { Injectable } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { TenantService } from '../../core/services/tenant.service';
import { Observable } from 'rxjs';

export interface NotificationConfig {
  duration?: number;
  panelClass?: string[];
  horizontalPosition?: 'start' | 'center' | 'end' | 'left' | 'right';
  verticalPosition?: 'top' | 'bottom';
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly defaultConfig: NotificationConfig = {
    duration: 4000,
    horizontalPosition: 'right',
    verticalPosition: 'top',
    panelClass: []
  };

  constructor(
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router,
    private tenantService: TenantService
  ) {}

  success(message: string, config?: Partial<NotificationConfig>): void {
    this.show(message, 'success-snackbar', config);
  }

  error(message: string, config?: Partial<NotificationConfig>): void {
    this.show(message, 'error-snackbar', config);
  }

  warning(message: string, config?: Partial<NotificationConfig>): void {
    this.show(message, 'warning-snackbar', config);
  }

  info(message: string, config?: Partial<NotificationConfig>): void {
    this.show(message, 'info-snackbar', config);
  }

  private show(message: string, panelClass: string, config?: Partial<NotificationConfig>): void {
    const finalConfig = { ...this.defaultConfig, ...config };
    finalConfig.panelClass = [...(finalConfig.panelClass || []), panelClass];

    this.snackBar.open(message, 'Close', finalConfig);
  }

  // For persistent notifications that require user action
  persistent(message: string, action?: string): Observable<any> {
    return this.snackBar.open(message, action || 'Close', {
      duration: 0,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['persistent-snackbar']
    }).afterOpened();
  }

  // For real-time notifications (like new student enrolled)
  realtime(message: string, config?: Partial<NotificationConfig>): void {
    const realtimeConfig = {
      ...this.defaultConfig,
      ...config,
      panelClass: [...(config?.panelClass || []), 'realtime-snackbar'],
      duration: 6000 // Longer duration for real-time notifications
    };

    this.snackBar.open(message, 'View', realtimeConfig)
      .onAction()
      .subscribe(() => {
        // Navigate to relevant page based on notification type
        this.handleRealtimeAction(message);
      });
  }

  private handleRealtimeAction(message: string): void {
    // Parse message to determine navigation using tenant-aware routing
    const tenant = this.tenantService.currentTenant?.subdomain;
    
    if (message.toLowerCase().includes('student')) {
      // Navigate to students
      const studentUrl = tenant ? `/${tenant}/students` : '/students';
      this.router.navigate([studentUrl]);
    } else if (message.toLowerCase().includes('payment')) {
      // Navigate to finance
      const financeUrl = tenant ? `/${tenant}/finance` : '/finance';
      this.router.navigate([financeUrl]);
    } else if (message.toLowerCase().includes('session')) {
      // Navigate to planning
      const planningUrl = tenant ? `/${tenant}/planning` : '/planning';
      this.router.navigate([planningUrl]);
    }
  }
}
