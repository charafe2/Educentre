import { Component, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [NgClass],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css'
})
export class ToastComponent {
  toastService = inject(ToastService);
}
