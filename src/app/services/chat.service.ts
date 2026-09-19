import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { RealtimeService } from './realtime.service';

export interface Message {
  id: number;
  uuid: string;
  conversation_id: string;
  sender_id: string;
  sender_type?: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: any;
}

export interface Conversation {
  id: number;
  uuid: string;
  tenant_id: number;
  user_id: number;
  agent_id: number | null;
  status: string;
  subject?: string;
  updated_at: string;
  user?: any;
  agent?: any;
}

@Injectable({ providedIn: 'root' })
export class ChatService {
  private http = inject(HttpClient);
  private realtime = inject(RealtimeService);

  conversations = signal<Conversation[]>([]);
  activeConversation = signal<Conversation | null>(null);
  messages = signal<Message[]>([]);
  unreadCount = signal<number>(0);

  private currentChannel: any = null;

  loadConversations(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/v1/conversations`).pipe(
      tap(res => {
        if (res.success) {
          this.conversations.set(res.data);
        }
      })
    );
  }

  startConversation(subject: string): Observable<any> {
    return this.http.post<any>(`${environment.apiUrl}/v1/conversations`, { subject }).pipe(
      tap(res => {
        if (res.success) {
          this.conversations.update(list => [res.data, ...list]);
          this.setActiveConversation(res.data);
        }
      })
    );
  }

  setActiveConversation(conversation: Conversation) {
    this.activeConversation.set(conversation);
    this.messages.set([]);
    this.loadMessages(conversation.uuid).subscribe();
    this.listenToConversation(conversation.uuid);
  }

  loadMessages(uuid: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/v1/conversations/${uuid}/messages`).pipe(
      tap(res => {
        if (res.success) {
          this.messages.set(res.data);
        }
      })
    );
  }

  sendMessage(conversationUuid: string, content: string): Observable<any> {
    // Optimistic update could go here, but for simplicity we rely on the API response
    return this.http.post<any>(`${environment.apiUrl}/v1/conversations/${conversationUuid}/messages`, { content }).pipe(
      tap(res => {
        if (res.success) {
          this.messages.update(msgs => [...msgs, res.data]);
        }
      })
    );
  }

  private listenToConversation(uuid: string) {
    if (this.currentChannel) {
      this.realtime.echo?.leave(this.currentChannel.name);
    }

    if (this.realtime.echo) {
      this.currentChannel = this.realtime.echo.private(`chat.${uuid}`);
      this.currentChannel.listen('.message.sent', (event: any) => {
        // Prevent duplicate messages if the sender is the current user
        // (as sendMessage already updates the list)
        this.messages.update(msgs => {
          const exists = msgs.find(m => m.uuid === event.uuid);
          if (exists) return msgs;
          return [...msgs, event];
        });
        this.unreadCount.update(n => n + 1);
      });
    }
  }

  clearUnread() {
    this.unreadCount.set(0);
  }
}
