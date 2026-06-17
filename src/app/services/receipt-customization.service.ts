import { Injectable, signal } from '@angular/core';
import { Classe } from '../models/classe.model';
import { Document } from '../models/document.model';
import { Payment } from '../models/payment.model';
import { Student } from '../models/student.model';

export interface ReceiptCustomizationSettings {
  logoDataUrl: string;
  centerName: string;
  accentColor: string;
  address: string;
  phone: string;
  footerNote: string;
}

export interface ReceiptPreviewData {
  receiptNumber: string;
  dateTime: string;
  centerName: string;
  address: string;
  phone: string;
  parentName: string;
  studentName: string;
  levelGroup: string;
  designation: string;
  period: string;
  amount: number;
  paymentMethod: string;
  status: string;
  receivedBy: string;
  reference: string;
}

const STORAGE_KEY = 'moujtahid_receipt_customization_v1';

export const DEFAULT_RECEIPT_SETTINGS: ReceiptCustomizationSettings = {
  logoDataUrl: '',
  centerName: 'Centre Excel Mathématiques',
  accentColor: '#078c78',
  address: '123, Rue des Écoles, Maarif, Casablanca, Maroc',
  phone: '06 12 34 56 78',
  footerNote: 'Merci pour votre confiance.',
};

export const SAMPLE_RECEIPT_DATA: ReceiptPreviewData = {
  receiptNumber: 'RCP-2026-000125',
  dateTime: '12 Juin 2026 à 11:32',
  centerName: DEFAULT_RECEIPT_SETTINGS.centerName,
  address: DEFAULT_RECEIPT_SETTINGS.address,
  phone: DEFAULT_RECEIPT_SETTINGS.phone,
  parentName: 'Adam Alaoui',
  studentName: 'Youssef Alaoui',
  levelGroup: '3ème Collège',
  designation: 'Frais de scolarité',
  period: 'Mai 2026',
  amount: 300,
  paymentMethod: 'Espèces',
  status: 'Payé',
  receivedBy: 'Youssef El Mansouri',
  reference: 'RCP-2026-000125',
};

@Injectable({ providedIn: 'root' })
export class ReceiptCustomizationService {
  settings = signal<ReceiptCustomizationSettings>(this.loadSettings());

  save(settings: ReceiptCustomizationSettings): void {
    const normalized = this.normalize(settings);
    this.settings.set(normalized);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }

  reset(): ReceiptCustomizationSettings {
    this.save(DEFAULT_RECEIPT_SETTINGS);
    return { ...DEFAULT_RECEIPT_SETTINGS };
  }

  sampleData(settings = this.settings()): ReceiptPreviewData {
    return {
      ...SAMPLE_RECEIPT_DATA,
      centerName: settings.centerName || DEFAULT_RECEIPT_SETTINGS.centerName,
      address: settings.address || '',
      phone: settings.phone || '',
    };
  }

  fromDocument(doc: Document, student?: Student, classe?: Classe, payment?: Payment): ReceiptPreviewData {
    const settings = this.settings();
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'Étudiant';
    const parentName = student?.parentName || 'Parent';
    const levelGroup = classe ? `${classe.level} · ${classe.name}` : student?.level || 'Niveau non renseigné';
    const receiptNumber = doc.invoiceNumber.replace('FAC', 'RCP');

    return {
      receiptNumber,
      dateTime: this.formatDateTime(payment?.paidAt || doc.generatedAt),
      centerName: settings.centerName,
      address: settings.address,
      phone: settings.phone,
      parentName,
      studentName,
      levelGroup,
      designation: 'Frais de scolarité',
      period: this.formatPeriod(doc.periodMonth),
      amount: doc.amount,
      paymentMethod: payment?.method || 'Espèces',
      status: payment?.status === 'paid' || this.isReceiptType(doc.type) ? 'Payé' : 'En attente',
      receivedBy: 'Youssef El Mansouri',
      reference: receiptNumber,
    };
  }

  async downloadReceipt(data: ReceiptPreviewData, settings = this.settings()): Promise<void> {
    const receiptImage = await this.renderReceiptImage(data, settings);
    const pdf = this.buildPdf(receiptImage);
    const pdfBuffer = pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer;
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.reference || data.receiptNumber}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private loadSettings(): ReceiptCustomizationSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_RECEIPT_SETTINGS };
      return this.normalize({ ...DEFAULT_RECEIPT_SETTINGS, ...JSON.parse(raw) });
    } catch {
      return { ...DEFAULT_RECEIPT_SETTINGS };
    }
  }

  private normalize(settings: ReceiptCustomizationSettings): ReceiptCustomizationSettings {
    return {
      logoDataUrl: settings.logoDataUrl || '',
      centerName: settings.centerName?.trim() || DEFAULT_RECEIPT_SETTINGS.centerName,
      accentColor: settings.accentColor || DEFAULT_RECEIPT_SETTINGS.accentColor,
      address: settings.address?.trim() || '',
      phone: settings.phone?.trim() || '',
      footerNote: settings.footerNote?.trim() || DEFAULT_RECEIPT_SETTINGS.footerNote,
    };
  }

  private formatPeriod(period: string): string {
    const [year, month] = period.split('-');
    const date = new Date(Number(year), Number(month) - 1, 1);
    if (Number.isNaN(date.getTime())) return period;
    return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
      .format(date)
      .replace(/^\w/, c => c.toUpperCase());
  }

  private isReceiptType(type: Document['type']): boolean {
    const value = type as string;
    return value === 'Reçu' || value === 'ReÃ§u';
  }

  private formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date).replace(',', ' à');
  }

  private buildReceiptHtml(data: ReceiptPreviewData, settings: ReceiptCustomizationSettings): string {
    const accent = settings.accentColor;
    const logo = settings.logoDataUrl
      ? `<img class="logo-img" src="${settings.logoDataUrl}" alt="">`
      : `<div class="logo-mark">${this.escape(settings.centerName.slice(0, 2).toUpperCase())}</div>`;

    return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>${this.escape(data.receiptNumber)}</title>
<style>${this.receiptCss(accent)}</style>
</head>
<body>
${this.receiptMarkup(data, settings, logo)}
<script>window.addEventListener('load', () => setTimeout(() => window.print(), 350));</script>
</body>
</html>`;
  }

  private async renderReceiptImage(data: ReceiptPreviewData, settings: ReceiptCustomizationSettings): Promise<string> {
    const width = 1600;
    const height = 1131;
    const accent = settings.accentColor;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas rendering is not available.');

    const ink = '#081333';
    const muted = '#53637c';
    const border = '#dbe4ee';
    const softAccent = this.mixColor(accent, '#ffffff', 0.88);
    const softerAccent = this.mixColor(accent, '#ffffff', 0.94);
    const logoImage = settings.logoDataUrl ? await this.safeLoadImage(settings.logoDataUrl) : null;

    ctx.fillStyle = '#f4f7fb';
    ctx.fillRect(0, 0, width, height);
    this.drawRoundRect(ctx, 72, 52, 1456, 1026, 26, '#ffffff', '#dfe7ef');

    if (logoImage) {
      this.drawRoundRect(ctx, 130, 112, 74, 74, 18, '#ffffff');
      ctx.save();
      this.clipRoundRect(ctx, 130, 112, 74, 74, 18);
      ctx.drawImage(logoImage, 130, 112, 74, 74);
      ctx.restore();
    } else {
      this.drawRoundRect(ctx, 130, 112, 74, 74, 18, accent);
      this.drawText(ctx, settings.centerName.slice(0, 2).toUpperCase(), 167, 158, {
        align: 'center',
        color: '#ffffff',
        font: '800 27px Arial',
      });
    }

    this.drawText(ctx, settings.centerName, 230, 138, { color: ink, font: '800 42px Arial' });
    this.drawText(ctx, 'Gestion intelligente de centre de soutien', 230, 184, { color: muted, font: '25px Arial' });
    this.drawText(ctx, 'REÇU DE PAIEMENT', 1455, 134, { align: 'right', color: ink, font: '800 35px Arial' });
    this.drawText(ctx, `N° ${data.receiptNumber}`, 1455, 178, { align: 'right', color: accent, font: '700 25px Arial' });
    this.drawText(ctx, data.dateTime, 1455, 220, { align: 'right', color: muted, font: '23px Arial' });

    this.drawLine(ctx, 122, 260, 1478, 260, border);

    this.drawCircle(ctx, 170, 354, 50, softAccent);
    this.drawText(ctx, '⌂', 170, 372, { align: 'center', color: accent, font: '42px Arial' });
    this.drawText(ctx, 'Centre', 260, 333, { color: accent, font: '800 23px Arial' });
    this.drawText(ctx, data.centerName, 260, 373, { color: ink, font: '800 27px Arial' });
    this.wrapText(ctx, data.address || 'Adresse non renseignée', 260, 414, 430, 28, { color: muted, font: '22px Arial' });
    this.drawText(ctx, data.phone || 'Téléphone non renseigné', 260, 488, { color: muted, font: '22px Arial' });

    this.drawLine(ctx, 806, 304, 806, 486, border);
    this.drawCircle(ctx, 914, 354, 50, softAccent);
    this.drawText(ctx, '○', 914, 372, { align: 'center', color: accent, font: '46px Arial' });
    this.drawText(ctx, 'Reçu de', 1004, 333, { color: accent, font: '800 23px Arial' });
    this.drawText(ctx, data.parentName, 1004, 373, { color: ink, font: '800 27px Arial' });
    this.drawText(ctx, `Parent de ${data.studentName}`, 1004, 419, { color: muted, font: '22px Arial' });
    this.drawText(ctx, data.levelGroup, 1004, 468, { color: muted, font: '22px Arial' });

    this.drawRoundRect(ctx, 122, 528, 1356, 248, 12, '#ffffff', border);
    ctx.fillStyle = softerAccent;
    ctx.fillRect(123, 529, 1354, 66);
    this.drawText(ctx, 'DÉSIGNATION', 158, 574, { color: accent, font: '800 21px Arial' });
    this.drawText(ctx, 'PÉRIODE / RÉFÉRENCE', 825, 574, { color: accent, font: '800 21px Arial' });
    this.drawText(ctx, 'MONTANT', 1428, 574, { align: 'right', color: accent, font: '800 21px Arial' });
    this.drawLine(ctx, 122, 596, 1478, 596, border);

    this.drawCircle(ctx, 190, 656, 32, softAccent);
    this.drawText(ctx, '▯', 190, 668, { align: 'center', color: accent, font: '31px Arial' });
    this.drawText(ctx, data.designation, 250, 648, { color: ink, font: '800 24px Arial' });
    this.drawText(ctx, `${data.studentName} · ${data.levelGroup}`, 250, 684, { color: muted, font: '20px Arial' });
    this.drawText(ctx, data.period, 825, 648, { color: ink, font: '24px Arial' });
    this.drawText(ctx, `Réf : INV-${data.reference}`, 825, 684, { color: muted, font: '20px Arial' });
    this.drawText(ctx, this.formatAmount(data.amount), 1428, 668, { align: 'right', color: ink, font: '800 25px Arial' });

    this.drawLine(ctx, 158, 720, 1478, 720, '#e6edf4', [8, 8]);
    this.drawText(ctx, 'TOTAL PAYÉ', 158, 770, { color: accent, font: '800 24px Arial' });
    this.drawText(ctx, this.formatAmount(data.amount), 1428, 770, { align: 'right', color: accent, font: '800 35px Arial' });

    const summary = [
      ['MODE DE PAIEMENT', data.paymentMethod],
      ['STATUT', data.status],
      ['REÇU PAR', data.receivedBy],
      ['RÉFÉRENCE', data.reference],
    ];
    summary.forEach(([label, value], index) => {
      const x = 135 + index * 350;
      this.drawCircle(ctx, x + 33, 856, 36, softAccent);
      this.drawText(ctx, ['▣', '✓', '▤', '#'][index], x + 33, 870, { align: 'center', color: accent, font: '30px Arial' });
      this.drawText(ctx, label, x + 90, 840, { color: accent, font: '800 18px Arial' });
      if (label === 'STATUT') {
        this.drawRoundRect(ctx, x + 90, 858, 72, 32, 7, softAccent, accent);
        this.drawText(ctx, value, x + 126, 881, { align: 'center', color: accent, font: '18px Arial' });
      } else {
        this.drawText(ctx, value, x + 90, 886, { color: ink, font: '22px Arial' });
      }
      if (index < 3) this.drawLine(ctx, x + 315, 818, x + 315, 896, border);
    });

    this.drawLine(ctx, 122, 932, 1478, 932, border);
    this.drawRoundRect(ctx, 122, 976, 500, 74, 10, softerAccent, this.mixColor(accent, '#ffffff', 0.76));
    this.drawText(ctx, '✓', 170, 1022, { align: 'center', color: accent, font: '34px Arial' });
    this.drawText(ctx, settings.footerNote, 220, 1006, { color: '#33415d', font: '21px Arial' });
    this.drawText(ctx, 'Ce reçu est une preuve de paiement.', 220, 1036, { color: '#33415d', font: '21px Arial' });
    this.drawText(ctx, 'SIGNATURE ET CACHET DU CENTRE', 1120, 990, { align: 'center', color: accent, font: '800 18px Arial' });
    this.drawText(ctx, 'Signature', 1120, 1044, { align: 'center', color: ink, font: '44px "Brush Script MT", cursive' });

    return canvas.toDataURL('image/jpeg', 0.94);
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Unable to render the receipt PDF.'));
      image.src = src;
    });
  }

  private async safeLoadImage(src: string): Promise<HTMLImageElement | null> {
    try {
      return await this.loadImage(src);
    } catch {
      return null;
    }
  }

  private drawRoundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: string,
    stroke?: string,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  private clipRoundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.clip();
  }

  private drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fill: string): void {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  private drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, dash: number[] = []): void {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash(dash);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  }

  private drawText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    options: { align?: CanvasTextAlign; color?: string; font?: string } = {},
  ): void {
    ctx.fillStyle = options.color || '#081333';
    ctx.font = options.font || '20px Arial';
    ctx.textAlign = options.align || 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y);
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    options: { color?: string; font?: string } = {},
  ): void {
    ctx.fillStyle = options.color || '#081333';
    ctx.font = options.font || '20px Arial';
    ctx.textAlign = 'left';
    const words = text.split(' ');
    let line = '';
    words.forEach(word => {
      const testLine = line ? `${line} ${word}` : word;
      if (ctx.measureText(testLine).width > maxWidth && line) {
        ctx.fillText(line, x, y);
        line = word;
        y += lineHeight;
      } else {
        line = testLine;
      }
    });
    if (line) ctx.fillText(line, x, y);
  }

  private mixColor(color: string, target: string, targetAmount: number): string {
    const from = this.hexToRgb(color);
    const to = this.hexToRgb(target);
    return `rgb(${Math.round(from.r * (1 - targetAmount) + to.r * targetAmount)}, ${Math.round(from.g * (1 - targetAmount) + to.g * targetAmount)}, ${Math.round(from.b * (1 - targetAmount) + to.b * targetAmount)})`;
  }

  private hexToRgb(color: string): { r: number; g: number; b: number } {
    const normalized = color.replace('#', '').trim();
    const full = normalized.length === 3
      ? normalized.split('').map(char => `${char}${char}`).join('')
      : normalized.padEnd(6, '0').slice(0, 6);
    return {
      r: parseInt(full.slice(0, 2), 16) || 0,
      g: parseInt(full.slice(2, 4), 16) || 0,
      b: parseInt(full.slice(4, 6), 16) || 0,
    };
  }

  private buildPdf(jpegDataUrl: string): Uint8Array {
    const pageWidth = 841.89;
    const pageHeight = 595.28;
    const imageWidth = 1600;
    const imageHeight = 1131;
    const imageBinary = atob(jpegDataUrl.split(',')[1] ?? '');
    const objects: string[] = [];

    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    objects.push(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBinary.length} >>\nstream\n${imageBinary}\nendstream`);
    const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ`;
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach(offset => {
      pdf += `${offset.toString().padStart(10, '0')} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

    const bytes = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i += 1) {
      bytes[i] = pdf.charCodeAt(i) & 0xff;
    }
    return bytes;
  }

  private receiptMarkup(data: ReceiptPreviewData, settings: ReceiptCustomizationSettings, logo: string): string {
    return `
<main class="receipt">
  <header class="receipt-head">
    <div class="brand">${logo}<div><h1>${this.escape(settings.centerName)}</h1><p>Gestion intelligente de centre de soutien</p></div></div>
    <div class="doc-title"><h2>REÇU DE PAIEMENT</h2><strong>N° ${this.escape(data.receiptNumber)}</strong><span>${this.escape(data.dateTime)}</span></div>
  </header>
  <section class="info-grid">
    <div class="info-block"><div class="icon">⌂</div><div><b>Centre</b><h3>${this.escape(data.centerName)}</h3><p>${this.escape(data.address || 'Adresse non renseignée')}</p><p>${this.escape(data.phone || 'Téléphone non renseigné')}</p></div></div>
    <div class="info-block"><div class="icon">◎</div><div><b>Reçu de</b><h3>${this.escape(data.parentName)}</h3><p>Parent de ${this.escape(data.studentName)}</p><p>${this.escape(data.levelGroup)}</p></div></div>
  </section>
  <section class="payment-table">
    <div class="table-head"><span>DÉSIGNATION</span><span>PÉRIODE / RÉFÉRENCE</span><span>MONTANT</span></div>
    <div class="table-row"><span><b>${this.escape(data.designation)}</b><small>${this.escape(data.studentName)} · ${this.escape(data.levelGroup)}</small></span><span><b>${this.escape(data.period)}</b><small>Réf : INV-${this.escape(data.reference)}</small></span><strong>${this.formatAmount(data.amount)}</strong></div>
    <div class="total-row"><span>TOTAL PAYÉ</span><strong>${this.formatAmount(data.amount)}</strong></div>
  </section>
  <section class="summary">
    <div><b>MODE DE PAIEMENT</b><span>${this.escape(data.paymentMethod)}</span></div>
    <div><b>STATUT</b><span class="paid">${this.escape(data.status)}</span></div>
    <div><b>REÇU PAR</b><span>${this.escape(data.receivedBy)}</span></div>
    <div><b>RÉFÉRENCE</b><span>${this.escape(data.reference)}</span></div>
  </section>
  <footer class="receipt-foot">
    <div class="note"><strong>${this.escape(settings.footerNote)}</strong><span>Ce reçu est une preuve de paiement.</span></div>
    <div class="signature"><b>SIGNATURE ET CACHET DU CENTRE</b><span>Signature</span></div>
  </footer>
</main>`;
  }

  private receiptCss(accent: string): string {
    return `
@page { size: A4 landscape; margin: 12mm; }
* { box-sizing: border-box; }
body { margin: 0; background: #f4f7fb; color: #081333; font-family: Inter, Arial, sans-serif; }
.receipt { width: 100%; min-height: calc(100vh - 24mm); margin: 0 auto; padding: 34px 42px; border: 1px solid #dfe7ef; border-radius: 22px; background: #fff; box-shadow: 0 24px 70px rgba(15, 23, 42, .08); }
.receipt-head { display: flex; justify-content: space-between; gap: 32px; padding-bottom: 26px; border-bottom: 1px solid #dbe4ee; }
.brand { display: flex; align-items: center; gap: 18px; }
.logo-img, .logo-mark { width: 58px; height: 58px; border-radius: 16px; object-fit: cover; }
.logo-mark { display: grid; place-items: center; background: ${accent}; color: #fff; font-weight: 800; }
h1 { margin: 0; font-size: 30px; } p { margin: 0; color: #53637c; line-height: 1.5; }
.doc-title { text-align: right; } .doc-title h2 { margin: 0 0 8px; letter-spacing: .03em; font-size: 25px; } .doc-title strong { display: block; color: ${accent}; font-size: 18px; } .doc-title span { display: block; margin-top: 10px; color: #53637c; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 42px; padding: 30px 0; }
.info-block { display: flex; gap: 18px; align-items: flex-start; } .info-block + .info-block { border-left: 1px solid #dbe4ee; padding-left: 42px; }
.icon { display: grid; place-items: center; width: 70px; height: 70px; border-radius: 50%; background: color-mix(in srgb, ${accent} 12%, white); color: ${accent}; font-size: 28px; }
b { color: ${accent}; font-size: 13px; letter-spacing: .02em; } h3 { margin: 8px 0 10px; font-size: 18px; }
.payment-table { border: 1px solid #dbe4ee; border-radius: 13px; overflow: hidden; }
.table-head, .table-row, .total-row { display: grid; grid-template-columns: 1.3fr 1fr .55fr; align-items: center; padding: 16px 24px; }
.table-head { background: color-mix(in srgb, ${accent} 7%, white); color: ${accent}; font-weight: 800; font-size: 13px; }
.table-row { border-top: 1px solid #e6edf4; } .table-row small { display: block; margin-top: 6px; color: #53637c; } .table-row strong { text-align: right; }
.total-row { border-top: 1px dashed #dbe4ee; } .total-row span { color: ${accent}; font-weight: 800; } .total-row strong { grid-column: 3; text-align: right; color: ${accent}; font-size: 24px; }
.summary { display: grid; grid-template-columns: repeat(4,1fr); gap: 18px; padding: 28px 0; border-bottom: 1px solid #dbe4ee; }
.summary div { display: grid; gap: 8px; border-right: 1px solid #e3e9f0; } .summary div:last-child { border-right: 0; }
.summary span { color: #081333; } .paid { width: fit-content; padding: 4px 11px; border: 1px solid ${accent}; border-radius: 8px; background: color-mix(in srgb, ${accent} 12%, white); color: ${accent} !important; }
.receipt-foot { display: flex; justify-content: space-between; align-items: center; gap: 32px; padding-top: 28px; }
.note { min-width: 360px; padding: 18px 22px; border: 1px solid color-mix(in srgb, ${accent} 18%, white); border-radius: 10px; background: color-mix(in srgb, ${accent} 5%, white); }
.note strong, .note span { display: block; color: #33415d; margin-top: 4px; }
.signature { min-width: 300px; text-align: center; } .signature span { display: block; margin-top: 22px; color: #081333; font-family: cursive; font-size: 34px; }
`;
  }

  private formatAmount(amount: number): string {
    return `${amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Dhs`;
  }

  private escape(value: string): string {
    return value.replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    }[char] ?? char));
  }
}
