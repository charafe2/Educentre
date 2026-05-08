import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from './layout/sidebar/sidebar.component';
import { TopbarComponent } from './layout/topbar/topbar.component';
import { ToastComponent } from './components/toast/toast.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {}
