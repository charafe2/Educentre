export interface Classe {
  id: number;
  name: string;
  subject: string;
  level: string;
  teacherId: number | null;
  teacherName?: string;
  roomId: number;
  roomName?: string;
  maxCapacity: number;
  monthlyPrice: number;
  enrolledStudentIds: number[];
  status: 'active' | 'inactive';
  color: string;
  bgColor: string;
}
