export type PaymentIssueStatus = 'pending' | 'overdue';

export interface StudentAttritionRiskReport {
  rule: {
    lookbackDays: number;
    absenceThreshold: number;
    requiredPaymentStatuses: PaymentIssueStatus[];
    conditionsOperator: 'and';
  };
  students: StudentAttritionRisk[];
}

export interface StudentAttritionRisk {
  studentUuid: string;
  studentName: string;
  studentCode: string;
  parentPhone: string | null;
  absenceRate: number;
  absenceCount: number;
  attendanceCount: number;
  lookbackDays: number;
  windowStart: string;
  windowEnd: string;
  paymentIssue: {
    status: PaymentIssueStatus;
    periodMonth: string;
    amount: number;
    issueCount: number;
  };
  reasons: string[];
}
