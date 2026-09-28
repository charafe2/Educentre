import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RealtimeService } from '../../services/realtime.service';
import { ChatWidgetComponent } from '../../components/chat-widget/chat-widget.component';

/**
 * Wraps every authenticated page. Each page draws its own app bar, so this
 * adds no chrome: it only keeps the realtime connection open for the session
 * and the support chat reachable from anywhere.
 */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, ChatWidgetComponent],
  template: `
    <router-outlet />
    <app-chat-widget />
  `,
})
export class AppShellComponent implements OnInit, OnDestroy {
  private realtimeService = inject(RealtimeService);

  ngOnInit(): void {
    this.realtimeService.initialize();
  }

  ngOnDestroy(): void {
    this.realtimeService.disconnect();
  }
}
