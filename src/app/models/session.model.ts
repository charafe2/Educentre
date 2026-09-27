export interface Session {
  id: number;
  classeId: number;
  /** Null when the whole class (every group) meets at this slot. */
  groupId: number | null;
  day: number; // 0=Mon..5=Sat
  startHour: number;
  endHour: number;
  isCancelled: boolean;
  cancelReason?: string;
}
