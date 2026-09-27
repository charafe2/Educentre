import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { Expense, ExpenseCategory } from '../models/expense.model';

export interface ExpensePayload {
  category: ExpenseCategory;
  label: string;
  amount: number;
  method?: string | null;
  date: string;
  recurring?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExpensesService {
  private http = inject(HttpClient);

  readonly expenses = signal<Expense[]>([]);

  constructor() {
    this.load();
  }

  /** Loads every expense once (small centre-scale data), same "?all"-style convention as Payments/Students. */
  load(): void {
    this.http.get<ApiResponse<Expense[]>>(`${environment.apiUrl}/v1/expenses`).subscribe(res => {
      if (res.success) this.expenses.set(res.data);
    });
  }

  add(data: ExpensePayload): Observable<ApiResponse<Expense>> {
    return this.http.post<ApiResponse<Expense>>(`${environment.apiUrl}/v1/expenses`, data).pipe(
      tap(() => this.load()),
    );
  }

  remove(id: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/expenses/${id}`).pipe(
      tap(() => this.load()),
    );
  }
}
