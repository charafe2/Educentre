import { Component, inject, OnInit, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SuperadminTicketService } from '../../services/superadmin-ticket.service';
import { SuperadminAuthStore } from '../../superadmin-auth.store';

@Component({
  selector: 'app-tickets',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './tickets.component.html',
  styleUrls: ['./tickets.component.css']
})
export class TicketsComponent implements OnInit, AfterViewChecked {
  ticketService = inject(SuperadminTicketService);
  authStore = inject(SuperadminAuthStore);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  newMessage = '';
  filterStatus = 'all';
  private shouldScrollToBottom = false;

  superadmins: any[] = [];
  showSummaryModal = false;
  selectedSummaryTicket: any = null;
  editedNotes = '';

  ngOnInit() {
    this.ticketService.loadTickets().subscribe();
    this.ticketService.listenToGlobalTickets();
    this.ticketService.getSuperadmins().subscribe(res => {
      if (res.success) {
        this.superadmins = res.data;
      }
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  selectTicket(ticket: any) {
    this.ticketService.setActiveTicket(ticket);
    this.editedNotes = ticket.internal_notes || '';
    this.shouldScrollToBottom = true;
  }

  onDoubleClickTicket(ticket: any) {
    this.selectedSummaryTicket = ticket;
    this.showSummaryModal = true;
  }

  isMe(msg: any): boolean {
    return msg.sender_type?.includes('SuperAdmin');
  }

  sendMessage(event: Event) {
    event.preventDefault();
    const active = this.ticketService.activeTicket();
    if (!this.newMessage.trim() || !active) return;

    this.ticketService.sendMessage(active.uuid, this.newMessage).subscribe(() => {
      this.newMessage = '';
      this.shouldScrollToBottom = true;
    });
  }

  claimTicket() {
    const active = this.ticketService.activeTicket();
    if (active) {
      this.ticketService.claimTicket(active.uuid).subscribe();
    }
  }

  assignTicket(agentId: number) {
    const active = this.ticketService.activeTicket();
    if (active) {
      this.ticketService.assignTo(active.uuid, agentId).subscribe();
    }
  }

  updateStatus(status: string) {
    const active = this.ticketService.activeTicket();
    if (active) {
      this.ticketService.updateStatus(active.uuid, status).subscribe();
    }
  }

  saveNotes() {
    const active = this.ticketService.activeTicket();
    if (active) {
      this.ticketService.updateNotes(active.uuid, this.editedNotes).subscribe();
    }
  }

  closeTicket() {
    this.updateStatus('closed');
  }

  getInitials(name: string | undefined): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  getFilteredTickets() {
    const tickets = this.ticketService.tickets();
    if (this.filterStatus === 'all') return tickets;
    return tickets.filter(t => t.status === this.filterStatus);
  }

  getTicketCount(status: string): number {
    const tickets = this.ticketService.tickets();
    if (status === 'all') return tickets.length;
    return tickets.filter(t => t.status === status).length;
  }

  onToastClick(toast: any) {
    if (toast.ticketUuid) {
      const ticket = this.ticketService.tickets().find(t => t.uuid === toast.ticketUuid);
      if (ticket) {
        this.selectTicket(ticket);
      }
    }
    this.ticketService.dismissToast(toast.id);
  }

  private scrollToBottom() {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (_) {}
  }
}
