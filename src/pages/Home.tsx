import { motion } from 'motion/react';
import { ArrowRight, FileDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { domToPng } from 'modern-screenshot';
import { jsPDF } from 'jspdf';
import BrochureContent from '../components/BrochureContent';

interface GalleryImage {
  id: string;
  url: string;
  title: string;
}

const DEFAULT_IMAGES = [
  { id: 'def1', url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1000", title: "Lichtrijke Woonkamer" },
  { id: 'def2', url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=1000", title: "Zuidgericht Terras" },
  { id: 'def3', url: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&q=80&w=1000", title: "Moderne Badkamer" },
  { id: 'def4', url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1000", title: "Keuken Detail" },
];

export default function Home() {
  const [heroImage, setHeroImage] = useState(DEFAULT_IMAGES[0].url);
  const [detailsImage, setDetailsImage] = useState(DEFAULT_IMAGES[3].url);
  const [imageList, setImageList] = useState<GalleryImage[]>(DEFAULT_IMAGES);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'gallery'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let dbImages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((img: any) => img.url) as GalleryImage[];
      
      if (dbImages.length === 0) {
        dbImages = DEFAULT_IMAGES;
      }
      
      setImageList(dbImages);

      if (dbImages.length > 0) {
        // 1. Try to find image manually marked as Hero
        const pinnedHero = dbImages.find((img: any) => img.isHero);
        if (pinnedHero) {
          setHeroImage(pinnedHero.url);
        } else {
          // Fallback to name-based or first image
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

        // 2. Try to find image manually marked as Section
        const pinnedSection = dbImages.find((img: any) => img.isSection);
        if (pinnedSection) {
          setDetailsImage(pinnedSection.url);
        } else {
          // Fallback to name-based or first image
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
    }, (error) => {
      console.warn("Firestore gallery access restricted on Home page:", error);
      setImageList(DEFAULT_IMAGES);
      // We don't call handleFirestoreError here to avoid potentially recursive error loops in a tight update cycle
      // only if it's a non-quota error would we want a loud throw, but for quota we just fallback.
    });

    return () => unsubscribe();
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
      alert('PDF maken mislukt: ' + msg);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="relative bg-slate-50 min-h-screen">
      {/* Hidden Brochure Content for PDF Generation */}
      <div className="fixed -left-[2000px] top-0 pointer-events-none opacity-0 z-[-1]">
        <BrochureContent heroImage={heroImage} galleryImages={imageList} />
      </div>

      <div id="property-details">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-24">
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
            <div className="absolute inset-0 bg-gradient-to-t from-primary-950/80 via-transparent to-transparent flex flex-col justify-end p-12 text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <span className="text-primary-300 font-bold uppercase text-xs tracking-widest mb-4 block">RUIM APPARTEMENT TE KOOP IN GERAARDSBERGEN</span>
                <h1 className="text-5xl md:text-6xl font-extrabold mb-4 leading-tight">
                  Modern Wonen met <br />
                  <span className="italic text-primary-200">Veel Ruimte</span>
                </h1>
                <p className="text-slate-200 text-lg max-w-md font-light">
                  Luxe afwerking, 128.2m² woonoppervlakte en een ruim appartement, gelegen in centrum Geraardsbergen, midden in de Vlaamse Ardennen.
                </p>
              </motion.div>
            </div>
            <div className="absolute top-8 right-8 bg-white/90 backdrop-blur-sm text-primary-950 px-6 py-3 rounded-full font-bold shadow-xl">
              275.000€
            </div>
          </motion.div>

          <div className="md:col-span-4 flex flex-col space-y-8 h-full">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-primary-950 text-white p-10 rounded-3xl shadow-xl flex-1 flex flex-col justify-center"
            >
              <h2 className="text-2xl font-bold mb-8 italic serif">Kerngegevens</h2>
              <div className="space-y-8">
                <div className="flex items-center space-x-6">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-300 italic font-serif">B</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Energielabel</p>
                    <p className="text-lg font-bold">Label B</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-300 italic font-serif">128.2</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Oppervlakte</p>
                    <p className="text-lg font-bold">128.2 m&sup2;</p>
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                    <span className="text-xl font-bold text-primary-300 italic font-serif">2</span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-white/40">Slaapkamers</p>
                    <p className="text-lg font-bold">2 Slaapkamers</p>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="space-y-4">
              <Link 
                to="/contact"
                className="group bg-primary-600 text-white p-8 rounded-3xl shadow-lg hover:bg-primary-700 transition-all flex items-center justify-between overflow-hidden relative w-full"
                data-html2canvas-ignore="true"
              >
                <div className="relative z-10">
                  <p className="text-xs font-bold uppercase tracking-widest mb-1">Interesse?</p>
                  <p className="text-xl font-bold">Plan een Bezichtiging</p>
                </div>
                <ArrowRight className="w-8 h-8 relative z-10 group-hover:translate-x-2 transition-transform" />
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 -mr-16 -mt-16 rounded-full blur-2xl group-hover:bg-white/20 transition-colors"></div>
              </Link>

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
                    <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5 opacity-60">Documentatie</p>
                    <p className="text-base font-bold">
                      {isDownloading ? 'Genereren...' : 'Download Brochure PDF'}
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
      <section className="bg-white py-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-4 block">Architectuur & Design</span>
              <h2 className="serif text-5xl mb-8 font-light italic text-slate-900 leading-tight">Zeldzame kans nabij domein Hunnegem</h2>
              <div className="text-slate-600 leading-relaxed space-y-6 font-light text-lg">
                <p>
                  Statig en verrassend ruim duplex appartement (128.2m²) met man-cave en goederelift in hartje Geraardsbergen. 
                  Bent u op zoek naar het comfort van een appartement, maar wilt u het ruimtelijke gevoel van een eengezinswoning niet missen? 
                  Dit unieke duplex appartement van maar liefst 128.2m² combineert historisch karakter met modern wooncomfort, gelegen in het bruisende centrum van Geraardsbergen, de poort naar de prachtige Vlaamse Ardennen.
                </p>
                
                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Statige uitstraling en zeeën van ruimte</h3>
                  <p>
                    Bij aankomst valt meteen de indrukwekkende voor- en achtergevel op, die het gebouw een statige en standingvolle uitstraling geeft. 
                    Binnenin geniet u overal van een hoogwaardige afwerking met duurzame vloeren en het ultieme comfort van vloerverwarming op aardgas hoogrendementketel.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Verrassende en functionele indeling</h3>
                  <ul className="list-none space-y-3">
                    <li><span className="font-semibold text-primary-700">Gelijkvloers & Kelder:</span> Een grote garage met EV-lader en een royale onderliggende kelder. Deze multifunctionele kelderruimte is ideaal in te richten als privéfitness, hobbyruimte of de ultieme man-cave.</li>
                    <li><span className="font-semibold text-primary-700">Eerste verdieping:</span> Een schitterende, lichtrijke woon- en eetruimte van maar liefst 50m². Dankzij de grote raampartijen geniet u hier van een overvloed aan natuurlijk licht en een rustgevend, groen uitzicht.</li>
                    <li><span className="font-semibold text-primary-700">Tweede verdieping:</span> Hier bevinden zich twee volwaardige slaapkamers, een ruime badkamer en de volledig uitgeruste keuken.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Unieke troef: De goederelift</h3>
                  <p>
                    Geen gesleur met zware boodschappen of dienbladen op de trap! Een slimme, compacte goederelift verbindt de keuken op de tweede verdieping rechtstreeks met de leefruimte op de eerste verdieping. Zo serveert u diners en drankjes in een handomdraai.
                  </p>
                  <p className="mt-2 font-semibold text-slate-900">
                    Video deurbel. Domotica voor-installatie.
                  </p>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 mb-2">Toplocatie in de Vlaamse Ardennen</h3>
                  <p>
                    U woont hier midden in het centrum van Geraardsbergen met winkels, openbaar vervoer en gezellige horeca op wandelafstand. Tegelijkertijd fietst of wandelt u zo de natuur van de Vlaamse Ardennen in.
                  </p>
                </div>

                <div className="bg-primary-50 p-6 rounded-2xl border border-primary-100">
                  <h3 className="font-bold text-primary-900 mb-4 uppercase text-xs tracking-widest">Troeven in de kijker</h3>
                  <ul className="grid grid-cols-1 gap-2 text-sm">
                    {['128.2m² bewoonbare oppervlakte', 'Dakterras van 40m²', 'Lichtrijke leefruimte van 49m² met groen uitzicht', 'Vloerverwarming op aardgas hoogrendementketel', 'Hoogwaardige keramiekvloeren', 'Grote garage met EV-lader + kelder (geschikt voor man-cave/fitness/hobby)', 'Unieke goederelift tussen keuken en living', 'Video deurbel. Domotica voor-installatie.', 'Centrale, doch groene ligging'].map((item, idx) => (
                      <li key={idx} className="flex items-center space-x-2">
                        <div className="w-1 h-1 bg-primary-600 rounded-full"></div>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex space-x-4">
                <div className="h-1 w-12 bg-primary-600 rounded-full mt-4"></div>
                <p className="text-slate-500 italic font-light">
                  Ontwikkeld door gerenommeerde architecten met een focus op modern wonen in Geraardsbergen.
                </p>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="aspect-[4/5] relative overflow-hidden rounded-3xl shadow-2xl border-8 border-white"
            >
              <img 
                src={detailsImage} 
                alt="Achtergevel" 
                className="w-full h-full object-cover"
                crossOrigin="anonymous"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Gallery Section Preview */}
      <section className="bg-slate-50 py-32 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-end mb-16">
            <div>
              <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">Impressie</span>
              <h2 className="serif text-4xl italic text-slate-900">Fotooverzicht</h2>
            </div>
            <Link to="/galerij" className="text-primary-600 font-bold uppercase text-xs tracking-widest border-b-2 border-primary-600 pb-1 hover:text-primary-800 hover:border-primary-800 transition-colors">
              Bekijk alle foto's
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {imageList.slice(0, 4).map((img, idx) => (
              <motion.div
                key={img.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="aspect-square rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer group"
              >
                <img 
                  src={img.url} 
                  alt={img.title} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700"
                />
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      </div>
    </div>
  );
}
