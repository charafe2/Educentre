import { Component, HostListener, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';

type NotificationItem = {
  id: number;
  name: string;
  initials: string;
  message: string;
  time: string;
  unread: boolean;
};

@Component({
  selector: 'app-topbar',
  imports: [RouterLink],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.css'
})
export class TopbarComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  isNotificationsOpen = false;
  isProfileOpen = false;

  notifications: NotificationItem[] = [
    {
      id: 1,
      name: 'Chris Thompson',
      initials: 'CT',
      message: 'requested review on PR #42: Feature implementation.',
      time: '15 minutes ago',
      unread: true,
    },
    {
      id: 2,
      name: 'Emma Davis',
      initials: 'ED',
      message: 'shared New component library.',
      time: '45 minutes ago',
      unread: true,
    },
    {
      id: 3,
      name: 'James Wilson',
      initials: 'JW',
      message: 'assigned you to API integration task.',
      time: '4 hours ago',
      unread: false,
    },
  ];

  get unreadCount(): number {
    return this.notifications.filter((notification) => notification.unread).length;
  }

  toggleNotifications(event: MouseEvent): void {
    event.stopPropagation();
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isProfileOpen = false;
  }

  toggleProfile(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileOpen = !this.isProfileOpen;
    this.isNotificationsOpen = false;
  }

  markAllAsRead(event: MouseEvent): void {
    event.stopPropagation();
    this.notifications = this.notifications.map((notification) => ({
      ...notification,
      unread: false,
    }));
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
    this.router.navigate(['/login']);
  }
}
