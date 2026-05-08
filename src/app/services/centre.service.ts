import { Injectable, signal } from '@angular/core';

export interface CentreInfo {
  name: string;
  type: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
}

@Injectable({ providedIn: 'root' })
export class CentreService {
  centreInfo = signal<CentreInfo>({
    name: 'Centre Éducatif Al Moujtahid',
    type: 'Soutien scolaire',
    city: 'Casablanca',
    address: '12 Rue Al Qods, Hay Mohammadi',
    phone: '+212 522 123 456',
    whatsapp: '+212 661 234 567',
  });

  update(data: Partial<CentreInfo>): void {
    this.centreInfo.update(info => ({ ...info, ...data }));
  }
}
