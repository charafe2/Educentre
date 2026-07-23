import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SuperadminAuthStore } from '../../superadmin-auth.store';

@Component({
  selector: 'app-superadmin-login',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './superadmin-login.component.html',
  styleUrl: './superadmin-login.component.css'
})
export class SuperadminLoginComponent {
  private auth = inject(SuperadminAuthStore);
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
    const ok = await this.auth.login(this.email, this.password);
    this.loading.set(false);
    if (ok) {
      this.router.navigate(['/superadmin/dashboard']);
    } else {
      this.error.set('Identifiants incorrects.');
    }
  }
}
