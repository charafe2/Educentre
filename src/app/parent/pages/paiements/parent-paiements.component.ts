import { Component, inject, computed } from '@angular/core';
import { ParentAuthService } from '../../parent-auth.service';
import { PaymentsService } from '../../../services/payments.service';
import { ClassesService } from '../../../services/classes.service';

@Component({
  selector: 'app-parent-paiements',
  standalone: true,
  imports: [],
  templateUrl: './parent-paiements.component.html',
  styleUrl: './parent-paiements.component.css'
})
export class ParentPaiementsComponent {
  private auth = inject(ParentAuthService);
  private paymentsService = inject(PaymentsService);
  private classesService = inject(ClassesService);

  payments = computed(() => {
    const s = this.auth.currentStudent();
    return s
      ? this.paymentsService.getByStudent(s.id)
          .sort((a, b) => b.periodMonth.localeCompare(a.periodMonth))
      : [];
  });

  totals = computed(() => {
    const ps = this.payments();
    return {
      paid:    ps.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0),
      pending: ps.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0),
      overdue: ps.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0),
    };
  });

  getClassName(classeId: number): string {
    return this.classesService.getById(classeId)?.name ?? '—';
  }

  formatMonth(periodMonth: string): string {
    return new Date(periodMonth + '-01').toLocaleDateString('fr-MA', { month: 'long', year: 'numeric' });
  }

  methodLabel(method?: string): string {
    if (!method) return '—';
    return method;
  }

  paymentLabel(status: string): string {
    const map: Record<string, string> = { paid: 'Payé', pending: 'En attente', overdue: 'Impayé' };
    return map[status] ?? status;
  }
}
