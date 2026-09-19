import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RealtimeService } from '../../services/realtime.service';

export interface Ticket {
  id: number;
  uuid: string;
  tenant_id: number;
  user_id: number;
  agent_id: number | null;
  subject?: string;
  status: string;
  internal_notes?: string;
  updated_at: string;
  created_at?: string;
  unread_count?: number;
  user?: any;
  agent?: any;
  /** Eager-loaded by the ticket index so the list can show a preview line. */
  latest_message?: { content: string; created_at: string } | null;
}

export interface Message {
  id: number;
  uuid: string;
  conversation_id: string;
  sender_type: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: any;
}

export interface Toast {
  id: number;
  title: string;
  message: string;
  type: 'new-ticket' | 'new-message';
  ticketUuid?: string;
}

@Injectable({ providedIn: 'root' })
export class SuperadminTicketService {
  private http = inject(HttpClient);
  private realtime = inject(RealtimeService);

  tickets = signal<Ticket[]>([]);
  activeTicket = signal<Ticket | null>(null);
  messages = signal<Message[]>([]);
  toasts = signal<Toast[]>([]);

  private currentTicketChannel: any = null;
  private globalTicketsChannel: any = null;
  private toastCounter = 0;

  loadTickets(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/v1/superadmin/tickets`).pipe(
      tap(res => {
        if (res.success) {
          this.tickets.set(res.data.data);
        }
      })
    );
  }

  setActiveTicket(ticket: Ticket) {
    this.activeTicket.set(ticket);
    this.messages.set([]);
    this.loadMessages(ticket.uuid).subscribe();
    this.listenToTicket(ticket.uuid);

    this.tickets.update(list => list.map(t => t.uuid === ticket.uuid ? { ...t, unread_count: 0 } : t));
  }

  loadMessages(uuid: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/v1/superadmin/tickets/${uuid}/messages`).pipe(
      tap(res => {
        if (res.success) {
          this.messages.set(res.data);
        }
      })
    );
  }

  sendMessage(uuid: string, content: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/v1/superadmin/tickets/${uuid}/messages`, { content }).pipe(
      tap(res => {
        if (res.success) {
          this.messages.update(msgs => [...msgs, res.data]);
        }
      })
    );
  }

  claimTicket(uuid: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/v1/superadmin/tickets/${uuid}/claim`, {}).pipe(
      tap(res => {
        if (res.success) {
          this.activeTicket.set(res.data);
          this.tickets.update(list => list.map(t => t.uuid === uuid ? res.data : t));
        }
      })
    );
  }

  closeTicket(uuid: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/v1/superadmin/tickets/${uuid}/close`, {}).pipe(
      tap(res => {
        if (res.success) {
          this.activeTicket.set(res.data);
          this.tickets.update(list => list.map(t => t.uuid === uuid ? res.data : t));
        }
      })
    );
  }

  updateStatus(uuid: string, status: string): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/v1/superadmin/tickets/${uuid}/status`, { status }).pipe(
      tap(res => {
        if (res.success) {
          this.activeTicket.set(res.data);
          this.tickets.update(list => list.map(t => t.uuid === uuid ? { ...t, status: res.data.status } : t));
        }
      })
    );
  }

  updateNotes(uuid: string, notes: string): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/v1/superadmin/tickets/${uuid}/notes`, { notes }).pipe(
      tap(res => {
        if (res.success) {
          this.activeTicket.set(res.data);
          this.tickets.update(list => list.map(t => t.uuid === uuid ? { ...t, internal_notes: res.data.internal_notes } : t));
        }
      })
    );
  }

  assignTo(uuid: string, agentId: number): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/v1/superadmin/tickets/${uuid}/assign`, { agent_id: agentId }).pipe(
      tap(res => {
        if (res.success) {
          this.activeTicket.set(res.data);
          this.tickets.update(list => list.map(t => t.uuid === uuid ? res.data : t));
        }
      })
    );
  }

  getSuperadmins(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/v1/superadmin/superadmins`);
  }

  // ── Toast management ──
  pushToast(title: string, message: string, type: Toast['type'], ticketUuid?: string) {
    const id = ++this.toastCounter;
    this.toasts.update(list => [...list, { id, title, message, type, ticketUuid }]);

    // Auto-dismiss after 6 seconds
    setTimeout(() => this.dismissToast(id), 6000);
  }

  dismissToast(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  // ── Real-time listeners ──
  listenToGlobalTickets() {
    if (this.globalTicketsChannel || !this.realtime.echo) return;

    this.globalTicketsChannel = this.realtime.echo.private('superadmin.tickets');

    // Listen for brand new tickets
    this.globalTicketsChannel.listen('.ticket.created', (event: any) => {
      const newTicket: Ticket = {
        id: event.id,
        uuid: event.uuid,
        tenant_id: 0,
        user_id: 0,
        agent_id: null,
        status: event.status,
        subject: event.subject,
        updated_at: event.updated_at,
        created_at: event.created_at,
        unread_count: 0,
        user: event.user,
      };

      // Add to top of list
      this.tickets.update(list => {
        const exists = list.find(t => t.uuid === event.uuid);
        if (exists) return list;
        return [newTicket, ...list];
      });

      // Show toast
      this.pushToast(
        'Nouveau ticket',
        `${event.user?.name || 'Un utilisateur'} de ${event.user?.tenant?.name || 'un centre'} a ouvert un ticket.`,
        'new-ticket',
        event.uuid
      );
    });

    // Listen for new messages on existing tickets
    this.globalTicketsChannel.listen('.message.sent', (event: any) => {
      this.tickets.update(list => {
        const ticketIndex = list.findIndex(t => t.uuid === event.conversation_id);
        if (ticketIndex > -1) {
          const newList = [...list];
          if (this.activeTicket()?.uuid !== event.conversation_id && event.sender_type?.includes('User')) {
            newList[ticketIndex] = { ...newList[ticketIndex], unread_count: (newList[ticketIndex].unread_count || 0) + 1 };

            // Show toast for new message
            this.pushToast(
              'Nouveau message',
              `Message de ${newList[ticketIndex].user?.name || 'un client'}`,
              'new-message',
              event.conversation_id
            );
          }
          // Keep the inbox preview line in step with what just arrived.
          newList[ticketIndex] = {
            ...newList[ticketIndex],
            updated_at: event.created_at,
            latest_message: { content: event.content, created_at: event.created_at },
          };

          // Move to top
          const ticket = newList.splice(ticketIndex, 1)[0];
          newList.unshift(ticket);
          return newList;
        } else {
          this.loadTickets().subscribe();
          return list;
        }
      });
    });
  }

  private listenToTicket(uuid: string) {
    if (this.currentTicketChannel) {
      this.realtime.echo?.leave(this.currentTicketChannel.name);
    }

    if (this.realtime.echo) {
      this.currentTicketChannel = this.realtime.echo.private(`chat.${uuid}`);
      this.currentTicketChannel.listen('.message.sent', (event: any) => {
        this.messages.update(msgs => {
          const exists = msgs.find(m => m.uuid === event.uuid);
          if (exists) return msgs;
          return [...msgs, event];
        });
      });
    }
  }
}
