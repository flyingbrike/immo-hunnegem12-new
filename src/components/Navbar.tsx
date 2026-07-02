import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Menu, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const LANGUAGES = [
  { code: 'nl', name: 'NL', flag: '🇧🇪' },
  { code: 'en', name: 'ENG', flag: '🇬🇧' },
  { code: 'fr', name: 'FR', flag: '🇫🇷' },
  { code: 'de', name: 'GER', flag: '🇩🇪' },
  { code: 'ar', name: 'Arabic', flag: '🇦🇪' }
];

export default function Navbar() {
  const location = useLocation();
  const { t, dt } = useLanguage();
  // Detect active language from Google Translate cookie directly in initial state
  const getGoogleTransCookie = () => {
    try {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; googtrans=`);
      if (parts.length === 2) {
        const val = parts.pop()?.split(';').shift();
        if (val) {
          const lang = val.split('/').pop()?.toLowerCase();
          if (lang) {
            return lang === 'english' || lang === 'eng' ? 'en' : lang;
          }
        }
      }
    } catch (e) {
      console.error(e);
    }
    return 'nl';
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeLang, setActiveLang] = useState<string>(getGoogleTransCookie);

  const navItems = [
    { name: t('nav.home'), path: '/' },
    { name: t('nav.gallery'), path: '/galerij' },
    { name: t('nav.details'), path: '/technisch' },
    { name: t('nav.surroundings'), path: '/omgeving' },
    { name: t('nav.contact'), path: '/contact' },
  ];

  // Programmatically trigger Google Translate
  const triggerTranslation = (langCode: string) => {
    try {
      const domain = window.location.hostname;
      // Clear legacy/conflicting path cookies
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${domain};`;

      // Set new cookie with SameSite=None; Secure so it works perfectly in iframes
      document.cookie = `googtrans=/nl/${langCode}; path=/; SameSite=None; Secure;`;
      document.cookie = `googtrans=/nl/${langCode}; path=/; domain=${domain}; SameSite=None; Secure;`;
      document.cookie = `googtrans=/nl/${langCode}; path=/; domain=.${domain}; SameSite=None; Secure;`;

      // Also set for any parent subdomain to ensure Google Translate script picks it up correctly
      const domainParts = domain.split('.');
      if (domainParts.length > 2) {
        const parentDomain = domainParts.slice(1).join('.');
        document.cookie = `googtrans=/nl/${langCode}; path=/; domain=.${parentDomain}; SameSite=None; Secure;`;
      }

      // Sync active state
      setActiveLang(langCode);

      // Attempt programmatic change event
      const selectEl = document.querySelector('.goog-te-combo') as HTMLSelectElement;
      if (selectEl) {
        selectEl.value = langCode;
        selectEl.dispatchEvent(new Event('change'));
      }
    } catch (e) {
      console.error("Error setting Google Translate cookie:", e);
    }

    // Force page reload: Google Translate natively reads 'googtrans' cookie on reload and translates 100% reliably
    window.location.reload();
  };

  // Dynamic Google Translate Widget Injector
  useEffect(() => {
    const scriptId = 'google-translate-script';
    if (!document.getElementById(scriptId)) {
      // Create callback
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement(
          {
            pageLanguage: 'nl',
            includedLanguages: 'nl,en,fr,de,ar',
            autoDisplay: false
          },
          'google_translate_element'
        );
      };

      const addScript = document.createElement('script');
      addScript.id = scriptId;
      addScript.type = 'text/javascript';
      addScript.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      document.body.appendChild(addScript);
    }
  }, []);

  return (
    <div className="fixed top-0 left-0 w-full z-50">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-2">
          {/* Mobile Menu Button - Left-aligned on mobile, hidden on desktop */}
          <div className="md:hidden flex items-center shrink-0">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 -ml-1.5 text-slate-700 hover:text-primary-600 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center space-x-1.5 xs:space-x-3 group shrink-0 min-w-0">
            <motion.div 
              whileHover={{ rotate: 10 }}
              className="w-7 h-7 xs:w-8 xs:h-8 sm:w-10 sm:h-10 bg-primary-950 rounded-lg xs:rounded-xl flex items-center justify-center text-white font-extrabold italic font-serif text-sm xs:text-base sm:text-xl shadow-lg border border-white/10 shrink-0"
            >
              H12
            </motion.div>
            <div className="flex flex-col min-w-0">
              <span className="font-serif font-black text-[10px] xs:text-xs sm:text-lg tracking-tighter text-primary-950 uppercase leading-none truncate pr-1">
                DUPLEX APPARTEMENT <span className="italic font-medium lowercase">met</span> GARAGE
              </span>
              <span className="text-[6px] xs:text-[7px] sm:text-[8px] uppercase tracking-[0.1em] xs:tracking-[0.12em] text-primary-600 font-bold mt-0.5 sm:mt-1 truncate">Hunnegemstraat 12 - 9500 Geraardsbergen</span>
            </div>
          </Link>
          
          <div className="hidden md:flex items-center space-x-5 lg:space-x-7">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "text-xs font-semibold uppercase tracking-wider text-slate-500 transition-colors hover:text-primary-600 pb-1",
                  location.pathname === item.path && "text-primary-600 border-b-2 border-primary-600"
                )}
              >
                {item.name}
              </Link>
            ))}
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
            {/* Custom Google Translate Horizontal Flags/Buttons */}
            <div className="flex items-center space-x-1 sm:space-x-1.5 shrink-0">
              {LANGUAGES.map((lang) => {
                const isActive = activeLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setActiveLang(lang.code);
                      triggerTranslation(lang.code);
                    }}
                    title={lang.name}
                    className={cn(
                      "flex items-center space-x-1 px-1 md:px-1.5 py-1 rounded transition-all duration-150 border-0 outline-none select-none",
                      isActive 
                        ? "bg-slate-900 text-white font-bold scale-105 shadow-sm" 
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200/60"
                    )}
                  >
                    <span className="text-[12px] sm:text-[13px] leading-none" role="img" aria-label={lang.name}>
                      {lang.flag}
                    </span>
                    <span className="text-[8px] sm:text-[9px] font-extrabold tracking-wider uppercase leading-none hidden xs:inline">
                      {lang.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Hidden original widget for Google script translation hook */}
            <div id="google_translate_element" className="absolute -top-40 left-0 opacity-0 pointer-events-none" />

            <div className="hidden xl:block">
              <Link 
                to="/contact" 
                className="bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-1.5 rounded-lg font-bold text-[10px] transition-colors uppercase tracking-wider whitespace-nowrap"
              >
                {t('nav.cta')}
              </Link>
            </div>

          </div>
        </div>
      </nav>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bg-white border-b border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="px-6 py-4 space-y-3 flex flex-col">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-primary-600 py-1 border-b border-slate-5",
                    location.pathname === item.path && "text-primary-600 pl-1"
                  )}
                >
                  {item.name}
                </Link>
              ))}

              <Link 
                to="/contact" 
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center bg-primary-600 hover:bg-primary-700 text-white py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest mt-2 block"
              >
                {t('nav.cta')}
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
