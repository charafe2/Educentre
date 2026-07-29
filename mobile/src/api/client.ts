import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthUser, Student } from '../types';
import { students } from '../data/demo';

// Même backend que l'application web Angular (Laravel - /api/v1/*).
// DEMO_MODE = true : l'app fonctionne sans serveur, avec les données de src/data/demo.ts.
export const DEMO_MODE = false;
// Web preview (browser + backend on the same machine) can reach the API via
// localhost directly. A physical device on the same Wi-Fi cannot resolve
// "localhost" as itself — replace this with your machine's LAN IP
// (ipconfig/ifconfig) when testing on a real phone.
export const API_URL = Platform.OS === 'web'
  ? 'http://localhost:8000/api'
  : 'http://192.168.1.10:8000/api';

const TOKEN_KEY = 'auth_token';

export const tokenStore = {
  get: () => AsyncStorage.getItem(TOKEN_KEY),
  set: (token: string) => AsyncStorage.setItem(TOKEN_KEY, token),
  clear: () => AsyncStorage.removeItem(TOKEN_KEY),
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await tokenStore.get();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json() as Promise<T>;
}

interface LoginResponse {
  success: boolean;
  data: { user: AuthUser; token: string };
  message: string;
}

export const DEMO_ADMIN: AuthUser = {
  uuid: 'demo-admin',
  name: 'Directeur du centre',
  email: 'admin@moujtahid.ma',
  role: 'admin',
};

export async function apiLogin(email: string, password: string): Promise<AuthUser | null> {
  if (DEMO_MODE) {
    // Démo : toute adresse e-mail valide + mot de passe ≥ 4 caractères.
    if (/\S+@\S+\.\S+/.test(email) && password.length >= 4) {
      await tokenStore.set('demo-token');
      return { ...DEMO_ADMIN, email };
    }
    return null;
  }

  try {
    const res = await request<LoginResponse>('/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (!res.success) return null;
    await tokenStore.set(res.data.token);
    return res.data.user;
  } catch {
    return null;
  }
}

interface ParentLoginResponse {
  success: boolean;
  data: { parent: { uuid: string; firstName: string; lastName: string; phone: string }; children: Student[]; token: string };
  message: string;
}

const normalizePhone = (value: string) => value.replace(/\D/g, '');

export async function apiLoginParent(phone: string, password: string): Promise<Student[] | null> {
  if (DEMO_MODE) {
    const digits = normalizePhone(phone);
    if (digits.length < 6 || password.trim().length === 0) return null;

    const children = students.filter(
      s => normalizePhone(s.parentPhone ?? '') === digits && s.parentPassword === password,
    );
    if (!children.length) return null;

    await tokenStore.set('demo-token');
    return children;
  }

  try {
    const res = await request<ParentLoginResponse>('/v1/parent/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    });
    if (!res.success) return null;
    await tokenStore.set(res.data.token);
    return res.data.children;
  } catch {
    return null;
  }
}

export async function apiLogout(): Promise<void> {
  if (!DEMO_MODE) {
    try {
      await request('/v1/auth/logout', { method: 'POST' });
    } catch {
      // Le token local est supprimé quoi qu'il arrive.
    }
  }
  await tokenStore.clear();
}

export async function apiLogoutParent(): Promise<void> {
  if (!DEMO_MODE) {
    try {
      // Distinct from apiLogout: a parent token is rejected by the staff-only
      // /v1/auth/logout route, so it must revoke itself via its own endpoint.
      await request('/v1/parent/auth/logout', { method: 'POST' });
    } catch {
      // Le token local est supprimé quoi qu'il arrive.
    }
  }
  await tokenStore.clear();
}

export async function registerPushToken(token: string, platform: string): Promise<void> {
  if (DEMO_MODE) return;

  try {
    await request('/v1/device-tokens', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  } catch {
    // Best-effort: a failed registration shouldn't block app usage.
  }
}

export async function unregisterPushToken(token: string): Promise<void> {
  if (DEMO_MODE) return;

  try {
    await request(`/v1/device-tokens/${encodeURIComponent(token)}`, { method: 'DELETE' });
  } catch {
    // Best-effort.
  }
}
