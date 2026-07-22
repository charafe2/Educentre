import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fr } from './locales/fr';
import { ar } from './locales/ar';
import { en } from './locales/en';

export type Lang = 'fr' | 'ar' | 'en';

export const LANGUAGES: ReadonlyArray<{ code: Lang; label: string; rtl: boolean }> = [
  { code: 'fr', label: 'Français', rtl: false },
  { code: 'ar', label: 'العربية', rtl: true },
  { code: 'en', label: 'English', rtl: false },
];

const STORAGE_KEY = 'moujtahid.lang';
const DEFAULT_LANG: Lang = 'fr';

type Tree = { [key: string]: string | Tree };
const DICTS: Record<Lang, Tree> = { fr, ar, en };

function resolve(tree: Tree, key: string): string | null {
  let node: string | Tree | undefined = tree;
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return null;
    node = node[part];
  }
  return typeof node === 'string' ? node : null;
}

function interpolate(value: string, params?: Record<string, string | number>): string {
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (m, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : m
  );
}

interface I18nState {
  lang: Lang;
  isRTL: boolean;
  setLang: (lang: Lang) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nState | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(stored => {
        if (stored && LANGUAGES.some(l => l.code === stored)) setLangState(stored as Lang);
      })
      .catch(() => {
        // Storage unavailable — stay on default for this session.
      });
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
    // Note: React Native mirrors layout for RTL only after a native reload
    // (I18nManager.forceRTL). We deliberately DON'T force-reload here so the
    // language switch stays instant and non-breaking; text is fully translated.
    I18nManager.allowRTL(true);
  }, []);

  // Resolve active language, fall back to French, then to the key itself.
  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    const value = resolve(DICTS[lang], key) ?? resolve(DICTS[DEFAULT_LANG], key) ?? key;
    return interpolate(value, params);
  }, [lang]);

  const value = useMemo<I18nState>(() => ({
    lang,
    isRTL: lang === 'ar',
    setLang,
    t,
  }), [lang, setLang, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nState {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n doit être utilisé dans <I18nProvider>');
  return ctx;
}
