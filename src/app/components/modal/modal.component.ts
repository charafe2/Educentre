import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-modal',
  standalone: true,
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  @Input() title = '';
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Output() closed = new EventEmitter<void>();
}
