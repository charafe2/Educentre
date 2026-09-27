import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, firstValueFrom, of } from 'rxjs';
import { tap } from 'rxjs/operators';
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

  /** Same as loadGroups(), but awaitable — for callers that need the fresh list right after, e.g. finding a just-auto-created group. */
  async loadGroupsAsync(): Promise<Group[]> {
    const res = await firstValueFrom(this.http.get<ApiResponse<Group[]>>(`${environment.apiUrl}/v1/groups`));
    if (res.success) this.groups.set(res.data);
    return this.groups();
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

  addStudent(classeId: number, studentId: number): Observable<unknown> {
    const groups = this.getGroupsForClasse(classeId);
    if (groups.some(g => g.studentIds.includes(studentId))) return of(null);
    const target = groups.find(g => g.studentIds.length < g.maxCapacity);
    if (target) {
      return this.moveStudent(studentId, null, target.id).pipe(tap(() => this.loadGroups()));
    } else {
      return this.createGroup(classeId, studentId).pipe(tap(() => this.loadGroups()));
    }
  }

  moveStudent(studentId: number, fromGroupId: number | null, toGroupId: number): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${environment.apiUrl}/v1/groups/move-student`, { studentId, fromGroupId, toGroupId });
  }

  /** Un-groups a student without unenrolling them from the class. */
  removeStudentFromGroup(studentId: number, groupId: number): Observable<ApiResponse<null>> {
    return this.http.post<ApiResponse<null>>(`${environment.apiUrl}/v1/groups/remove-student`, { studentId, groupId }).pipe(tap(() => this.loadGroups()));
  }

  // The backend assigns the group number (highest + 1): a number derived from
  // this client's possibly stale list is what produced duplicate groups.
  createGroup(classeId: number, studentId: number): Observable<ApiResponse<{id: number}>> {
    return this.http.post<ApiResponse<{id: number}>>(`${environment.apiUrl}/v1/groups`, {
      classeId, maxCapacity: DEFAULT_CAPACITY, studentIds: [studentId],
    });
  }

  createEmptyGroup(classeId: number): Observable<ApiResponse<{id: number}>> {
    return this.http.post<ApiResponse<{id: number}>>(`${environment.apiUrl}/v1/groups`, {
      classeId, maxCapacity: DEFAULT_CAPACITY, studentIds: [],
    });
  }

  /** `overrides`: same per-group teacher/room/price overrides as `update()` — null clears back to the class's own value. */
  create(classeId: number, maxCapacity: number, overrides: Partial<Pick<Group, 'teacherId' | 'roomId' | 'monthlyPrice'>> = {}): Observable<ApiResponse<{id: number}>> {
    return this.http.post<ApiResponse<{id: number}>>(`${environment.apiUrl}/v1/groups`, {
      classeId, maxCapacity, studentIds: [],
      teacherId: overrides.teacherId, roomId: overrides.roomId, monthlyPrice: overrides.monthlyPrice,
    }).pipe(tap(() => this.loadGroups()));
  }

  updateCapacity(groupId: number, newCapacity: number): Observable<ApiResponse<null>> {
    return this.http.put<ApiResponse<null>>(`${environment.apiUrl}/v1/groups/${groupId}/capacity`, { maxCapacity: newCapacity });
  }

  update(groupId: number, data: Partial<Pick<Group, 'maxCapacity' | 'teacherId' | 'roomId' | 'monthlyPrice'>>): Observable<ApiResponse<Group>> {
    return this.http.put<ApiResponse<Group>>(`${environment.apiUrl}/v1/groups/${groupId}`, data).pipe(tap(() => this.loadGroups()));
  }

  delete(groupId: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(`${environment.apiUrl}/v1/groups/${groupId}`).pipe(tap(() => this.loadGroups()));
  }
}
