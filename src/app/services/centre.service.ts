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

export interface SubscriptionInfo {
  plan: string;
  monthlyPrice: number;
  status: 'active' | 'suspended' | 'expired' | 'cancelled';
  startDate: string | null;
  endDate: string | null;
  usersLimit: number | null;
  studentsLimit: number | null;
  storageGb: number | null;
  supportLevel: string | null;
  features: string[];
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

  subscription = signal<SubscriptionInfo | null>(null);
  subscriptionLoading = signal(false);
  /** Distinguishes "not fetched yet" from "fetched, tenant has none" for the template. */
  subscriptionError = signal(false);

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

  async loadSubscription(): Promise<void> {
    this.subscriptionLoading.set(true);
    this.subscriptionError.set(false);
    try {
      const result = await firstValueFrom(
        this.http.get<{ success: boolean; data: SubscriptionInfo }>(
          `${environment.apiUrl}/v1/settings/subscription`
        )
      );
      this.subscription.set(result.success ? result.data : null);
    } catch {
      this.subscription.set(null);
      this.subscriptionError.set(true);
    } finally {
      this.subscriptionLoading.set(false);
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

  async sendSupportRequest(subject: string, message: string): Promise<void> {
    await firstValueFrom(
      this.http.post<{ success: boolean; message: string }>(
        `${environment.apiUrl}/v1/settings/support-request`,
        { subject, message }
      )
    );
  }
}
