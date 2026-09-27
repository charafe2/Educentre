export const EXPENSE_CATEGORIES = [
  'Loyer', 'Électricité et eau', 'Internet et téléphone', 'Ménage',
  'Fournitures', 'Publicité', 'Maintenance', 'Autre',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface Expense {
  id: number;
  category: ExpenseCategory;
  label: string;
  amount: number;
  method: string | null;
  date: string; // 'YYYY-MM-DD'
  month: string; // 'YYYY-MM'
  recurring: boolean;
}
