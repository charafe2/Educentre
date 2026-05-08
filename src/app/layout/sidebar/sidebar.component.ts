import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-sidebar',
  imports: [RouterLink, RouterLinkActive, NgClass],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent {
  collapsed = signal(false);

  toggle() {
    this.collapsed.update(v => !v);
  }
}
