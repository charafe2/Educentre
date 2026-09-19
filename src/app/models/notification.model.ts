export type NotificationType = 'payment_received' | 'student_registered' | 'student_at_risk';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  message: string;
  relatedEntityType: string | null;
  relatedEntityId: number | null;
  isRead: boolean;
  createdAt: string;
}
