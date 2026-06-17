import { Component, Input } from '@angular/core';
import { ReceiptCustomizationSettings, ReceiptPreviewData } from '../../services/receipt-customization.service';

@Component({
  selector: 'app-receipt-preview',
  standalone: true,
  templateUrl: './receipt-preview.component.html',
  styleUrl: './receipt-preview.component.css',
})
export class ReceiptPreviewComponent {
  @Input({ required: true }) settings!: ReceiptCustomizationSettings;
  @Input({ required: true }) data!: ReceiptPreviewData;
  @Input() compact = false;

  get initials(): string {
    const name = this.settings?.centerName || this.data?.centerName || 'Centre';
    return name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  }

  amount(value: number): string {
    return `${value.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dhs`;
  }
}
