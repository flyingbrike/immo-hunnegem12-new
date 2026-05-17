import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send, Phone, Mail, MapPin } from 'lucide-react';

export default function Contact() {
  const [status, setStatus] = useState<null | 'sending' | 'success' | 'error'>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    
    // Simuleer een API call
    setTimeout(() => {
      setStatus('success');
    }, 2000);
  };

  return (
    <div className="py-24 px-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
        <div>
          <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">Neem contact op</span>
          <h1 className="serif text-5xl italic mb-8 text-slate-900 leading-tight">Interesse?<br />Plan een Afspraak</h1>
          <p className="text-lg font-light text-slate-600 leading-relaxed mb-12">
            Heeft u interesse in een bezichtiging of wilt u meer informatie ontvangen? Neem gerust contact met ons op. We helpen u graag verder.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 mb-6">
                <Phone className="w-6 h-6" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Telefoon</h4>
              <p className="text-lg font-bold text-slate-800 tracking-tight">0032 (0) 475 701549</p>
            </div>
            <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
              <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 mb-6">
                <Mail className="w-6 h-6" />
              </div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Email</h4>
              <p className="text-sm font-bold text-slate-800 truncate">eriksuniverse@gmail.com</p>
            </div>
          </div>
        </div>

        <div className="bg-primary-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-colors"></div>
          
          <div className="relative z-10 h-full flex flex-col">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary-300 mb-8">Bericht Verzenden</h3>
            
            {status === 'success' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }}
                className="flex-grow flex flex-col items-center justify-center text-center py-12"
              >
                <div className="w-20 h-20 bg-white/10 text-emerald-400 rounded-full flex items-center justify-center mb-6 border-2 border-emerald-400/20">
                  <Send className="w-8 h-8" />
                </div>
                <h3 className="serif text-3xl mb-4 italic">Verzonden</h3>
                <p className="text-primary-100/60 font-light max-w-xs">Bedankt voor uw bericht. We nemen zo spoedig mogelijk contact op.</p>
                <button 
                  onClick={() => setStatus(null)}
                  className="mt-12 text-xs font-bold uppercase tracking-widest bg-white/10 px-8 py-3 rounded-full hover:bg-white/20 transition-colors"
                >
                  Nieuw bericht
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6 flex-grow">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-300/60">Naam</label>
                    <input required type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary-400 focus:bg-white/10 transition-all font-light" placeholder="Uw naam" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-300/60">Email</label>
                    <input required type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary-400 focus:bg-white/10 transition-all font-light" placeholder="Email adres" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary-300/60">Onderwerp</label>
                  <select className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary-400 focus:bg-white/10 transition-all font-light appearance-none">
                    <option className="text-slate-900">Ik wil een bezichtiging plannen</option>
                    <option className="text-slate-900">Ik wil technische documentatie</option>
                    <option className="text-slate-900">Algemene vraag</option>
                  </select>
                </div>
                <div className="space-y-2 flex-grow flex flex-col">
                  <label className="text-[10px] font-black uppercase tracking-widest text-primary-300/60">Bericht</label>
                  <textarea required rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary-400 focus:bg-white/10 transition-all font-light resize-none flex-grow" placeholder="Schrijf hier uw bericht..."></textarea>
                </div>
                <button 
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full bg-white text-primary-900 font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-primary-50 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
                >
                  {status === 'sending' ? 'Verzenden...' : 'Verstuur Aanvraag'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
