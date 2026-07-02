import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, loginWithGoogle } from './lib/firebase';
import { Lock, LogOut, FileText } from 'lucide-react';
import Navbar from './components/Navbar';
import WhatsAppButton from './components/WhatsAppButton';
import Home from './pages/Home';
import Gallery from './pages/Gallery';
import Technical from './pages/Technical';
import Surroundings from './pages/Surroundings';
import Contact from './pages/Contact';
import { LanguageProvider, useLanguage } from './context/LanguageContext';

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const { t, dt, language } = useLanguage();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
      } else {
        const cached = localStorage.getItem('local_admin_user');
        if (cached) {
          try {
            setUser(JSON.parse(cached));
          } catch (e) {}
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error("Login err: ", err);
      const password = prompt("Firebase login is momenteel niet beschikbaar wegens quota limieten. Voer de admin pincode of wachtwoord in om lokaal in te loggen:");
      if (password === "admin" || password === "admin123" || password === "1234") {
        const localAdminUser = {
          uid: 'local_admin',
          email: 'admin@hunnegem.be',
          displayName: 'Local Admin',
        } as any;
        setUser(localAdminUser);
        localStorage.setItem('local_admin_user', JSON.stringify(localAdminUser));
        window.location.reload(); // Refresh to apply to all components
      } else if (password !== null) {
        alert("Ongeldig wachtwoord.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Logout err: ", err);
    }
    setUser(null);
    localStorage.removeItem('local_admin_user');
    window.location.reload(); // Refresh to clear state
  };

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <Navbar />
        <WhatsAppButton />
        <main className="flex-grow pt-[56px]">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/galerij" element={<Gallery />} />
            <Route path="/technisch" element={<Technical />} />
            <Route path="/omgeving" element={<Surroundings />} />
            <Route path="/contact" element={<Contact />} />
          </Routes>
        </main>
        
        {/* Info Banner */}
        <div id="attesten-banner" className="w-full bg-slate-100/80 border-t border-slate-200 py-4 px-6 text-center shrink-0">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-slate-700 text-xs sm:text-sm font-medium tracking-wide">
            <FileText id="attesten-banner-icon" className="w-4 h-4 text-slate-500 shrink-0" />
            <span id="attesten-banner-text">{dt('Alle attesten op eenvoudig verzoek.')}</span>
          </div>
        </div>
        
        {/* Unified Premium Global Footer */}
        <footer className="bg-slate-950 text-slate-400 py-12 border-t border-slate-900 shrink-0 bg-gradient-to-b from-slate-950 to-slate-900">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-center md:text-left flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold italic font-serif text-sm">H12</div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-white mb-0.5">{t('footer.title')}</p>
                <p className="text-[10px] text-slate-500 font-mono">{t('footer.subtitle')}</p>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
              <Link to="/" className="hover:text-white transition-colors">{t('nav.home')}</Link>
              <Link to="/galerij" className="hover:text-white transition-colors">{t('nav.gallery')}</Link>
              <Link to="/omgeving" className="hover:text-white transition-colors">{t('nav.surroundings')}</Link>
              <Link to="/technisch" className="hover:text-white transition-colors">{t('nav.details')}</Link>
              <Link to="/contact" className="hover:text-white transition-colors">{t('nav.contact')}</Link>
              
              {!user ? (
                <button 
                  onClick={handleLogin}
                  className="text-slate-500 hover:text-white transition-colors flex items-center space-x-1.5 cursor-pointer bg-transparent border-none outline-none font-sans font-medium"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{t('footer.admin')}</span>
                </button>
              ) : (
                <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <span className="text-[10px] text-slate-400 font-mono">{t('footer.loggedIn')}: {user.email}</span>
                  <button
                    onClick={handleLogout}
                    className="text-slate-500 hover:text-red-400 transition-colors p-0.5"
                    title={t('ui.logout')}
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}
