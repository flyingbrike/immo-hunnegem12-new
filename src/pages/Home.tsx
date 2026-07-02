import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, ArrowLeft, FileDown, Lock, Edit3, Save, X, Plus, Trash2, LogOut, MapPin, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, loginWithGoogle, db } from '../lib/firebase';
import { collection, onSnapshot, query, doc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import BrochureContent from '../components/BrochureContent';
import { useLanguage } from '../context/LanguageContext';
import { GalleryImage } from '../types';

const DEFAULT_IMAGES = [
  { id: 'def1', url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1000", title: "Lichtrijke Woonkamer" },
  { id: 'def2', url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=1000", title: "Zuidgericht Terras" },
  { id: 'def3', url: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&q=80&w=1000", title: "Moderne Badkamer" },
  { id: 'def4', url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1000", title: "Keuken Detail" },
];

const defaultHomeData = {
  price: "279.000 €",
  showPriceBlock: true,
  heroSubtitle: "Luxe Appartement met Garage te Koop",
  heroTitle: "Modern Wonen met\nVeel Ruimte",
  heroDesc: "Luxe afwerking, 128.2m² woonoppervlakte en een ruim appartement, gelegen in centrum Geraardsbergen, midden in de Vlaamse Ardennen.",
  keyEnergyLabel: "Label B",
  keySizeLabel: "128.2 m²",
  keyBedroomsLabel: "2 Slaapkamers",
  keyParkingLabel: "RUIME prive GARAGE 21m²",
  keyParkingDesc: "auto + motor/fietsen",
  introSubtitle: "Architectuur & Design",
  introTitle: "Zeldzame kans nabij domein Hunnegem",
  introDesc: "Statig en verrassend ruim appartement met garage (128.2 m²) met man-cave en goederelift in hartje Geraardsbergen. Bent u op zoek naar het comfort van een appartement, maar wilt u het ruimtelijke gevoel van een eengezinswoning niet missen? Dit unieke appartement van maar liefst 128.2 m² combineert historisch karakter met modern wooncomfort, gelegen in het bruisende centrum van Geraardsbergen, de poort naar de prachtige Vlaamse Ardennen.",
  sec1Title: "Statige uitstraling en zeeën van ruimte",
  sec1Desc: "Bij aankomst valt meteen de indrukwekkende voor- en achtergevel op, die het gebouw een statige en standingvolle uitstraling geeft. Binnenin geniet u overal van een hoogwaardige afwerking met duurzame vloeren en het ultieme comfort van vloerverwarming op aardgas hoogrendementketel.",
  sec2Title: "Verrassende en functionele indeling",
  sec2Gelijkvloers: "Een grote garage met EV-lader en een royale onderliggende kelder. Deze multifunctionele kelderruimte is ideaal in te richten als privéfitness, hobbyruimte of de ultieme man-cave.",
  sec2Eerste: "Een schitterende, lichtrijke woon- en eetruimte van maar liefst 50m². Dankzij de grote raampartijen geniet u hier van een overvloed aan natuurlijk licht en een rustgevend, groen uitzicht.",
  sec2Tweede: "Hier bevinden zich twee volwaardige slaapkamers, een ruime badkamer en de volledig uitgeruste keuken.",
  sec3Title: "Unieke troef: De goederelift",
  sec3Desc: "Geen gesleur met zware boodschappen of dienbladen op de trap! Een slimme, compacte goederelift verbindt de keuken op de tweede verdieping rechtstreeks met de leefruimte op de eerste verdieping. Zo serveert u diners en drankjes in een handomdraai.",
  sec3Extra: "Video deurbel. Domotica voor-installatie.",
  sec4Title: "Toplocatie in de Vlaamse Ardennen",
  sec4Desc: "U woont hier midden in het centrum van Geraardsbergen met winkels, openbaar vervoer en gezellige horeca op wandelafstand. Tegelijkertijd fietst of wandelt u zo de natuur van de Vlaamse Ardennen in.",
  troevenTitle: "Troeven in de kijker",
  troevenList: [
    '128.2m² bewoonbare oppervlakte',
    'Dakterras van 40m²',
    'Lichtrijke leefruimte van 49m² met groen uitzicht',
    'Vloerverwarming op aardgas hoogrendementketel',
    'Hoogwaardige keramiekvloeren',
    'Grote garage met EV-lader + kelder (geschikt voor man-cave/fitness/hobby)',
    'Unieke goederelift tussen keuken en living',
    'Video deurbel. Domotica voor-installatie.',
    'Centrale, doch groene ligging'
  ],
  footerQuote: "Ontwikkeld door gerenommeerde architecten met een focus op modern wonen in Geraardsbergen."
};

export default function Home() {
  const { t, dt, language } = useLanguage();

  // Get initial image list from cache
  const initialImages = (() => {
    try {
      const cached = localStorage.getItem('cached_gallery_images');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return DEFAULT_IMAGES;
  })();

  const initialHeroImage = (() => {
    const backFacade = initialImages.find((img: any) => img.isHero) || initialImages.find((img: any) => 
      (img.title && (
        img.title.toLowerCase().includes('achtergevel1') || 
        img.title.toLowerCase().includes('achtergevel 1') || 
        img.title.toLowerCase().includes('foto achtergevel1') ||
        img.title.toLowerCase().includes('foto_achtergevel1')
      )) || 
      (img.url && img.url.toLowerCase().includes('achtergevel1'))
    ) || initialImages.find((img: any) => 
      (img.title && img.title.toLowerCase().includes('achtergevel')) || 
      (img.url && img.url.toLowerCase().includes('achtergevel'))
    );
    return backFacade ? backFacade.url : initialImages[0].url;
  })();

  const initialDetailsImage = (() => {
    const pinnedSection = initialImages.find((img: any) => img.isSection);
    if (pinnedSection) return pinnedSection.url;
    
    const backFacade1 = initialImages.find((img: any) => 
      (img.title && img.title.toLowerCase() === 'achtergevel') || 
      (img.title && img.title.toLowerCase().includes('achtergevel') && !img.title.toLowerCase().includes('achtergevel1')) ||
      (img.url && img.url.toLowerCase().includes('achtergevel') && !img.url.toLowerCase().includes('achtergevel1'))
    ) || initialImages.find((img: any) => 
      (img.title && (
        img.title.toLowerCase().includes('achtergevel1') || 
        img.title.toLowerCase().includes('achtergevel 1') ||
        img.title.toLowerCase().includes('foto achtergevel1')
      )) || 
      (img.url && img.url.toLowerCase().includes('achtergevel1'))
    );
    return backFacade1 ? backFacade1.url : (initialImages[3] ? initialImages[3].url : initialImages[0].url);
  })();

  const initialSurroundingsImages = (() => {
    try {
      const cached = localStorage.getItem('cached_surroundings_images');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {}
    return [];
  })();

  const initialHomeData = (() => {
    try {
      const cached = localStorage.getItem('cached_home_data');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {}
    return { ...defaultHomeData };
  })();

  const [heroImage, setHeroImage] = useState(initialHeroImage);
  const [detailsImage, setDetailsImage] = useState(initialDetailsImage);
  const [imageList, setImageList] = useState<GalleryImage[]>(initialImages);
  const [isDownloading, setIsDownloading] = useState(false);
  const [surroundingsData, setSurroundingsData] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('cached_surroundings_data');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });
  const [contactData, setContactData] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('cached_contact_data');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });
  const [surroundingsImages, setSurroundingsImages] = useState<any[]>(initialSurroundingsImages);
  const [technicalData, setTechnicalData] = useState<any>(() => {
    try {
      const cached = localStorage.getItem('cached_technical_data');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return null;
  });

  const [homeData, setHomeData] = useState(() => ({ ...initialHomeData }));
  const [draftHomeData, setDraftHomeData] = useState(() => ({ ...initialHomeData }));
  const [editMode, setEditMode] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [selectedHomeImage, setSelectedHomeImage] = useState<GalleryImage | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollGallery = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === 'left' 
        ? scrollLeft - clientWidth * 0.75 
        : scrollLeft + clientWidth * 0.75;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
    }
  };

  // Ultra-smooth slow automatic scrolling effect with mouse/touch interaction pause
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animationFrameId: number;
    let isPaused = false;
    let direction = 1; // 1 = forward, -1 = backward
    let currentScrollX = el.scrollLeft;

    const step = () => {
      if (!el) return;

      if (!isPaused) {
        // Increment scroll slowly
        currentScrollX += 0.5 * direction;
        el.scrollLeft = currentScrollX;

        const maxScroll = el.scrollWidth - el.clientWidth;
        
        // If we hit boundaries, reverse direction
        if (currentScrollX >= maxScroll - 1) {
          direction = -1;
          currentScrollX = maxScroll - 1;
        } else if (currentScrollX <= 1) {
          direction = 1;
          currentScrollX = 1;
        }
      } else {
        // Update tracker to actual scroll if user scrolled/swiped
        currentScrollX = el.scrollLeft;
      }

      animationFrameId = requestAnimationFrame(step);
    };

    const handleMouseEnter = () => {
      isPaused = true;
    };

    const handleMouseLeave = () => {
      isPaused = false;
    };

    const handleTouchStart = () => {
      isPaused = true;
    };

    const handleTouchEnd = () => {
      setTimeout(() => {
        isPaused = false;
      }, 1000);
    };

    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Start auto scroll
    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (el) {
        el.removeEventListener('mouseenter', handleMouseEnter);
        el.removeEventListener('mouseleave', handleMouseLeave);
        el.removeEventListener('touchstart', handleTouchStart);
        el.removeEventListener('touchend', handleTouchEnd);
      }
    };
  }, [imageList]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
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

    // 1. Subscribe to home_data
    const unsubHome = onSnapshot(doc(db, 'home_data', 'page_content'), (docSnap) => {
      if (docSnap.exists()) {
        const homeDataObj = docSnap.data();
        setHomeData(prev => {
          const next = { ...prev, ...homeDataObj };
          try {
            localStorage.setItem('cached_home_data', JSON.stringify(next));
          } catch (e) {}
          return next;
        });
      }
    }, (err) => {
      console.warn("Failed to subscribe to home_data:", err);
    });

    // 2. Subscribe to surroundings_data
    const unsubSurr = onSnapshot(doc(db, 'surroundings_data', 'page_content'), (docSnap) => {
      if (docSnap.exists()) {
        const surrDataObj = docSnap.data();
        setSurroundingsData(surrDataObj);
        try {
          localStorage.setItem('cached_surroundings_data', JSON.stringify(surrDataObj));
        } catch (e) {}
      }
    }, (err) => {
      console.warn("Failed to subscribe to surroundings_data:", err);
    });

    // 3. Subscribe to contact_data
    const unsubContact = onSnapshot(doc(db, 'contact_data', 'page_content'), (docSnap) => {
      if (docSnap.exists()) {
        const contactDataObj = docSnap.data();
        setContactData(contactDataObj);
        try {
          localStorage.setItem('cached_contact_data', JSON.stringify(contactDataObj));
        } catch (e) {}
      }
    }, (err) => {
      console.warn("Failed to subscribe to contact_data:", err);
    });

    // 4. Subscribe to technical_data
    const unsubTech = onSnapshot(doc(db, 'technical_data', 'page_content'), (docSnap) => {
      if (docSnap.exists()) {
        const techDataObj = docSnap.data();
        setTechnicalData(techDataObj);
        try {
          localStorage.setItem('cached_technical_data', JSON.stringify(techDataObj));
        } catch (e) {}
      }
    }, (err) => {
      console.warn("Failed to subscribe to technical_data:", err);
    });

    // 5. Subscribe to gallery
    const qGallery = query(collection(db, 'gallery'));
    const unsubGallery = onSnapshot(qGallery, (snapshot) => {
      let dbImages = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as GalleryImage[];

      if (!dbImages || dbImages.length === 0) {
        dbImages = DEFAULT_IMAGES;
      } else {
        try {
          localStorage.setItem('cached_gallery_images', JSON.stringify(dbImages));
        } catch (e) {}
      }
      
      setImageList(dbImages);

      if (dbImages.length > 0) {
        const pinnedHero = dbImages.find((img: any) => img.isHero);
        if (pinnedHero) {
          setHeroImage(pinnedHero.url);
        } else {
          const backFacade = dbImages.find(img => 
            (img.title && (
              img.title.toLowerCase().includes('achtergevel1') || 
              img.title.toLowerCase().includes('achtergevel 1') || 
              img.title.toLowerCase().includes('foto achtergevel1') ||
              img.title.toLowerCase().includes('foto_achtergevel1')
            )) || 
            img.url.toLowerCase().includes('achtergevel1')
          ) || dbImages.find(img => 
            (img.title && img.title.toLowerCase().includes('achtergevel')) || 
            img.url.toLowerCase().includes('achtergevel')
          );
          
          if (backFacade) {
            setHeroImage(backFacade.url);
          } else {
            setHeroImage(dbImages[0].url);
          }
        }

        const pinnedSection = dbImages.find((img: any) => img.isSection);
        if (pinnedSection) {
          setDetailsImage(pinnedSection.url);
        } else {
          const backFacade1 = dbImages.find(img => 
            (img.title && img.title.toLowerCase() === 'achtergevel') || 
            (img.title && img.title.toLowerCase().includes('achtergevel') && !img.title.toLowerCase().includes('achtergevel1')) ||
            (img.url.toLowerCase().includes('achtergevel') && !img.url.toLowerCase().includes('achtergevel1'))
          ) || dbImages.find(img => 
            (img.title && (
              img.title.toLowerCase().includes('achtergevel1') || 
              img.title.toLowerCase().includes('achtergevel 1') ||
              img.title.toLowerCase().includes('foto achtergevel1')
            )) || 
            img.url.toLowerCase().includes('achtergevel1')
          );

          if (backFacade1) {
            setDetailsImage(backFacade1.url);
          }
        }
      }
    }, (err) => {
      console.warn("Failed to subscribe to gallery:", err);
    });

    // 6. Subscribe to surroundings_gallery
    const qSurrGallery = query(collection(db, 'surroundings_gallery'));
    const unsubSurrGallery = onSnapshot(qSurrGallery, (snapshot) => {
      const dbImages = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as GalleryImage[];

      if (dbImages && dbImages.length > 0) {
        setSurroundingsImages(dbImages);
        try {
          localStorage.setItem('cached_surroundings_images', JSON.stringify(dbImages));
        } catch (e) {}
      }
    }, (err) => {
      console.warn("Failed to subscribe to surroundings_gallery:", err);
    });

    return () => {
      unsubscribeAuth();
      unsubHome();
      unsubSurr();
      unsubContact();
      unsubTech();
      unsubGallery();
      unsubSurrGallery();
    };
  }, []);

  const downloadPdf = async () => {
    if (isDownloading) return;

    try {
      setIsDownloading(true);
      
      // Wait for the hidden brochure content to be fully ready
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const brochureContainer = document.getElementById('full-brochure');
      if (!brochureContainer) throw new Error("Brochure container not found");

      const pages = brochureContainer.querySelectorAll('.pdf-page');
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });

      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        
        // Capture each page individually for better quality and reliable splitting
        const dataUrl = await domToPng(page, {
          scale: 1.5,
          backgroundColor: '#ffffff',
        });

        if (i > 0) pdf.addPage();
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        // Give the UI a chance to breathe
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      pdf.save('Luxe-Brochure-Appartement-Geraardsbergen.pdf');
      
    } catch (error) {
      console.error('PDF generation failed:', error);
      const msg = error instanceof Error ? error.message : 'Onbekende fout';
      alert(t('error.pdf_generation') + msg);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative bg-slate-50 min-h-screen">
      {/* Admin Floating Controller Bar */}
      {user && (
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-primary-100 shadow-sm px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-800 uppercase tracking-widest block">{t('ui.admin_panel')}</span>
              <span className="text-[9px] text-slate-400 font-mono">{user.email}</span>
            </div>
          </div>
          <div className="flex gap-2">
            {!editMode ? (
              <button
                onClick={() => {
                  setDraftHomeData({ ...homeData });
                  setEditMode(true);
                }}
                className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t('ui.edit')}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={async () => {
                    try {
                      await setDoc(doc(db, 'home_data', 'page_content'), {
                        ...draftHomeData,
                        updatedAt: new Date().toISOString(),
                        updatedBy: user.uid
                      }, { merge: true });
                      setHomeData({ ...draftHomeData });
                      setEditMode(false);
                    } catch (err) {
                      console.error("Save home data error: ", err);
                      alert(t('error.save_failed') + err);
                    }
                  }}
                  className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{t('ui.save')}</span>
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>{t('ui.cancel')}</span>
                </button>
              </>
            )}
            <button
              onClick={() => signOut(auth)}
              className="text-slate-400 hover:text-red-600 transition-colors p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer flex items-center justify-center"
              title={t('ui.logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hidden Brochure Content for PDF Generation */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none opacity-0 z-[-1]">
        <BrochureContent 
          heroImage={heroImage} 
          galleryImages={imageList} 
          surroundingsImages={surroundingsImages}
          homeData={homeData} 
          surroundingsData={surroundingsData}
          contactData={contactData}
          technicalData={technicalData}
        />
      </div>

      <div id="property-details">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-4 pb-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="md:col-span-8 relative h-[600px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
          >
            <img 
              src={heroImage} 
              alt="Geraardsbergen Woning" 
              className="w-full h-full object-cover"
              crossOrigin="anonymous"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-sky-50/95 via-sky-50/50 to-transparent flex flex-col justify-end p-12 text-primary-950">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full"
              >
                {editMode ? (
                  <div className="space-y-4 bg-primary-950/40 p-6 rounded-2xl backdrop-blur-sm border border-white/10">
                    <div>
                      <label className="text-[10px] text-primary-300 uppercase tracking-widest font-bold mb-1 block">Hero Subtitel</label>
                      <input 
                        type="text"
                        value={draftHomeData.heroSubtitle}
                        onChange={e => setDraftHomeData(prev => ({ ...prev, heroSubtitle: e.target.value }))}
                        className="w-full bg-white/10 text-white border border-white/20 rounded p-2 text-sm focus:border-primary-400 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-primary-300 uppercase tracking-widest font-bold mb-1 block">Hero Titel (Gebruik \n voor nieuwe regel)</label>
                      <textarea 
                        value={draftHomeData.heroTitle}
                        onChange={e => setDraftHomeData(prev => ({ ...prev, heroTitle: e.target.value }))}
                        rows={2}
                        className="w-full bg-white/10 text-white border border-white/20 rounded p-2 text-sm focus:border-primary-400 outline-none font-sans font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-primary-300 uppercase tracking-widest font-bold mb-1 block">Hero Omschrijving</label>
                      <textarea 
                        value={draftHomeData.heroDesc}
                        onChange={e => setDraftHomeData(prev => ({ ...prev, heroDesc: e.target.value }))}
                        rows={3}
                        className="w-full bg-white/10 text-white border border-white/20 rounded p-2 text-sm focus:border-primary-400 outline-none font-light text-slate-200"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <span className="text-primary-700 font-bold uppercase text-xs tracking-widest mb-4 block">
                      {dt(homeData.heroSubtitle, 'home.hero_sub')}
                    </span>
                    <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight whitespace-pre-line text-primary-950">
                      {dt(homeData.heroTitle, 'home.hero_title')}
                    </h1>
                    <p className="text-primary-900/80 text-base md:text-lg max-w-md font-medium leading-relaxed">
                      {dt(homeData.heroDesc, 'home.hero_desc')}
                    </p>
                    <div className="mt-4 max-w-sm flex flex-col gap-1.5 pt-1.5" data-html2canvas-ignore="true">
                      <span className="text-[9px] font-black text-primary-800 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary-600 animate-pulse" />
                        <span>{t('home.location_maps')}</span>
                      </span>
                      <div className="relative w-full h-[135px] rounded-2xl overflow-hidden border border-primary-100 bg-white/80 shadow-lg group/map">
                        <iframe
                          src="https://maps.google.com/maps?q=Hunnegemstraat%2012,%209500%20Geraardsbergen&t=&z=15&ie=UTF8&iwloc=&output=embed"
                          className="absolute inset-0 w-full h-full border-0 rounded-2xl opacity-90 hover:opacity-100 transition-opacity"
                          allowFullScreen={true}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          title="Google Maps Location"
                        />
                        <a 
                          href="https://www.google.com/maps/place/Hunnegemstraat+12,+9500+Geraardsbergen/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="absolute bottom-1.5 right-1.5 bg-primary-950/90 hover:bg-primary-950 px-2 py-0.5 rounded-lg text-[8px] font-bold text-white tracking-wider flex items-center gap-1 transition-all z-10"
                        >
                          <ExternalLink className="w-2 h-2 text-amber-400" />
                          <span>OPEN MAPS</span>
                        </a>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          </motion.div>
 
          <div className="md:col-span-4 flex flex-col space-y-8 h-full">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-primary-950 text-white p-10 rounded-3xl shadow-xl flex-1 flex flex-col justify-center"
            >
              {/* Blinking Price Display */}
              <div className="mb-6 text-center select-none border-b border-white/10 pb-6">
                {editMode ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-primary-300">Prijs weergeven</span>
                      <button
                        type="button"
                        onClick={() => setDraftHomeData(prev => ({ ...prev, showPriceBlock: prev.showPriceBlock !== false ? false : true }))}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm ${
                          draftHomeData.showPriceBlock !== false 
                            ? 'bg-amber-500 hover:bg-amber-600 text-primary-950' 
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                        }`}
                      >
                        {draftHomeData.showPriceBlock !== false ? 'JA' : 'NEE (Vraagprijs verbergen)'}
                      </button>
                    </div>
                    {draftHomeData.showPriceBlock !== false ? (
                      <input
                        type="text"
                        value={(draftHomeData as any).price || ""}
                        onChange={e => setDraftHomeData(prev => ({ ...prev, price: e.target.value }))}
                        className="text-red-500 font-black text-4xl tracking-tight text-center bg-white/10 border-b border-red-500/40 rounded-xl px-2 py-1 w-full focus:border-red-500 focus:outline-none placeholder-red-500/50"
                        placeholder="279.000 €"
                      />
                    ) : (
                      <span className="text-red-500 font-bold text-2xl tracking-tight block py-1">
                        {t('home.price_on_request')}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="text-red-500 font-black text-4xl tracking-tight animate-blink block">
                    {homeData.showPriceBlock !== false ? ((homeData as any).price || "279.000 €") : t('home.price_on_request')}
                  </span>
                )}
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-black mt-1.5 block font-sans">
                  {t('home.asking_price')}
                </span>
              </div>

              <h2 className="text-2xl font-bold mb-8 italic serif">{t('home.kerngegevens')}</h2>
              <div className="space-y-8">
                {editMode ? (
                  <div className="space-y-4 text-slate-800">
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] uppercase tracking-widest text-primary-300 font-bold block">Vraagprijs</label>
                        <span className="text-[8px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-900/30 text-primary-300 font-semibold">
                          {draftHomeData.showPriceBlock !== false ? 'Zichtbaar' : 'Op aanvraag'}
                        </span>
                      </div>
                      <input 
                        type="text" 
                        value={(draftHomeData as any).price || ""} 
                        onChange={e => setDraftHomeData(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full bg-white/20 text-white border border-white/10 rounded p-1.5 text-xs outline-none focus:border-primary-400 placeholder-white/30"
                        placeholder="Bijv. 279.000 €"
                      />
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                      <label className="text-[9px] uppercase tracking-widest text-primary-300 font-bold block mb-1">Energielabel</label>
                      <input 
                        type="text" 
                        value={draftHomeData.keyEnergyLabel} 
                        onChange={e => setDraftHomeData(prev => ({ ...prev, keyEnergyLabel: e.target.value }))}
                        className="w-full bg-white/20 text-white border border-white/10 rounded p-1.5 text-xs outline-none focus:border-primary-400"
                      />
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                      <label className="text-[9px] uppercase tracking-widest text-primary-300 font-bold block mb-1">Woonoppervlakte</label>
                      <input 
                        type="text" 
                        value={draftHomeData.keySizeLabel} 
                        onChange={e => setDraftHomeData(prev => ({ ...prev, keySizeLabel: e.target.value }))}
                        className="w-full bg-white/20 text-white border border-white/10 rounded p-1.5 text-xs outline-none focus:border-primary-400"
                      />
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                      <label className="text-[9px] uppercase tracking-widest text-primary-300 font-bold block mb-1">Slaapkamers</label>
                      <input 
                        type="text" 
                        value={draftHomeData.keyBedroomsLabel} 
                        onChange={e => setDraftHomeData(prev => ({ ...prev, keyBedroomsLabel: e.target.value }))}
                        className="w-full bg-white/20 text-white border border-white/10 rounded p-1.5 text-xs outline-none focus:border-primary-400"
                      />
                    </div>
                    <div className="bg-white/10 p-3 rounded-xl border border-white/10">
                      <label className="text-[9px] uppercase tracking-widest text-primary-300 font-bold block mb-1">Parkeren (Titel)</label>
                      <input 
                        type="text" 
                        value={draftHomeData.keyParkingLabel} 
                        onChange={e => setDraftHomeData(prev => ({ ...prev, keyParkingLabel: e.target.value }))}
                        className="w-full bg-white/20 text-white border border-white/10 rounded p-1.5 text-xs outline-none focus:border-primary-400 mb-2"
                      />
                      <label className="text-[9px] uppercase tracking-widest text-primary-300 font-bold block mb-1">Parkeren (Ondertitel)</label>
                      <input 
                        type="text" 
                        value={(draftHomeData as any).keyParkingDesc || ""} 
                        onChange={e => setDraftHomeData(prev => ({ ...prev, keyParkingDesc: e.target.value }))}
                        className="w-full bg-white/20 text-white border border-white/10 rounded p-1.5 text-xs outline-none focus:border-primary-400"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center space-x-6">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-xl font-bold text-amber-300 italic font-serif">€</span>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/40">{t('home.asking_price')}</p>
                        <p className="text-lg font-bold">
                          {homeData.showPriceBlock !== false 
                            ? ((homeData as any).price || "279.000 €") 
                            : t('home.price_on_request')
                          }
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-xl font-bold text-primary-300 italic font-serif">
                          {homeData.keyEnergyLabel.replace('Label', '').trim().slice(0, 2)}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/40">{t('home.energielabel')}</p>
                        <p className="text-lg font-bold">{dt(homeData.keyEnergyLabel)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-xl font-bold text-primary-300 italic font-serif">128</span>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/40">{t('home.oppervlakte')}</p>
                        <p className="text-lg font-bold">{dt(homeData.keySizeLabel)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-xl font-bold text-primary-300 italic font-serif">2</span>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/40">{t('home.slaapkamers')}</p>
                        <p className="text-lg font-bold">{dt(homeData.keyBedroomsLabel)}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0">
                        <span className="text-xl font-bold text-primary-300 italic font-serif">G</span>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-white/40">{t('home.parkeren')}</p>
                        <p className="text-lg font-bold leading-snug">{dt(homeData.keyParkingLabel)}</p>
                        <p className="text-[10px] text-white/60 font-medium tracking-wide">{dt((homeData as any).keyParkingDesc || "auto + motor/fietsen", 'home.parkeren_desc')}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Link 
                    to="/contact"
                    className="group bg-primary-600 text-white p-8 rounded-3xl shadow-lg hover:bg-primary-700 transition-all flex items-center justify-between overflow-hidden relative w-full"
                    data-html2canvas-ignore="true"
                  >
                    <div className="relative z-10">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-xs font-bold uppercase tracking-widest">{t('ui.interest')}</p>
                        <span className="w-1 h-1 bg-white/40 rounded-full"></span>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-primary-300">{dt(homeData.keyParkingLabel)}</p>
                      </div>
                      <p className="text-xl font-bold">{t('home.plan_viewing')}</p>
                    </div>
                    <ArrowRight className="w-8 h-8 relative z-10 group-hover:translate-x-2 transition-transform" />
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
                  </Link>
                  <a 
                    href="https://wa.me/32475701549" 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-2 text-[10px] font-bold uppercase tracking-widest text-primary-600 hover:text-primary-800 transition-colors py-2"
                  >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" className="w-4 h-4" alt="WhatsApp" />
                    <span>{t('home.or_whatsapp')}</span>
                  </a>
                </div>

              <button 
                onClick={downloadPdf}
                disabled={isDownloading}
                className={`group bg-white text-primary-900 border border-primary-100 p-6 rounded-3xl shadow-md transition-all flex items-center justify-between w-full ${isDownloading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary-50'}`}
                data-html2canvas-ignore="true"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                    {isDownloading ? (
                      <div className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FileDown className="w-5 h-5 text-primary-600" />
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-60">{t('home.documentation')}</p>
                    <p className="text-base font-bold">
                      {isDownloading ? t('home.generating') : t('home.download_brochure')}
                    </p>
                  </div>
                </div>
                {!isDownloading && <ArrowRight className="w-5 h-5 opacity-30 group-hover:translate-x-1 transition-transform" />}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Intro Section */}
      <section className="bg-white py-10">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              {editMode ? (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Intro Rubriek</label>
                    <input 
                      type="text" 
                      value={draftHomeData.introSubtitle}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, introSubtitle: e.target.value }))}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600"
                    />
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1 mt-3">Intro Titel</label>
                    <input 
                      type="text" 
                      value={draftHomeData.introTitle}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, introTitle: e.target.value }))}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 font-bold"
                    />
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1 mt-3">Intro Beschrijving</label>
                    <textarea 
                      value={draftHomeData.introDesc !== undefined ? draftHomeData.introDesc : ""}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, introDesc: e.target.value }))}
                      rows={5}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 font-light"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Sectie 1: Titel</label>
                    <input 
                      type="text" 
                      value={draftHomeData.sec1Title}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, sec1Title: e.target.value }))}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 font-bold"
                    />
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1 mt-3">Sectie 1: Tekst</label>
                    <textarea 
                      value={draftHomeData.sec1Desc}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, sec1Desc: e.target.value }))}
                      rows={4}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 font-light"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Sectie 2: Indeling Titel</label>
                    <input 
                      type="text" 
                      value={draftHomeData.sec2Title}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, sec2Title: e.target.value }))}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 font-bold"
                    />
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1 mt-3">Sectie 2: Gelijkvloers & Kelder</label>
                    <textarea 
                      value={draftHomeData.sec2Gelijkvloers}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, sec2Gelijkvloers: e.target.value }))}
                      rows={2}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 text-xs"
                    />
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1 mt-2">Sectie 2: Eerste Verdieping</label>
                    <textarea 
                      value={draftHomeData.sec2Eerste}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, sec2Eerste: e.target.value }))}
                      rows={2}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 text-xs"
                    />
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1 mt-2">Sectie 2: Tweede Verdieping</label>
                    <textarea 
                      value={draftHomeData.sec2Tweede}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, sec2Tweede: e.target.value }))}
                      rows={2}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 text-xs"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 font-light">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Sectie 3: Goederelift Titel</label>
                    <input 
                      type="text" 
                      value={draftHomeData.sec3Title}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, sec3Title: e.target.value }))}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 font-bold"
                    />
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1 mt-3">Sectie 3: Goederelift Tekst</label>
                    <textarea 
                      value={draftHomeData.sec3Desc}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, sec3Desc: e.target.value }))}
                      rows={3}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600"
                    />
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1 mt-3">Sectie 3: Extra Info (Domotica etc.)</label>
                    <input 
                      type="text" 
                      value={draftHomeData.sec3Extra}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, sec3Extra: e.target.value }))}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 font-bold"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1">Sectie 4: Locatie Titel</label>
                    <input 
                      type="text" 
                      value={draftHomeData.sec4Title}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, sec4Title: e.target.value }))}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 font-bold"
                    />
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-1 mt-3">Sectie 4: Locatie Tekst</label>
                    <textarea 
                      value={draftHomeData.sec4Desc}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, sec4Desc: e.target.value }))}
                      rows={3}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600"
                    />
                  </div>

                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block mb-2">Quote Onderaan</label>
                    <input 
                      type="text" 
                      value={draftHomeData.footerQuote}
                      onChange={e => setDraftHomeData(prev => ({ ...prev, footerQuote: e.target.value }))}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-sm outline-none focus:border-primary-600 italic"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-slate-600 leading-relaxed space-y-6 font-light text-lg">
                  <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-4 block">
                    {dt(homeData.introSubtitle, 'home.introSubtitle')}
                  </span>
                  <h2 className="serif text-5xl mb-8 font-light italic text-slate-900 leading-tight">
                    {dt(homeData.introTitle, 'home.introTitle')}
                  </h2>
                  <p>
                    {dt(homeData.introDesc !== undefined ? homeData.introDesc : `Statig en verrassend ruim appartement met garage (${homeData.keySizeLabel}) met man-cave en goederelift in hartje Geraardsbergen. Bent u op zoek naar het comfort van een appartement, maar wilt u het ruimtelijke gevoel van een eengezinswoning niet missen? Dit unieke appartement van maar liefst ${homeData.keySizeLabel} combineert historisch karakter met modern wooncomfort, gelegen in het bruisende centrum van Geraardsbergen, de poort naar de prachtige Vlaamse Ardennen.`, 'home.introDesc')}
                  </p>
                  
                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">{dt(homeData.sec1Title, 'home.sec1Title')}</h3>
                    <p>{dt(homeData.sec1Desc, 'home.sec1Desc')}</p>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">{dt(homeData.sec2Title, 'home.sec2Title')}</h3>
                    <ul className="list-none space-y-3">
                      <li>
                        <span className="font-semibold text-primary-700">
                          {t('home.floor_ground_cellar')}
                        </span> {dt(homeData.sec2Gelijkvloers)}
                      </li>
                      <li>
                        <span className="font-semibold text-primary-700">
                          {t('home.floor_first')}
                        </span> {dt(homeData.sec2Eerste)}
                      </li>
                      <li>
                        <span className="font-semibold text-primary-700">
                          {t('home.floor_second')}
                        </span> {dt(homeData.sec2Tweede)}
                      </li>
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">{dt(homeData.sec3Title, 'home.sec3Title')}</h3>
                    <p>{dt(homeData.sec3Desc, 'home.sec3Desc')}</p>
                    {homeData.sec3Extra && (
                      <p className="mt-2 font-semibold text-slate-900">
                        {dt(homeData.sec3Extra, 'home.sec3Extra')}
                      </p>
                    )}
                  </div>

                  <div>
                    <h3 className="font-bold text-slate-900 mb-2">{dt(homeData.sec4Title, 'home.sec4Title')}</h3>
                    <p>{dt(homeData.sec4Desc, 'home.sec4Desc')}</p>
                  </div>
                </div>
              )}

              {/* Dynamic highlights bullets */}
              <div className="mt-8">
                {editMode ? (
                  <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100 space-y-3">
                    <label className="text-xs uppercase tracking-widest font-black text-primary-900 block mb-2">
                      Highlights Titel
                    </label>
                    <input 
                      type="text" 
                      value={draftHomeData.troevenTitle} 
                      onChange={e => setDraftHomeData(prev => ({ ...prev, troevenTitle: e.target.value }))}
                      className="w-full bg-white text-slate-800 border border-slate-300 rounded p-1.5 text-xs focus:border-primary-600 outline-none"
                    />
                    <label className="text-[10px] uppercase tracking-widest font-bold text-slate-400 block mt-4">
                      Highlights Lijst
                    </label>
                    <div className="space-y-2">
                       {draftHomeData.troevenList.map((item, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input 
                            type="text"
                            value={item}
                            onChange={e => {
                              const newList = [...draftHomeData.troevenList];
                              newList[idx] = e.target.value;
                              setDraftHomeData(prev => ({ ...prev, troevenList: newList }));
                            }}
                            className="flex-1 bg-white text-slate-800 border border-slate-300 rounded px-2 py-1 text-xs outline-none focus:border-primary-600"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newList = draftHomeData.troevenList.filter((_, i) => i !== idx);
                              setDraftHomeData(prev => ({ ...prev, troevenList: newList }));
                            }}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setDraftHomeData(prev => ({ ...prev, troevenList: [...prev.troevenList, "Nieuwe troef"] }));
                        }}
                        className="flex items-center space-x-1 text-xs text-primary-600 font-bold hover:text-primary-800 pt-2 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Troef toevoegen</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100">
                    <h3 className="font-bold text-primary-900 mb-4 uppercase text-xs tracking-widest">{dt(homeData.troevenTitle, 'home.troeven_title')}</h3>
                    <ul className="grid grid-cols-1 gap-2 text-sm">
                      {homeData.troevenList.map((item, idx) => (
                        <li key={idx} className="flex items-center space-x-2">
                          <div className="w-1.5 h-1.5 bg-primary-600 rounded-full shrink-0"></div>
                          <span>{dt(item)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex space-x-4 mt-8">
                <div className="h-1 w-12 bg-primary-600 rounded-full mt-4"></div>
                <p className="text-slate-500 italic font-light leading-relaxed">
                  {dt(homeData.footerQuote)}
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative overflow-hidden rounded-3xl shadow-2xl border-8 border-white self-start"
            >
              <img 
                src={detailsImage} 
                alt="Achtergevel" 
                className="w-full h-auto block"
                crossOrigin="anonymous"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Gallery Section Preview with Horizontal Smooth Scroll Ticker of All Photos */}
      <section className="bg-slate-50 py-16 border-t border-slate-200 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-10 gap-4">
            <div>
              <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">{t('home.impression')}</span>
              <h2 className="serif text-4xl italic text-slate-900">{t('home.photo_overview')}</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                {t('ui.scroll_hint') || 'Ontdek alle ruimtes • Gebruik de pijlen of swipe om te scrollen'}
              </p>
            </div>
            
            <div className="flex items-center space-x-3 shrink-0">
              <button
                onClick={() => scrollGallery('left')}
                className="w-11 h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all shadow-sm active:scale-95"
                title="Vorige foto's"
                aria-label="Scroll left"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scrollGallery('right')}
                className="w-11 h-11 rounded-full border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all shadow-sm active:scale-95"
                title="Volgende foto's"
                aria-label="Scroll right"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
              <span className="h-6 w-px bg-slate-200 hidden sm:inline-block"></span>
              <Link 
                to="/galerij" 
                className="text-primary-600 font-black uppercase text-xs tracking-widest border-b-2 border-primary-600 pb-1 hover:text-primary-800 hover:border-primary-800 transition-colors hidden sm:inline-block whitespace-nowrap"
              >
                {t('home.view_all_photos')}
              </Link>
            </div>
          </div>
        </div>

        {/* Full screen bleed scroll gallery viewport wrapper */}
        <div className="relative pl-6 sm:pl-[calc((100vw-1216px)/2)] md:pl-[calc((100vw-1216px)/2)] lg:pl-[calc((100vw-1216px)/2)] overflow-x-auto no-scrollbar">
          <div 
            ref={scrollRef}
            className="flex space-x-6 overflow-x-auto pb-8 pt-2 no-scrollbar pr-6"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {imageList.map((img, idx) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "0px 80px 0px 0px" }}
                transition={{ duration: 0.5, delay: Math.min(idx * 0.05, 0.3) }}
                onClick={() => setSelectedHomeImage(img)}
                className="w-[280px] sm:w-[380px] aspect-[4/3] rounded-3xl overflow-hidden shadow-md hover:shadow-2xl hover:scale-[1.01] transition-all duration-300 cursor-pointer bg-white p-2.5 border border-slate-200/60 flex-shrink-0 snap-start snap-always"
              >
                <div className="w-full h-full rounded-2xl overflow-hidden relative">
                  <img 
                    src={img.url} 
                    alt={img.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700"
                    loading="lazy"
                  />
                  {/* Subtle info overlay on hover */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent p-5 opacity-0 hover:opacity-100 group-hover:opacity-100 transition-all duration-300 flex items-end">
                    <p className="text-white text-xs font-black uppercase tracking-wider">{dt(img.title)}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 mt-2 text-right sm:hidden">
          <Link to="/galerij" className="inline-block text-primary-600 font-bold uppercase text-xs tracking-widest border-b-2 border-primary-600 pb-1 hover:text-primary-800 hover:border-primary-800 transition-colors">
            {t('home.view_all_photos')}
          </Link>
        </div>
      </section>

      {/* Lightbox Modal on Homepage */}
      <AnimatePresence>
        {selectedHomeImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedHomeImage(null)}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 animate-fadeIn"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full aspect-[4/3] bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-white/10"
            >
              <img 
                src={selectedHomeImage.url} 
                alt={selectedHomeImage.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950/80 to-transparent text-white">
                <h3 className="text-2xl font-bold italic serif">{dt(selectedHomeImage.title)}</h3>
                <p className="text-sm text-slate-300">
                  {t('gallery.interior_impression') || 'Sfeervolle impressie van het duplex appartement'}
                </p>
              </div>
              <button 
                onClick={() => setSelectedHomeImage(null)}
                className="absolute top-6 right-6 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-3 rounded-full transition-colors cursor-pointer"
                aria-label="Sluit galerij"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  </div>
  );
}
