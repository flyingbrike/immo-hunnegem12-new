import { Camera, MapPin, Ruler, Home as HomeIcon, Zap, ShieldCheck, Waves, Sun } from 'lucide-react';

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  isHero?: boolean;
  isSection?: boolean;
}

interface BrochureContentProps {
  heroImage: string;
  galleryImages: GalleryImage[];
}

export default function BrochureContent({ heroImage, galleryImages }: BrochureContentProps) {
  const specs = [
    { icon: <Ruler className="w-4 h-4" />, label: "Woonoppervlakte", value: "128.2 m²" },
    { icon: <Sun className="w-4 h-4" />, label: "Dakterras", value: "40 m²" },
    { icon: <HomeIcon className="w-4 h-4" />, label: "Slaapkamers", value: "2 Slaapkamers" },
    { icon: <Zap className="w-4 h-4" />, label: "Energielabel", value: "Label B" },
    { icon: <ShieldCheck className="w-4 h-4" />, label: "Beveiliging", value: "Video deurbel" },
    { icon: <Waves className="w-4 h-4" />, label: "Verwarming", value: "Vloerverwarming" },
    { icon: <Sun className="w-4 h-4" />, label: "Oriëntatie", value: "Zuid-West" },
  ];

  const locations = [
    { name: "Centrum & Markt", distance: "5 min" },
    { name: "Wandelpad langs Dender jachtpad", distance: "2 min" },
    { name: "Woonzorgcentra De Populier, Maretak en Hunnegem", distance: "5 min" },
    { name: "De Muur van Geraardsbergen", distance: "15 min" },
    { name: "Winkels & Restaurants", distance: "3 min" },
    { name: "Provinciaal Domein De Gavers", distance: "15 min" },
    { name: "Station Geraardsbergen", distance: "5 min" },
    { name: "Pairi Daiza", distance: "30 km" },
  ];

  const detailsImage = galleryImages.find(img => img.isSection)?.url || galleryImages.find(img => 
    (img.title && (
      img.title.toLowerCase().includes('achtergevel1') || 
      img.title.toLowerCase().includes('achtergevel 1') || 
      img.title.toLowerCase().includes('foto achtergevel1') ||
      img.title.toLowerCase().includes('foto_achtergevel1')
    )) || 
    img.url.toLowerCase().includes('achtergevel1')
  )?.url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800";

  return (
    <div id="full-brochure" className="bg-white text-slate-900 overflow-hidden" style={{ width: '800px' }}>
      {/* Page 1: Cover */}
      <div className="pdf-page h-[1120px] relative flex flex-col p-12">
        <div className="flex-1 rounded-[40px] overflow-hidden relative shadow-2xl">
          <img src={heroImage} alt="Cover" className="w-full h-full object-cover" crossOrigin="anonymous" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 to-transparent flex flex-col justify-end p-12">
            <span className="text-white/60 uppercase tracking-[0.3em] font-bold text-[10px] mb-4">Geraardsbergen, Oost-Vlaanderen</span>
            <h1 className="text-6xl font-black text-white leading-tight mb-8">
              Kwaliteit & <br/>
              <span className="italic font-light text-primary-300">Ruimtelijk Comfort</span>
            </h1>
          </div>
        </div>
        <div className="mt-12 grid grid-cols-3 gap-6">
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Prijs</p>
            <p className="text-2xl font-black italic">€ 275.000</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Oppervlakte</p>
            <p className="text-2xl font-black italic">128.2 m²</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Energielabel</p>
            <p className="text-2xl font-black italic text-primary-600">B</p>
          </div>
        </div>
      </div>

      {/* Page 2: Introduction */}
      <div className="pdf-page h-[1120px] p-16 flex flex-col bg-slate-50">
        <div className="max-w-2xl">
          <span className="text-primary-600 font-bold uppercase text-[10px] tracking-widest mb-4 block">Introductie</span>
          <h2 className="text-5xl font-black text-slate-900 leading-tight mb-12 italic">Zeldzame kans nabij domein Hunnegem</h2>
          <div className="space-y-8 text-slate-600 leading-relaxed font-light text-xl">
            <p>
              Statig en verrassend ruim duplex appartement (128.2m²) met man-cave en goederelift in hartje Geraardsbergen. 
            </p>
            <p>
              Dit unieke duplex appartement combineert historisch karakter met modern wooncomfort. 
              Bij aankomst valt meteen de indrukwekkende voor- en achtergevel op, die het gebouw een statige en standingvolle uitstraling geeft.
            </p>
          </div>
          <div className="mt-16 grid grid-cols-2 gap-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-4 text-sm">Indeling</h4>
              <p className="text-sm font-light leading-relaxed">
                Gelijkvloers garage met EV-lader en kelder. Deze multifunctionele kelderruimte is ideaal in te richten als privéfitness, hobbyruimte of de ultieme man-cave.
              </p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <h4 className="font-bold text-slate-900 mb-4 text-sm">Troeven</h4>
              <p className="text-sm font-light leading-relaxed">
                Unieke goederelift tussen keuken en living. Volledige vloerverwarming. Grote garage met EV-lader + kelder. Zeer centrale ligging.
              </p>
            </div>
          </div>
        </div>
        <div className="mt-auto pt-12 border-t border-slate-200">
          <img 
            src={detailsImage} 
            alt="Interior" 
            className="w-full h-64 object-cover rounded-[30px]" 
            crossOrigin="anonymous" 
          />
        </div>
      </div>

      {/* Page 3: Gallery */}
      <div className="pdf-page h-[1120px] p-16 flex flex-col bg-white">
        <div className="flex items-center space-x-4 mb-12">
          <Camera className="w-8 h-8 text-primary-600" />
          <h2 className="text-4xl font-black italic">Visuele Impressie</h2>
        </div>
        <div className="grid grid-cols-2 gap-6 flex-1">
          {galleryImages.length > 0 ? (
            galleryImages.slice(0, 4).map((img, idx) => (
              <div key={idx} className={`rounded-3xl overflow-hidden shadow-lg border-4 border-slate-100 ${idx === 0 || idx === 3 ? 'aspect-[4/3]' : 'aspect-square'}`}>
                <img src={img.url} alt={img.title} className="w-full h-full object-cover" crossOrigin="anonymous" />
              </div>
            ))
          ) : (
            <div className="col-span-2 bg-slate-50 flex items-center justify-center rounded-[40px] italic text-slate-400 border-2 border-dashed border-slate-200">
              Fotogalerij wordt geladen...
            </div>
          )}
        </div>
      </div>

      {/* Page 4: Technical Specifications */}
      <div className="pdf-page h-[1120px] p-16 flex flex-col bg-slate-900 text-white">
          <div className="mb-12">
            <h3 className="text-primary-300 uppercase tracking-widest font-black text-xs mb-10">Technische Gegevens</h3>
            <div className="grid grid-cols-2 gap-8">
              {specs.map((s, i) => (
                <div key={i} className="flex items-center space-x-6 pb-6 border-b border-white/10">
                  <div className="p-3 bg-white/10 rounded-xl text-primary-400">
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">{s.label}</p>
                    <p className="text-sm font-bold">{s.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 space-y-6 text-white/70 font-light text-sm">
            <p>• Volledige vloerverwarming op aardgas hoogrendementketel.</p>
            <p>• Duurzame materialen en hoogwaardige keramiekvloeren.</p>
            <p>• Video deurbel systeem en domotica voor-installatie.</p>
            <p>• Energiezuinig ontwerp met EPC Label B.</p>
          </div>
          <div className="mt-auto p-12 bg-white/5 rounded-[40px] border border-white/10">
            <p className="italic text-primary-200 text-center text-lg">"Een toonbeeld van modern wonen in een historisch kader."</p>
          </div>
      </div>

      {/* Page 5: Surroundings */}
      <div className="pdf-page h-[1120px] p-16 flex flex-col bg-slate-50">
          <h3 className="text-primary-600 uppercase tracking-widest font-black text-xs mb-10">Locatie & Omgeving</h3>
          <div className="grid grid-cols-1 gap-6 mb-12">
            {locations.map((l, i) => (
              <div key={i} className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-primary-50 rounded-lg">
                    <MapPin className="w-4 h-4 text-primary-600" />
                  </div>
                  <span className="text-base font-bold text-slate-800">{l.name}</span>
                </div>
                <span className="text-xs font-black text-primary-700 bg-primary-100 px-4 py-2 rounded-full uppercase tracking-widest">{l.distance}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 rounded-[40px] overflow-hidden shadow-2xl relative border-8 border-white">
            <img src="https://images.unsplash.com/photo-1493246507139-91e8bef99c1e?auto=format&fit=crop&q=80&w=800" alt="Map View" className="w-full h-full object-cover" crossOrigin="anonymous" />
            <div className="absolute inset-0 bg-primary-950/20"></div>
          </div>
      </div>

      {/* Page 6: Contact */}
      <div className="pdf-page h-[1120px] p-16 flex flex-col items-center justify-center text-center bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-50 rounded-full -mr-32 -mt-32 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary-50 rounded-full -ml-32 -mb-32 opacity-50"></div>
        
        <div className="relative z-10 max-w-lg">
          <h2 className="text-6xl font-black italic mb-8">Maak nu een afspraak</h2>
          <p className="text-xl font-light text-slate-500 mb-12 leading-relaxed">
            Interesse in dit unieke project? Neem gerust contact op voor een vrijblijvende bezichtiging ter plaatse.
          </p>
          <div className="space-y-6">
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">E-mail Contact</p>
              <p className="text-2xl font-black text-primary-600">eriksuniverse@gmail.com</p>
            </div>
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 shadow-sm">
              <p className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Locatie</p>
              <p className="text-2xl font-black text-slate-700 leading-tight">Hunnegemhoeve 4,<br/> Geraardsbergen</p>
            </div>
          </div>
        </div>
        <div className="mt-20 flex items-center space-x-4 opacity-30">
          <div className="w-12 h-0.5 bg-slate-900"></div>
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold">Exclusief Aanbod</p>
          <div className="w-12 h-0.5 bg-slate-900"></div>
        </div>
      </div>
    </div>
  );
}
