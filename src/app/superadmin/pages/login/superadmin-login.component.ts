import { Component, signal, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SuperadminAuthService } from '../../superadmin-auth.service';

@Component({
  selector: 'app-superadmin-login',
  imports: [FormsModule],
  templateUrl: './superadmin-login.component.html',
  styleUrl: './superadmin-login.component.css'
})
export class SuperadminLoginComponent {
  private auth = inject(SuperadminAuthService);
  private router = inject(Router);

  email = '';
  password = '';
  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  async submit() {
    if (!this.email || !this.password) {
      this.error.set('Veuillez remplir tous les champs.');
      return;
    }
    this.loading.set(true);
    this.error.set('');
    await new Promise(r => setTimeout(r, 700));
    const ok = this.auth.login(this.email, this.password);
    this.loading.set(false);
    if (ok) {
      this.router.navigate(['/superadmin/dashboard']);
    } else {
      this.error.set('Identifiants incorrects.');
    }
  }
}
