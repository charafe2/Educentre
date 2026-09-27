import { Component, Input } from '@angular/core';
import { ReceiptCustomizationSettings } from '../../services/receipt-customization.service';
import { TeacherPayslipData } from '../../models/teacher-payslip.model';

@Component({
  selector: 'app-teacher-payslip-preview',
  standalone: true,
  templateUrl: './teacher-payslip-preview.component.html',
  styleUrl: './teacher-payslip-preview.component.css',
})
export class TeacherPayslipPreviewComponent {
  @Input({ required: true }) settings!: ReceiptCustomizationSettings;
  @Input({ required: true }) data!: TeacherPayslipData;

  get initials(): string {
    const name = this.settings?.centerName || 'Centre';
    return name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }

  amount(value: number): string {
    return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dhs`;
  }
}
