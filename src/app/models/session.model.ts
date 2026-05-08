export interface Session {
  id: number;
  classeId: number;
  day: number; // 0=Mon..5=Sat
  startHour: number;
  endHour: number;
  isCancelled: boolean;
  cancelReason?: string;
}
