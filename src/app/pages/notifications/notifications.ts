import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsService } from '../../services/notifications.service';
import { TranslationService } from '../../i18n/translation.service';
import { TranslatePipe } from '../../i18n/translate.pipe';
import { NotificationType } from '../../models/notification.model';

const NOTIFICATION_ICONS: Record<NotificationType, string> = {
  payment_received: 'fa-solid fa-circle-check',
  student_registered: 'fa-solid fa-user-plus',
  student_at_risk: 'fa-solid fa-triangle-exclamation',
};

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './notifications.html',
  styleUrl: './notifications.css'
})
export class NotificationsComponent {
  private notificationsService = inject(NotificationsService);
  private i18n = inject(TranslationService);
  private t = (key: string, params?: Record<string, string | number>) => this.i18n.translate(key, params);

  notificationFilter = signal<string>('ALL');
  notifications = this.notificationsService.notifications;
  filteredNotifications = computed(() => {
    const filter = this.notificationFilter();
    const all = this.notifications();
    
    if (filter === 'UNREAD') return all.filter(n => !n.isRead);
    if (filter === 'PAYMENT') return all.filter(n => n.type === 'payment_received');
    if (filter === 'REGISTRATION') return all.filter(n => n.type === 'student_registered');
    if (filter === 'RISK') return all.filter(n => n.type === 'student_at_risk');
    return all;
  });

  constructor() {
    this.notificationsService.load();
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
}
