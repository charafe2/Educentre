import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgClass } from '@angular/common';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule, NgClass],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private auth = inject(AuthService);
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
    // Simulate network latency
    await new Promise(r => setTimeout(r, 600));
    const ok = this.auth.login(this.email, this.password);
    this.loading.set(false);
    if (ok) {
      this.router.navigate(['/dashboard']);
    } else {
      this.error.set('Email ou mot de passe incorrect.');
    }
  }

  fillDemo() {
    this.email = 'admin@moujtahid.ma';
    this.password = 'admin123';
  }
}
