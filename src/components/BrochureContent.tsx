import { Camera, MapPin, Ruler, Home as HomeIcon, Zap, ShieldCheck, Waves, Sun, Sparkles, Car, Lock } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

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
  surroundingsImages?: GalleryImage[];
  homeData?: {
    price?: string;
    showPriceBlock?: boolean;
    heroSubtitle?: string;
    heroTitle?: string;
    heroDesc?: string;
    keyEnergyLabel?: string;
    keySizeLabel?: string;
    keyBedroomsLabel?: string;
    keyParkingLabel?: string;
    keyParkingDesc?: string;
    introSubtitle?: string;
    introTitle?: string;
    introDesc?: string;
    sec1Title?: string;
    sec1Desc?: string;
    sec2Title?: string;
    sec2Gelijkvloers?: string;
    sec2Eerste?: string;
    sec2Tweede?: string;
    sec3Title?: string;
    sec3Desc?: string;
    sec3Extra?: string;
    sec4Title?: string;
    sec4Desc?: string;
    troevenTitle?: string;
    troevenList?: string[];
    footerQuote?: string;
  };
  surroundingsData?: {
    subtitle?: string;
    title?: string;
    description?: string;
    locationsSubtitle?: string;
    locationsTitle?: string;
    locations?: {
      iconName?: string;
      name?: string;
      distance?: string;
    }[];
  };
  contactData?: {
    subtitle?: string;
    titleLine1?: string;
    titleLine2?: string;
    description?: string;
    phoneLabel?: string;
    phoneValue?: string;
    emailLabel?: string;
    emailValue?: string;
  };
  technicalData?: {
    introText?: string;
    specs?: { iconName: string; label: string; value: string }[];
    stedenbouw?: { label: string; value: string }[];
    overstroming?: { label: string; value: string }[];
    installaties?: { label: string; value: string }[];
    algemeen?: { label: string; value: string }[];
    leefruimtes?: { label: string; value: string }[];
    extraRuimtes?: { label: string; value: string }[];
    nachtgedeelte?: { label: string; value: string }[];
    totals?: { label: string; value: string }[];
    bijzonderheden?: string[];
    rooms?: {
      id: string;
      name: string;
      size: string;
      description: string;
      features: string[];
    }[];
    aiSummary?: string;
  };
}

export default function BrochureContent({ 
  heroImage, 
  galleryImages, 
  surroundingsImages, 
  homeData, 
  surroundingsData, 
  contactData,
  technicalData
}: BrochureContentProps) {
  const { t, dt } = useLanguage();

  // Helper to resolve room icons in the PDF
  const getRoomIcon = (id: string) => {
    switch (id) {
      case 'leefruimte': return <HomeIcon className="w-4 h-4 text-indigo-600" />;
      case 'keuken': return <Sparkles className="w-4 h-4 text-amber-500" />;
      case 'badkamer': return <Waves className="w-4 h-4 text-blue-500" />;
      case 'slaapkamer1':
      case 'slaapkamer2': return <HomeIcon className="w-4 h-4 text-sky-500" />;
      case 'berging': return <ShieldCheck className="w-4 h-4 text-teal-600" />;
      case 'nachthal': return <Ruler className="w-4 h-4 text-purple-600" />;
      case 'inkom': return <Ruler className="w-4 h-4 text-slate-500" />;
      case 'garage': return <Car className="w-4 h-4 text-rose-500" />;
      case 'kelder': return <Lock className="w-4 h-4 text-emerald-600" />;
      case 'dakterras': return <Sun className="w-4 h-4 text-orange-500" />;
      default: return <Sparkles className="w-4 h-4 text-slate-500" />;
    }
  };

  const defaultRooms = [
    {
      id: "leefruimte",
      name: "Leefruimte (Living/Eetkamer)",
      size: "49 m²",
      description: "Schitterende, lichtrijke woon- en eetkamer van maar liefst 49m². Dankzij grote raampartijen aan de voor- en achtergevel geniet u van een overvloed aan natuurlijk licht en een rustgevend, groen uitzicht over de tuinen van Hunnegem. Volledig voorzien van vloerverwarming.",
      features: ["Vloerverwarming", "Grote raampartijen", "Zuid-West oriëntatie", "Inbouwspots"]
    },
    {
      id: "keuken",
      name: "Volledig Uitgeruste Keuken",
      size: "9 m²",
      description: "Moderne designkeuken, hyper-geïnstalleerd met hoogwaardige Miele toestellen. De keuken bevindt zich op de tweede verdieping and heeft een rechtstreekse verbinding met een unieke troef: de goederelift naar de leefruimte.",
      features: ["Miele apparatuur", "Goederelift verbinding", "Granieten werkblad", "Inductieplaat"]
    },
    {
      id: "badkamer",
      name: "Badkamer met Comfort",
      size: "15 m²",
      description: "Luxueuze, volledig betegelde badkamer met een riant volume. Uitgerust met een ruim ligbad, een aparte douchecabine, een dubbel lavabomeubel en een spiegelkast. Comfortabel en functioneel ingedeeld.",
      features: ["Ligbad & Douche", "Dubbele lavabo", "Volledig betegeld", "Ventilatie"]
    },
    {
      id: "slaapkamer1",
      name: "Slaapkamer 1",
      size: "17.5 m²",
      description: "Grootste slaapkamer, gelegen onder het dak met royale afmetingen en een hoge gezelligheidsfactor. Voorzien van grote Velux dakramen voor optimale lichtinval en ingebouwde zonverduistering.",
      features: ["Groot Velux raam", "Parket-look vloer", "TV-aansluiting"]
    },
    {
      id: "slaapkamer2",
      name: "Slaapkamer 2",
      size: "8.5 m²",
      description: "Sfeervolle tweede slaapkamer, perfect geschikt als kinderkamer, logeerkamer of dressing.",
      features: ["Velux dakraam", "Hoge afwerking", "Ingebouwde bergruimte"]
    },
    {
      id: "berging",
      name: "Berging / Wasplaats",
      size: "4 m²",
      description: "Praktische berging en wasplaats met aansluiting voor wasmachine en droogkast, handig gelegen nabij de keuken en slaapvertrekken voor optimaal comfort.",
      features: ["Wasmachine aansluiting", "Extra opslagruimte", "Aparte zekeringkast"]
    },
    {
      id: "nachthal",
      name: "Nachthal / Bureel / 2de",
      size: "16.6 m²",
      description: "Ruime en multifunctionele nachthal op de tweede verdieping. Deze open ruimte is uiterst geschikt om in te richten als thuiskantoor (bureel), leeshoek of extra hobbyruimte.",
      features: ["Lichtkoepel", "Hobby / Bureau hoek", "Houten traphal verbinding"]
    },
    {
      id: "inkom",
      name: "Inkom / Gang / 1ste",
      size: "8.6 m²",
      description: "Statige privé-inkomhal op de eerste verdieping met ruimte voor een vestiairekast en toegang tot de traphal, de goederelift en de leefruimte.",
      features: ["Video-intercom", "Keramische tegelvloer", "Directe lifttoegang"]
    },
    {
      id: "garage",
      name: "Ruime Privé-Garage",
      size: "21 m²",
      description: "Grote, veilige inpandige privé-garage uitgerust met een sectionale automatische garagepoort en een professionele EV-laadpaal voor elektrische wagens. Daarnaast biedt de garage volop extra stallingsruimte voor motoren, fietsen of een handige werkbank.",
      features: ["EV-Laadpaal aanwezig", "Sectionale poort", "Directe binnentoegang", "Extra plaats voor motoren/fietsen"]
    },
    {
      id: "kelder",
      name: "Kelder / Souterrain",
      size: "60 m²",
      description: "Zeer grote, droge multifunctionele kelderruimte verdeeld in handige compartimenten. Ideaal om te gebruiken als privé-fitness, hobbyruimte, riante werkplaats of de ultieme man-cave/cinema.",
      features: ["Werkplaats faciliteit", "Droog & Geventileerd", "Hoge plafonds", "Privé berging"]
    },
    {
      id: "dakterras",
      name: "Groot Dakterras",
      size: "40 m²",
      description: "Prachtig, zonrijk dakterras van maar liefst 40m². Een zeldzame oase van rust in het centrum waar u in alle privacy kunt genieten van zonnige dagen en sfeervolle avonden.",
      features: ["Intieme privacy", "Zuid-West georiënteerd", "Keramische terrastegels", "Buitenlicht / stopcontacten"]
    }
  ];

  const defaultStedenbouw = [
    { label: "Bestemming", value: "Woongebied" },
    { label: "Vergunning", value: "Ja" },
    { label: "Voorkooprecht", value: "Nee" },
    { label: "Verkavelingsvergunning", value: "Nee" },
    { label: "Erfdienstbaarheden", value: "Geen" },
  ];

  const defaultOverstroming = [
    { label: "P-score (perceel)", value: "A (geen)" },
    { label: "G-score (gebouw)", value: "A (geen)" },
    { label: "Signaalgebied", value: "Nee" },
  ];

  const defaultInstallaties = [
    { label: "Elektriciteitskeuring", value: "Conform (tot 2046)" },
    { label: "Asbestattest", value: "Asbestveilig" },
    { label: "Verwarming", value: "Vloerverwarming op aardgas hoogrendementketel" },
  ];

  const defaultAlgemeen = [
    { label: "Kadastraal inkomen (niet-geïndexeerd)", value: "€ 751,-" },
    { label: "Bouwjaar", value: "1993 (Regelmatig onderhouden & upgedate)" },
    { label: "Beschikbaarheid", value: "Onmiddellijk na akte" },
    { label: "Constructie", value: "Steen en beton, geen houten gewelven" },
  ];

  const defaultLeefruimtes = [
    { label: "Leefruimte (Living/Eetkamer)", value: "49 m²" },
    { label: "Keuken", value: "9 m²" },
    { label: "Inkomhal / Gang", value: "8.6 m²" },
    { label: "Nachthal / bureel", value: "16.6 m²" },
  ];

  const defaultExtraRuimtes = [
    { label: "Badkamer", value: "15 m²" },
    { label: "Berging / Wasplaats", value: "4 m²" },
    { label: "Garage", value: "21 m²" },
    { label: "Kelder", value: "60 m²" },
  ];

  const defaultNachtgedeelte = [
    { label: "Slaapkamer 1", value: "17.5 m²" },
    { label: "Slaapkamer 2", value: "8.5 m²" },
  ];

  const defaultTotals = [
    { label: "Totaal Bewoonbaar", value: "128.2 m²" },
    { label: "Gemeenschappelijk kelder", value: "50 m²" },
    { label: "Dakterras", value: "40 m²" },
    { label: "Gemeenschappelijke inkomhal", value: "6.2 m²" },
  ];

  const rooms = technicalData?.rooms || defaultRooms;
  const algemeen = technicalData?.algemeen || defaultAlgemeen;
  const stedenbouw = technicalData?.stedenbouw || defaultStedenbouw;
  const overstroming = technicalData?.overstroming || defaultOverstroming;
  const installaties = technicalData?.installaties || defaultInstallaties;
  const leefruimtes = technicalData?.leefruimtes || defaultLeefruimtes;
  const extraRuimtes = technicalData?.extraRuimtes || defaultExtraRuimtes;
  const nachtgedeelte = technicalData?.nachtgedeelte || defaultNachtgedeelte;
  const totals = technicalData?.totals || defaultTotals;

  const specs = [
    { icon: <Ruler className="w-4 h-4" />, label: t('home.oppervlakte'), value: homeData?.keySizeLabel || "128.2 m²" },
    { icon: <Sun className="w-4 h-4" />, label: dt("Dakterras"), value: "40 m²" },
    { icon: <HomeIcon className="w-4 h-4" />, label: t('home.slaapkamers'), value: homeData?.keyBedroomsLabel || "2 Slaapkamers" },
    { icon: <Zap className="w-4 h-4" />, label: t('home.energielabel'), value: homeData?.keyEnergyLabel || "Label B" },
    { icon: <HomeIcon className="w-4 h-4" />, label: t('home.parkeren'), value: homeData?.keyParkingLabel || "RUIME prive GARAGE 21m²" },
    { icon: <ShieldCheck className="w-4 h-4" />, label: dt("Extra's"), value: homeData?.sec3Extra || dt("Video deurbel") },
  ];

  const defaultLocations = [
    { name: dt("Centrum & Markt"), distance: dt("5 min") },
    { name: dt("Wandelpad langs Dender jaagpad"), distance: dt("2 min") },
    { name: dt("Woonzorgcentra De Populier, Maretak en Hunnegem"), distance: dt("5 min") },
    { name: dt("De Muur van Geraardsbergen"), distance: dt("15 min") },
    { name: dt("Winkels & Restaurants"), distance: dt("3 min") },
    { name: dt("Restaurant My LunchTime"), distance: dt("50 m") },
    { name: dt("Restaurants, tavernes en terrasjes"), distance: dt("500 m") },
    { name: dt("Provinciaal Domein De Gavers"), distance: dt("15 min") },
    { name: dt("Station Geraardsbergen"), distance: dt("5 min") },
    { name: dt("Pairi Daiza"), distance: "30 km" },
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
      <div className="pdf-page h-[1120px] relative flex flex-col p-12 justify-between bg-white">
        <div className="flex-1 rounded-[40px] overflow-hidden relative shadow-2xl">
          <img src={heroImage} alt="Cover" className="w-full h-full object-cover" crossOrigin="anonymous" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/95 via-slate-900/40 to-transparent flex flex-col justify-end p-12">
            <span className="text-amber-400 uppercase tracking-[0.3em] font-black text-xs mb-3">
              {dt(homeData?.heroSubtitle || "Luxe Appartement met Garage te Koop")}
            </span>
            <h1 className="text-5xl font-black text-white leading-tight mb-6 whitespace-pre-line">
              {dt(homeData?.heroTitle || "Modern Wonen met\nVeel Ruimte")}
            </h1>
            <p className="text-white/85 text-sm max-w-xl font-light leading-relaxed mb-4">
              {dt(homeData?.heroDesc || "Luxe afwerking, 128.2m² woonoppervlakte en een ruim appartement, gelegen in centrum Geraardsbergen, midden in de Vlaamse Ardennen.")}
            </p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-3 gap-6">
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">{t('home.oppervlakte')}</p>
            <p className="text-xl font-black italic text-primary-950">{dt(homeData?.keySizeLabel || "128.2 m²")}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">{t('home.energielabel')}</p>
            <p className="text-xl font-black italic text-primary-600">{dt(homeData?.keyEnergyLabel || "Label B")}</p>
          </div>
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 shadow-sm text-center">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-1.5">{t('home.asking_price')}</p>
            <p className="text-xl font-black italic text-amber-600">
              {homeData?.showPriceBlock !== false ? dt(homeData?.price || "279.000 €") : t('home.price_on_request')}
            </p>
          </div>
        </div>
      </div>

      {/* Page 2: Introduction & Indeling */}
      <div className="pdf-page h-[1120px] p-12 flex flex-col bg-slate-50 justify-between">
        <div>
          <span className="text-primary-600 font-bold uppercase text-[10px] tracking-widest mb-2 block">
            {dt(homeData?.introSubtitle || "Architectuur & Design")}
          </span>
          <h2 className="text-4xl font-black text-slate-900 leading-tight mb-6 italic">
            {dt(homeData?.introTitle || "Zeldzame kans nabij domein Hunnegem")}
          </h2>
          
          <div className="grid grid-cols-12 gap-8 items-start">
            {/* Left side: Intro & Section 1 */}
            <div className="col-span-7 space-y-6">
              <p className="text-slate-600 leading-relaxed font-light text-sm">
                {dt(homeData?.introDesc || "Statig en verrassend ruim duplex appartement (128.2m²) met man-cave en goederelift in hartje Geraardsbergen. Dit unieke duplex appartement combineert historisch karakter met modern wooncomfort.")}
              </p>
              
              <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-2 text-sm">
                  {dt(homeData?.sec1Title || "Statige uitstraling en zeeën van ruimte")}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-light">
                  {dt(homeData?.sec1Desc || "Bij aankomst valt meteen de indrukwekkende voor- en achtergevel op, die het gebouw een statige en standingvolle uitstraling geeft. Binnenin geniet u overal van een hoogwaardige afwerking.")}
                </p>
              </div>
            </div>

            {/* Right side: Section 2 Verdiepingen */}
            <div className="col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="font-black text-primary-950 text-base italic">
                {dt(homeData?.sec2Title || "Verrassende en functionele indeling")}
              </h3>
              <div className="space-y-3 text-xs">
                <div>
                  <h4 className="font-bold text-primary-700 uppercase tracking-wider text-[10px] mb-0.5">{t('home.floor_ground_cellar')}</h4>
                  <p className="text-slate-600 font-light leading-relaxed">{dt(homeData?.sec2Gelijkvloers)}</p>
                </div>
                <div className="border-t border-slate-100 pt-2">
                  <h4 className="font-bold text-primary-700 uppercase tracking-wider text-[10px] mb-0.5">{t('home.floor_first')}</h4>
                  <p className="text-slate-600 font-light leading-relaxed">{dt(homeData?.sec2Eerste)}</p>
                </div>
                <div className="border-t border-slate-100 pt-2">
                  <h4 className="font-bold text-primary-700 uppercase tracking-wider text-[10px] mb-0.5">{t('home.floor_second')}</h4>
                  <p className="text-slate-600 font-light leading-relaxed">{dt(homeData?.sec2Tweede)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <img 
            src={detailsImage} 
            alt="Interior" 
            className="w-full h-56 object-cover rounded-[30px] shadow-md" 
            crossOrigin="anonymous" 
          />
        </div>
      </div>

      {/* Page 3: Visuele Impressie (Gallery) */}
      <div className="pdf-page h-[1120px] p-12 flex flex-col bg-white justify-between">
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <Camera className="w-7 h-7 text-primary-600" />
            <h2 className="text-3xl font-black italic">{dt("Visuele Impressie")}</h2>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {galleryImages.length > 0 ? (
              galleryImages.slice(0, 4).map((img, idx) => (
                <div key={idx} className="bg-slate-50 p-3 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between h-[380px]">
                  <div className="w-full h-[310px] rounded-2xl overflow-hidden">
                    <img src={img.url} alt={img.title} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  </div>
                  <p className="text-xs font-bold text-slate-700 text-center mt-2.5 truncate">
                    {dt(img.title)}
                  </p>
                </div>
              ))
            ) : (
              <div className="col-span-2 bg-slate-50 flex items-center justify-center rounded-[40px] italic text-slate-400 border-2 border-dashed border-slate-200">
                {dt("Fotogalerij wordt geladen...")}
              </div>
            )}
          </div>
        </div>
        <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 mt-6 flex justify-between items-center">
          <p className="text-xs text-slate-500 font-light">{dt("Dit is een selectie van de beschikbare beelden van het duplex appartement.")}</p>
          <span className="text-[10px] uppercase tracking-wider text-primary-600 font-bold">{dt("Exclusief Vastgoed")}</span>
        </div>
      </div>

      {/* Page 4: Specifications & Highlights */}
      <div className="pdf-page h-[1120px] p-12 flex flex-col justify-between" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <div>
          <div className="flex items-center space-x-3 mb-8">
            <ShieldCheck className="w-7 h-7" style={{ color: '#0284c7' }} />
            <h2 className="text-3xl font-black italic uppercase tracking-wider" style={{ color: '#0f172a' }}>{t('tech.title')}</h2>
          </div>

          <div className="grid grid-cols-12 gap-8 items-start">
            {/* Left Column: Kerngegevens spec table */}
            <div className="col-span-6 space-y-6">
              <div className="p-6 rounded-3xl border space-y-4 shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                <h3 className="text-xs uppercase tracking-widest font-black mb-2" style={{ color: '#0369a1' }}>{t('home.kerngegevens')}</h3>
                <div className="grid grid-cols-1 gap-4">
                  {specs.map((s, i) => (
                    <div key={i} className="flex items-center space-x-4 pb-3 border-b last:border-0 last:pb-0" style={{ borderBottomColor: '#f1f5f9' }}>
                      <div className="p-2 rounded-xl" style={{ backgroundColor: '#f0f9ff', color: '#0284c7' }}>
                        {s.icon}
                      </div>
                      <div>
                        <p className="text-[8px] uppercase tracking-widest mb-0.5" style={{ color: '#64748b' }}>{s.label}</p>
                        <p className="text-xs font-bold" style={{ color: '#0f172a' }}>{dt(s.value)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unique goederelift highlight card */}
              <div className="p-6 rounded-3xl border space-y-2 shadow-sm" style={{ backgroundColor: '#f0f9ff', borderColor: '#bae6fd' }}>
                <h3 className="font-bold text-sm flex items-center gap-2" style={{ color: '#0369a1' }}>
                  <span>{dt(homeData?.sec3Title || "Unieke troef: De goederelift")}</span>
                </h3>
                <p className="text-xs font-light leading-relaxed" style={{ color: '#334155' }}>
                  {dt(homeData?.sec3Desc || "Geen gesleur met zware boodschappen of dienbladen op de trap! Een slimme, compacte goederelift verbindt de keuken rechtstreeks met de leefruimte.")}
                </p>
                {homeData?.sec3Extra && (
                  <p className="text-[10px] font-semibold mt-1" style={{ color: '#b45309' }}>
                    • {dt(homeData.sec3Extra)}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Highlights / Troeven */}
            <div className="col-span-6 space-y-6">
              <div className="p-6 rounded-3xl border space-y-4 shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                <h3 className="text-xs uppercase tracking-widest font-black" style={{ color: '#0369a1' }}>
                  {dt(homeData?.troevenTitle || "Troeven in de kijker")}
                </h3>
                <div className="space-y-3.5 text-xs font-light" style={{ color: '#334155' }}>
                  {homeData?.troevenList && homeData.troevenList.length > 0 ? (
                    homeData.troevenList.slice(0, 8).map((troef, idx) => (
                      <div key={idx} className="flex items-start space-x-2.5">
                        <span className="font-bold mt-0.5" style={{ color: '#0284c7' }}>•</span>
                        <span>{dt(troef)}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="flex items-start space-x-2.5">
                        <span className="font-bold mt-0.5" style={{ color: '#0284c7' }}>•</span>
                        <span>{dt("128.2m² bewoonbare oppervlakte")}</span>
                      </div>
                      <div className="flex items-start space-x-2.5">
                        <span className="font-bold mt-0.5" style={{ color: '#0284c7' }}>•</span>
                        <span>{dt("Dakterras van 40m²")}</span>
                      </div>
                      <div className="flex items-start space-x-2.5">
                        <span className="font-bold mt-0.5" style={{ color: '#0284c7' }}>•</span>
                        <span>{dt("Grote garage met EV-lader + kelder")}</span>
                      </div>
                      <div className="flex items-start space-x-2.5">
                        <span className="font-bold mt-0.5" style={{ color: '#0284c7' }}>•</span>
                        <span>{dt("Unieke goederelift tussen keuken en living")}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Toplocatie in de Vlaamse Ardennen card */}
              <div className="p-6 rounded-3xl border space-y-2 shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                <h3 className="font-bold text-sm" style={{ color: '#0369a1' }}>
                  {dt(homeData?.sec4Title || "Toplocatie in de Vlaamse Ardennen")}
                </h3>
                <p className="text-xs font-light leading-relaxed" style={{ color: '#475569' }}>
                  {dt(homeData?.sec4Desc || "U woont hier midden in het centrum van Geraardsbergen met winkels, openbaar vervoer en gezellige horeca op wandelafstand.")}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 rounded-3xl border mt-6 shadow-sm" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
          <p className="italic text-center text-sm font-medium" style={{ color: '#0369a1' }}>
            "{dt(homeData?.footerQuote || "Ontwikkeld met een focus op modern wonen in Geraardsbergen.")}"
          </p>
        </div>
      </div>

      {/* Page 5: Technische Gegevens & Installaties */}
      <div className="pdf-page h-[1120px] p-12 flex flex-col justify-between bg-slate-50 text-slate-800" style={{ backgroundColor: '#f8fafc' }}>
        <div>
          {/* Header */}
          <div className="border-b-4 border-indigo-950 pb-3 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700 block">
              {dt("Gebouwendossier & Specificaties")}
            </span>
            <h2 className="text-3xl font-black text-slate-900 italic mt-0.5">
              {dt("Technische Gegevens")}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Left Column: Algemeen & Installaties */}
            <div className="space-y-6">
              {/* Algemeen */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest mb-3 text-indigo-800 border-b border-slate-100 pb-1.5">
                  {dt("Algemeen")}
                </h3>
                <div className="space-y-2 text-xs">
                  {algemeen.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-50 last:border-0">
                      <span className="font-medium text-slate-400">{dt(item.label)}</span>
                      <span className="font-bold text-slate-800 text-right">{dt(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technische Installaties */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest mb-3 text-indigo-800 border-b border-slate-100 pb-1.5">
                  {dt("Technische Installaties")}
                </h3>
                <div className="space-y-2 text-xs">
                  {installaties.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col py-1.5 border-b border-slate-50 last:border-0">
                      <span className="font-medium text-slate-400 text-[10px] uppercase tracking-wider mb-0.5">{dt(item.label)}</span>
                      <span className="font-bold text-slate-800">{dt(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Overstroming */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest mb-3 text-indigo-800 border-b border-slate-100 pb-1.5">
                  {dt("Overstromingsrisico")}
                </h3>
                <div className="space-y-2 text-xs">
                  {overstroming.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-50 last:border-0">
                      <span className="font-medium text-slate-400">{dt(item.label)}</span>
                      <span className="font-bold text-slate-800 text-right">{dt(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Stedenbouw & Oppervlaktes */}
            <div className="space-y-6">
              {/* Stedenbouw */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest mb-3 text-indigo-800 border-b border-slate-100 pb-1.5">
                  {dt("Stedenbouw")}
                </h3>
                <div className="space-y-2 text-xs">
                  {stedenbouw.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between py-1 border-b border-slate-50 last:border-0">
                      <span className="font-medium text-slate-400">{dt(item.label)}</span>
                      <span className="font-bold text-slate-800 text-right">{dt(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Oppervlaktes & Totalen */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-widest mb-3 text-indigo-800 border-b border-slate-100 pb-1.5">
                  {dt("Gedetailleerde Oppervlaktes")}
                </h3>
                <div className="space-y-2.5 text-xs">
                  {/* Leefruimtes */}
                  <div>
                    <span className="font-black text-indigo-750 text-[10px] uppercase tracking-wider block mb-1">{dt("Leefruimtes (2de verdieping)")}</span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-1">
                      {leefruimtes.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                          <span className="text-slate-400 font-light truncate max-w-[120px]">{dt(item.label)}</span>
                          <span className="font-bold text-slate-800">{dt(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Nachtgedeelte */}
                  <div className="border-t border-slate-100 pt-2">
                    <span className="font-black text-indigo-750 text-[10px] uppercase tracking-wider block mb-1">{dt("Nachtgedeelte & Berging")}</span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-1">
                      {nachtgedeelte.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                          <span className="text-slate-400 font-light truncate max-w-[120px]">{dt(item.label)}</span>
                          <span className="font-bold text-slate-800">{dt(item.value)}</span>
                        </div>
                      ))}
                      {extraRuimtes.slice(0, 2).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                          <span className="text-slate-400 font-light truncate max-w-[120px]">{dt(item.label)}</span>
                          <span className="font-bold text-slate-800">{dt(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Overige ruimtes */}
                  <div className="border-t border-slate-100 pt-2">
                    <span className="font-black text-indigo-750 text-[10px] uppercase tracking-wider block mb-1">{dt("Garage & Kelder")}</span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-1">
                      {extraRuimtes.slice(2).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                          <span className="text-slate-400 font-light truncate max-w-[120px]">{dt(item.label)}</span>
                          <span className="font-bold text-slate-800">{dt(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Totalen */}
                  <div className="border-t-2 border-indigo-100 pt-2 mt-1">
                    <span className="font-black text-slate-900 text-[10px] uppercase tracking-wider block mb-1">{dt("Totaaloverzicht")}</span>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-1">
                      {totals.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between py-0.5 border-b border-slate-50 text-[11px]">
                          <span className="text-slate-500 font-bold truncate max-w-[120px]">{dt(item.label)}</span>
                          <span className="font-black text-indigo-950">{dt(item.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono">
          <span>{dt("TECHNISCHE SPECIFICATIES")}</span>
          <span>{dt("PAGINA 5")}</span>
        </div>
      </div>

      {/* Page 6: Gedetailleerde Fiche per Ruimte (Deel 1) */}
      <div className="pdf-page h-[1120px] p-12 flex flex-col justify-between bg-slate-50 text-slate-800" style={{ backgroundColor: '#ffffff' }}>
        <div>
          {/* Header */}
          <div className="border-b-4 border-indigo-950 pb-3 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700 block">
              {dt("Fiche per Ruimte")}
            </span>
            <h2 className="text-3xl font-black text-slate-900 italic mt-0.5">
              {dt("Gedetailleerde Fiche per Ruimte (Deel 1)")}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {rooms.slice(0, 6).map((room: any, idx: number) => (
              <div key={idx} className="bg-slate-50/75 p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-[255px]">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      {getRoomIcon(room.id)}
                      <h4 className="font-bold text-xs text-slate-900 truncate">{dt(room.name)}</h4>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded shrink-0">
                      {dt(room.size)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-light leading-relaxed mb-3 line-clamp-4">
                    {dt(room.description)}
                  </p>
                </div>
                <div>
                  {room.features && room.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {room.features.slice(0, 4).map((feat: string, fIdx: number) => (
                        <span key={fIdx} className="text-[9px] font-medium bg-white text-slate-600 border border-slate-200/60 px-1.5 py-0.5 rounded">
                          {dt(feat)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono mt-4">
          <span>{dt("RUIMTE FICHE DEEL 1")}</span>
          <span>{dt("PAGINA 6")}</span>
        </div>
      </div>

      {/* Page 7: Gedetailleerde Fiche per Ruimte (Deel 2) */}
      <div className="pdf-page h-[1120px] p-12 flex flex-col justify-between bg-slate-50 text-slate-800" style={{ backgroundColor: '#ffffff' }}>
        <div>
          {/* Header */}
          <div className="border-b-4 border-indigo-950 pb-3 mb-6">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700 block">
              {dt("Fiche per Ruimte")}
            </span>
            <h2 className="text-3xl font-black text-slate-900 italic mt-0.5">
              {dt("Gedetailleerde Fiche per Ruimte (Deel 2)")}
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {rooms.slice(6).map((room: any, idx: number) => (
              <div key={idx} className="bg-slate-50/75 p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col justify-between h-[255px]">
                <div>
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0 pr-2">
                      {getRoomIcon(room.id)}
                      <h4 className="font-bold text-xs text-slate-900 truncate">{dt(room.name)}</h4>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded shrink-0">
                      {dt(room.size)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-light leading-relaxed mb-3 line-clamp-4">
                    {dt(room.description)}
                  </p>
                </div>
                <div>
                  {room.features && room.features.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {room.features.slice(0, 4).map((feat: string, fIdx: number) => (
                        <span key={fIdx} className="text-[9px] font-medium bg-white text-slate-600 border border-slate-200/60 px-1.5 py-0.5 rounded">
                          {dt(feat)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400 font-mono mt-4">
          <span>{dt("RUIMTE FICHE DEEL 2")}</span>
          <span>{dt("PAGINA 7")}</span>
        </div>
      </div>

      {/* Page 8: Surroundings */}
      <div className="pdf-page h-[1120px] p-12 flex flex-col justify-between" style={{ backgroundColor: '#f8fafc', color: '#0f172a' }}>
        <div>
          <span className="font-bold uppercase text-[10px] tracking-widest mb-2 block" style={{ color: '#0284c7' }}>
            {dt(surroundingsData?.subtitle || "Locatie & Omgeving")}
          </span>
          <h2 className="text-4xl font-black leading-tight mb-6 italic" style={{ color: '#0f172a' }}>
            {dt(surroundingsData?.title || "Ontdek de Omgeving")}
          </h2>
          <p className="text-sm font-light leading-relaxed mb-8 max-w-2xl" style={{ color: '#64748b' }}>
            {dt(surroundingsData?.description || "Gelegen in het hart van de Vlaamse Ardennen, biedt dit appartement het beste van twee werelden: de levendigheid van de historische stad en de rust van de omliggende natuur.")}
          </p>

          <div className="grid grid-cols-2 gap-4">
            {((surroundingsData?.locations || []).length > 0 ? (surroundingsData?.locations || []) : defaultLocations).slice(0, 10).map((l, i) => (
              <div key={i} className="flex justify-between items-center px-4 py-3 rounded-2xl shadow-sm border" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: '#f0f9ff' }}>
                    <MapPin className="w-3.5 h-3.5 text-primary-600" style={{ color: '#0284c7' }} />
                  </div>
                  <span className="text-xs font-bold truncate" style={{ color: '#1e293b' }}>{dt(l.name)}</span>
                </div>
                <span className="text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider shrink-0" style={{ color: '#0369a1', backgroundColor: '#e0f2fe' }}>{dt(l.distance)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 rounded-[40px] overflow-hidden shadow-md relative border-8 border-white mt-8 min-h-[300px]">
          <img 
            src={surroundingsImages && surroundingsImages.length > 0 ? surroundingsImages[0].url : "https://images.unsplash.com/photo-1549144511-f099e773c147?auto=format&fit=crop&q=80&w=800"} 
            alt="Omgeving View" 
            className="w-full h-full object-cover" 
            crossOrigin="anonymous" 
          />
          <div className="absolute inset-0 bg-primary-950/10" style={{ backgroundColor: 'rgba(8, 47, 73, 0.1)' }}></div>
          {surroundingsImages && surroundingsImages.length > 0 && (
            <div className="absolute bottom-4 left-4 backdrop-blur-sm px-4 py-1.5 rounded-xl border text-white text-[10px] font-bold" style={{ backgroundColor: 'rgba(15, 23, 42, 0.8)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
              {dt(surroundingsImages[0].title)}
            </div>
          )}
        </div>
      </div>

      {/* Page 6: Contact */}
      <div className="pdf-page h-[1120px] p-12 flex flex-col items-center justify-center text-center relative overflow-hidden justify-between" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32 opacity-50" style={{ backgroundColor: '#f0f9ff' }}></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full -ml-32 -mb-32 opacity-50" style={{ backgroundColor: '#f0f9ff' }}></div>
        
        <div className="relative z-10 max-w-lg my-auto space-y-8">
          <div>
            <span className="font-bold uppercase text-xs tracking-widest mb-3 block" style={{ color: '#0284c7' }}>
              {dt(contactData?.subtitle || "Neem contact op")}
            </span>
            <h2 className="text-5xl font-black italic leading-tight" style={{ color: '#082f49' }}>
              {dt(contactData?.titleLine1 || "Interesse?")} <br/>
              <span className="font-light" style={{ color: '#0284c7' }}>{dt(contactData?.titleLine2 || "Plan een Afspraak")}</span>
            </h2>
          </div>
          
          <p className="text-base font-light leading-relaxed" style={{ color: '#64748b' }}>
            {dt(contactData?.description || "Heeft u interesse in een bezichtiging of wilt u meer informatie ontvangen? Neem gerust contact met ons op. We helpen u graag verder.")}
          </p>
          
          <div className="space-y-4">
            <div className="p-6 rounded-3xl border shadow-sm" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: '#94a3b8' }}>
                {dt(contactData?.phoneLabel || "Telefoon en whatsapp")}
              </p>
              <p className="text-xl font-black" style={{ color: '#1e293b' }}>{dt(contactData?.phoneValue || "0032 (0) 475 701549")}</p>
            </div>
            <div className="p-6 rounded-3xl border shadow-sm" style={{ backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }}>
              <p className="text-[10px] uppercase tracking-widest font-bold mb-1.5" style={{ color: '#94a3b8' }}>
                {dt(contactData?.emailLabel || "Email")}
              </p>
              <p className="text-xl font-black" style={{ color: '#0284c7' }}>{dt(contactData?.emailValue || "eriksuniverse@gmail.com")}</p>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center space-x-4 opacity-30 relative z-10">
          <div className="w-12 h-0.5 bg-slate-900" style={{ backgroundColor: '#0f172a' }}></div>
          <p className="text-[10px] uppercase tracking-[0.4em] font-bold" style={{ color: '#0f172a' }}>{dt("Exclusief Aanbod")}</p>
          <div className="w-12 h-0.5 bg-slate-900" style={{ backgroundColor: '#0f172a' }}></div>
        </div>
      </div>
    </div>
  );
}
