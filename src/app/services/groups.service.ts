import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Group } from '../models/group.model';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

export const DEFAULT_CAPACITY = 2;

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private http = inject(HttpClient);

  groups = signal<Group[]>([]);

  constructor() {
    this.loadGroups();
  }

  loadGroups(): void {
    this.http.get<ApiResponse<Group[]>>(`${environment.apiUrl}/v1/groups`).subscribe(res => {
      if (res.success) {
        this.groups.set(res.data);
      }
    });
  }

  getGroupsForClasse(classeId: number): Group[] {
    return this.groups().filter(g => g.classeId === classeId).sort((a, b) => a.groupNumber - b.groupNumber);
  }

  getGroupForStudent(classeId: number, studentId: number): Group | undefined {
    return this.groups().find(g => g.classeId === classeId && g.studentIds.includes(studentId));
  }

  getClasseIdForGroup(groupId: number): number | undefined {
    return this.groups().find(g => g.id === groupId)?.classeId;
  }

  addStudent(classeId: number, studentId: number): void {
    const groups = this.getGroupsForClasse(classeId);
    if (groups.some(g => g.studentIds.includes(studentId))) return;
    const target = groups.find(g => g.studentIds.length < g.maxCapacity);
    if (target) {
      this.moveStudent(studentId, null, target.id).subscribe(() => this.loadGroups());
    } else {
      const nextGroupNumber = groups.length + 1;
      this.createGroup(classeId, nextGroupNumber, studentId).subscribe(() => this.loadGroups());
    }
  }

  moveStudent(studentId: number, fromGroupId: number | null, toGroupId: number): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${environment.apiUrl}/v1/groups/move-student`, { studentId, fromGroupId, toGroupId });
  }

  createGroup(classeId: number, groupNumber: number, studentId: number): Observable<ApiResponse<{id: number}>> {
    return this.http.post<ApiResponse<{id: number}>>(`${environment.apiUrl}/v1/groups`, {
      classeId, groupNumber, maxCapacity: DEFAULT_CAPACITY, studentIds: [studentId],
    });
  }

  updateCapacity(groupId: number, newCapacity: number): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${environment.apiUrl}/v1/groups/${groupId}/capacity`, { maxCapacity: newCapacity });
  }
}
