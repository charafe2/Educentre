import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Room } from '../models/room.model';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';

@Injectable({ providedIn: 'root' })
export class RoomsService {
  private http = inject(HttpClient);

  rooms = signal<Room[]>([]);

  constructor() {
    this.load();
  }

  load(): void {
    this.http.get<ApiResponse<Room[]>>(`${environment.apiUrl}/v1/rooms`).subscribe(res => {
      if (res.success) this.rooms.set(res.data);
    });
  }

  add(name: string, capacity?: number): Observable<ApiResponse<Room>> {
    return this.http.post<ApiResponse<Room>>(`${environment.apiUrl}/v1/rooms`, { name, capacity }).pipe(
      tap(() => this.load())
    );
  }

  getById(id: number): Room | undefined {
    return this.rooms().find(r => r.id === id);
  }
}
