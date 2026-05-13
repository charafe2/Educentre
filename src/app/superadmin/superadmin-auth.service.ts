import { Injectable, signal, computed } from '@angular/core';

const SUPERADMIN_ACCOUNT = {
  email: 'superadmin@moujtahid.ma',
  password: 'superadmin2024',
  name: 'Super Administrateur',
};

@Injectable({ providedIn: 'root' })
export class SuperadminAuthService {
  private _loggedIn = signal(false);

  isLoggedIn = computed(() => this._loggedIn());

  login(email: string, password: string): boolean {
    if (email === SUPERADMIN_ACCOUNT.email && password === SUPERADMIN_ACCOUNT.password) {
      this._loggedIn.set(true);
      return true;
    }
    return false;
  }

  logout(): void {
    this._loggedIn.set(false);
  }

  get name() { return SUPERADMIN_ACCOUNT.name; }
}
