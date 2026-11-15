'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type SiteLang = 'en' | 'es';

export interface BiText {
  en: string;
  es: string;
}

export function pickLang<T>(lang: SiteLang, text: { readonly en: T; readonly es: T }): T;
export function pickLang<T>(text: { readonly en: T; readonly es: T }, lang: SiteLang): T;
export function pickLang<T>(
  first: SiteLang | { readonly en: T; readonly es: T },
  second: { readonly en: T; readonly es: T } | SiteLang
): T {
  const lang = typeof first === 'string' ? first : (second as SiteLang);
  const text = (typeof first === 'string' ? second : first) as { readonly en: T; readonly es: T };
  return lang === 'es' ? text.es : text.en;
}

interface LanguageContextValue {
  lang: SiteLang;
  setLang: (lang: SiteLang) => void;
  toggleLang: () => void;
}

const STORAGE_KEY = 'th_site_lang';

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
  toggleLang: () => {},
});

function persistLang(lang: SiteLang) {
  try {
    window.localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Ignore storage access errors in restricted browsing contexts.
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<SiteLang>('en');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'es') {
        setLangState('es');
      }
    } catch {
      // Keep default English when storage is unavailable.
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((nextLang: SiteLang) => {
    setLangState(nextLang);
    persistLang(nextLang);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => {
      const next: SiteLang = prev === 'en' ? 'es' : 'en';
      persistLang(next);
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      toggleLang,
    }),
    [lang, setLang, toggleLang]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): {
  lang: SiteLang;
  setLang: (lang: SiteLang) => void;
  toggleLang: () => void;
} {
  return useContext(LanguageContext);
}
