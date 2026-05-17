import { motion } from 'motion/react';
import { Ruler, Home, Zap, Waves, ShieldCheck, Sun, Sparkles } from 'lucide-react';
import { useState } from 'react';

const specs = [
  { icon: <Ruler className="w-5 h-5" />, label: "Woonoppervlakte", value: "128.2 m²" },
  { icon: <Sun className="w-5 h-5" />, label: "Dakterras", value: "40 m²" },
  { icon: <Home className="w-5 h-5" />, label: "Slaapkamers", value: "2 Slaapkamers" },
  { icon: <Zap className="w-5 h-5" />, label: "Energielabel", value: "Label B" },
  { icon: <ShieldCheck className="w-5 h-5" />, label: "Beveiliging", value: "Video deurbel. Domotica voor-installatie." },
  { icon: <Waves className="w-5 h-5" />, label: "Verwarming", value: "Vloerverwarming op aardgas hoogrendementketel" },
  { icon: <Sun className="w-5 h-5" />, label: "Oriëntatie", value: "Zuid-West" },
];

export default function Technical() {
  const [aiSummary, setAiSummary] = useState('');
  const [loading, setLoading] = useState(false);

  const generateAiSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specs: specs.map(s => `${s.label}: ${s.value}`).join(', ') }),
      });
      const data = await response.json();
      setAiSummary(data.summary);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="py-24 px-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="max-w-3xl mb-16">
        <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">Specifications</span>
        <h1 className="serif text-5xl italic mb-6 text-slate-900">Technische Gegevens</h1>
        <p className="text-lg font-light text-slate-600 leading-relaxed">
          Dit appartement werd degelijk gebouwd en is steeds met zorg onderhouden en geactualiseerd naar hedendaags comfort. Alles is van steen en beton.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {specs.map((spec, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-primary-600 transition-colors"
              >
                <div className="flex items-center space-x-4">
                  <div className="text-primary-600 bg-primary-100 p-3 rounded-lg group-hover:bg-primary-600 group-hover:text-white transition-colors">
                    {spec.icon}
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{spec.label}</h4>
                    <p className="text-sm font-bold text-slate-800">{spec.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary-600 mb-6">Aanvullende Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Stedenbouwkundige inlichtingen</h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li className="flex justify-between"><span>Bestemming</span> <span className="font-bold">Woongebied</span></li>
                    <li className="flex justify-between"><span>Vergunning</span> <span className="font-bold">Ja</span></li>
                    <li className="flex justify-between"><span>Voorkooprecht</span> <span className="font-bold">Nee</span></li>
                    <li className="flex justify-between"><span>Verkavelingsvergunning</span> <span className="font-bold">Nee</span></li>
                    <li className="flex justify-between"><span>Erfdienstbaarheden</span> <span className="font-bold">Geen</span></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Overstromingsrapport</h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li className="flex justify-between"><span>P-score (perceel)</span> <span className="font-bold text-green-600">A (geen)</span></li>
                    <li className="flex justify-between"><span>G-score (gebouw)</span> <span className="font-bold text-green-600">A (geen)</span></li>
                    <li className="flex justify-between"><span>Signaalgebied</span> <span className="font-bold">Nee</span></li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Installaties & Attesten</h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li className="flex justify-between"><span>Elektriciteitskeuring</span> <span className="font-bold text-green-600">Conform (tot 2046)</span></li>
                    <li className="flex justify-between"><span>Asbestattest</span> <span className="font-bold text-green-600">Asbestveilig</span></li>
                    <li className="flex justify-between"><span>Verwarming</span> <span className="font-bold">Vloerverwarming op aardgas hoogrendementketel</span></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Algemeen</h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li className="flex justify-between"><span>Kadastraal inkomen (niet-geïndexeerd)</span> <span className="font-bold">€ 751,-</span></li>
                    <li className="flex justify-between"><span>Bouwjaar</span> <span className="font-bold">1993 (Regelmatig onderhouden & upgedate)</span></li>
                    <li className="flex justify-between"><span>Beschikbaarheid</span> <span className="font-bold">Onmiddellijk na akte</span></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary-600 mb-6 font-sans">Oppervlaktes & Afmetingen</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Leefgedeeltes</h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li className="flex justify-between"><span>Leefruimte (Living/Eetkamer)</span> <span className="font-bold">49 m²</span></li>
                    <li className="flex justify-between"><span>Keuken</span> <span className="font-bold">9 m²</span></li>
                    <li className="flex justify-between"><span>Inkomhal / Gang</span> <span className="font-bold">8.6 m²</span></li>
                    <li className="flex justify-between"><span>Nachthal / bureel</span> <span className="font-bold">16.6 m²</span></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Extra Ruimtes</h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li className="flex justify-between"><span>Badkamer</span> <span className="font-bold">15 m²</span></li>
                    <li className="flex justify-between"><span>Berging / Wasplaats</span> <span className="font-bold">4 m²</span></li>
                    <li className="flex justify-between"><span>Garage</span> <span className="font-bold">21 m²</span></li>
                    <li className="flex justify-between"><span>Kelder</span> <span className="font-bold">60 m²</span></li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Nachtgedeelte</h4>
                  <ul className="text-sm text-slate-700 space-y-1">
                    <li className="flex justify-between"><span>Slaapkamer 1</span> <span className="font-bold">17.5 m²</span></li>
                    <li className="flex justify-between"><span>Slaapkamer 2</span> <span className="font-bold">8.5 m²</span></li>
                  </ul>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-3">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-900">Totaal Bewoonbaar</span>
                    <span className="text-xl font-black text-primary-600 italic">128.2 m²</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gemeenschappelijk kelder</span>
                    <span className="text-sm font-bold text-slate-600">50 m²</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dakterras</span>
                    <span className="text-sm font-bold text-slate-600">40 m²</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Gemeenschappelijke inkomhal</span>
                    <span className="text-sm font-bold text-slate-600">6.2 m²</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-primary-600 mb-1">AI Analyse</h3>
                <p className="serif text-xl italic text-slate-800">Verkoop Pitch</p>
              </div>
              <button 
                onClick={generateAiSummary}
                disabled={loading}
                className="flex items-center space-x-2 text-[10px] font-bold uppercase tracking-widest bg-primary-600 text-white px-6 py-3 rounded-xl hover:bg-primary-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />
                <span>{loading ? 'Genereren...' : 'Genereer Pitch'}</span>
              </button>
            </div>
            <div className="relative z-10">
              {aiSummary ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-300"
                >
                  <p className="text-sm font-light leading-relaxed italic text-slate-700">
                    "{aiSummary}"
                  </p>
                </motion.div>
              ) : (
                <p className="text-sm text-slate-400 italic">Klik op de knop om een door AI gegenereerde verkooptekst te maken op basis van de technische gegevens.</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-primary-950 text-white p-10 rounded-3xl shadow-2xl flex flex-col h-full ring-4 ring-white/10">
          <div className="mb-12">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary-300 mb-6">Bijzonderheden</h3>
            <ul className="text-[13px] space-y-4 text-white/70 font-light">
              <li className="flex items-start space-x-3">
                <span className="text-primary-400 font-bold">•</span>
                <span>Video deurbel. Domotica voor-installatie.</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-primary-400 font-bold">•</span>
                <span>Grote garage met EV-lader + Kelder</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-primary-400 font-bold">•</span>
                <span>Privé berging van 8 m²</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-primary-400 font-bold">•</span>
                <span>Hoogwaardige keramiekvloeren</span>
              </li>
              <li className="flex items-start space-x-3">
                <span className="text-primary-400 font-bold">•</span>
                <span>Designkeuken met Miele apparatuur</span>
              </li>
            </ul>
          </div>
          <div className="mt-auto pt-10 border-t border-white/10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs uppercase tracking-widest text-primary-300">Vraagprijs</span>
              <span className="text-2xl font-black italic">€ 275.000,-</span>
            </div>
            <p className="text-[10px] opacity-40 uppercase tracking-widest text-center italic">Servicekosten: €185,- p.m.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
