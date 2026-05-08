export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export interface Attendance {
  id: number;
  sessionId: number;
  studentId: number;
  status: AttendanceStatus;
  note?: string;
}
