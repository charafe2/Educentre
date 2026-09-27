export interface Group {
  id: number;
  classeId: number;
  groupNumber: number;
  studentIds: number[];
  maxCapacity: number;
  /** Per-group overrides of its class's own teacher/room/price — null means "inherits from its class". */
  teacherId: number | null;
  roomId: number | null;
  monthlyPrice: number | null;
}
