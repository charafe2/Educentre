export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
export interface Attendance {
  id: number;
  sessionId: number;
  studentId: number;
  attendedOn?: string;
  status: AttendanceStatus;
  note?: string;
}
