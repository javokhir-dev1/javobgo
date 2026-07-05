'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, translations } from '@/locales/translations';
import { api } from '@/lib/api';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider = ({ children }: { children: React.ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('uz');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('app_language') as Language;
    if (saved && ['uz', 'en', 'ru'].includes(saved)) {
      setLanguageState(saved);
    }
    
    // Fetch from backend to sync
    api.get('/auth/me')
      .then(res => {
        const dbLang = res.data.language as Language;
        if (dbLang && ['uz', 'en', 'ru'].includes(dbLang)) {
          setLanguageState(dbLang);
          localStorage.setItem('app_language', dbLang);
        }
      })
      .catch(() => {})
      .finally(() => {
        setMounted(true);
      });
  }, []);

  const setLanguage = async (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
    try {
      await api.patch('/auth/update-profile', { language: lang });
    } catch (e) {
      // Ignore API errors, local state is already updated
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  // Always wrap with Provider so useLanguage() doesn't throw
  // To avoid hydration mismatch, you could return null if !mounted,
  // but that breaks SSR. We just provide default 'uz' for first render.
  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
