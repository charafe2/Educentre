export interface Student {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  school: string;
  level: string;
  enrolledClassIds: number[];
  paymentStatus: 'paid' | 'pending' | 'overdue';
  status: 'active' | 'inactive';
  avatarColor: string;
  parentName?: string;
  parentPhone?: string;
  parentWhatsapp?: string;
  createdAt: string;
}
