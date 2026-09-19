import { Injectable, inject } from '@angular/core';
import { AuthStore } from '../auth/auth.store';
import { SuperadminAuthStore } from '../superadmin/superadmin-auth.store';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class RealtimeService {
  private auth = inject(AuthStore);
  private superadminAuth = inject(SuperadminAuthStore);
  public echo: any = null;

  constructor() {
    // Make Pusher available globally for Echo
    (window as any).Pusher = Pusher;
  }

  public initialize(): void {
    if (this.echo) {
      return; // Already initialized
    }

    const superAdminToken = localStorage.getItem('superadmin_token');
    const authToken = localStorage.getItem('auth_token');

    if (!superAdminToken && !authToken) {
        return; // Don't connect unauthenticated
    }

    const token = superAdminToken ? superAdminToken : authToken;

    console.log('RealtimeService: Initializing Echo connection with host:', environment.reverb.host, 'and port:', environment.reverb.port);

    this.echo = new Echo({
      broadcaster: 'reverb',
      key: environment.reverb.key,
      wsHost: environment.reverb.host,
      wsPort: environment.reverb.port,
      wssPort: environment.reverb.port,
      forceTLS: environment.reverb.scheme === 'https',
      enabledTransports: ['ws', 'wss'],
      authorizer: (channel: any, options: any) => {
        return {
          authorize: (socketId: any, callback: any) => {
            fetch(`${environment.apiUrl}/broadcasting/auth`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}` 
              },
              body: JSON.stringify({
                socket_id: socketId,
                channel_name: channel.name
              })
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
              callback(false, data);
            })
            .catch(error => {
              callback(true, error);
            });
          }
        };
      },
    });
  }

  public disconnect(): void {
    if (this.echo) {
      this.echo.disconnect();
      this.echo = null;
    }
  }
}
