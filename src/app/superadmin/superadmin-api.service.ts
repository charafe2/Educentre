import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export interface SuperAdminInvoice {
  id: string;
  centre: string;
  city: string;
  packageName: string;
  amount: number;
  dueDate: string;
  status: 'paid' | 'pending' | 'late';
}

export interface PackageMixItem {
  name: string;
  centres: number;
  revenue: number;
  tone: string;
}

export interface SuperAdminOverview {
  invoices: SuperAdminInvoice[];
  packageMix: PackageMixItem[];
  summary: {
    totalRevenue: number;
    pendingAmount: number;
    lateAmount: number;
    paidCount: number;
  };
}

export interface ClientAccount {
  id: number;
  uuid: string;
  tenantUuid: string;
  centreName: string;
  centreType: string;
  city: string;
  ownerName: string;
  email: string;
  phone: string;
  plan: 'Basique' | 'Pro' | 'Enterprise';
  status: 'active' | 'suspended' | 'trial';
  createdAt: string;
  studentsCount: number;
}

export interface SaveClientPayload {
  centreName: string;
  centreType: string;
  city: string;
  ownerName: string;
  email: string;
  phone: string;
  password?: string;
  plan: ClientAccount['plan'];
}

export interface PackagePlan {
  id: number;
  uuid: string;
  name: string;
  monthlyPrice: number;
  usersLimit: number;
  studentsLimit: number;
  storageGb: number;
  supportLevel: 'Standard' | 'Prioritaire' | 'Dédié';
  status: 'active' | 'draft' | 'archived';
  features: string[];
}


export interface SuperAdminAccount {
  id: number;
  uuid: string;
  name: string;
  email: string;
  status: 'active' | 'suspended';
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SaveSuperAdminAccountPayload {
  name: string;
  email: string;
  password?: string;
  status: 'active' | 'suspended';
}

export interface CentreInvoice {
  id: number;
  uuid: string;
  invoiceNumber: string;
  centreId: number;
  centreName: string;
  city: string;
  packagePlanId: number | null;
  packageName: string;
  amount: number;
  issuedAt: string;
  dueDate: string;
  paidAt: string | null;
  status: 'pending' | 'paid' | 'late' | 'cancelled';
  notes: string | null;
}

export interface CreateCentreInvoicePayload {
  centreId: number;
  packagePlanId?: number | null;
  packageName: string;
  amount: number;
  issuedAt: string;
  dueDate: string;
  status: CentreInvoice['status'];
  paidAt?: string | null;
  notes?: string | null;
}

export interface Subject {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  color: string;
  bgColor: string;
  assignedCentresCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveSubjectPayload {
  name: string;
  status: Subject['status'];
  color?: string;
  bgColor?: string;
}

export interface AcademicLevel {
  id: number;
  name: string;
  status: 'active' | 'inactive';
  assignedCentresCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaveAcademicLevelPayload {
  name: string;
  status: AcademicLevel['status'];
}

@Injectable({ providedIn: 'root' })
export class SuperadminApiService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/v1/superadmin`;

  getOverview(): Promise<SuperAdminOverview> {
    return this.data(this.http.get<ApiResponse<SuperAdminOverview>>(`${this.baseUrl}/overview`));
  }

  getCentres(): Promise<ClientAccount[]> {
    return this.data(this.http.get<ApiResponse<ClientAccount[]>>(`${this.baseUrl}/centres`));
  }

  createCentre(payload: SaveClientPayload): Promise<ClientAccount> {
    return this.data(this.http.post<ApiResponse<ClientAccount>>(`${this.baseUrl}/centres`, payload));
  }

  updateCentre(id: number, payload: SaveClientPayload): Promise<ClientAccount> {
    return this.data(this.http.put<ApiResponse<ClientAccount>>(`${this.baseUrl}/centres/${id}`, payload));
  }

  toggleCentreStatus(id: number): Promise<ClientAccount> {
    return this.data(this.http.post<ApiResponse<ClientAccount>>(`${this.baseUrl}/centres/${id}/toggle-status`, {}));
  }

  deleteCentre(id: number): Promise<void> {
    return this.data(this.http.delete<ApiResponse<void>>(`${this.baseUrl}/centres/${id}`));
  }

  getPackages(): Promise<PackagePlan[]> {
    return this.data(this.http.get<ApiResponse<PackagePlan[]>>(`${this.baseUrl}/packages`));
  }

  createPackage(payload: Omit<PackagePlan, 'id' | 'uuid'>): Promise<PackagePlan> {
    return this.data(this.http.post<ApiResponse<PackagePlan>>(`${this.baseUrl}/packages`, payload));
  }

  updatePackage(id: number, payload: Omit<PackagePlan, 'id' | 'uuid'>): Promise<PackagePlan> {
    return this.data(this.http.put<ApiResponse<PackagePlan>>(`${this.baseUrl}/packages/${id}`, payload));
  }

  deletePackage(id: number): Promise<void> {
    return this.data(this.http.delete<ApiResponse<void>>(`${this.baseUrl}/packages/${id}`));
  }


  getAccounts(): Promise<SuperAdminAccount[]> {
    return this.data(this.http.get<ApiResponse<SuperAdminAccount[]>>(`${this.baseUrl}/accounts`));
  }

  createAccount(payload: SaveSuperAdminAccountPayload): Promise<SuperAdminAccount> {
    return this.data(this.http.post<ApiResponse<SuperAdminAccount>>(`${this.baseUrl}/accounts`, payload));
  }

  updateAccount(id: number, payload: SaveSuperAdminAccountPayload): Promise<SuperAdminAccount> {
    return this.data(this.http.put<ApiResponse<SuperAdminAccount>>(`${this.baseUrl}/accounts/${id}`, payload));
  }

  toggleAccountStatus(id: number): Promise<SuperAdminAccount> {
    return this.data(this.http.post<ApiResponse<SuperAdminAccount>>(`${this.baseUrl}/accounts/${id}/toggle-status`, {}));
  }

  deleteAccount(id: number): Promise<void> {
    return this.data(this.http.delete<ApiResponse<void>>(`${this.baseUrl}/accounts/${id}`));
  }

  getInvoices(): Promise<CentreInvoice[]> {
    return this.data(this.http.get<ApiResponse<CentreInvoice[]>>(`${this.baseUrl}/invoices`));
  }

  createInvoice(payload: CreateCentreInvoicePayload): Promise<CentreInvoice> {
    return this.data(this.http.post<ApiResponse<CentreInvoice>>(`${this.baseUrl}/invoices`, payload));
  }

  markInvoicePaid(id: number): Promise<CentreInvoice> {
    return this.data(this.http.post<ApiResponse<CentreInvoice>>(`${this.baseUrl}/invoices/${id}/mark-paid`, {}));
  }

  deleteInvoice(id: number): Promise<void> {
    return this.data(this.http.delete<ApiResponse<void>>(`${this.baseUrl}/invoices/${id}`));
  }

  getSubjects(search?: string, status?: 'active' | 'inactive'): Promise<Subject[]> {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (status) params['status'] = status;
    return this.data(this.http.get<ApiResponse<Subject[]>>(`${this.baseUrl}/subjects`, { params }));
  }

  createSubject(payload: SaveSubjectPayload): Promise<{ id: number }> {
    return this.data(this.http.post<ApiResponse<{ id: number }>>(`${this.baseUrl}/subjects`, payload));
  }

  updateSubject(id: number, payload: SaveSubjectPayload): Promise<null> {
    return this.data(this.http.put<ApiResponse<null>>(`${this.baseUrl}/subjects/${id}`, payload));
  }

  deleteSubject(id: number): Promise<void> {
    return this.data(this.http.delete<ApiResponse<void>>(`${this.baseUrl}/subjects/${id}`));
  }

  getCentreSubjects(centreId: number): Promise<number[]> {
    return this.data(
      this.http.get<ApiResponse<{ subjectIds: number[] }>>(`${this.baseUrl}/centres/${centreId}/subjects`)
    ).then(res => res.subjectIds);
  }

  syncCentreSubjects(centreId: number, subjectIds: number[]): Promise<number[]> {
    return this.data(
      this.http.put<ApiResponse<{ subjectIds: number[] }>>(`${this.baseUrl}/centres/${centreId}/subjects`, { subjectIds })
    ).then(res => res.subjectIds);
  }

  getAcademicLevels(search?: string, status?: 'active' | 'inactive'): Promise<AcademicLevel[]> {
    const params: Record<string, string> = {};
    if (search) params['search'] = search;
    if (status) params['status'] = status;
    return this.data(this.http.get<ApiResponse<AcademicLevel[]>>(`${this.baseUrl}/academic-levels`, { params }));
  }

  createAcademicLevel(payload: SaveAcademicLevelPayload): Promise<{ id: number }> {
    return this.data(this.http.post<ApiResponse<{ id: number }>>(`${this.baseUrl}/academic-levels`, payload));
  }

  updateAcademicLevel(id: number, payload: SaveAcademicLevelPayload): Promise<null> {
    return this.data(this.http.put<ApiResponse<null>>(`${this.baseUrl}/academic-levels/${id}`, payload));
  }

  deleteAcademicLevel(id: number): Promise<void> {
    return this.data(this.http.delete<ApiResponse<void>>(`${this.baseUrl}/academic-levels/${id}`));
  }

  getCentreAcademicLevels(centreId: number): Promise<number[]> {
    return this.data(
      this.http.get<ApiResponse<{ levelIds: number[] }>>(`${this.baseUrl}/centres/${centreId}/academic-levels`)
    ).then(res => res.levelIds);
  }

  syncCentreAcademicLevels(centreId: number, levelIds: number[]): Promise<number[]> {
    return this.data(
      this.http.put<ApiResponse<{ levelIds: number[] }>>(`${this.baseUrl}/centres/${centreId}/academic-levels`, { levelIds })
    ).then(res => res.levelIds);
  }

  private async data<T>(request: Observable<ApiResponse<T>>): Promise<T> {
    const response = await firstValueFrom(request);
    return response.data;
  }
}
