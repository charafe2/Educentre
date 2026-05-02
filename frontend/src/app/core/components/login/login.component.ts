import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';

import { AuthService, LoginResponse } from '../../services/auth.service';
import { TenantService } from '../../services/tenant.service';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  loginForm: any;
  isLoading = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private tenantService: TenantService,
    private router: Router,
    private notificationService: NotificationService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading = true;
      const { email, password } = this.loginForm.value;
      
      this.authService.login(email!, password!).subscribe({
        next: (response: LoginResponse) => {
          if (response.success) {
            this.notificationService.success('Login successful!');
            // Use tenant-aware navigation as required by rules.md
            const tenant = this.tenantService.currentTenant?.subdomain || response.data.user.tenantId;
            if (tenant) {
              this.router.navigate([`/${tenant}/dashboard`]);
            } else {
              this.router.navigate(['/dashboard']);
            }
          } else {
            this.notificationService.error(response.message || 'Login failed');
          }
          this.isLoading = false;
        },
        error: (error) => {
          this.notificationService.error('Login failed. Please try again.');
          this.isLoading = false;
        }
      });
    }
  }

  fillDemoCredentials(role: 'admin' | 'teacher'): void {
    const credentials = {
      admin: { email: 'admin@demo.com', password: 'admin123456' },
      teacher: { email: 'teacher@demo.com', password: 'teacher123456' }
    };
    
    this.loginForm.patchValue(credentials[role]);
    this.notificationService.info(`Demo ${role} credentials filled`);
  }

  handleForgotPassword(event: Event): void {
    event.preventDefault();
    this.notificationService.info('Password reset functionality coming soon');
  }
}
