import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'SuperAdmin' | 'SchoolAdmin' | 'Teacher' | 'Parent';
  tenantId: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    user: User;
    token: string;
  };
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = '/api/v1';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private currentTokenSubject = new BehaviorSubject<string | null>(null);

  public currentUser$ = this.currentUserSubject.asObservable();
  public currentToken$ = this.currentTokenSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {
    this.loadStoredUser();
  }

  private loadStoredUser(): void {
    const storedUser = localStorage.getItem('currentUser');
    const storedToken = localStorage.getItem('authToken');
    
    if (storedUser && storedToken) {
      this.currentUserSubject.next(JSON.parse(storedUser));
      this.currentTokenSubject.next(storedToken);
    }
  }

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/auth/login`, { email, password })
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.storeUserData(response.data.user, response.data.token);
          }
        })
      );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    this.currentUserSubject.next(null);
    this.currentTokenSubject.next(null);
    this.router.navigate(['/login']);
  }

  private storeUserData(user: User, token: string): void {
    localStorage.setItem('currentUser', JSON.stringify(user));
    localStorage.setItem('authToken', token);
    this.currentUserSubject.next(user);
    this.currentTokenSubject.next(token);
  }

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get currentToken(): string | null {
    return this.currentTokenSubject.value;
  }

  get isAuthenticated(): boolean {
    return !!(this.currentUser && this.currentToken);
  }

  get hasRole(): (role: string) => boolean {
    return (role: string) => this.currentUser?.role === role;
  }

  get tenantId(): string | null {
    return this.currentUser?.tenantId || null;
  }

  getAuthHeaders(): HttpHeaders {
    const token = this.currentToken;
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
}
