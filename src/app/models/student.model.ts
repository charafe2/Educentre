export interface StudentEnrollment {
  classId: number;
  groupId: number | null;
  enrolledAt: string;
  status: 'active' | 'dropped' | 'graduated';
  /** Overrides the group's/class's own price for this one student — a
   *  discount the owner granted at enrollment. Null inherits as usual. */
  customPrice?: number | null;
}

export interface Student {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  birthDate: string;
  school: string;
  level: string;
  enrolledClassIds: number[];
  enrollments: StudentEnrollment[];
  paymentStatus: 'paid' | 'pending' | 'partial' | 'overdue';
  status: 'active' | 'inactive';
  avatarColor: string;
  parentName?: string;
  parentPhone?: string;
  parentWhatsapp?: string;
  absenceCount: number;
  totalSessions: number;
  createdAt: string;
}
