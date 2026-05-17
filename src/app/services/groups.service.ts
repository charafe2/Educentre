import { Injectable, signal } from '@angular/core';
import { Group } from '../models/group.model';

export const DEFAULT_CAPACITY = 2;

@Injectable({ providedIn: 'root' })
export class GroupsService {
  private nextId = signal(7);

  // One group per existing classe, seeded from real enrolled students
  groups = signal<Group[]>([
    { id: 1, classeId: 1, groupNumber: 1, studentIds: [1, 4, 7], maxCapacity: DEFAULT_CAPACITY },
    { id: 2, classeId: 2, groupNumber: 1, studentIds: [1, 2, 4, 7], maxCapacity: DEFAULT_CAPACITY },
    { id: 3, classeId: 3, groupNumber: 1, studentIds: [2, 6, 8], maxCapacity: DEFAULT_CAPACITY },
    { id: 4, classeId: 4, groupNumber: 1, studentIds: [5], maxCapacity: DEFAULT_CAPACITY },
    { id: 5, classeId: 5, groupNumber: 1, studentIds: [3, 6], maxCapacity: DEFAULT_CAPACITY },
    { id: 6, classeId: 6, groupNumber: 1, studentIds: [3], maxCapacity: DEFAULT_CAPACITY },
  ]);

  getGroupsForClasse(classeId: number): Group[] {
    return this.groups().filter(g => g.classeId === classeId).sort((a, b) => a.groupNumber - b.groupNumber);
  }

  getGroupForStudent(classeId: number, studentId: number): Group | undefined {
    return this.groups().find(g => g.classeId === classeId && g.studentIds.includes(studentId));
  }

  // Called when enrolling a student in a class — auto-places in first group with space.
  addStudent(classeId: number, studentId: number): void {
    const groups = this.getGroupsForClasse(classeId);

    // Avoid duplicates
    if (groups.some(g => g.studentIds.includes(studentId))) return;

    const target = groups.find(g => g.studentIds.length < g.maxCapacity);

    if (target) {
      this.groups.update(list =>
        list.map(g => g.id === target.id ? { ...g, studentIds: [...g.studentIds, studentId] } : g)
      );
    } else {
      // All groups full — create a new overflow group
      const nextGroupNumber = groups.length + 1;
      const newId = this.nextId();
      this.groups.update(list => [...list, {
        id: newId,
        classeId,
        groupNumber: nextGroupNumber,
        studentIds: [studentId],
        maxCapacity: DEFAULT_CAPACITY,
      }]);
      this.nextId.update(n => n + 1);
    }
  }

  // Called when unenrolling a student from a class
  removeStudent(classeId: number, studentId: number): void {
    this.groups.update(list =>
      list
        .map(g => g.classeId === classeId
          ? { ...g, studentIds: g.studentIds.filter(id => id !== studentId) }
          : g
        )
        // Clean up empty overflow groups (keep at least group 1)
        .filter(g => g.classeId !== classeId || g.groupNumber === 1 || g.studentIds.length > 0)
    );
  }

  getClasseIdForGroup(groupId: number): number | undefined {
    return this.groups().find(g => g.id === groupId)?.classeId;
  }

  // Drag & drop between groups — validates capacity
  moveStudent(studentId: number, fromGroupId: number, toGroupId: number): 'ok' | 'full' | 'same' {
    if (fromGroupId === toGroupId) return 'same';

    const toGroup = this.groups().find(g => g.id === toGroupId);
    if (!toGroup) return 'same';
    if (toGroup.studentIds.length >= toGroup.maxCapacity) return 'full';

    this.groups.update(list =>
      list.map(g => {
        if (g.id === fromGroupId) return { ...g, studentIds: g.studentIds.filter(id => id !== studentId) };
        if (g.id === toGroupId) return { ...g, studentIds: [...g.studentIds, studentId] };
        return g;
      })
    );
    return 'ok';
  }

  // Force-move a student to a full group, ignoring capacity
  forceAddToGroup(studentId: number, fromGroupId: number, toGroupId: number): void {
    this.groups.update(list =>
      list.map(g => {
        if (g.id === fromGroupId) return { ...g, studentIds: g.studentIds.filter(id => id !== studentId) };
        if (g.id === toGroupId) return { ...g, studentIds: [...g.studentIds, studentId] };
        return g;
      })
    );
  }

  // Create a brand-new group for the class and move the student into it
  createGroupAndMove(studentId: number, fromGroupId: number, classeId: number): void {
    const groups = this.getGroupsForClasse(classeId);
    const nextGroupNumber = groups.length + 1;
    const newId = this.nextId();
    this.groups.update(list => [
      ...list.map(g => g.id === fromGroupId
        ? { ...g, studentIds: g.studentIds.filter(id => id !== studentId) }
        : g
      ),
      { id: newId, classeId, groupNumber: nextGroupNumber, studentIds: [studentId], maxCapacity: DEFAULT_CAPACITY },
    ]);
    this.nextId.update(n => n + 1);
  }

  updateCapacity(groupId: number, newCapacity: number): void {
    if (newCapacity < 1) return;
    this.groups.update(list =>
      list.map(g => g.id === groupId ? { ...g, maxCapacity: newCapacity } : g)
    );
  }

  // Ensure a classe has at least one group (called when a new classe is created)
  ensureGroupExists(classeId: number): void {
    if (!this.groups().some(g => g.classeId === classeId)) {
      const newId = this.nextId();
      this.groups.update(list => [...list, { id: newId, classeId, groupNumber: 1, studentIds: [], maxCapacity: DEFAULT_CAPACITY }]);
      this.nextId.update(n => n + 1);
    }
  }
}
