import { Component, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {
  email = '';
  loading = signal(false);
  sent = signal(false);

  async submit() {
    if (!this.email) return;
    this.loading.set(true);
    await new Promise(r => setTimeout(r, 800));
    this.loading.set(false);
    this.sent.set(true);
  }
}
