import { Component, signal, inject } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  centreTypes = ['Soutien scolaire', 'Langue', 'Informatique', 'Artistique', 'Sport'];

  form = {
    centreName: '',
    centreType: '',
    city: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeTerms: false,
  };

  showPassword = signal(false);
  showConfirm = signal(false);
  loading = signal(false);
  error = signal('');

  get passwordStrength(): 'weak' | 'medium' | 'strong' | '' {
    const p = this.form.password;
    if (!p) return '';
    if (p.length < 6) return 'weak';
    if (p.length < 10 || !/[0-9]/.test(p)) return 'medium';
    return 'strong';
  }

  get strengthLabel(): string {
    const map: Record<string, string> = { weak: 'Faible', medium: 'Moyen', strong: 'Fort' };
    return map[this.passwordStrength] ?? '';
  }

  async submit() {
    const f = this.form;
    if (!f.centreName || !f.name || !f.email || !f.password) {
      this.error.set('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (f.password !== f.confirmPassword) {
      this.error.set('Les mots de passe ne correspondent pas.');
      return;
    }
    if (f.password.length < 6) {
      this.error.set('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (!f.agreeTerms) {
      this.error.set("Veuillez accepter les conditions d'utilisation.");
      return;
    }
    this.loading.set(true);
    this.error.set('');
    await new Promise(r => setTimeout(r, 800));
    this.auth.register({ centreName: f.centreName, centreType: f.centreType, city: f.city, name: f.name, email: f.email });
    this.loading.set(false);
    this.router.navigate(['/dashboard']);
  }
}
