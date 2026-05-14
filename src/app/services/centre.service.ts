import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

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
  private http = inject(HttpClient);
  private _loading = signal(false);

  centreInfo = signal<CentreInfo>({
    name: '',
    type: '',
    city: '',
    address: '',
    phone: '',
    whatsapp: '',
  });

  loading = this._loading.asReadonly();

  async load(): Promise<void> {
    this._loading.set(true);
    try {
      const result = await firstValueFrom(
        this.http.get<{ success: boolean; data: CentreInfo }>(
          `${environment.apiUrl}/v1/settings/centre`
        )
      );
      if (result.success) {
        this.centreInfo.set(result.data);
      }
    } catch {
      // Keep defaults on error
    } finally {
      this._loading.set(false);
    }
  }

  async update(data: Partial<CentreInfo>): Promise<void> {
    await firstValueFrom(
      this.http.put<{ success: boolean; data: CentreInfo }>(
        `${environment.apiUrl}/v1/settings/centre`,
        data
      )
    );
    this.centreInfo.update(info => ({ ...info, ...data }));
  }
}
