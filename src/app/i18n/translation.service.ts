import { DOCUMENT, Injectable, inject, signal } from '@angular/core';
import { fr } from './locales/fr';
import { ar } from './locales/ar';
import { en } from './locales/en';

export type Lang = 'fr' | 'ar' | 'en';

export const LANGUAGES: ReadonlyArray<{ code: Lang; label: string; dir: 'ltr' | 'rtl' }> = [
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'en', label: 'English', dir: 'ltr' },
];

const STORAGE_KEY = 'moujtahid.lang';
const DEFAULT_LANG: Lang = 'fr';

type Tree = { [key: string]: string | string[] | Tree };

const DICTS: Record<Lang, Tree> = { fr, ar, en };

@Injectable({ providedIn: 'root' })
export class TranslationService {
  // Injected DOCUMENT (not the global) so setting lang/dir works during
  // prerender/SSR as well as in the browser.
  private readonly document = inject(DOCUMENT);

  // Exposed as a signal so any computed/effect can react to language changes.
  readonly lang = signal<Lang>(this.readInitialLang());

  constructor() {
    this.applyDocumentAttributes(this.lang());
  }

  get dir(): 'ltr' | 'rtl' {
    return this.lang() === 'ar' ? 'rtl' : 'ltr';
  }

  setLang(lang: Lang): void {
    if (!LANGUAGES.some(l => l.code === lang)) return;
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage unavailable — language still applies for this session.
    }
    this.applyDocumentAttributes(lang);
  }

  // Resolve a dot-path key ('nav.students') for the active language.
  // Falls back to French, then to the key itself, so a missing translation
  // degrades gracefully instead of breaking the UI.
  translate(key: string, params?: Record<string, string | number>): string {
    const active = this.resolve(DICTS[this.lang()], key);
    const value = active ?? this.resolve(DICTS[DEFAULT_LANG], key) ?? key;
    return params ? this.interpolate(value, params) : value;
  }

  // Resolve a dot-path key to an array leaf (e.g. 'calendar.days') — used for
  // things like day-name lists where a single interpolated string won't do.
  translateArray(key: string): string[] {
    const active = this.resolveArray(DICTS[this.lang()], key);
    return active ?? this.resolveArray(DICTS[DEFAULT_LANG], key) ?? [];
  }

  private resolve(tree: Tree, key: string): string | null {
    let node: string | string[] | Tree | undefined = tree;
    for (const part of key.split('.')) {
      if (node === undefined || node === null || typeof node !== 'object' || Array.isArray(node)) return null;
      node = node[part];
    }
    return typeof node === 'string' ? node : null;
  }

  private resolveArray(tree: Tree, key: string): string[] | null {
    let node: string | string[] | Tree | undefined = tree;
    for (const part of key.split('.')) {
      if (node === undefined || node === null || typeof node !== 'object' || Array.isArray(node)) return null;
      node = node[part];
    }
    return Array.isArray(node) ? node : null;
  }

  private interpolate(value: string, params: Record<string, string | number>): string {
    return value.replace(/\{(\w+)\}/g, (match, name: string) =>
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match
    );
  }

  private applyDocumentAttributes(lang: Lang): void {
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    const root = this.document.documentElement;
    root.setAttribute('lang', lang);
    root.setAttribute('dir', dir);
  }

  private readInitialLang(): Lang {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && LANGUAGES.some(l => l.code === stored)) return stored as Lang;
    } catch {
      // ignore
    }
    return DEFAULT_LANG;
  }
}
