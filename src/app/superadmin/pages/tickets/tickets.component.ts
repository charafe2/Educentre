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
  styleUrls: ['./tickets.component.css', './tickets-redesign.css']
})
export class TicketsComponent implements OnInit, AfterViewChecked {
  ticketService = inject(SuperadminTicketService);
  authStore = inject(SuperadminAuthStore);

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;

  newMessage = '';
  filterStatus = 'all';
  search = '';
  private shouldScrollToBottom = false;

  superadmins: any[] = [];
  showSummaryModal = false;
  selectedSummaryTicket: any = null;
  editedNotes = '';

  /** Internal notes live in a drawer so they never push the conversation down. */
  notesOpen = false;
  /** Long threads collapse to the most recent exchange. */
  showAllMessages = false;
  private readonly COLLAPSED_COUNT = 6;

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
    // Each ticket opens on its latest exchange with notes closed.
    this.showAllMessages = false;
    this.notesOpen = false;
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
    const query = this.search.trim().toLowerCase();
    return this.ticketService.tickets()
      .filter(t => this.filterStatus === 'all' || t.status === this.filterStatus)
      .filter(t => !query || [
        t.user?.name,
        t.user?.email,
        t.user?.tenant?.name,
        t.subject,
        t.latest_message?.content,
      ].some(field => (field || '').toLowerCase().includes(query)));
  }

  statusLabel(status: string): string {
    if (status === 'open') return 'Ouvert';
    if (status === 'pending') return 'En attente';
    if (status === 'closed') return 'Fermé';
    return 'En cours';
  }

  /** Same name always lands on the same swatch, so agents start recognising
   *  repeat requesters by colour before they read the name. */
  avatarTone(name?: string): number {
    const source = name || '?';
    let hash = 0;
    for (let i = 0; i < source.length; i++) hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
    return hash % 6;
  }

  relativeTime(iso?: string): string {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return '';

    const mins = Math.floor((Date.now() - then) / 60_000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins} min`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;

    const days = Math.floor(hours / 24);
    if (days < 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    return this.frenchDate(iso);
  }

  /** Written out rather than using DatePipe's `fr` locale, which would need
   *  registerLocaleData wired up app-wide just for this one line. */
  frenchDate(iso?: string): string {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
      'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  /** Target reply time shown in the composer strip. */
  slaDeadline(ticket: any): string {
    const created = new Date(ticket?.created_at || ticket?.updated_at || Date.now());
    created.setHours(created.getHours() + 24);
    return `${this.frenchDate(created.toISOString())} à ${created.getHours().toString().padStart(2, '0')}h`;
  }

  hiddenMessageCount(): number {
    return Math.max(0, this.ticketService.messages().length - this.COLLAPSED_COUNT);
  }

  visibleMessages() {
    const all = this.ticketService.messages();
    if (this.showAllMessages || all.length <= this.COLLAPSED_COUNT) return all;
    return all.slice(-this.COLLAPSED_COUNT);
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
