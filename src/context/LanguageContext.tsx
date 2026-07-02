import React, { createContext, useContext, useState } from 'react';
import nlData from '../locales/nl.json';

export type Language = 'nl' | 'en' | 'fr' | 'de' | 'es' | 'ar';

interface LanguageContextProps {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  dt: (defaultString: string, contextKey?: string) => string;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // We keep language state for compat but default it to 'nl' (Dutch)
  const [language, setLanguageState] = useState<Language>('nl');

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  // Static key-value translations helper
  const t = (key: string): string => {
    const dictionary = nlData.dictionary as Record<string, string>;
    if (dictionary && dictionary[key]) {
      return dictionary[key];
    }
    return key;
  };

  // Dynamic values helper (verbatim fallback for Google Translate to translate visually)
  const dt = (defaultString: string, _contextKey?: string): string => {
    return defaultString || '';
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dt, isLoading: false }}>
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
