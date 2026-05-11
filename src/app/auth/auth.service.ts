import { Injectable, signal, computed } from '@angular/core';

export interface AuthUser {
  name: string;
  email: string;
  role: string;
}

const MOCK_ACCOUNTS = [
  { email: 'admin@moujtahid.ma', password: 'admin123', name: 'Ahmed Berrada', role: 'Administrateur' },
  { email: 'manager@moujtahid.ma', password: 'manager123', name: 'Khadija Alami', role: 'Gestionnaire' },
];

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _user = signal<AuthUser | null>(null);

  user = this._user.asReadonly();
  isLoggedIn = computed(() => this._user() !== null);

  login(email: string, password: string): boolean {
    const found = MOCK_ACCOUNTS.find(u => u.email === email && u.password === password);
    if (found) {
      this._user.set({ name: found.name, email: found.email, role: found.role });
      return true;
    }
    return false;
  }

  register(data: { centreName: string; centreType: string; city: string; name: string; email: string }): void {
    this._user.set({ name: data.name, email: data.email, role: 'Administrateur' });
  }

  logout(): void {
    this._user.set(null);
  }
}
