import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthStore } from '../../auth/auth.store';
import { NotificationsService } from '../../services/notifications.service';
import { AppNotification, NotificationType } from '../../models/notification.model';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { TranslationService } from '../../i18n/translation.service';
import { LanguageSwitcherComponent } from '../../i18n/language-switcher/language-switcher.component';

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  payment_received: 'fa-solid fa-circle-check',
  student_registered: 'fa-solid fa-user-plus',
  student_at_risk: 'fa-solid fa-triangle-exclamation',
};

@Component({
  selector: 'app-topbar',
  imports: [RouterLink, TranslatePipe, LanguageSwitcherComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent {
  private router = inject(Router);
  auth = inject(AuthStore);
  private i18n = inject(TranslationService);
  private t = (key: string, params?: Record<string, string | number>) => this.i18n.translate(key, params);
  notificationsService = inject(NotificationsService);

  isNotificationsOpen = false;
  isProfileOpen = false;

  notifications = this.notificationsService.notifications;
  unreadCount = this.notificationsService.unreadCount;
  loading = this.notificationsService.loading;

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isProfileOpen = false;
    if (this.isNotificationsOpen) {
      this.notificationsService.load();
    }
  }

  toggleProfile(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileOpen = !this.isProfileOpen;
    this.isNotificationsOpen = false;
  }

  markAllAsRead(event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsService.markAllAsRead().subscribe();
  }

  onNotificationClick(notification: AppNotification, event: MouseEvent): void {
    event.stopPropagation();

    if (!notification.isRead) {
      this.notificationsService.markAsRead(notification.id).subscribe();
    }

    this.isNotificationsOpen = false;

    if (notification.relatedEntityType === 'student') {
      this.router.navigate(['/etudiants']);
    }
  }

  deleteNotification(notification: AppNotification, event: MouseEvent): void {
    event.stopPropagation();
    this.notificationsService.delete(notification.id).subscribe();
  }

  iconFor(type: NotificationType): string {
    return NOTIFICATION_ICONS[type] ?? 'fa-regular fa-bell';
  }

  timeAgo(createdAt: string): string {
    const seconds = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);

    if (seconds < 60) return this.t('topbar.justNow');
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return this.t('topbar.minutesAgo', { count: minutes });
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return this.t('topbar.hoursAgo', { count: hours });
    const days = Math.floor(hours / 24);
    if (days === 1) return this.t('topbar.yesterday');
    if (days < 7) return this.t('topbar.daysAgo', { count: days });

    return new Date(createdAt).toLocaleDateString();
  }

  @HostListener('document:click')
  closeMenus(): void {
    this.isNotificationsOpen = false;
    this.isProfileOpen = false;
  }

  async logout(event: MouseEvent): Promise<void> {
    event.stopPropagation();
    await this.auth.logout();
    this.isProfileOpen = false;
    // Hard reload (not router.navigate) so every app-root singleton service
    // (student/teacher/payment caches, etc.) is torn down — an SPA-only nav
    // would let the next login on this tab inherit this tenant's cached data.
    window.location.href = '/login';
  }
}
