import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../services/chat.service';
import { AuthStore } from '../../auth/auth.store';

@Component({
  selector: 'app-chat-widget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-widget.component.html',
  styleUrl: './chat-widget.component.css'
})
export class ChatWidgetComponent {
  chatService = inject(ChatService);
  authStore = inject(AuthStore);

  isOpen = signal(false);
  view = signal<'subject' | 'chat'>('chat');
  newMessage = '';
  subjectInput = '';
  startingConversation = false;

  currentUserId = this.authStore.user()?.uuid;

  constructor() {
    effect(() => {
      // Re-evaluate current user id if auth changes
      const user = this.authStore.user();
      if (user) {
        this.currentUserId = user.uuid || (user as any).id;
      }
    });
  }

  toggleChat() {
    const next = !this.isOpen();
    this.isOpen.set(next);
    if (next) {
      this.chatService.clearUnread();
      if (!this.chatService.activeConversation()) {
        this.initConversation();
      }
    }
  }

  isMe(msg: any): boolean {
    return msg.sender_type?.includes('User') && msg.sender_id === this.currentUserId;
  }

  initConversation() {
    this.chatService.loadConversations().subscribe(res => {
      if (res.success && res.data.length > 0) {
        // Load the latest conversation
        this.chatService.setActiveConversation(res.data[0]);
        this.view.set('chat');
      } else {
        // No conversation yet: ask what the tenant needs help with first
        this.view.set('subject');
      }
    });
  }

  submitSubject(event: Event) {
    event.preventDefault();
    if (!this.subjectInput.trim() || this.startingConversation) return;

    this.startingConversation = true;
    this.chatService.startConversation(this.subjectInput.trim()).subscribe({
      next: () => {
        this.startingConversation = false;
        this.view.set('chat');
      },
      error: () => {
        this.startingConversation = false;
      }
    });
  }

  sendMessage(event: Event) {
    event.preventDefault();
    if (!this.newMessage.trim()) return;

    const conv = this.chatService.activeConversation();
    if (conv) {
      this.chatService.sendMessage(conv.uuid, this.newMessage).subscribe(() => {
        this.newMessage = ''; // Clear input on success
      });
    }
  }
}
