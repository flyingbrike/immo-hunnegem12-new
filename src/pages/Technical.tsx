import { motion } from 'motion/react';
import { jsPDF } from 'jspdf';
import { domToPng } from 'modern-screenshot';
import { Ruler, Home, Zap, Waves, ShieldCheck, Sun, Sparkles, Car, Lock, Edit3, Save, X, Plus, Trash2, LogOut, ChevronUp, ChevronDown, FileText, Eye, Download, Check, Printer, Search, Filter } from 'lucide-react';
import { useState, useEffect, Dispatch, SetStateAction } from 'react';
import { auth, loginWithGoogle, storage, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, query, doc, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useLanguage } from '../context/LanguageContext';

interface LabelValuePair {
  label: string;
  value: string;
}

interface SpecItem {
  iconName: string;
  label: string;
  value: string;
}

const defaultSpecs: SpecItem[] = [
  { iconName: "Ruler", label: "Woonoppervlakte", value: "128.2 m²" },
  { iconName: "Car", label: "Parkeren", value: "RUIME prive GARAGE 21m²" },
  { iconName: "Sun", label: "Dakterras", value: "40 m²" },
  { iconName: "Home", label: "Slaapkamers", value: "2 Slaapkamers" },
  { iconName: "Zap", label: "Energielabel", value: "Label B" },
  { iconName: "ShieldCheck", label: "Beveiliging", value: "Video deurbel. Domotica voor-installatie." },
  { iconName: "Waves", label: "Verwarming", value: "Vloerverwarming op aardgas hoogrendementketel" },
  { iconName: "Sun", label: "Oriëntatie", value: "Zuid-West" },
];

const defaultStedenbouw: LabelValuePair[] = [
  { label: "Bestemming", value: "Woongebied" },
  { label: "Vergunning", value: "Ja" },
  { label: "Voorkooprecht", value: "Nee" },
  { label: "Verkavelingsvergunning", value: "Nee" },
  { label: "Erfdienstbaarheden", value: "Geen" },
];

const defaultOverstroming: LabelValuePair[] = [
  { label: "P-score (perceel)", value: "A (geen)" },
  { label: "G-score (gebouw)", value: "A (geen)" },
  { label: "Signaalgebied", value: "Nee" },
];

const defaultPriceSetting: LabelValuePair[] = [
  { label: "Vraagprijs", value: "€ 279.000,-" },
  { label: "Prijs per m²", value: "€ 2.176 / m²" },
  { label: "Een garage kost al gauw", value: "€ 30.000,-" },
  { label: "Dan is voor het appartement", value: "€ 249.000,- (zeker correct)" },
  { label: "Schattingsprijs", value: "€ 295.000,-" },
];

const defaultInstallaties: LabelValuePair[] = [
  { label: "Elektriciteitskeuring", value: "Conform (tot 2046)" },
  { label: "Asbestattest", value: "Asbestveilig" },
  { label: "Verwarming", value: "Vloerverwarming op aardgas hoogrendementketel" },
];

const defaultAlgemeen: LabelValuePair[] = [
  { label: "Kadastraal inkomen (niet-geïndexeerd)", value: "€ 751,-" },
  { label: "Bouwjaar", value: "1993 (Regelmatig onderhouden & upgedate)" },
  { label: "Beschikbaarheid", value: "Onmiddellijk na akte" },
  { label: "Constructie", value: "Steen en beton, geen houten gewelven" },
];

const defaultLeefruimtes: LabelValuePair[] = [
  { label: "Leefruimte (Living/Eetkamer)", value: "49 m²" },
  { label: "Keuken", value: "9 m²" },
  { label: "Inkomhal / Gang", value: "8.6 m²" },
  { label: "Nachthal / bureel", value: "16.6 m²" },
];

const defaultExtraRuimtes: LabelValuePair[] = [
  { label: "Badkamer", value: "15 m²" },
  { label: "Berging / Wasplaats", value: "4 m²" },
  { label: "Garage", value: "21 m²" },
  { label: "Kelder", value: "60 m²" },
];

const defaultNachtgedeelte: LabelValuePair[] = [
  { label: "Slaapkamer 1", value: "17.5 m²" },
  { label: "Slaapkamer 2", value: "8.5 m²" },
];

const defaultTotals: LabelValuePair[] = [
  { label: "Totaal Bewoonbaar", value: "128.2 m²" },
  { label: "Gemeenschappelijk kelder", value: "50 m²" },
  { label: "Dakterras", value: "40 m²" },
  { label: "Gemeenschappelijke inkomhal", value: "6.2 m²" },
];

const defaultBijzonderheden: string[] = [
  "Ruime living 49m² met grote ramen en vloerverwarming.",
  "Video deurbel. Domotica voor-installatie.",
  "Grote garage met EV-lader",
  "Garageput met takel en perslucht",
  "Grote kelder 60m² Werkplaats/fitness/cinema/man-cave",
  "Privé berging van 8 m²",
  "Hoogwaardige keramiekvloeren",
  "Designkeuken met Miele apparatuur",
  "Op de slaapkamer reuze Velux ramen"
];

export interface RoomDetailItem {
  id: string;
  name: string;
  size: string;
  description: string;
  features: string[];
}

const defaultRooms: RoomDetailItem[] = [
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
    description: "Sfeervolle tweede slaapkamer, perfect geschikt als kinderkamer, logeerkamer of ruime dressing.",
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

const getRoomIcon = (id: string) => {
  switch (id) {
    case 'leefruimte': return <Home className="w-5 h-5 text-indigo-500" />;
    case 'keuken': return <Sparkles className="w-5 h-5 text-amber-500" />;
    case 'badkamer': return <Waves className="w-5 h-5 text-blue-500" />;
    case 'slaapkamer1':
    case 'slaapkamer2': return <Home className="w-5 h-5 text-sky-500" />;
    case 'berging': return <ShieldCheck className="w-5 h-5 text-teal-500" />;
    case 'nachthal': return <Ruler className="w-5 h-5 text-purple-200" />;
    case 'inkom': return <Ruler className="w-5 h-5 text-slate-500" />;
    case 'garage': return <Car className="w-5 h-5 text-rose-500" />;
    case 'kelder': return <Lock className="w-5 h-5 text-emerald-600" />;
    case 'dakterras': return <Sun className="w-5 h-5 text-orange-400" />;
    default: return <Sparkles className="w-5 h-5" />;
  }
};

const defaultIntroText = "Dit appartement (128.2m²) beschikt over een RUIME prive GARAGE (21m²) voor auto + motor/fietsen met EV-lader en werd degelijk gebouwd met focus op duurzaamheid en comfort. Volledige technische gegevens en uitleg verkrijgbaar op aanvraag.";

const getIcon = (name: string) => {
  switch (name) {
    case 'Ruler': return <Ruler className="w-5 h-5" />;
    case 'Car': return <Car className="w-5 h-5" />;
    case 'Sun': return <Sun className="w-5 h-5" />;
    case 'Home': return <Home className="w-5 h-5" />;
    case 'Zap': return <Zap className="w-5 h-5" />;
    case 'ShieldCheck': return <ShieldCheck className="w-5 h-5" />;
    case 'Waves': return <Waves className="w-5 h-5" />;
    default: return <Sparkles className="w-5 h-5" />;
  }
};

const officialDocuments = [
  {
    id: 'epc',
    title: { 
      nl: 'Energieprestatiecertificaat (EPC)', 
      en: 'Energy Performance Certificate (EPC)',
      fr: 'Certificat de Performance Énergétique (EPC)',
      de: 'Energieausweis (EPC)',
      es: 'Certificado de Eficiencia Energética (EPC)',
      ar: 'شهادة أداء الطاقة (EPC)'
    },
    category: 'bouw',
    issuer: 'Bart Peysmans de Rick',
    date: '22-12-2022',
    validUntil: '22-12-2032',
    certificateNumber: '20221222-0002760563-RES-1',
    conclusion: 'Label B — 130 kWh / (m² jaar)',
    color: 'emerald',
    description: {
      nl: 'Officiële energiescore met een zeer gunstig B-label. De woning is hiermee uitermate energiezuinig en klaar voor de toekomst.',
      en: 'Official energy assessment score showing a highly efficient B-label. Outstanding energy performance ready for the future.',
      fr: 'Évaluation énergétique officielle affichant un label B très performant. Excellente efficacité énergétique prête pour l\'avenir.',
      de: 'Offizieller Energieausweis mit dem hervorragenden Label B. Äußerst energieeffizient und zukunftssicher.',
      es: 'Calificación oficial de eficiencia energética que muestra una etiqueta B muy ventajosa. Excelente rendimiento de cara al futuro.',
      ar: 'التقييم الرسمي لكفاءة الطاقة والذي يؤكد حصول العقار على تصنيف الفئة B الممتازة مما يجعله موفراً واعداً للمستقبل.'
    },
    badge: {
      nl: 'Energielabel B - Zeer Energiezuinig',
      en: 'Energy Label B - Highly Efficient',
      fr: 'Label Énergétique B - Très Économe',
      de: 'Energieklasse B - Sehr Effizient',
      es: 'Clase Energética B - Muy Eficiente',
      ar: 'فئة كفاءة الطاقة B - واعد للغد'
    }
  },
  {
    id: 'asbest',
    title: { 
      nl: 'Asbestinventarisattest', 
      en: 'Asbestos Inventory Certificate',
      fr: 'Attestation Inventaire Amiante',
      de: 'Asbestzertifikat',
      es: 'Certificado de Amianto',
      ar: 'شهادة جرد الأسبستوس'
    },
    category: 'milieu',
    issuer: 'OVAM (Vlaamse overheid)',
    date: '19-02-2023',
    validUntil: '19-02-2033',
    certificateNumber: '20230219-000043.001',
    conclusion: 'Asbestveilig (0 asbestmaterialen gedetecteerd)',
    color: 'sky',
    description: {
      nl: 'Volledig inspectieverslag met eindconclusie asbestveilig. Er zijn geen asbesthoudende materialen aangetroffen in de woning.',
      en: 'Comprehensive inspection report confirming asbestos-safe status. Absolutely zero asbestos materials were detected.',
      fr: 'Rapport d\'inspection complet confirmant l\'état conforme et sécurisé. Aucun matériau contenant de l\'amiante n\'a été détecté.',
      de: 'Umfassender Inspektionsbericht, der den asbestfreien Zustand bestätigt. Es wurden keinerlei asbesthaltige Materialien gefunden.',
      es: 'Informe de inspección detallado que confirma que la propiedad está libre de amianto. No se detectaron materiales con asbesto.',
      ar: 'تقرير فحص شامل وموثق يثبت خلو العقار تماماً من مادة الأسبستوس لضمان سلامة وصحة قاطنيه.'
    },
    badge: {
      nl: 'Asbestveilig',
      en: 'Asbestos Safe',
      fr: 'Sans Amiante',
      de: 'Asbestfrei',
      es: 'Libre de Amianto',
      ar: 'خالٍ من الأسبستوس'
    }
  },
  {
    id: 'bodem',
    title: { 
      nl: 'Bodemattest (OVAM)', 
      en: 'Soil Quality Certificate (OVAM)',
      fr: 'Attestation de Sol (OVAM)',
      de: 'Bodengutachten (OVAM)',
      es: 'Certificado de Calidad del Suelo (OVAM)',
      ar: 'شهادة جودة التربة (OVAM)'
    },
    category: 'milieu',
    issuer: 'OVAM Bodembeheer',
    date: '26-01-2023',
    certificateNumber: 'Attest 20230050758 — Formulier 20230049434',
    conclusion: 'Niet opgenomen in het Grondeninformatieregister (Zuivere risicocertificering)',
    color: 'teal',
    description: {
      nl: 'Inlichtingen van de OVAM bevestigen dat er geen aanwijzingen zijn van bodemverontreiniging of risicogrondactiviteiten.',
      en: 'Official OVAM documentation certifying that there are zero indications of soil contamination or hazardous land occupancy.',
      fr: 'Documentation officielle de l\'OVAM certifiant qu\'il n\'y a aucune indication de pollution du sol ni d\'activité à risque.',
      de: 'Offizielle OVAM-Unterlagen, die bescheinigen, dass keinerlei Hinweise auf Bodenverunreinigungen vorliegen.',
      es: 'Certificado oficial de OVAM que avala la total pureza del terreno, descartando riesgos de contaminación histórica.',
      ar: 'بيان معتمد من مؤسسة OVAM لسلامة البيئة يقر بنقاء التربة التام وخلو الموقع من أي تلوث أرضي سابق.'
    },
    badge: {
      nl: 'Geen Risicogrond',
      en: 'No Soil Risks',
      fr: 'Sol Conforme',
      de: 'Boden ohne Mängel',
      es: 'Suelo sin Riesgos',
      ar: 'تربة نظيفة تماماً'
    }
  },
  {
    id: 'kadaster_opzoeking',
    title: { 
      nl: 'Kadastrale Opzoeking', 
      en: 'Official Cadastral Document',
      fr: 'Enquête Cadastrale Officielle',
      de: 'Katasterrecherche',
      es: 'Búsqueda Catastral Oficial',
      ar: 'الاستعلام العقاري الرسمي'
    },
    category: 'kadaster',
    issuer: 'FEDNOT / Notariaat',
    date: '23-01-2023',
    certificateNumber: 'Dossier KD/W.1951/2230025',
    conclusion: 'Sectie A, nummer 0714EP0000, Rechten: VE 1/1 (Volledige eigendom)',
    color: 'indigo',
    description: {
      nl: 'Officiële kadastrale inlichtingen en identificatie van de rechten van de eigenaar voor Hunnegemstraat 10/12.',
      en: 'Official registry statement detailing property rights (100% full ownership) and exact plot listing.',
      fr: 'Relevé officiel du registre détaillant les droits de propriété (pleine propriété) et l\'identification de la parcelle.',
      de: 'Offizieller Registerauszug mit Einzelheiten zu Eigentumsrechten und der genauen Parzellenbezeichnung.',
      es: 'Nota de registro oficial que detalla la titularidad del 100% de la propiedad y su delimitación catastral.',
      ar: 'الصحيفة العقارية الرسمية التي توثق الملكية الكاملة والخالصة بنسبة 1/1 لصاحب العقار دون منازع.'
    },
    badge: {
      nl: 'Volle Eigendom (1/1)',
      en: 'Full Ownership (1/1)',
      fr: 'Pleine Propriété',
      de: 'Volleigentum (1/1)',
      es: 'Propiedad Absoluta',
      ar: 'ملكيتها خالصة بالكامل'
    }
  },
  {
    id: 'kadaster_percelenplan',
    title: { 
      nl: 'Uittreksel Kadastraal Percelenplan', 
      en: 'Cadastral Parcel Map',
      fr: 'Extrait de Plan Parcellaire',
      de: 'Kataster-Lageplan',
      es: 'Plano Parcelario Catastral',
      ar: 'مخطط الرقعة المساحية العينية'
    },
    category: 'kadaster',
    issuer: 'FOD Financiën — Patrimoniumdocumentatie',
    date: '08-08-2022',
    certificateNumber: 'GERAARDSBERGEN 1 AFD (Schaal 1:250)',
    conclusion: 'Visualisatie van de perceelsgrenzen (A714e - 340.0 m²)',
    color: 'rose',
    description: {
      nl: 'Uittreksel uit het kadastrale percelenplan met precieze weergave van de perceelgrenzen en bebouwing.',
      en: 'High-precision layout schematic of boundaries and structural footprint from the federal mapping division.',
      fr: 'Schéma cadastral de grande précision définissant les limites de propriété et l\'emprise du bâtiment.',
      de: 'Hochpräzise Flurkarte des Bundesamtes zur detaillierten Parzellengrenze und Gebäudelage.',
      es: 'Plano técnico oficial con un nivel de escala ideal que representa con rigor los mojones y límites del lote.',
      ar: 'مخطط مساحي عالي الدقة صادر عن مصلحة المساحة لإيضاح حدود الملكية ورسم حدود المبنى المعماري.'
    },
    badge: {
      nl: 'Schaal 1:250',
      en: 'Scale 1:250',
      fr: 'Échelle 1:250',
      de: 'Maßstab 1:250',
      es: 'Escala 1:250',
      ar: 'رسم مقياس 1:250'
    }
  },
  {
    id: 'overstroming',
    title: { 
      nl: 'Overstromingsrapport (Watertoets)', 
      en: 'Official Flood Assessment',
      fr: 'Évaluation des Risques d\'Inondation',
      de: 'Hochwasserschutz-Gutachten',
      es: 'Evaluación del Riesgo de Inundación',
      ar: 'تقرير تقييم مخاطر الفيضانات'
    },
    category: 'milieu',
    issuer: 'Vlaanderen is Milieu',
    date: '23-01-2023',
    certificateNumber: 'Perceel 41018A0714/00E000',
    conclusion: 'P-score: A | G-score: A — Bevindt zich NIET in risicozone',
    color: 'blue',
    description: {
      nl: 'De officiële watertoets bewijst dat het perceel en gebouw de hoogste veiligheidscategorie A dragen (nul risico).',
      en: 'Comprehensive test results indicating the property falls into Safety Class A (zero historical or statistical risk).',
      fr: 'Les résultats d\'analyses officielles classent la parcelle et l\'appartement en Zone A (risque nul d\'inondation).',
      de: 'Amtliche Hochwasserprüfung, die die Immobilie der sichersten Einstufung (Klasse A) zuordnet (kein Risiko).',
      es: 'Informe oficial que certifica que el inmueble se sitúa en la clase máxima A, completamente fuera de cuencas de riesgo.',
      ar: 'تقرير مصلحة الطبيعة والري الذي يمنح العقار التصنيف الممتاز A مؤكداً عدم تعرضه لأي تهديد مائي.'
    },
    badge: {
      nl: 'Klasse A - Geen Risico',
      en: 'Class A - Zero Risk',
      fr: 'Classe A - Aucun Risque',
      de: 'Klasse A - Risikofrei',
      es: 'Clase A - Cero Riesgos',
      ar: 'تصنيف ممتاز  A - أمن مائي'
    }
  },
  {
    id: 'erfgoed',
    title: { 
      nl: 'Perceelrapport Onroerend Erfgoed', 
      en: 'Official Heritage Assessment',
      fr: 'Rapport Consigne du Patrimoine',
      de: 'Gutachten zum Kulturerbe und Denkmalschutz',
      es: 'Dictamen de Patrimonio Histórico',
      ar: 'تقرير حماية الآثار والتراث الفني'
    },
    category: 'bouw',
    issuer: 'Agentschap Onroerend Erfgoed',
    date: '23-01-2023',
    certificateNumber: 'ID: 11889 / CAPAKEY 41018A0714/00E000',
    conclusion: 'Archeologische stadskern, GEEN beschermd monument of renovatiebeperkingen',
    color: 'violet',
    description: {
      nl: 'Onderzoek bevestigt restauratieve vrijheid. Het gebouw is geen beschermd monument en kent geen onderhoudrestricties.',
      en: 'Registry inquiry confirming full remodeling freedom. The building is not landmarked and has no structural constraints.',
      fr: 'Enquête officielle confirmant la liberté de rénovation architecturale. Le bien n\'est pas classé monument historique.',
      de: 'Offizielle Abfrage, die absolute Sanierungsfreiheit garantiert. Kein Denkmalschutz oder strukturelle Vorgaben.',
      es: 'La resolución descarta catalogaciones restrictivas, garantizando plena libertad técnica para futuras reformas.',
      ar: 'دراسة هندسية تنفي وجود أي قيود أو وصاية تمنع الترميم مما يتيح حرية التعديل للمالك الجديد.'
    },
    badge: {
      nl: 'Vrij van Beperkingen',
      en: 'Free of Structural Restraints',
      fr: 'Rénovation Libre',
      de: 'Sanierungsfrei',
      es: 'Sin Restricciones',
      ar: 'حرية كاملة لإعادة الهيكلة'
    }
  },
  {
    id: 'klip',
    title: { 
      nl: 'KLIP Opvraging (Nutsleidingen)', 
      en: 'Utility Mapping Inquiry (KLIP)',
      fr: 'Enquête Réseau de Pipelines (KLIP)',
      de: 'Leitungsnetz-Abfrage (KLIP)',
      es: 'Plano de Red de Tuberías (KLIP)',
      ar: 'استقصاء شبكات الإمداد والمواسير (KLIP)'
    },
    category: 'bouw',
    issuer: 'Agentschap Wegen en Verkeer / Fluvius / Watergroep',
    date: '23-01-2023',
    certificateNumber: 'Referentie KD/W.1951/2230025',
    conclusion: 'Opvraging geslaagd — Alle leidingen (Gas, Water, Infra, Telecom) in kaart gebracht',
    color: 'amber',
    description: {
      nl: 'Informatieopvraging bij alle netbeheerders ter behoeve van veilige infrastructuuraansluiting en onderhoud.',
      en: 'Registry synchronization displaying certified coordinate layout for all pipeline, fiber, gas, and power systems.',
      fr: 'Rapport de conformité affichant le tracé certifié pour toutes les conduites d\'eau, de gaz, d\'électricité et télécom.',
      de: 'Konformitätsbericht mit zertifiziertem Leitungsverlauf für alle Versorgungsleitungen (Gas, Wasser, Strom, DSL).',
      es: 'Planos actualizados que trazan con precisión milimétrica la red subterránea para garantizar la seguridad.',
      ar: 'المسح الفني المعتمد لجميع خطوط الغاز والماء والكهرباء والاتصالات الأرضية في محيط العقار لضمان الأمان.'
    },
    badge: {
      nl: 'Nutsleidingen Gekarteerd',
      en: 'Utilities Mapped',
      fr: 'Pipelines Enquête Réussie',
      de: 'Versorgung kartiert',
      es: 'Trazados Registrados',
      ar: 'إمدادات طاقة معتمدة بالكامل'
    }
  }
];

export default function Technical() {
  const { t, dt, language } = useLanguage();
  
  const cachedTech = (() => {
    try {
      const cached = localStorage.getItem('cached_technical_data');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error("Failed to parse cached technical data", e);
    }
    return null;
  })();

  const [aiSummary, setAiSummary] = useState(() => cachedTech?.aiSummary !== undefined ? cachedTech.aiSummary : '');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // Document Center states
  const [activeDocFilter, setActiveDocFilter] = useState<'all' | 'bouw' | 'milieu' | 'kadaster'>('all');
  const [docSearchQuery, setDocSearchQuery] = useState('');
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [pdfZoom, setPdfZoom] = useState(100);
  const [pdfDownloadingDoc, setPdfDownloadingDoc] = useState<any | null>(null);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [documents, setDocuments] = useState<any[]>(() => cachedTech?.documents !== undefined ? cachedTech.documents : officialDocuments);
  const [draftDocuments, setDraftDocuments] = useState<any[]>([]);
  const [editingDoc, setEditingDoc] = useState<any | null>(null);
  const [newDocMode, setNewDocMode] = useState(false);
  const [languageTab, setLanguageTab] = useState<'nl' | 'en'>('nl');
  const [docToDelete, setDocToDelete] = useState<any | null>(null);
  const [fileUploading, setFileUploading] = useState(false);
  const [fileUploadProgress, setFileUploadProgress] = useState(0);

  // Core content states loaded from Firestore
  const [introText, setIntroText] = useState(() => cachedTech?.introText !== undefined ? cachedTech.introText : defaultIntroText);
  const [specs, setSpecs] = useState<SpecItem[]>(() => cachedTech?.specs !== undefined ? cachedTech.specs : defaultSpecs);
  const [stedenbouw, setStedenbouw] = useState<LabelValuePair[]>(() => cachedTech?.stedenbouw !== undefined ? cachedTech.stedenbouw : defaultStedenbouw);
  const [overstroming, setOverstroming] = useState<LabelValuePair[]>(() => cachedTech?.overstroming !== undefined ? cachedTech.overstroming : defaultOverstroming);
  const [installaties, setInstallaties] = useState<LabelValuePair[]>(() => cachedTech?.installaties !== undefined ? cachedTech.installaties : defaultInstallaties);
  const [priceSetting, setPriceSetting] = useState<LabelValuePair[]>(() => cachedTech?.priceSetting !== undefined ? cachedTech.priceSetting : defaultPriceSetting);
  const [algemeen, setAlgemeen] = useState<LabelValuePair[]>(() => cachedTech?.algemeen !== undefined ? cachedTech.algemeen : defaultAlgemeen);
  const [leefruimtes, setLeefruimtes] = useState<LabelValuePair[]>(() => cachedTech?.leefruimtes !== undefined ? cachedTech.leefruimtes : defaultLeefruimtes);
  const [extraRuimtes, setExtraRuimtes] = useState<LabelValuePair[]>(() => cachedTech?.extraRuimtes !== undefined ? cachedTech.extraRuimtes : defaultExtraRuimtes);
  const [nachtgedeelte, setNachtgedeelte] = useState<LabelValuePair[]>(() => cachedTech?.nachtgedeelte !== undefined ? cachedTech.nachtgedeelte : defaultNachtgedeelte);
  const [totals, setTotals] = useState<LabelValuePair[]>(() => cachedTech?.totals !== undefined ? cachedTech.totals : defaultTotals);
  const [totaalBruikbaar, setTotaalBruikbaar] = useState<string>(() => cachedTech?.totaalBruikbaar !== undefined ? cachedTech.totaalBruikbaar : "217 m²");
  const [bijzonderheden, setBijzonderheden] = useState<string[]>(() => cachedTech?.bijzonderheden !== undefined ? cachedTech.bijzonderheden : defaultBijzonderheden);
  const [rooms, setRooms] = useState<RoomDetailItem[]>(() => cachedTech?.rooms !== undefined ? cachedTech.rooms : defaultRooms);

  // Edit Panel drafts
  const [editMode, setEditMode] = useState(false);
  const [selectedRoomIndex, setSelectedRoomIndex] = useState(0);
  const [draftIntroText, setDraftIntroText] = useState('');
  const [draftSpecs, setDraftSpecs] = useState<SpecItem[]>([]);
  const [draftStedenbouw, setDraftStedenbouw] = useState<LabelValuePair[]>([]);
  const [draftOverstroming, setDraftOverstroming] = useState<LabelValuePair[]>([]);
  const [draftInstallaties, setDraftInstallaties] = useState<LabelValuePair[]>([]);
  const [draftPriceSetting, setDraftPriceSetting] = useState<LabelValuePair[]>([]);
  const [draftAlgemeen, setDraftAlgemeen] = useState<LabelValuePair[]>([]);
  const [draftLeefruimtes, setDraftLeefruimtes] = useState<LabelValuePair[]>([]);
  const [draftExtraRuimtes, setDraftExtraRuimtes] = useState<LabelValuePair[]>([]);
  const [draftNachtgedeelte, setDraftNachtgedeelte] = useState<LabelValuePair[]>([]);
  const [draftTotals, setDraftTotals] = useState<LabelValuePair[]>([]);
  const [draftTotaalBruikbaar, setDraftTotaalBruikbaar] = useState<string>("217 m²");
  const [draftBijzonderheden, setDraftBijzonderheden] = useState<string[]>([]);
  const [draftRooms, setDraftRooms] = useState<RoomDetailItem[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
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

    const unsubData = onSnapshot(doc(db, 'technical_data', 'page_content'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        try {
          localStorage.setItem('cached_technical_data', JSON.stringify(data));
        } catch (e) {
          console.error("Failed to write technical data cache:", e);
        }
        if (data.introText !== undefined) setIntroText(data.introText);
        if (data.specs !== undefined) setSpecs(data.specs);
        if (data.stedenbouw !== undefined) setStedenbouw(data.stedenbouw);
        if (data.overstroming !== undefined) setOverstroming(data.overstroming);
        if (data.installaties !== undefined) setInstallaties(data.installaties);
        
        let priceSettingData = data.priceSetting !== undefined ? data.priceSetting : defaultPriceSetting;
        
        // Auto-inject missing garage and apartment correct pricing items if missing
        const hasGarageItem = priceSettingData.some((item: any) => item.label && item.label.toLowerCase().includes('garage'));
        if (!hasGarageItem) {
          priceSettingData = [
            ...priceSettingData.filter((item: any) => item.label !== "Schattingsprijs"),
            { label: "Een garage kost al gauw", value: "€ 30.000,-" },
            { label: "Dan is voor het appartement", value: "€ 245.000,- (zeker correct)" },
            ...priceSettingData.filter((item: any) => item.label === "Schattingsprijs")
          ];
          
          setDoc(doc(db, 'technical_data', 'page_content'), {
            ...data,
            priceSetting: priceSettingData,
            updatedAt: new Date().toISOString(),
            updatedBy: 'system'
          }, { merge: true }).catch(err => console.error("Auto-adding garage price items failed:", err));
        }

        if (priceSettingData.length > 0 && priceSettingData[0].label === "Schattingsprijs") {
          const first = priceSettingData[0];
          const rest = priceSettingData.slice(1);
          priceSettingData = [...rest, first];
          
          setDoc(doc(db, 'technical_data', 'page_content'), {
            ...data,
            priceSetting: priceSettingData,
            updatedAt: new Date().toISOString(),
            updatedBy: 'system'
          }, { merge: true }).catch(err => console.error("Auto-moving Schattingsprijs failed:", err));
        }
        setPriceSetting(priceSettingData);
        
        let algemeenData = data.algemeen !== undefined ? data.algemeen : defaultAlgemeen;
        const hasConstructie = algemeenData.some((item: any) => item.label && item.label.toLowerCase() === 'constructie');
        if (!hasConstructie) {
          algemeenData = [...algemeenData, { label: "Constructie", value: "Steen en beton, geen houten gewelven" }];
          
          setDoc(doc(db, 'technical_data', 'page_content'), {
            ...data,
            algemeen: algemeenData,
            updatedAt: new Date().toISOString(),
            updatedBy: 'system'
          }, { merge: true }).catch(err => console.error("Auto-adding constructie failed:", err));
        }
        setAlgemeen(algemeenData);

        if (data.leefruimtes !== undefined) setLeefruimtes(data.leefruimtes);
        if (data.extraRuimtes !== undefined) setExtraRuimtes(data.extraRuimtes);
        if (data.nachtgedeelte !== undefined) setNachtgedeelte(data.nachtgedeelte);
        if (data.totals !== undefined) setTotals(data.totals);
        if (data.totaalBruikbaar !== undefined) setTotaalBruikbaar(data.totaalBruikbaar);
        if (data.bijzonderheden !== undefined) setBijzonderheden(data.bijzonderheden);
        if (data.rooms !== undefined) setRooms(data.rooms);
        if (data.aiSummary !== undefined) setAiSummary(data.aiSummary);
        if (data.documents !== undefined) {
          setDocuments(data.documents);
        } else {
          setDocuments(officialDocuments);
        }
      } else {
        // Fallback to cache or defaults
        const cached = localStorage.getItem('cached_technical_data');
        if (cached) {
          try {
            const data = JSON.parse(cached);
            if (data.introText !== undefined) setIntroText(data.introText);
            if (data.specs !== undefined) setSpecs(data.specs);
            if (data.stedenbouw !== undefined) setStedenbouw(data.stedenbouw);
            if (data.overstroming !== undefined) setOverstroming(data.overstroming);
            if (data.installaties !== undefined) setInstallaties(data.installaties);
            if (data.priceSetting !== undefined) setPriceSetting(data.priceSetting);
            if (data.algemeen !== undefined) setAlgemeen(data.algemeen);
            if (data.leefruimtes !== undefined) setLeefruimtes(data.leefruimtes);
            if (data.extraRuimtes !== undefined) setExtraRuimtes(data.extraRuimtes);
            if (data.nachtgedeelte !== undefined) setNachtgedeelte(data.nachtgedeelte);
            if (data.totals !== undefined) setTotals(data.totals);
            if (data.totaalBruikbaar !== undefined) setTotaalBruikbaar(data.totaalBruikbaar);
            if (data.bijzonderheden !== undefined) setBijzonderheden(data.bijzonderheden);
            if (data.rooms !== undefined) setRooms(data.rooms);
            if (data.aiSummary !== undefined) setAiSummary(data.aiSummary);
            if (data.documents !== undefined) setDocuments(data.documents);
          } catch (e) {}
        }
      }
    }, (err) => {
      console.warn("Failed to subscribe to technical_data page_content:", err);
    });

    return () => {
      unsubAuth();
      unsubData();
    };
  }, []);

  const login = async () => {
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
    }
  };

  const startEditing = () => {
    setDraftIntroText(introText);
    setDraftSpecs([...specs]);
    setDraftStedenbouw([...stedenbouw]);
    setDraftOverstroming([...overstroming]);
    setDraftInstallaties([...installaties]);
    setDraftPriceSetting([...priceSetting]);
    setDraftAlgemeen([...algemeen]);
    setDraftLeefruimtes([...leefruimtes]);
    setDraftExtraRuimtes([...extraRuimtes]);
    setDraftNachtgedeelte([...nachtgedeelte]);
    setDraftTotals([...totals]);
    setDraftTotaalBruikbaar(totaalBruikbaar);
    setDraftBijzonderheden([...bijzonderheden]);
    setDraftRooms(rooms.map(r => ({ ...r, features: r.features ? [...r.features] : [] })));
    setDraftDocuments(JSON.parse(JSON.stringify(documents)));
    setEditMode(true);
  };

  const uploadFileToLocalServer = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fileName: file.name,
            fileType: file.type,
            base64Data: reader.result as string,
          }),
        });

        if (!response.ok) {
          throw new Error(`Server status ${response.status}`);
        }

        const data = await response.json();
        if (data.success && data.url) {
          setEditingDoc((prev: any) => {
            if (!prev) return null;
            return {
              ...prev,
              pdfFile: data.url,
              pdfFileName: file.name,
              pdfFileSize: (file.size / 1024).toFixed(1) + ' KB'
            };
          });
        } else {
          throw new Error(data.error || "Unknown response");
        }
      } catch (err: any) {
        console.error("Local server upload fallback failed:", err);
        alert(dt("Fout bij het uploaden van het bestand: ") + err.message);
      } finally {
        setFileUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const uploadFileToFirebase = (file: File) => {
    if (!file) return;
    setFileUploading(true);
    setFileUploadProgress(0);

    const fileExtension = file.name.split('.').pop() || 'pdf';
    const fileNameSafe = `${Date.now()}_document.${fileExtension}`;
    const storageRef = ref(storage, `technical_documents/${fileNameSafe}`);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on('state_changed', 
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setFileUploadProgress(progress);
      }, 
      (error) => {
        console.warn("Firebase Storage upload failed, falling back to local server storage:", error);
        uploadFileToLocalServer(file);
      }, 
      () => {
        getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
          setEditingDoc((prev: any) => {
            if (!prev) return null;
            return {
              ...prev,
              pdfFile: downloadURL,
              pdfFileName: file.name,
              pdfFileSize: (file.size / 1024).toFixed(1) + ' KB'
            };
          });
          setFileUploading(false);
        }).catch((err) => {
          console.warn("Firebase URL retrieval failed, falling back to local server storage:", err);
          uploadFileToLocalServer(file);
        });
      }
    );
  };

  const saveChanges = async () => {
    try {
      if (!user) return;
      const nextContent = {
        introText: draftIntroText,
        specs: draftSpecs,
        stedenbouw: draftStedenbouw,
        overstroming: draftOverstroming,
        installaties: draftInstallaties,
        priceSetting: draftPriceSetting,
        algemeen: draftAlgemeen,
        leefruimtes: draftLeefruimtes,
        extraRuimtes: draftExtraRuimtes,
        nachtgedeelte: draftNachtgedeelte,
        totals: draftTotals,
        totaalBruikbaar: draftTotaalBruikbaar,
        bijzonderheden: draftBijzonderheden,
        rooms: draftRooms,
        documents: draftDocuments,
        aiSummary: aiSummary,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid
      };

      await setDoc(doc(db, 'technical_data', 'page_content'), nextContent, { merge: true });

      // Update local states immediately
      setIntroText(draftIntroText);
      setSpecs(draftSpecs);
      setStedenbouw(draftStedenbouw);
      setOverstroming(draftOverstroming);
      setInstallaties(draftInstallaties);
      setPriceSetting(draftPriceSetting);
      setAlgemeen(draftAlgemeen);
      setLeefruimtes(draftLeefruimtes);
      setExtraRuimtes(draftExtraRuimtes);
      setNachtgedeelte(draftNachtgedeelte);
      setTotals(draftTotals);
      setTotaalBruikbaar(draftTotaalBruikbaar);
      setBijzonderheden(draftBijzonderheden);
      setRooms(draftRooms);
      setDocuments(draftDocuments);

      setEditMode(false);
    } catch (error) {
      console.error("Save technical data failed: ", error);
      alert("Opslaan mislukt: " + error);
    }
  };

  const generateAiSummary = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specs: specs.map(s => `${s.label}: ${s.value}`).join(', ') }),
      });
      const data = await response.json();
      if (data.summary) {
        setAiSummary(data.summary);
        
        // Persist pitch straight to local DB
        await setDoc(doc(db, 'technical_data', 'page_content'), {
          introText,
          specs,
          stedenbouw,
          overstroming,
          installaties,
          priceSetting,
          algemeen,
          leefruimtes,
          extraRuimtes,
          nachtgedeelte,
          totals,
          bijzonderheden,
          rooms,
          aiSummary: data.summary,
          updatedAt: new Date().toISOString(),
          updatedBy: user.uid
        }, { merge: true });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getSafeDocRef = (certNum: string | undefined | null) => {
    if (!certNum) return 'N/A';
    const s = String(certNum);
    const p1 = s.includes(' — ') ? s.split(' — ')[0] : s;
    const p2 = p1.includes(' / ') ? p1.split(' / ')[0] : p1;
    return p2 || 'N/A';
  };

  const renderEPCPages = (docItem: any) => {
    return (
      <div className="flex flex-col gap-8 bg-slate-50 p-8">
        {/* --- EPC PAGE 1: COVER --- */}
        <div className="pdf-page bg-white text-slate-800 px-10 py-10 shadow-2xl rounded border border-slate-300 w-[794px] h-[1123px] font-sans flex flex-col justify-between shrink-0 box-border relative">
          <div>
            {/* Yellow-Green header bar matching the official Flemish output */}
            <div className="bg-[#c2d22a] -mx-10 -mt-10 p-8 mb-6 rounded-t border-b border-white/20">
              <h1 className="text-white text-3xl font-extrabold tracking-tight uppercase leading-snug">
                {dt('Energieprestatiecertificaat')}
              </h1>
              <p className="text-white text-lg font-medium tracking-wide mt-1 opacity-90">
                {dt('Residentiële eenheid')}
              </p>
            </div>

            {/* Building Main Image Frame */}
            <div className="flex flex-col items-center justify-center my-6">
              <div className="border-[6px] border-slate-100 bg-white shadow-md rounded-2xl overflow-hidden w-96 h-56 flex items-center justify-center">
                <img 
                  src="https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&q=80&w=600" 
                  alt="Facade Hunnegemstraat 12" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="text-center mt-4">
                <h2 className="text-base font-black text-slate-900 tracking-tight">
                  Hunnegemstraat 12, 9500 Geraardsbergen
                </h2>
                <p className="text-xs text-slate-500 uppercase font-mono tracking-wider mt-0.5">
                  appartement
                </p>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  certificaatnummer: <span className="font-extrabold text-slate-600">20221222-0002760563-RES-1</span>
                </p>
              </div>
            </div>

            {/* Energielabel Banner representing exact B Label - 130 score */}
            <div className="border-t border-b border-slate-100 py-6 my-6">
              <h3 className="text-center text-xs font-black uppercase tracking-wider text-slate-400 mb-4">
                {dt('Energielabel')}
              </h3>

              <div className="flex justify-between items-center px-4">
                {/* Big Bold Label Indicator */}
                <div className="flex flex-col items-center justify-center bg-[#84cc16] text-white rounded-2xl py-3 px-6 shadow-md border border-lime-500">
                  <span className="text-4xl font-black tracking-tighter leading-none">B</span>
                  <span className="text-[10px] font-black uppercase mt-1 tracking-wider">{dt('Label')}</span>
                </div>

                {/* Numeric rating */}
                <div className="text-center">
                  <span className="text-4xl font-black text-slate-900 leading-none">130</span>
                  <span className="text-sm font-bold text-slate-500 ml-1">kWh / (m² jaar)</span>
                  <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider mt-1">
                    {dt('Gemiddelde appartement: 222 kWh / (m² jaar)')}
                  </div>
                </div>
              </div>

              {/* Horizontal bar scale */}
              <div className="relative mt-6 px-4">
                <div className="h-6 rounded-lg flex overflow-hidden border border-slate-200/80 font-mono text-[9px] font-black text-white shadow-inner">
                  <div className="bg-[#ef4444] w-[14%] flex items-center justify-center">F</div>
                  <div className="bg-[#f97316] w-[14%] flex items-center justify-center">E</div>
                  <div className="bg-[#f59e0b] w-[14%] flex items-center justify-center">D</div>
                  <div className="bg-[#eab308] w-[14%] flex items-center justify-center">C</div>
                  <div className="bg-[#84cc16] w-[14%] flex items-center justify-center relative">
                    <span>B</span>
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-0.5">
                      <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-slate-950"></div>
                    </div>
                  </div>
                  <div className="bg-[#22c55e] w-[16%] flex items-center justify-center">A</div>
                  <div className="bg-[#15803d] w-[14%] flex items-center justify-center">A+</div>
                </div>
                <div className="flex justify-between text-[9px] font-mono text-slate-400 font-bold mt-1.5 px-1">
                  <span>...</span>
                  <span>500</span>
                  <span>400</span>
                  <span>300</span>
                  <span>200</span>
                  <span>100</span>
                  <span>0</span>
                  <span>-100</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed italic text-center px-4 my-4 font-light">
              {dt('De energiescore en het energielabel van dit appartement zijn bepaald via een theoretische berekening op basis van de bestaande toestand van het gebouw. Er wordt geen rekening gehouden met het werkelijk energieverbruik van de bewoners.')}
            </p>

            {/* Inspector assessment block */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 mt-6 text-xs text-slate-600">
              <h4 className="font-extrabold text-slate-800 uppercase tracking-wider text-[9px] mb-2 font-mono">
                {dt('Verklaring van de energiedeskundige')}
              </h4>
              <p className="leading-relaxed">
                {dt('Ik verklaar dat alle gegevens op dit certificaat overeenstemmen met de door de Vlaamse overheid vastgelegde werkwijze.')}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-200/50 pt-3">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{dt('Datum')}</p>
                  <p className="font-black text-slate-800 text-[11px]">22-12-2022</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{dt('Energiedeskundige')}</p>
                  <p className="font-black text-slate-800 text-[11px]">BART PEYSMANS DE RICK (EP19744)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Cover Page Footer */}
          <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-400 font-sans flex justify-between items-center select-none">
            <div>
              <p className="font-bold text-slate-650">{dt('Energieprestatiecertificaat (EPC)')} — Hunnegemstraat 12</p>
              <p className="text-[9px] mt-0.5">Vlaams Energie- en Klimaatagentschap</p>
            </div>
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-550 font-black rounded uppercase text-[9px]">
              {dt('PAGINA 1 van 4')}
            </span>
          </div>
        </div>

        {/* --- EPC PAGE 2: HUIDIGE STAAT --- */}
        <div className="pdf-page bg-white text-slate-800 px-10 py-10 shadow-2xl rounded border border-slate-300 w-[794px] h-[1123px] font-sans flex flex-col justify-between shrink-0 box-border relative">
          <div>
            <div className="border-b-4 border-[#c2d22a] pb-3 mb-6">
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                {dt('Huidige staat van het appartement')}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                {dt('Om met uw appartement te voldoen aan de energiedoelstelling, zijn er twee mogelijke pistes:')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6 text-xs text-slate-600 mb-6 font-light leading-relaxed">
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <span className="font-extrabold text-slate-800 block mb-1">1. {dt('Inzetten op isolatie en verwarming')}</span>
                {dt('U isoleert elk deel van uw appartement tot de doelstelling én u voorziet een energie-efficiënte verwarmingsinstallatie (condenserende ketel, warmtepomp, etc.).')}
              </div>
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <span className="font-extrabold text-slate-800 block mb-1">2. {dt('Energielabel van het appartement')}</span>
                {dt('U behaalt een energielabel A voor uw appartement (= energiescore van maximaal 100 kWh/(m² jaar)). U kiest zelf op welke manier u dat doet.')}
              </div>
            </div>

            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1.5 mb-4">
              {dt('Prestatie per bouwschil-onderdeel')}
            </h3>

            {/* Rating blocks */}
            <div className="space-y-3.5">
              {[
                { label: dt('Daken'), val: '0,28 W/(m²K)', target: '0,24 W/(m²K)', status: 'Voldoet bijna', color: 'bg-lime-500', detail: dt('Hellend dak voor & achter, 200mm MW tussen regelwerk') },
                { label: dt('Muren'), val: '0,78 W/(m²K)', target: '0,24 W/(m²K)', status: 'Nog te isoleren', color: 'bg-orange-500', detail: dt('Spouwmuren vermoedelijk weinig geïsoleerd') },
                { label: dt('Vensters (beglazing en profiel)'), val: '1,90 W/(m²K)', target: '1,50 W/(m²K)', status: 'Nog te verbeteren', color: 'bg-yellow-500', detail: dt('Houten en kunststof profielen') },
                { label: dt('Beglazing'), val: '1,51 W/(m²K)', target: '1,00 W/(m²K)', status: 'Nog te verbeteren', color: 'bg-yellow-500', detail: dt('Hoogrendementsbeglazing (HR-glas b)') },
                { label: dt('Deuren, poorten en panelen'), val: '2,71 W/(m²K)', target: '2,00 W/(m²K)', status: 'Nog te verbeteren', color: 'bg-orange-400', detail: dt('Deuren en panelen niet optimaal thermisch geïsoleerd') }
              ].map((item, idx) => (
                <div key={idx} className="border border-slate-200/60 rounded-xl p-3 flex justify-between items-center text-xs">
                  <div className="space-y-1 max-w-[60%] font-medium">
                    <span className="font-black text-slate-850 block">{item.label}</span>
                    <p className="text-[10px] text-slate-400 leading-none">{item.detail}</p>
                  </div>
                  <div className="text-right flex items-center space-x-3 shrink-0">
                    <div className="font-mono text-[11px] font-bold text-slate-700">
                      <p>{dt('U-waarde')}: <span className="font-black text-slate-900">{item.val}</span></p>
                      <p className="text-[9px] text-slate-400 font-medium">Doel: {item.target}</p>
                    </div>
                    <span className={`px-2.5 py-1 text-white font-extrabold rounded text-[9.5px] tracking-wider uppercase shadow-sm ${item.color}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional parameters section */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <h4 className="text-xs font-black uppercase text-slate-400 mb-3 tracking-wider">{dt('Technische Installaties & Comfort')}</h4>
              <div className="grid grid-cols-2 gap-4 text-xs font-medium">
                <div className="bg-slate-50 p-3 rounded-xl border flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">{dt('Verwarming')}</p>
                    <p className="text-slate-800 font-bold mt-0.5">{dt('Centrale verwarming (gas)')}</p>
                  </div>
                  <span className="p-1 bg-emerald-100 text-emerald-800 rounded-full"><Check className="w-3.5 h-3.5" /></span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">{dt('Sanitair warm water')}</p>
                    <p className="text-slate-800 font-bold mt-0.5">{dt('Aanwezig (gekoppeld)')}</p>
                  </div>
                  <span className="p-1 bg-emerald-100 text-emerald-800 rounded-full"><Check className="w-3.5 h-3.5" /></span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">{dt('Ventilatie')}</p>
                    <p className="text-slate-800 font-bold mt-0.5">{dt('Geen systeem aanwezig')}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-[9px] uppercase font-bold">{dt('Aandachtspunt')}</span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-[10px] font-bold uppercase">{dt('Koeling en zomercomfort')}</p>
                    <p className="text-slate-800 font-bold mt-0.5">{dt('Kans op oververhitting')}</p>
                  </div>
                  <span className="px-2 py-0.5 bg-sky-100 text-sky-800 rounded text-[9px] uppercase font-bold">{dt('Buitenzonwering')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Page 2 Footer */}
          <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-400 font-sans flex justify-between items-center select-none">
            <div>
              <p className="font-bold text-slate-650">{dt('Energieprestatiecertificaat (EPC)')} — Hunnegemstraat 12</p>
              <p className="text-[9px] mt-0.5">Vlaams Energie- en Klimaatagentschap</p>
            </div>
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-550 font-black rounded uppercase text-[9px]">
              {dt('PAGINA 2 van 4')}
            </span>
          </div>
        </div>

        {/* --- EPC PAGE 3: AANBEVELINGEN --- */}
        <div className="pdf-page bg-white text-slate-800 px-10 py-10 shadow-2xl rounded border border-slate-300 w-[794px] h-[1123px] font-sans flex flex-col justify-between shrink-0 box-border relative">
          <div>
            <div className="border-b-4 border-[#c2d22a] pb-3 mb-6">
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                {dt('Overzicht aanbevelingen')}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                {dt('In deze tabel vindt u aanbevelingen om uw appartement energiezuiniger te maken. Zo kunt u de energiescore nog verder verlagen naar')} <span className="font-extrabold text-slate-800">105 kWh / (m² jaar)</span>.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  category: dt('Muur'),
                  huidige: dt('3 m² van de muren is niet geïsoleerd.'),
                  aanbeveling: dt('Plaats isolatie aan de binnenkant of aan de buitenkant van de muren om warmteverliezen via de gevel tegen te gaan.')
                },
                {
                  category: dt('Vensters'),
                  huidige: dt('5 m² van de vensters heeft verouderde hoogrendementsbeglazing. Ook de raamprofielen zijn thermisch weinig performant.'),
                  aanbeveling: dt('Vervang de vensters door nieuwe vensters met hoogrendementsbeglazing en energieperformante raamprofielen.')
                },
                {
                  category: dt('Muur (spouw)'),
                  huidige: dt('39 m² van de spouwmuren is vermoedelijk te weinig geïsoleerd.'),
                  aanbeveling: dt('Breng isolatie aan in de spouw en combineer eventueel met extra wandisolatie voor maximaal comfort.')
                },
                {
                  category: dt('Hellend dak'),
                  huidige: dt('150 m² van het hellende dak is redelijk goed geïsoleerd (200mm MW tussen regelwerk), maar voldoet nog niet volledig aan de doelstelling.'),
                  aanbeveling: dt('Overweeg bij een grondige renovatie bijkomende overzetisolatie aan de binnenkant of buitenkant van het hellende dak.')
                },
                {
                  category: dt('Zonne-energie'),
                  huidige: dt('Er is geen zonnepanelen of zonneboiler installatie aanwezig op het dak.'),
                  aanbeveling: dt('Onderzoek de mogelijkheid om thermische zonnecollectoren of fotovoltaïsche zonnepanelen te plaatsen ter ondersteuning van eigen stroomvoorziening.')
                }
              ].map((item, idx) => (
                <div key={idx} className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-50 px-4 py-2 border-b flex justify-between items-center">
                    <span className="font-black text-slate-850 uppercase tracking-wider text-[10px] font-mono">{item.category}</span>
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 font-bold rounded text-[9px] uppercase">{dt('Aanbevolen actie')}</span>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 border-r border-slate-100 pr-3 font-medium">
                      <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">{dt('HUIDIGE SITUATIE')}</p>
                      <p className="text-slate-600 leading-relaxed font-light">{item.huidige}</p>
                    </div>
                    <div className="space-y-1.5 pl-1">
                      <p className="text-[9.5px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">{dt('AANBEVELING')}</p>
                      <p className="text-slate-800 font-semibold leading-relaxed">{item.aanbeveling}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Page 3 Footer */}
          <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-400 font-sans flex justify-between items-center select-none">
            <div>
              <p className="font-bold text-slate-650">{dt('Energieprestatiecertificaat (EPC)')} — Hunnegemstraat 12</p>
              <p className="text-[9px] mt-0.5">Vlaams Energie- en Klimaatagentschap</p>
            </div>
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-550 font-black rounded uppercase text-[9px]">
              {dt('PAGINA 3 van 4')}
            </span>
          </div>
        </div>

        {/* --- EPC PAGE 4: TECHNISCHE FICHE --- */}
        <div className="pdf-page bg-white text-slate-800 px-10 py-10 shadow-2xl rounded border border-slate-300 w-[794px] h-[1123px] font-sans flex flex-col justify-between shrink-0 box-border relative">
          <div>
            <div className="border-b-4 border-[#c2d22a] pb-3 mb-6">
              <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                {dt('Technische fiche van de bouwschil')}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                {dt('Gedetailleerde door de energiedeskundige ingevoerde parameters voor inspectie.')}
              </p>
            </div>

            <div className="space-y-6 text-xs">
              {/* Daken Table */}
              <div className="space-y-2">
                <h3 className="font-black text-slate-800 border-b pb-1 uppercase text-[10px] tracking-wider font-mono">
                  1. {dt('Hellende daken')}
                </h3>
                <table className="w-full text-left border-collapse border border-slate-200/55 rounded-xl overflow-hidden shadow-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[10px] font-black text-slate-550">
                      <th className="p-2.5">{dt('Beschrijving')}</th>
                      <th className="p-2.5">{dt('Oriëntatie')}</th>
                      <th className="p-2.5">{dt('Oppervlakte')}</th>
                      <th className="p-2.5">{dt('Isolatie')}</th>
                      <th className="p-2.5 text-right">{dt('U-waarde')} (W/m²K)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b font-medium text-slate-700">
                      <td className="p-2.5 font-bold text-slate-800">{dt('Hellend dak voor')}</td>
                      <td className="p-2.5">O (Oost)</td>
                      <td className="p-2.5">75 m²</td>
                      <td className="p-2.5">200mm MW tussen regelwerk</td>
                      <td className="p-2.5 text-right font-bold text-emerald-600">0,28</td>
                    </tr>
                    <tr className="font-medium text-slate-700">
                      <td className="p-2.5 font-bold text-slate-800">{dt('Hellend dak achter')}</td>
                      <td className="p-2.5">W (West)</td>
                      <td className="p-2.5">74 m²</td>
                      <td className="p-2.5">200mm MW tussen regelwerk</td>
                      <td className="p-2.5 text-right font-bold text-emerald-600">0,28</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Vensters Table */}
              <div className="space-y-2">
                <h3 className="font-black text-slate-800 border-b pb-1 uppercase text-[10px] tracking-wider font-mono">
                  2. {dt('Vensters en beglazing')}
                </h3>
                <table className="w-full text-left border-collapse border border-slate-200/55 rounded-xl overflow-hidden font-sans shadow-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b text-[10px] font-black text-slate-550">
                      <th className="p-2">{dt('Omschrijving')}</th>
                      <th className="p-2">{dt('Oriëntatie')}</th>
                      <th className="p-2">{dt('Oppervlakte')}</th>
                      <th className="p-2">{dt('Beglazingstype')}</th>
                      <th className="p-2">{dt('Profiel')}</th>
                      <th className="p-2 text-right">{dt('U-waarde')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { name: 'Voorgevel-GL1', side: 'O (Oost)', size: '5,0 m²', glass: 'HR-glas a', frame: 'Hout', u: '2,24' },
                      { name: 'Achtergevel-GL1', side: 'W (West)', size: '6,0 m²', glass: 'HR-glas b', frame: 'Kunststof >2000', u: '1,82' },
                      { name: 'Achtergevel-GL2', side: 'W (West)', size: '5,8 m²', glass: 'HR-glas b', frame: 'Kunststof >2000', u: '1,82' },
                      { name: 'Achtergevel-GL3', side: 'W (West)', size: '3,9 m²', glass: 'HR-glas b', frame: 'Kunststof >2000', u: '1,82' },
                      { name: 'Dakvlak voor-GL1', side: 'O (Oost) 45°', size: '2,3 m²', glass: 'HR-glas b', frame: 'Kunststof >2000', u: '1,82' },
                      { name: 'Dakvlak achter-GL1', side: 'W (West) 45°', size: '3,4 m²', glass: 'HR-glas b', frame: 'Kunststof >2000', u: '1,82' }
                    ].map((win, index) => (
                      <tr key={index} className="border-b font-medium hover:bg-slate-50/40 text-slate-700">
                        <td className="p-2 font-bold text-slate-800">{win.name}</td>
                        <td className="p-2">{win.side}</td>
                        <td className="p-2">{win.size}</td>
                        <td className="p-2 text-slate-600">{win.glass}</td>
                        <td className="p-2 text-slate-600">{win.frame}</td>
                        <td className="p-2 text-right font-bold text-amber-600">{win.u}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Stamp and reference info */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-4 mt-6 flex justify-between items-center text-[11px] leading-relaxed font-normal">
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-700 uppercase tracking-widest text-[8.5px] font-mono">{dt('OVERHEIDSVALIDATIE')}</p>
                  <p className="text-slate-655 font-normal">✓ {dt('Dit rapport stemt 100% overeen met het geregistreerde EPC in de Vlaamse energie-databank.')}</p>
                  <p className="text-slate-500 font-light font-sans">{dt('Validatiecode: 20221222-0002760563-RES-1 • Gecertificeerd op 22 december 2022.')}</p>
                </div>
                <div className="w-16 h-16 border border-emerald-500/20 bg-emerald-50 rounded-full flex items-center justify-center text-center p-1 shrink-0 ml-4">
                  <span className="text-[7.5px] font-black text-emerald-800 uppercase tracking-tight leading-none rotate-12">{dt('GOEDGEKEURD VL-EPC')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Page 4 Footer */}
          <div className="border-t border-slate-200 pt-4 text-[10px] text-slate-400 font-sans flex justify-between items-center select-none animate-fade-in">
            <div>
              <p className="font-bold text-slate-650">{dt('Energieprestatiecertificaat (EPC)')} — Hunnegemstraat 12</p>
              <p className="text-[9px] mt-0.5">Vlaams Energie- en Klimaatagentschap</p>
            </div>
            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-550 font-black rounded uppercase text-[9px]">
              {dt('PAGINA 4 van 4')}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const renderDocPages = (docItem: any) => {
    if (!docItem) return null;
    if (docItem.id === 'epc') {
      return renderEPCPages(docItem);
    }
    const titleLocalized = typeof docItem.title === 'object' 
      ? (docItem.title[language] || docItem.title['nl'] || '') 
      : (docItem.title || '');
    const descLocalized = typeof docItem.description === 'object' 
      ? (docItem.description[language] || docItem.description['nl'] || '') 
      : (docItem.description || '');
    const badgeLocalized = typeof docItem.badge === 'object' 
      ? (docItem.badge[language] || docItem.badge['nl'] || '') 
      : (docItem.badge || '');

    return (
      <div className="flex flex-col gap-8 bg-slate-50 p-8">
        {/* --- PAGE 1 --- */}
        <div className="pdf-page bg-white text-slate-800 px-10 py-12 shadow-2xl rounded border border-slate-300 w-[794px] h-[1123px] font-sans flex flex-col justify-between shrink-0 box-border">
          <div>
            {/* RECONSTRUCT SHEET HEADER */}
            {docItem.id === 'epc' && (
              <div className="border-b-4 border-lime-500 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-lime-600 block uppercase font-mono tracking-widest">
                      Vlaams Agentschap van Energie & Klimaat
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">
                      Energieprestatiecertificaat (EPC)
                    </h1>
                    <p className="text-[11px] text-slate-500 font-mono mt-1 uppercase">
                      Residentiële Eenheid / Appartement
                    </p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-400 bg-slate-50 p-2 border border-slate-200 rounded">
                    <p className="font-extrabold text-slate-705">CERTIFICAATNUMMER</p>
                    <p className="text-[11px] text-slate-900 font-black">20221222-0002760563-RES-1</p>
                  </div>
                </div>
              </div>
            )}

            {docItem.id === 'asbest' && (
              <div className="border-b-4 border-yellow-500 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-yellow-500 text-yellow-950 font-black text-[9px] uppercase tracking-wider rounded">
                        OVAM Conform
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-widest">
                        Vlaanderen is materiaalbewust
                      </span>
                    </div>
                    <h1 className="text-2xl font-black text-slate-950 tracking-tight leading-none mt-1">
                      Asbestinventarisattest
                    </h1>
                    <p className="text-[11px] text-slate-500 font-mono mt-1">
                      Krachtens het Decreet van 24 april 2009 betreffende de bodemsanering en asbestveiligheid
                    </p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-400 bg-slate-50 p-2 border border-slate-200 rounded">
                    <p className="font-extrabold text-slate-705">ATTESTNUMMER</p>
                    <p className="text-[11px] text-slate-900 font-black">20230219-000043.001</p>
                  </div>
                </div>
              </div>
            )}

            {docItem.id === 'bodem' && (
              <div className="border-b-4 border-teal-500 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-teal-600 block uppercase tracking-widest">
                      OPENBARE VLAAMSE AFVALSTOFFENMAATSCHAPPIJ
                    </span>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none mt-1">
                      BODEMATTEST
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 italic">
                      Uitgegeven overeenkomstig de bepalingen van het Bodemdecreet
                    </p>
                  </div>
                  <div className="text-right font-mono text-[10px] text-slate-400 bg-slate-50 p-2 border border-slate-200 rounded">
                    <p className="font-bold text-slate-705">ONS KENMERK</p>
                    <p className="text-slate-900 font-bold">20230050758</p>
                  </div>
                </div>
              </div>
            )}

            {docItem.id === 'kadaster_opzoeking' && (
              <div className="border-b-4 border-indigo-600 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-widest font-mono">
                      KONINKLIJKE FEDERATIE VAN BELGISCH NOTARIAAT
                    </span>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1">
                      Kadastrale Opzoeking & Eigendomsinformatie
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Gecertificeerde inlichtingen ten behoeve van onroerende verkoopstransactie
                    </p>
                  </div>
                  <div className="text-right font-mono text-[10px] bg-slate-50 p-2 border border-slate-200 rounded">
                    <p className="font-bold text-slate-705">DOSSIERNR</p>
                    <p className="text-slate-900 font-bold">KD/W.1951/2230025</p>
                  </div>
                </div>
              </div>
            )}

            {docItem.id === 'kadaster_percelenplan' && (
              <div className="border-b-4 border-rose-500 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-rose-600 block uppercase tracking-widest font-mono">
                      FEDERALE OVERHEIDSDIENST FINANCIËN / AAPD
                    </span>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1">
                      Extract van het Kadastraal Percelenplan
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-mono uppercase">
                      Gecentreerd op GERAARDSBERGEN 1 AFD / Schaal 1:250
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1 rounded">
                    Meest recente toestand
                  </span>
                </div>
              </div>
            )}

            {docItem.id === 'overstroming' && (
              <div className="border-b-4 border-blue-500 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-blue-600 block uppercase tracking-widest">
                      INTEGRAAL WATERBELEID / VLAANDEREN IS MILIEU
                    </span>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1">
                      Watertoetstabel & Risicozones Overstromingen
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 font-mono">
                      Kaartversie: januari 2018 / Datum afdruk: 23/01/2023
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded">
                    Klasse A Conform
                  </span>
                </div>
              </div>
            )}

            {docItem.id === 'erfgoed' && (
              <div className="border-b-4 border-violet-500 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-violet-600 block uppercase tracking-widest">
                      AGENTSCHAP ONROEREND ERFGOED / VLAAMSE OVERHEID
                    </span>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1">
                      Perceelrapport Onroerend Erfgoed
                    </h1>
                    <p className="text-xs text-slate-500 mt-1 italic">
                      Inlichtingen aangaande erfgoedrechtelijke gevolgen en beschermingen
                    </p>
                  </div>
                  <div className="text-right font-mono text-[10px] bg-slate-50 p-2 border border-slate-200 rounded">
                    <p className="font-bold text-slate-705">CAPAKEY</p>
                    <p className="text-slate-900 font-bold">41018A0714/00E000</p>
                  </div>
                </div>
              </div>
            )}

            {docItem.id === 'klip' && (
              <div className="border-b-4 border-amber-500 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-amber-600 block uppercase tracking-widest font-mono">
                      KABEL- EN LEIDINGINFORMATIEPORTAAL (KLIP VLAANDEREN)
                    </span>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1">
                      Gedelegeerd KLIP-Inlichtingenverslag
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      Inquiry of registered pipeline & utility operators for construction and safety
                    </p>
                  </div>
                  <div className="text-right font-mono text-[10px] bg-slate-50 p-2 border border-slate-200 rounded">
                    <p className="font-bold text-slate-705">REF. KD/W</p>
                    <p className="text-slate-900 font-bold">1951/2230025</p>
                  </div>
                </div>
              </div>
            )}

            {/* Custom/Fallback Header */}
            {!['epc', 'asbest', 'bodem', 'kadaster_opzoeking', 'kadaster_percelenplan', 'overstroming', 'erfgoed', 'klip'].includes(docItem.id) && (
              <div className="border-b-4 border-slate-600 pb-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[9px] font-bold text-slate-600 block uppercase tracking-widest">
                      OFFICIEEL DOCUMENTENARCHIEF HUNNEGEMRESIDENTIE
                    </span>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1">
                      {titleLocalized}
                    </h1>
                    <p className="text-xs text-slate-500 mt-1">
                      {descLocalized || dt('Gevalideerd archiefdocument voor verkooptransactie.')}
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1 rounded">
                    {badgeLocalized}
                  </span>
                </div>
              </div>
            )}

            {/* Property Info block */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] mb-1 font-mono">
                  BETREFT LOCATIE / ADRES
                </p>
                <p className="font-bold text-slate-800 text-sm">Hunnegemstraat 10 - 12</p>
                <p className="font-medium">9500 Geraardsbergen, België</p>
                <p className="mt-2 font-medium">Gemeente: <span className="font-bold text-slate-800">Geraardsbergen</span></p>
              </div>
              <div className="sm:border-l sm:border-slate-200 sm:pl-4">
                <p className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] mb-1 font-mono">
                  KADASTRALE IDENTIFICATIE
                </p>
                <p className="font-mono text-slate-800 font-bold">AFDELING 1 [41018]</p>
                <p className="font-mono">Sectie: <span className="font-bold text-slate-800">A</span></p>
                <p className="font-mono">Perceelnummer: <span className="font-bold text-slate-800">0714/00E000 / 0714EP0000</span></p>
              </div>
            </div>

            {/* Status Banner */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8 flex items-center space-x-4">
              <div className="p-3 bg-emerald-600 text-white rounded-full shrink-0">
                <Check className="w-5 h-5 font-black" />
              </div>
              <div>
                <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider">
                  {dt('STATUS VAN CONFORMITEIT')}
                </h4>
                <p className="text-lg font-black text-slate-900 mt-0.5 leading-snug">
                  {docItem.conclusion}
                </p>
                <p className="text-xs text-slate-500 font-light mt-1">
                  {dt('Dit document is volledig goedgekeurd, gevalideerd door overheidsinstanties en onherroepelijk conform bevonden.')}
                </p>
              </div>
            </div>

            {/* DOCUMENT SPECIFIC SECTIONS RECONSTRUCTION */}
            {docItem.id === 'epc' && (
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                  GEDETAILLEERDE PRESTATIETABEL (ENERGIELABEL)
                </h3>
                
                {/* Interactive Slider recreation */}
                <div className="space-y-2 select-none">
                  <div className="flex justify-between text-[11px] font-black font-mono">
                    <span className="text-slate-400">...</span>
                    <span className="text-slate-400">500</span>
                    <span className="text-slate-400">400</span>
                    <span className="text-slate-400">300</span>
                    <span className="text-slate-400">200</span>
                    <span className="text-slate-400">100</span>
                    <span className="text-slate-400">0</span>
                    <span className="text-slate-400">-100</span>
                  </div>
                  {/* Interactive label range */}
                  <div className="h-6 rounded-full flex overflow-hidden border border-slate-300 shadow-inner font-mono text-[10px] font-black text-white relative">
                    <div className="bg-red-500 w-[15%] flex items-center justify-center">F</div>
                    <div className="bg-amber-600 w-[15%] flex items-center justify-center">E</div>
                    <div className="bg-amber-500 w-[15%] flex items-center justify-center">D</div>
                    <div className="bg-yellow-400 w-[15%] flex items-center justify-center">C</div>
                    <div className="bg-lime-500 w-[15%] flex items-center justify-center relative">
                      <span>B</span>
                      {/* Current Target indicator */}
                      <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col items-center">
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-slate-900"></div>
                        <span className="bg-slate-900 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded shadow-md mt-0.5 shrink-0 whitespace-nowrap">
                          NU: 130 kWh/m² (B)
                        </span>
                      </div>
                    </div>
                    <div className="bg-emerald-500 w-[15%] flex items-center justify-center">A</div>
                    <div className="bg-emerald-600 w-[10%] flex items-center justify-center">A+</div>
                  </div>
                </div>

                {/* Spaces stats list */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 pt-8 text-xs">
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-slate-800 border-b pb-1 font-mono uppercase text-[9px] tracking-wider">HUIDIGE ISOLATIESTAAT</h4>
                    <ul className="space-y-2">
                      <li className="flex justify-between border-b border-slate-50 pb-2">
                        <span className="text-slate-500">Daken (U = 0.28 W/m²K)</span>
                        <span className="font-extrabold text-emerald-600">✓ Voldoet (200mm MW)</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-50 pb-2">
                        <span className="text-slate-500">Muren (U = 0.78 W/m²K)</span>
                        <span className="font-bold text-slate-700">✓ Conform</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-50 pb-2">
                        <span className="text-slate-500">Vensters (Beglazing)</span>
                        <span className="font-bold text-slate-700">✓ HR-glas b (U = 1.82)</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <h4 className="font-extrabold text-slate-800 border-b pb-1 font-mono uppercase text-[9px] tracking-wider">TECHNISCHE INSTALLATIES</h4>
                    <ul className="space-y-2">
                      <li className="flex justify-between border-b border-slate-50 pb-2">
                        <span className="text-slate-500">Verwarming</span>
                        <span className="font-bold text-slate-700">Centrale verwarming (gas)</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-50 pb-2">
                        <span className="text-slate-500">Keteltype</span>
                        <span className="font-extrabold text-emerald-600">Condenserende ketel</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-50 pb-2">
                        <span className="text-slate-500">Vlaamse Doelstelling</span>
                        <span className="font-bold text-slate-600">100 kWh / m² (Klasse A)</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {docItem.id === 'asbest' && (
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                  INSPECTIE-RESULTATEN EN ASBEST-VEILIGHEID
                </h3>

                {/* Main counters bento style */}
                <div className="grid grid-cols-3 gap-4 py-4 text-center">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-3xl font-black text-slate-900">0</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                      Asbestmaterialen
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-3xl font-black text-slate-900">0</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                      Beperkingen
                    </p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <p className="text-3xl font-black text-slate-900">0</p>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                      Uitsluitingen
                    </p>
                  </div>
                </div>

                {/* Specific inspected zones */}
                <div className="bg-white border rounded-xl p-5 text-xs text-slate-600 space-y-3.5">
                  <h4 className="font-bold text-slate-800 font-mono uppercase text-[9px] tracking-wider pb-1.5 border-b">
                    GEÏNSPECTEERDE ELEMENTEN EN MONSTERS
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-1">
                      <span className="font-medium text-slate-700">1. Pleisterwerk nachthal (tweede verdieping)</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[9.5px]">Geen asbesthoudend materiaal (conform)</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-t border-slate-100">
                      <span className="font-medium text-slate-700">2. Pleisterwerk keuken (gelijkvloers)</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[9.5px]">Geen asbesthoudend materiaal (conform)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {docItem.id === 'bodem' && (
              <div className="space-y-5 text-sm font-light text-slate-600">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                  UITSPRAAK EN INLICHTINGEN OVER DE BODEMKWALITEIT
                </h3>
                
                <div className="space-y-4">
                  <p className="leading-relaxed">
                    <strong>1. KADASTRALE GEGEVENS</strong><br />
                    Betreft grond te Geraardsbergen, afdeling 1, sectie A met nummer 0714/00E000.
                  </p>
                  
                  <p className="leading-relaxed">
                    <strong>2. INHOUD VAN HET BODEMATTEST</strong><br />
                    De OVAM (Openbare Vlaamse Afvalstoffenmaatschappij) attesteert dat deze grond op de datum van uitgifte (26.01.2023) <strong>niet is opgenomen in het grondeninformatieregister (GIR)</strong>. 
                  </p>

                  <div className="bg-slate-50 border rounded-xl p-4 text-xs space-y-2.5 font-normal">
                    <p>✓ <strong>Informatie uit de gemeentelijke inventaris:</strong> De OVAM heeft geen enkele aanwijzing dat deze grond een risicogrond betreft.</p>
                    <p>✓ <strong>Bodemsanerings status:</strong> Geen saneringsverplichtingen, saneringsbesluiten of gebruiksbeperkingen van kracht.</p>
                  </div>
                </div>
              </div>
            )}

            {docItem.id === 'kadaster_opzoeking' && (
              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                  BETROKKEN GOEDEREN & RECHTEN VAN DE EIGENAAR
                </h3>

                <table className="w-full text-left text-xs font-sans border-collapse">
                  <thead>
                    <tr className="bg-indigo-50 text-indigo-900 border-b font-extrabold">
                      <th className="py-2.5 px-3">Naam / Eigenaar</th>
                      <th className="py-2.5 px-3">Straat / Adres</th>
                      <th className="py-2.5 px-3">Gemeente</th>
                      <th className="py-2.5 px-3">Rechten</th>
                      <th className="py-2.5 px-3 text-right">Andere</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b font-medium text-slate-700">
                      <td className="py-3 px-3 italic">Mede-eigenaren conform quotiteiten</td>
                      <td className="py-3 px-3">Hunnegemstraat 10/12</td>
                      <td className="py-3 px-3">Geraardsbergen</td>
                      <td className="py-3 px-3 font-bold text-indigo-700">VE 1/1</td>
                      <td className="py-3 px-3 text-right">Mede-eigendom</td>
                    </tr>
                  </tbody>
                </table>

                <div className="mt-4 bg-slate-50 border rounded-xl p-4 text-xs space-y-2.5 leading-relaxed text-slate-600">
                  <p><strong>Aard perceel:</strong> Ongebouwd & Privé-berging (Hunnegem residentie garage en duplex).</p>
                  <p><strong>Totale terreininvulling:</strong> Totale opp. 340.0 m² / Toestand op 23/01/2023.</p>
                </div>
              </div>
            )}

            {docItem.id === 'kadaster_percelenplan' && (
              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                  KADASTRALE PERCEELGRENZEN KAARTWEERGAVE (1:250)
                </h3>

                {/* SVG Percelenplan diagram recreation */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center">
                  <svg className="w-full max-w-[480px] h-64 border rounded-xl bg-white shadow-inner" viewBox="60 40 400 320">
                    <line x1="80" y1="40" x2="380" y2="340" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
                    <line x1="380" y1="40" x2="380" y2="340" stroke="#f1f5f9" strokeWidth="2" />
                    
                    <line x1="300" y1="50" x2="380" y2="280" stroke="#94a3b8" strokeWidth="20" strokeLinecap="round" opacity="0.15" />
                    <text x="350" y="240" fill="#475569" fontSize="10" className="font-bold font-mono tracking-widest" transform="rotate(71, 350, 240)">
                      HUNNEGEMSTRAAT
                    </text>

                    <polygon points="120,60 210,50 350,110 320,180 180,240 180,210 110,210 140,110" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
                    <text x="220" y="140" fill="#b45309" fontSize="13" className="font-extrabold text-[12px]">
                      10/12 (A714e)
                    </text>

                    <polygon points="210,50 300,40 380,80 350,110" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" opacity="0.6" />
                    <text x="290" y="70" fill="#64748b" fontSize="9" className="font-bold">14 (A718x2)</text>

                    <polygon points="300,40 340,30 380,50 380,80" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" opacity="0.6" />
                    <text x="350" y="45" fill="#64748b" fontSize="8">16 (A718n2)</text>

                    <polygon points="180,240 320,180 340,240 240,285" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" opacity="0.6" />
                    <text x="245" y="225" fill="#64748b" fontSize="9" className="font-bold">8 (A713k)</text>

                    <g transform="translate(360, 60)">
                      <line x1="0" y1="20" x2="0" y2="-20" stroke="#000" strokeWidth="2" />
                      <polygon points="0,-20 -5,-10 5,-10" fill="#000" />
                      <text x="2" y="-12" fontSize="10" className="font-black">N</text>
                    </g>
                  </svg>

                  <p className="text-[10px] text-slate-400 mt-3 font-mono">
                    Bovengenoemd diagram herleidt de officiële kadastrale grenzen voor het duplex kavel 10/12.
                  </p>
                </div>
              </div>
            )}

            {docItem.id === 'overstroming' && (
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                  OVERSTROMINGSRISICO EN WATERBEHEERSING
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="bg-slate-50 p-4 border rounded-xl">
                    <p className="font-black text-slate-800 text-[10px] uppercase font-mono tracking-wider mb-2">
                      P-SCORE (PERCEEL)
                    </p>
                    <span className="text-2xl font-black text-emerald-600 block">KLASSE A</span>
                    <p className="text-[11px] text-slate-500 mt-1 font-light leading-relaxed">
                      Geen overstromingsrisico onder invloed van intense neerslag of drempelleidingen.
                    </p>
                  </div>
                  <div className="bg-slate-50 p-4 border rounded-xl">
                    <p className="font-black text-slate-800 text-[10px] uppercase font-mono tracking-wider mb-2">
                      G-SCORE (GEBOUW)
                    </p>
                    <span className="text-2xl font-black text-emerald-600 block">KLASSE A</span>
                    <p className="text-[11px] text-slate-500 mt-1 font-light leading-relaxed">
                      Het gebouw is uiterst veilig en kent statistisch geen enkele overstromingsdreiging.
                    </p>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border rounded-xl text-xs leading-relaxed text-slate-600 font-light">
                  <p>✓ <strong>Signaalgebied:</strong> Nee (geen aangeduid signaalgebied, dus geen belemmering op onroerend recht).</p>
                  <p>✓ <strong>Natuurrampenverzekering:</strong> Volledig gedekt onder reguliere premies zonder meerkost of sancties.</p>
                </div>
              </div>
            )}

            {docItem.id === 'erfgoed' && (
              <div className="space-y-6">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
                  ERFGOEDRECHTELIJKE BEPALINGEN EN INRICHTING
                </h3>

                <ul className="space-y-3 font-sans text-xs">
                  {[
                    { l: 'Overgangszone', v: 'Nee' },
                    { l: 'Beschermd monument', v: 'Nee' },
                    { l: 'Beschermd cultuurhistorisch landschap', v: 'Nee' },
                    { l: 'Beschermde archeologische site', v: 'Nee' },
                    { l: 'Vastgestelde archeologische zone', v: 'Ja (Historische stadskern van Geraardsbergen)' },
                    { l: 'Vastgesteld erfgoed of dorpsgezicht', v: 'Nee' }
                  ].map((item, idx) => (
                    <li key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 leading-snug">
                      <span className="text-slate-500 font-medium">{item.l}</span>
                      <span className={`px-2.5 py-0.5 rounded font-bold ${item.v.startsWith('Ja') ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                        {item.v}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="bg-slate-50 p-4 border rounded-xl text-[11px] leading-relaxed text-slate-500 font-light">
                  Inlichtingen aangaande de archeologische kern ontsluiten dat er <strong>geen restricties, pre-emption claims of onderhoudsplichten</strong> gelden op het appartement zelf voor gewone herstellingen.
                </div>
              </div>
            )}

            {docItem.id === 'klip' && (
              <div className="space-y-5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-450 border-b border-slate-100 pb-2">
                  NUTS- EN LEIDINGBEHEERDERS DIRECTORY
                </h3>

                <table className="w-full text-xs font-mono border border-slate-100 font-light">
                  <thead>
                    <tr className="bg-slate-50 text-slate-700 font-extrabold text-[10px]">
                      <th className="p-2 border-b text-left">Beheerder</th>
                      <th className="p-2 border-b text-left">Nettype</th>
                      <th className="p-2 border-b text-left">Noodnummer</th>
                      <th className="p-2 border-b text-left">Inlichting</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { n: 'AWV KLIP info', t: 'Wegen & Infra', p: '+32 3 443 6285', c: 'In orde' },
                      { n: 'De Watergroep', t: 'Drinkwater', p: '+32 2 238 9699', c: 'Gekarteerd' },
                      { n: 'Fluvius (Gas/Elec)', t: 'Energie', p: '+32 78 35 35 34', c: 'Gecertificeerd' },
                      { n: 'Proximus', t: 'Telecom net', p: '+32 800 20065', c: 'Aangesloten' },
                      { n: 'Telenet BVBA', t: 'Kabelnet', p: '+32 015 333 596', c: 'Geautoriseerd' }
                    ].map((item, idx) => (
                      <tr key={idx} className="border-b hover:bg-slate-50/50">
                        <td className="p-2 font-bold text-slate-800">{item.n}</td>
                        <td className="p-2">{item.t}</td>
                        <td className="p-2 text-red-600 font-bold">{item.p}</td>
                        <td className="p-2 text-slate-500">{item.c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!['epc', 'asbest', 'bodem', 'kadaster_opzoeking', 'kadaster_percelenplan', 'overstroming', 'erfgoed', 'klip'].includes(docItem.id) && (
              <div className="space-y-6 text-left">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-450 border-b border-slate-100 pb-2">
                  {dt('INFORMATIEDETAILS & SPECIFICATIES')}
                </h3>
                {docItem.details && docItem.details.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                    {docItem.details.map((detail: any, dIdx: number) => (
                      <div key={dIdx} className="bg-slate-50 p-4 border border-slate-150 rounded-xl shadow-sm">
                        <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] mb-1 font-mono">
                          {detail.label}
                        </p>
                        <span className="text-sm font-bold text-slate-800 leading-snug">{detail.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 font-light">
                    {dt('Geen aanvullende details gespecificeerd.')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Page 2 Footer */}
          <div className="border-t border-slate-200 pt-5 mt-10 text-[10px] text-slate-400 font-light flex justify-between items-center bg-transparent shrink-0 select-none font-sans">
            <div>
              <p className="font-bold text-slate-650">{dt('Geraadpleegde documentreferentie:')} Hunnegemresidentie</p>
              <p className="mt-0.5">{dt('Officiële onlinedocumentversie in AI-archief • Versie 2026')}</p>
            </div>
            <div className="text-right font-semibold text-sans">
              <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-650 font-black rounded uppercase text-[9px]">
                PAGINA 2 van 2
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const downloadDocumentPDF = async (docItem: any) => {
    if (!docItem) return;

    if (docItem.pdfFile) {
      try {
        if (docItem.pdfFile.startsWith('data:')) {
          const link = document.createElement('a');
          link.href = docItem.pdfFile;
          const extension = docItem.pdfFile.split(';')[0].split('/')[1] || 'pdf';
          link.download = `${docItem.title[language] || docItem.title['nl'] || 'Document'}_Hunnegem.${extension}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // Open the real Firebase Storage original PDF in a new tab
          window.open(docItem.pdfFile, '_blank');
        }
      } catch (err: any) {
        console.error("Native file download failed:", err);
        alert(dt("Fout bij downloaden van bestand: ") + err.toString());
      }
      return;
    }

    if (isDownloadingPdf) return;
    try {
      setIsDownloadingPdf(true);
      setPdfDownloadingDoc(docItem);
      
      // Wait for React to render the hidden container
      await new Promise(resolve => setTimeout(resolve, 850));
      
      const container = document.getElementById('hidden-pdf-document-render-target');
      if (!container) throw new Error("PDF layout container not found");
      
      const pages = container.querySelectorAll('.pdf-page');
      if (pages.length === 0) throw new Error("No pages found in container");
      
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
      });
      
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const dataUrl = await domToPng(page, {
          scale: 1.5,
          backgroundColor: '#ffffff',
        });
        
        if (i > 0) pdf.addPage();
        
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
        
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      pdf.save(`${docItem.id.toUpperCase()}_Certificaat_Hunnegem.pdf`);
    } catch (e: any) {
      console.error("PDF generation failed:", e);
      alert(dt("Fout bij het genereren van PDF: ") + e.toString());
    } finally {
      setPdfDownloadingDoc(null);
      setIsDownloadingPdf(false);
    }
  };

  const renderDetailSection = (
    title: string, 
    draftList: LabelValuePair[], 
    setDraftList: Dispatch<SetStateAction<LabelValuePair[]>>,
    activeList: LabelValuePair[],
    setActiveList?: Dispatch<SetStateAction<LabelValuePair[]>>,
    dbKey?: string
  ) => {
    if (editMode) {
      return (
        <div className="space-y-3 p-4 bg-slate-50/75 rounded-xl border border-slate-200">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-600 border-b border-primary-100 pb-1.5">{title}</h4>
          <div className="space-y-2">
            {draftList.map((item, index) => (
              <div key={`draft-${item.label}-${index}`} className="flex flex-col lg:flex-row gap-2 items-stretch lg:items-center font-bold w-full">
                <input
                  type="text"
                  value={item.label}
                  placeholder="Eigenschap"
                  onChange={(e) => {
                    const updated = [...draftList];
                    updated[index] = { ...item, label: e.target.value };
                    setDraftList(updated);
                  }}
                  className="w-full lg:w-1/2 min-w-0 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 shrink-0"
                />
                <div className="flex w-full lg:w-1/2 space-x-2 items-center min-w-0">
                  <input
                    type="text"
                    value={item.value}
                    placeholder="Waarde"
                    onChange={(e) => {
                      const updated = [...draftList];
                      updated[index] = { ...item, value: e.target.value };
                      setDraftList(updated);
                    }}
                    className="flex-grow min-w-0 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
                  />
                  <div className="flex items-center space-x-0.5 border border-slate-200 rounded bg-white p-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => {
                        if (index === 0) return;
                        const updated = [...draftList];
                        const temp = updated[index];
                        updated[index] = updated[index - 1];
                        updated[index - 1] = temp;
                        setDraftList(updated);
                      }}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-1 flex items-center justify-center cursor-pointer rounded hover:bg-slate-50 transition-colors"
                      title="Omhoog verplaatsen"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === draftList.length - 1}
                      onClick={() => {
                        if (index === draftList.length - 1) return;
                        const updated = [...draftList];
                        const temp = updated[index];
                        updated[index] = updated[index + 1];
                        updated[index + 1] = temp;
                        setDraftList(updated);
                      }}
                      className="text-slate-400 hover:text-slate-700 disabled:opacity-20 p-1 flex items-center justify-center cursor-pointer rounded hover:bg-slate-50 transition-colors"
                      title="Omlaag verplaatsen"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftList(draftList.filter((_, i) => i !== index));
                    }}
                    className="text-red-500 hover:text-red-700 p-1 flex items-center justify-center cursor-pointer hover:bg-red-50 rounded shrink-0"
                    title="Verwijder rij"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={() => {
                setDraftList([...draftList, { label: "Nieuw veld", value: "Details" }]);
              }}
              className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-800 flex items-center space-x-1 pt-1.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Rij toevoegen</span>
            </button>
          </div>
        </div>
      );
    } else {
      const isAdmin = !!user;
      return (
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3.5">{title}</h4>
          <ul className="text-sm text-slate-700 space-y-2">
            {activeList.map((item, index) => {
              const isPriceSetting = dbKey === 'priceSetting' || title === t('tech.pricesetting');
              const isFirstPriceSetting = isPriceSetting && index === 0;
              const isAlgemeenAvailability = dbKey === 'algemeen' && (
                index === 2 || 
                item.label.toLowerCase().includes('beschikbaarheid') || 
                item.label.toLowerCase().includes('availability')
              );
              const isBlinkingRed = isFirstPriceSetting || isAlgemeenAvailability;
              return (
                <li key={`live-${item.label}-${index}`} className="group/item flex justify-between items-center border-b border-dashed border-slate-100 py-2.5 font-light gap-4 min-h-[44px]">
                  <div className="flex items-center space-x-2 flex-grow min-w-0">
                    {isAdmin && setActiveList && dbKey && (
                      <div className="flex items-center space-x-1 bg-slate-100/90 p-1 rounded border border-slate-200 shrink-0 shadow-sm mr-2 select-none">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={async () => {
                            if (index === 0) return;
                            const updated = [...activeList];
                            const temp = updated[index];
                            updated[index] = updated[index - 1];
                            updated[index - 1] = temp;
                            setActiveList(updated);
                            setDraftList(updated);
                            try {
                              await setDoc(doc(db, 'technical_data', 'page_content'), {
                                [dbKey]: updated,
                                updatedAt: new Date().toISOString(),
                                updatedBy: user.uid
                              }, { merge: true });
                            } catch (e) {
                              console.error("Inline save failed:", e);
                            }
                          }}
                          className="text-slate-500 hover:text-slate-950 disabled:opacity-25 p-1 rounded hover:bg-white cursor-pointer transition-colors"
                          title="Omhoog verplaatsen"
                        >
                          <ChevronUp className="w-4 h-4 text-slate-700" strokeWidth={3} />
                        </button>
                        <button
                          type="button"
                          disabled={index === activeList.length - 1}
                          onClick={async () => {
                            if (index === activeList.length - 1) return;
                            const updated = [...activeList];
                            const temp = updated[index];
                            updated[index] = updated[index + 1];
                            updated[index + 1] = temp;
                            setActiveList(updated);
                            setDraftList(updated);
                            try {
                              await setDoc(doc(db, 'technical_data', 'page_content'), {
                                [dbKey]: updated,
                                updatedAt: new Date().toISOString(),
                                updatedBy: user.uid
                              }, { merge: true });
                            } catch (e) {
                              console.error("Inline save failed:", e);
                            }
                          }}
                          className="text-slate-500 hover:text-slate-950 disabled:opacity-25 p-1 rounded hover:bg-white cursor-pointer transition-colors"
                          title="Omlaag verplaatsen"
                        >
                          <ChevronDown className="w-4 h-4 text-slate-700" strokeWidth={3} />
                        </button>
                      </div>
                    )}
                    <span className={`shrink-0 ${
                      isBlinkingRed 
                        ? 'text-red-600 font-extrabold text-sm sm:text-base animate-custom-blink animate-pulse' 
                        : isPriceSetting 
                          ? 'text-black font-semibold text-xs sm:text-sm' 
                          : 'text-slate-600 text-xs sm:text-sm'
                    }`}>{dt(item.label)}</span>
                  </div>
                  <span className={`text-right max-w-[65%] break-words leading-tight ${
                    isBlinkingRed 
                      ? 'text-red-600 font-black text-lg sm:text-xl animate-custom-blink animate-pulse' 
                      : isPriceSetting 
                        ? 'font-black text-black text-xs sm:text-sm' 
                        : 'font-bold text-slate-900 text-xs sm:text-sm'
                  }`}>
                    {dt(item.value)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
  };

  return (
    <div className="py-8 px-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      {/* Hidden container for rendering high-fidelity PDFs */}
      {pdfDownloadingDoc && (
        <div 
          id="hidden-pdf-document-render-target" 
          className="fixed -left-[4000px] top-0 pointer-events-none opacity-0 z-[-1] w-[800px]"
        >
          {renderDocPages(pdfDownloadingDoc)}
        </div>
      )}
      <style>{`
        @keyframes custom-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.15; }
        }
        .animate-custom-blink {
          animation: custom-blink 1s ease-in-out infinite;
        }
      `}</style>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8 border-b border-slate-200 pb-8">
        <div className="max-w-3xl">
          <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">{t('tech.subtitle')}</span>
          <h1 className="serif text-5xl italic mb-4 text-slate-900">{t('tech.title')}</h1>
          {editMode ? (
            <div className="space-y-2 mt-4">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block font-bold">Introductie beschrijving</label>
              <textarea
                value={draftIntroText}
                onChange={(e) => setDraftIntroText(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl p-4 text-sm focus:outline-none focus:border-primary-600 transition-all font-light shadow-inner"
                rows={3}
              />
            </div>
          ) : (
            <p className="text-lg font-light text-slate-600 leading-relaxed">
              {dt(introText)}
            </p>
          )}
        </div>

        {/* Administration Status / Controls */}
        <div className="flex flex-col items-stretch lg:items-end shrink-0 gap-3">
          {!user ? (
            <button
              onClick={login}
              className="flex items-center justify-center space-x-2 text-[10px] font-bold uppercase tracking-[0.15em] bg-slate-900 text-white px-5 py-3 rounded-xl hover:bg-slate-800 transition-all shadow-md active:scale-95 cursor-pointer border border-slate-800"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{t('footer.admin')} Login</span>
            </button>
          ) : (
            <div className="flex flex-col items-stretch lg:items-end gap-2.5">
              <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-4 text-xs shadow-sm">
                <div className="flex items-center space-x-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <div className="text-left">
                    <p className="font-bold text-slate-800">
                      Administrator
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono tracking-tight">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => signOut(auth)}
                  title={t('ui.logout')}
                  className="text-slate-400 hover:text-red-600 transition-colors p-1.5 hover:bg-slate-50 rounded-lg cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {user && (
                <div className="flex gap-2">
                  {!editMode ? (
                    <button
                      onClick={startEditing}
                      className="flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-[0.15em] bg-primary-600 hover:bg-primary-700 text-white px-5 py-3 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{t('ui.edit_data')}</span>
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={saveChanges}
                        className="flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-[0.15em] bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl transition-all shadow-lg active:scale-95 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{t('ui.save')}</span>
                      </button>
                      <button
                        onClick={() => setEditMode(false)}
                        className="flex items-center justify-center space-x-2 text-[10px] font-black uppercase tracking-[0.15em] bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-3 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t('ui.cancel')}</span>
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-9 space-y-8">
          {/* Main Specs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {editMode ? (
              draftSpecs.map((spec, index) => (
                <div key={index} className="bg-white p-5 rounded-xl border border-primary-200 shadow-sm space-y-3">
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-2">
                    <div className="text-primary-600 bg-primary-50 p-2 rounded-lg">
                      {getIcon(spec.iconName)}
                    </div>
                    <div className="flex-grow">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Icoontype</label>
                      <select
                        value={spec.iconName}
                        onChange={(e) => {
                          const updated = [...draftSpecs];
                          updated[index] = { ...spec, iconName: e.target.value };
                          setDraftSpecs(updated);
                        }}
                        className="text-xs font-bold text-slate-700 bg-slate-50 rounded border border-slate-200 outline-none p-1"
                      >
                        {["Ruler", "Car", "Sun", "Home", "Zap", "ShieldCheck", "Waves"].map((iconName) => (
                          <option key={iconName} value={iconName}>{iconName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Label</label>
                      <input
                        type="text"
                        value={spec.label}
                        onChange={(e) => {
                          const updated = [...draftSpecs];
                          updated[index] = { ...spec, label: e.target.value };
                          setDraftSpecs(updated);
                        }}
                        className="w-full text-xs font-bold text-slate-800 border border-slate-200 rounded p-1.5 focus:border-primary-600 outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block">Waarde</label>
                      <input
                        type="text"
                        value={spec.value}
                        onChange={(e) => {
                          const updated = [...draftSpecs];
                          updated[index] = { ...spec, value: e.target.value };
                          setDraftSpecs(updated);
                        }}
                        className="w-full text-xs font-bold text-slate-800 border border-slate-200 rounded p-1.5 focus:border-primary-600 outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : (
              specs.map((spec, index) => (
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
                      {getIcon(spec.iconName)}
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{dt(spec.label)}</h4>
                      <p className="text-sm font-bold text-slate-800">{dt(spec.value)}</p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>

          {/* Aanvullende Details */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary-600 mb-6 font-sans">
              {t('tech.additional_details')}
            </h3>
            <div className={`grid grid-cols-1 ${editMode ? 'grid-cols-1' : 'md:grid-cols-2'} gap-8 mb-8`}>
              <div className="space-y-6">
                {renderDetailSection(t('tech.stedenbouw'), draftStedenbouw, setDraftStedenbouw, stedenbouw, setStedenbouw, "stedenbouw")}
                {renderDetailSection(t('tech.overstroming'), draftOverstroming, setDraftOverstroming, overstroming, setOverstroming, "overstroming")}
              </div>
              <div className="space-y-6">
                {renderDetailSection(t('tech.installaties'), draftInstallaties, setDraftInstallaties, installaties, setInstallaties, "installaties")}
                {renderDetailSection(t('tech.algemeen'), draftAlgemeen, setDraftAlgemeen, algemeen, setAlgemeen, "algemeen")}
              </div>
            </div>
            <div className="border-t border-slate-100 pt-8">
              {renderDetailSection(t('tech.pricesetting'), draftPriceSetting, setDraftPriceSetting, priceSetting, setPriceSetting, "priceSetting")}
            </div>
          </div>

          {/* Oppervlaktes & Afmetingen */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-primary-600 mb-6 font-sans">
              {t('tech.surfaces_dimensions')}
            </h3>
            <div className={`grid grid-cols-1 ${editMode ? 'grid-cols-1' : 'md:grid-cols-2'} gap-8`}>
              <div className="space-y-6">
                {renderDetailSection(t('tech.leefruimtes'), draftLeefruimtes, setDraftLeefruimtes, leefruimtes, setLeefruimtes, "leefruimtes")}
                {renderDetailSection(t('tech.extras'), draftExtraRuimtes, setDraftExtraRuimtes, extraRuimtes, setExtraRuimtes, "extraRuimtes")}
              </div>
              <div className="space-y-6">
                {renderDetailSection(t('tech.nacht'), draftNachtgedeelte, setDraftNachtgedeelte, nachtgedeelte, setNachtgedeelte, "nachtgedeelte")}
                
                {editMode ? (
                  <div className="space-y-4">
                    {renderDetailSection(t('tech.totalling'), draftTotals, setDraftTotals, totals, setTotals, "totals")}
                    <div className="space-y-3 p-4 bg-slate-50/75 rounded-xl border border-slate-200">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary-600 border-b border-primary-100 pb-1.5">{dt("TOTAAL BRUIKBAAR")}</h4>
                      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center font-bold">
                        <span className="text-xs font-bold text-slate-500 w-full sm:w-1/2">Totaal Bruikbaar</span>
                        <input
                          type="text"
                          value={draftTotaalBruikbaar}
                          onChange={(e) => setDraftTotaalBruikbaar(e.target.value)}
                          className="w-full sm:w-1/2 text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded px-2 py-1.5 focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600"
                          placeholder="217 m²"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/60 space-y-3.5 transition-transform duration-300">
                      {totals.map((total, index) => (
                        <div 
                          key={index} 
                          className={`flex justify-between items-center ${
                            index === 0 
                              ? 'border-b border-slate-200 pb-3.5 text-slate-900' 
                               : 'text-slate-500 border-b border-slate-100/50 pb-2 last:border-0 last:pb-0'
                          }`}
                        >
                          <span className={index === 0 ? 'text-xs font-black uppercase tracking-widest' : 'text-[10px] font-black uppercase tracking-widest text-slate-400'}>
                            {dt(total.label)}
                          </span>
                          <span className={index === 0 ? 'text-xl font-black text-primary-600 italic' : 'text-sm font-bold text-slate-600'}>
                            {dt(total.value)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-primary-950 p-5 rounded-2xl border border-primary-900 text-white shadow-md flex justify-between items-center transition-all duration-300 hover:bg-primary-900">
                      <span className="text-xs font-black uppercase tracking-widest text-primary-200">
                        {dt("TOTAAL BRUIKBAAR")}
                      </span>
                      <span className="text-xl font-black text-yellow-400 italic font-sans">
                        {dt(totaalBruikbaar)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Specificaties per kamer (meer info) */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm mt-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary-600 font-sans flex items-center flex-wrap gap-1">
                <span>{dt('Gedetailleerde Fiche per Ruimte')}</span>
                <span className="text-slate-400 font-bold lowercase tracking-normal"> : {dt('click erop voor meer info.')}</span>
              </h3>
              <span className="text-[10px] font-bold uppercase bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full">
                {editMode ? `${draftRooms.length} ${dt('Ruimtes')}` : `${rooms.length} ${dt('Ruimtes')}`}
              </span>
            </div>

            {/* Room Selector Tabs list */}
            <div className="flex flex-wrap gap-1.5 mb-6 pb-2 border-b border-slate-100">
              {(editMode ? draftRooms : rooms).map((room, idx) => {
                const isActive = selectedRoomIndex === idx;
                return (
                  <button
                    key={room.id || idx}
                    type="button"
                    onClick={() => setSelectedRoomIndex(idx)}
                    className={`px-3 py-2 text-xs font-medium rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive 
                        ? 'bg-primary-950 text-white border-primary-950 shadow-md ring-2 ring-primary-950/10' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    {getRoomIcon(room.id)}
                    <span>{dt(room.name)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                      {room.size}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Room Detail / Edit Card */}
            {editMode ? (
              // EDIT MODE
              draftRooms[selectedRoomIndex] && (
                <div className="bg-slate-50/70 p-6 rounded-2xl border border-slate-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                        Kamer Naam (Nl)
                      </label>
                      <input
                        type="text"
                        value={draftRooms[selectedRoomIndex].name}
                        onChange={(e) => {
                          const updated = [...draftRooms];
                          updated[selectedRoomIndex] = { ...updated[selectedRoomIndex], name: e.target.value };
                          setDraftRooms(updated);
                        }}
                        className="w-full text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:border-primary-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                        Oppervlakte (bv. 49 m²)
                      </label>
                      <input
                        type="text"
                        value={draftRooms[selectedRoomIndex].size}
                        onChange={(e) => {
                          const updated = [...draftRooms];
                          updated[selectedRoomIndex] = { ...updated[selectedRoomIndex], size: e.target.value };
                          setDraftRooms(updated);
                        }}
                        className="w-full text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:border-primary-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">
                      Uitgebreide Beschrijving (Nl)
                    </label>
                    <textarea
                      value={draftRooms[selectedRoomIndex].description}
                      onChange={(e) => {
                        const updated = [...draftRooms];
                        updated[selectedRoomIndex] = { ...updated[selectedRoomIndex], description: e.target.value };
                        setDraftRooms(updated);
                      }}
                      rows={4}
                      className="w-full text-sm font-normal leading-relaxed text-slate-700 bg-white border border-slate-200 rounded-xl p-4 focus:border-primary-600 focus:outline-none resize-none"
                      placeholder="Typ hier de gedetailleerde omschrijving..."
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                      Specifieke Kenmerken / Troeven
                    </label>
                    <div className="space-y-2">
                      {(draftRooms[selectedRoomIndex].features || []).map((feat, fIdx) => (
                        <div key={fIdx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            value={feat}
                            onChange={(e) => {
                              const updated = [...draftRooms];
                              const rFeat = [...(updated[selectedRoomIndex].features || [])];
                              rFeat[fIdx] = e.target.value;
                              updated[selectedRoomIndex] = { ...updated[selectedRoomIndex], features: rFeat };
                              setDraftRooms(updated);
                            }}
                            className="flex-grow text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:border-primary-600 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = [...draftRooms];
                              const rFeat = (updated[selectedRoomIndex].features || []).filter((_, i) => i !== fIdx);
                              updated[selectedRoomIndex] = { ...updated[selectedRoomIndex], features: rFeat };
                              setDraftRooms(updated);
                            }}
                            className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded"
                            title="Kenmerk verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...draftRooms];
                          const rFeat = [...(updated[selectedRoomIndex].features || []), "Nieuw kenmerk"];
                          updated[selectedRoomIndex] = { ...updated[selectedRoomIndex], features: rFeat };
                          setDraftRooms(updated);
                        }}
                        className="text-[10px] font-black uppercase tracking-widest text-primary-600 hover:text-primary-800 flex items-center gap-1 cursor-pointer pt-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Kenmerk toevoegen</span>
                      </button>
                    </div>
                  </div>
                </div>
              )
            ) : (
              // REGULAR VIEW MODE
              rooms[selectedRoomIndex] && (
                <motion.div
                  key={selectedRoomIndex}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="bg-slate-50/50 p-6 sm:p-8 rounded-2xl border border-slate-200/60"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm">
                      {getRoomIcon(rooms[selectedRoomIndex].id)}
                    </div>
                    <div>
                      <h4 className="serif text-2xl italic text-slate-900 leading-tight">
                        {dt(rooms[selectedRoomIndex].name)}
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 text-xs font-mono text-slate-400">
                        <Ruler className="w-3.5 h-3.5 text-primary-600" />
                        <span>{rooms[selectedRoomIndex].size} {dt('bewoonbaar')}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm sm:text-base font-light text-slate-600 leading-relaxed max-w-2xl mb-6">
                    {dt(rooms[selectedRoomIndex].description)}
                  </p>

                  {rooms[selectedRoomIndex].features && rooms[selectedRoomIndex].features.length > 0 && (
                    <div>
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        {dt('Kenmerken & Voordelen')}
                      </h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {rooms[selectedRoomIndex].features.map((feat, fIdx) => (
                          <div key={fIdx} className="flex items-center gap-2 text-xs font-medium text-slate-700 bg-white border border-slate-100 rounded-lg px-3 py-2.5 shadow-sm font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary-600 shrink-0" />
                            <span>{dt(feat)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            )}
          </div>

        </div>

        {/* Right Sidebar - Bijzonderheden */}
        <div className="lg:col-span-3 bg-primary-950 text-white p-6 sm:p-7 rounded-2xl shadow-xl flex flex-col ring-2 ring-white/10">
          <div className="mb-4">
            {editMode ? (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-primary-300 mb-4 border-b border-primary-800 pb-2">Bijzonderheden (Beheer)</h3>
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 space-y-3">
                  {draftBijzonderheden.map((item, index) => (
                    <div key={index} className="flex gap-2 items-start bg-white/5 p-2.5 rounded-xl border border-white/10">
                      <textarea
                        value={item}
                        onChange={(e) => {
                          const updated = [...draftBijzonderheden];
                          updated[index] = e.target.value;
                          setDraftBijzonderheden(updated);
                        }}
                        className="flex-grow bg-transparent text-xs text-white placeholder:text-white/20 focus:outline-none resize-none"
                        rows={2}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setDraftBijzonderheden(draftBijzonderheden.filter((_, i) => i !== index));
                        }}
                        className="text-red-400 hover:text-red-500 p-1 flex items-center justify-center cursor-pointer hover:bg-white/5 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      setDraftBijzonderheden([...draftBijzonderheden, "Nieuwe specificatie of bijzonderheid"]);
                    }}
                    className="text-xs text-primary-300 hover:text-white flex items-center space-x-1.5 font-bold pt-2 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Nieuw kenmerk</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="text-xs font-black uppercase tracking-widest text-primary-300 mb-6">{t('tech.bijzonder')}</h3>
                <ul className="text-[13px] space-y-4 text-white/70 font-light">
                  {bijzonderheden.map((item, index) => (
                    <li key={index} className="flex items-start space-x-3">
                      <span className="text-primary-400 font-bold">•</span>
                      <span>{dt(item)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Documenten & Attesten Download/Preview Center */}
      {false && (
        <>
          <div className="mt-12 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-8">
          <div className="max-w-xl">
            <span className="text-primary-600 font-bold uppercase text-[10px] tracking-widest mb-2 block">
              {dt('Officieel Documentenarchief')}
            </span>
            <h2 className="serif text-3xl italic text-slate-900 mb-3">
              {dt('Certificaten & Overheidsattesten')}
            </h2>
            <p className="text-sm font-light text-slate-500 leading-relaxed">
              {dt('Raadpleeg hier de volledige officiële documentatie van de woning. Alle noodzakelijke certificaten, bodemattesten en kadastrale opverzichten zijn volledig conform, rechtsgeldig en up-to-date herleidbaar.')}
            </p>
          </div>
          {user && (
            <div className="flex gap-2 self-stretch sm:self-auto justify-end">
              {!editMode ? (
                <button
                  type="button"
                  onClick={startEditing}
                  className="flex items-center justify-center space-x-1.5 text-[10px] font-black uppercase tracking-[0.12em] bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{dt('Archief Bewerken')}</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={saveChanges}
                    className="flex items-center justify-center space-x-1.5 text-[10px] font-black uppercase tracking-[0.12em] bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer font-sans"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{dt('Opslaan')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode(false)}
                    className="flex items-center justify-center space-x-1.5 text-[10px] font-black uppercase tracking-[0.12em] bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2.5 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer font-sans"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{dt('Annuleren')}</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Toolbar: Category Filters & Search Field */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center border-b border-slate-100 pb-6 mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5 bg-slate-50 p-1 rounded-2xl border border-slate-100 self-start">
              {[
                { id: 'all', label: dt('Alles') },
                { id: 'bouw', label: dt('Bouw & Erfgoed') },
                { id: 'milieu', label: dt('Milieu & Bodem') },
                { id: 'kadaster', label: dt('Kadaster') }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveDocFilter(tab.id as any)}
                  className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    activeDocFilter === tab.id
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Add Document button (Visible ONLY in Edit Mode) */}
            {editMode && (
              <button
                onClick={() => {
                  const newId = 'custom_' + Date.now();
                  setEditingDoc({
                    id: newId,
                    title: { 
                      nl: 'Nieuw Document', 
                      en: 'New Document', 
                      fr: 'Nouveau Document', 
                      de: 'Neues Dokument', 
                      es: 'Nuevo Documento', 
                      ar: 'مستend' 
                    },
                    category: 'bouw',
                    issuer: 'Overheidsinstantie',
                    date: new Date().toLocaleDateString('nl-BE'),
                    validUntil: '',
                    certificateNumber: 'N/A',
                    conclusion: 'Conform / Goedgekeurd',
                    color: 'emerald',
                    description: { 
                      nl: 'Beschrijving van het nieuwe document.', 
                      en: 'Description of the new document.', 
                      fr: '', 
                      de: '', 
                      es: '', 
                      ar: '' 
                    },
                    badge: { 
                      nl: 'Nieuw', 
                      en: 'New', 
                      fr: 'Nouveau', 
                      de: 'Neu', 
                      es: 'Nuevo', 
                      ar: 'جديد' 
                    },
                    details: [
                      { label: 'Status', value: 'Goedgekeurd' },
                      { label: 'Referentie', value: newId }
                    ]
                  });
                  setNewDocMode(true);
                  setLanguageTab('nl');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5 font-bold" />
                <span>{dt('Document Toevoegen')}</span>
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative max-w-md w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={dt('Document zoeken...')}
              value={docSearchQuery}
              onChange={(e) => setDocSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-primary-600 focus:ring-1 focus:ring-primary-600 outline-none rounded-xl transition-all"
            />
            {docSearchQuery && (
              <button
                onClick={() => setDocSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Document Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {(editMode ? draftDocuments : documents)
            .filter((docItem) => {
              const matchesFilter = activeDocFilter === 'all' || docItem.category === activeDocFilter;
              const titleText = docItem.title[language] || dt(docItem.title['nl']);
              const descText = docItem.description[language] || dt(docItem.description['nl']);
              const matchesSearch = docSearchQuery === '' || 
                titleText.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                descText.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                docItem.issuer.toLowerCase().includes(docSearchQuery.toLowerCase()) ||
                docItem.certificateNumber.toLowerCase().includes(docSearchQuery.toLowerCase());
              return matchesFilter && matchesSearch;
            })
            .map((docItem, index) => {
              const titleLocalized = docItem.title[language] || dt(docItem.title['nl']);
              const descLocalized = docItem.description[language] || dt(docItem.description['nl']);
              const badgeLocalized = docItem.badge[language] || dt(docItem.badge['nl']);

              return (
                <motion.div
                  key={docItem.id}
                  initial={{ opacity: 0, y: 15 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white hover:bg-slate-50/50 p-6 rounded-2xl border border-slate-200 hover:border-primary-600 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group relative"
                >
                  {/* Edit/Delete overlays for administrative edit mode */}
                  {editMode && (
                    <div className="absolute top-3 right-3 flex items-center gap-1 z-10 bg-white/90 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-slate-100">
                      <button
                        title={dt('Bewerken')}
                        onClick={() => {
                          setEditingDoc(JSON.parse(JSON.stringify(docItem)));
                          setNewDocMode(false);
                          setLanguageTab('nl');
                        }}
                        className="p-1 px-2 text-[10px] uppercase font-bold text-indigo-650 hover:text-indigo-805 hover:bg-slate-100 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>NL/EN</span>
                      </button>
                      <button
                        title={dt('Verwijderen')}
                        onClick={() => {
                          setDocToDelete(docItem);
                        }}
                        className="p-1 text-red-650 hover:text-red-800 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                      </button>
                    </div>
                  )}

                  <div>
                    {/* Header line */}
                    <div className="flex justify-between items-start mb-4 gap-2">
                      <div className={`p-2.5 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors`}>
                        <FileText className="w-5 h-5 text-slate-600 group-hover:text-white transition-colors" />
                      </div>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200/50 ${editMode ? 'mr-20' : ''}`}>
                        {badgeLocalized}
                      </span>
                    </div>

                    {/* Title */}
                    <h4 className="text-base font-bold text-slate-800 tracking-tight mb-1 group-hover:text-slate-950 transition-colors">
                      {titleLocalized}
                    </h4>

                    {/* Meta info */}
                    <div className="space-y-0.5 text-[11px] font-medium text-slate-400 font-sans mb-3">
                      <p>{dt('Uitgever:')} {docItem.issuer}</p>
                      <p>{dt('Datum:')} {docItem.date} {docItem.validUntil ? ` | Expires: ${docItem.validUntil}` : ''}</p>
                    </div>

                    {/* Description */}
                    <p className="text-xs font-light text-slate-500 leading-relaxed mb-6">
                      {descLocalized}
                    </p>
                  </div>

                  {/* Actions bar */}
                  <div className="flex gap-2 items-center border-t border-slate-100 pt-4 mt-auto">
                    <button
                      onClick={() => {
                        setSelectedDoc(docItem);
                        setPdfZoom(100);
                      }}
                      className="flex-grow flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest border border-slate-200 hover:border-slate-800 text-slate-700 hover:text-slate-900 px-4 py-2.5 rounded-xl transition-all cursor-pointer bg-white"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{dt('Bekijk Document')}</span>
                    </button>
                    <button
                      onClick={() => downloadDocumentPDF(docItem)}
                      title={dt('Download PDF Rapport')}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-800 text-slate-500 hover:text-slate-900 transition-all cursor-pointer bg-white"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
        </div>
      </div>

      {/* Editing Document Details Sub-Modal */}
      {editingDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-fade-in text-left">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal TOP bar */}
            <div className="bg-slate-900 text-slate-100 px-6 py-4 flex items-center justify-between shrink-0 select-none">
              <div className="flex items-center space-x-3">
                <div className="bg-emerald-600 p-1.5 rounded-lg text-white font-bold">
                  <Edit3 className="w-4 h-4 font-bold text-white text-md" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                    {newDocMode ? 'DOCUMENT TOEVOEGEN' : 'DOCUMENT BEWERKEN'}
                  </span>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {editingDoc.title[language] || editingDoc.title['nl']}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingDoc(null);
                  setNewDocMode(false);
                }}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-grow overflow-y-auto p-6 space-y-6">
              {/* Language switcher for Title/Description/Badge */}
              <div className="bg-slate-50 border border-slate-100 p-1 rounded-xl flex gap-1 flex-wrap self-start inline-flex">
                {[
                  { id: 'nl', label: 'NL 🇧🇪' },
                  { id: 'en', label: 'EN 🇬🇧' },
                  { id: 'fr', label: 'FR 🇫🇷' },
                  { id: 'de', label: 'DE 🇩🇪' },
                  { id: 'es', label: 'ES 🇪🇸' },
                  { id: 'ar', label: 'AR 🇧🇭' }
                ].map((lang) => (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setLanguageTab(lang.id as any)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      languageTab === lang.id
                        ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>

              {/* Localized fields section */}
              <div className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                  Vertaalbare Velden ({languageTab.toUpperCase()})
                </h4>

                {/* Localized Title */}
                <div className="space-y-1 font-sans">
                  <label className="text-xs font-bold text-slate-750 block">Titel ({languageTab}) *</label>
                  <input
                    type="text"
                    value={editingDoc.title[languageTab] || ''}
                    onChange={(e) => {
                      const updatedTitle = { ...editingDoc.title, [languageTab]: e.target.value };
                      if (newDocMode && languageTab === 'nl') {
                        updatedTitle.en = updatedTitle.en || e.target.value;
                      }
                      setEditingDoc({ ...editingDoc, title: updatedTitle });
                    }}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl p-3 text-xs outline-none transition-all font-medium text-slate-850"
                    placeholder="e.g. Energieprestatiecertificaat (EPC)"
                  />
                </div>

                {/* Localized Badge */}
                <div className="space-y-1 font-sans">
                  <label className="text-xs font-bold text-slate-750 block">Badge ({languageTab})</label>
                  <input
                    type="text"
                    value={editingDoc.badge[languageTab] || ''}
                    onChange={(e) => {
                      const updatedBadge = { ...editingDoc.badge, [languageTab]: e.target.value };
                      setEditingDoc({ ...editingDoc, badge: updatedBadge });
                    }}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl p-3 text-xs outline-none transition-all font-medium text-slate-850"
                    placeholder="e.g. Energielabel B"
                  />
                </div>

                {/* Localized Description */}
                <div className="space-y-1 font-sans">
                  <label className="text-xs font-bold text-slate-750 block">Beschrijving / Detailtekst ({languageTab})</label>
                  <textarea
                    value={editingDoc.description[languageTab] || ''}
                    onChange={(e) => {
                      const updatedDesc = { ...editingDoc.description, [languageTab]: e.target.value };
                      setEditingDoc({ ...editingDoc, description: updatedDesc });
                    }}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl p-3 text-xs outline-none transition-all font-medium text-slate-850 resize-none"
                    rows={3}
                    placeholder="e.g. Officiële energiescore met een zeer gunstig B-label..."
                  />
                </div>
              </div>

              {/* General details section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Category */}
                <div className="space-y-1 font-sans">
                  <label className="text-xs font-bold text-slate-750 block">Categorie *</label>
                  <select
                    value={editingDoc.category}
                    onChange={(e) => setEditingDoc({ ...editingDoc, category: e.target.value })}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl p-3 text-xs outline-none transition-all font-medium text-slate-850 cursor-pointer"
                  >
                    <option value="bouw">Bouw & Erfgoed</option>
                    <option value="milieu">Milieu & Bodem</option>
                    <option value="kadaster">Kadaster</option>
                  </select>
                </div>

                {/* Color */}
                <div className="space-y-1 font-sans">
                  <label className="text-xs font-bold text-slate-750 block">Kleuraccent *</label>
                  <select
                    value={editingDoc.color}
                    onChange={(e) => setEditingDoc({ ...editingDoc, color: e.target.value })}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl p-3 text-xs outline-none transition-all font-medium text-slate-850 cursor-pointer"
                  >
                    <option value="emerald">Groen (Emerald)</option>
                    <option value="sky">Lichtblauw (Sky)</option>
                    <option value="teal">Blauw-groen (Teal)</option>
                    <option value="indigo">Donkerblauw (Indigo)</option>
                    <option value="rose">Roze (Rose)</option>
                    <option value="blue">Blauw (Blue)</option>
                    <option value="violet">Paars (Violet)</option>
                    <option value="amber">Oranje (Amber)</option>
                  </select>
                </div>

                {/* Issuer */}
                <div className="space-y-1 font-sans">
                  <label className="text-xs font-bold text-slate-750 block">Uitgever / Instantie *</label>
                  <input
                    type="text"
                    value={editingDoc.issuer || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, issuer: e.target.value })}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl p-3 text-xs outline-none transition-all font-medium text-slate-850"
                    placeholder="e.g. OVAM of Bart Peysmans"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1 font-sans">
                  <label className="text-xs font-bold text-slate-750 block">Datum uitgifte *</label>
                  <input
                    type="text"
                    value={editingDoc.date || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, date: e.target.value })}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl p-3 text-xs outline-none transition-all font-medium text-slate-850"
                    placeholder="e.g. 23-01-2023"
                  />
                </div>

                {/* Valid until */}
                <div className="space-y-1 font-sans">
                  <label className="text-xs font-bold text-slate-750 block">Geldig tot (optioneel)</label>
                  <input
                    type="text"
                    value={editingDoc.validUntil || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, validUntil: e.target.value })}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl p-3 text-xs outline-none transition-all font-medium text-slate-850"
                    placeholder="e.g. 23-01-2033"
                  />
                </div>

                {/* Certificate number */}
                <div className="space-y-1 font-sans">
                  <label className="text-xs font-bold text-slate-750 block">Certificaat- / Attestnummer *</label>
                  <input
                    type="text"
                    value={editingDoc.certificateNumber || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, certificateNumber: e.target.value })}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl p-3 text-xs outline-none transition-all font-medium text-slate-850"
                    placeholder="e.g. 20221222-0002760563-RES-1"
                  />
                </div>

                {/* Conclusion */}
                <div className="space-y-1 sm:col-span-2 font-sans">
                  <label className="text-xs font-bold text-slate-750 block">Eindconclusie (Status) *</label>
                  <input
                    type="text"
                    value={editingDoc.conclusion || ''}
                    onChange={(e) => setEditingDoc({ ...editingDoc, conclusion: e.target.value })}
                    className="w-full bg-white border border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl p-3 text-xs outline-none transition-all font-medium text-slate-850"
                    placeholder="e.g. Asbestveilig (0 asbestmaterialen gedetecteerd)"
                  />
                </div>

                {/* PDF File Upload */}
                <div className="space-y-1.5 sm:col-span-2 font-sans">
                  <label className="text-xs font-bold text-slate-750 block">{dt('PDF Document / Attest Upload')}</label>
                  
                  {fileUploading ? (
                    <div className="border-2 border-dashed border-emerald-300 bg-emerald-50/50 rounded-2xl p-6 text-center animate-pulse flex flex-col items-center justify-center min-h-[140px] font-sans">
                      <div className="relative mb-3 flex items-center justify-center w-12 h-12">
                        <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
                        <div 
                          className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"
                          style={{ animationDuration: '0.8s' }}
                        ></div>
                        <span className="text-[10px] font-black text-emerald-700 font-mono mt-0.5">{fileUploadProgress}%</span>
                      </div>
                      <p className="text-xs font-bold text-emerald-800">
                        {dt('Bestand uploaden naar cloud-archief...')}
                      </p>
                      <p className="text-[10px] text-emerald-600 mt-1 font-light leading-relaxed">
                        {dt('Bezig met het verwerken van uw originele PDF-document.')}
                      </p>
                    </div>
                  ) : editingDoc.pdfFile ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between shadow-sm animate-fade-in text-left">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        <div className="p-2.5 bg-emerald-600 text-white rounded-xl shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="text-left overflow-hidden">
                          <p className="text-xs font-bold text-slate-800 truncate max-w-[200px] sm:max-w-md">
                            {editingDoc.pdfFileName || dt('Geüpload bestand')}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {editingDoc.pdfFileSize || dt('Onbekende grootte')}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDoc({
                            ...editingDoc,
                            pdfFile: '',
                            pdfFileName: '',
                            pdfFileSize: ''
                          });
                        }}
                        className="p-2.5 bg-red-55 hover:bg-red-100 text-red-600 hover:text-red-800 rounded-xl transition-all font-bold text-[10px] flex items-center gap-1.5 cursor-pointer"
                        title={dt('Bestand verwijderen')}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-550" />
                        <span className="hidden sm:inline font-black uppercase tracking-wider">{dt('Verwijderen')}</span>
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const file = e.dataTransfer.files?.[0];
                        if (file) {
                          if (file.type !== "application/pdf" && !file.type.startsWith("image/")) {
                            alert(dt("Alleen PDF-bestanden of afbeeldingen zijn toegestaan."));
                            return;
                          }
                          if (file.size > 52428800) {
                            alert(dt("Bestand is te groot. Gelieve een bestand kleiner dan 50 MB te selecteren."));
                            return;
                          }
                          uploadFileToFirebase(file);
                        }
                      }}
                      className="border-2 border-dashed border-slate-200 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/50 rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 group relative flex flex-col items-center justify-center min-h-[140px]"
                    >
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 52428800) {
                              alert(dt("Bestand is te groot. Gelieve een bestand kleiner dan 50 MB te selecteren."));
                              return;
                            }
                            uploadFileToFirebase(file);
                          }
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="p-3 bg-white border border-slate-150 rounded-full text-slate-400 group-hover:text-slate-600 transition-colors shadow-sm mb-3">
                        <Download className="w-5 h-5 rotate-180" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        {dt('Klik hier of sleep een bestand om te uploaden')}
                      </p>
                      <button
                        type="button"
                        className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white font-black uppercase tracking-wider rounded-xl text-[10px] shadow-md hover:bg-slate-800 transition-colors pointer-events-none select-none"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {dt('Bestand selecteren')}
                      </button>
                      <p className="text-[10px] text-slate-400 mt-2 font-light leading-relaxed">
                        {dt('Ondersteunde formaten: PDF, PNG, JPG (Originele, complete documenten)')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic specifications/key-value pairs for this document */}
              <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-bold font-mono">
                    Aanvullende Specificaties (Voor PDF & Viewer)
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      const currentDetails = editingDoc.details || [];
                      setEditingDoc({
                        ...editingDoc,
                        details: [...currentDetails, { label: 'Eigenschap', value: 'Waarde' }]
                      });
                    }}
                    className="flex items-center gap-1 text-[10px] uppercase font-black text-emerald-600 hover:text-emerald-800 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 font-bold" />
                    <span>Specificatie Toevoegen</span>
                  </button>
                </div>

                {editingDoc.details && editingDoc.details.length > 0 ? (
                  <div className="space-y-3">
                    {editingDoc.details.map((detail: any, dIdx: number) => (
                      <div key={dIdx} className="flex gap-2 items-center bg-white p-2 border border-slate-100 rounded-xl shadow-sm">
                        <input
                          type="text"
                          value={detail.label}
                          onChange={(e) => {
                            const updatedDetails = [...editingDoc.details];
                            updatedDetails[dIdx].label = e.target.value;
                            setEditingDoc({ ...editingDoc, details: updatedDetails });
                          }}
                          className="w-1/3 bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-lg p-2 text-xs outline-none transition-all font-bold text-slate-800"
                          placeholder="Label name"
                        />
                        <input
                          type="text"
                          value={detail.value}
                          onChange={(e) => {
                            const updatedDetails = [...editingDoc.details];
                            updatedDetails[dIdx].value = e.target.value;
                            setEditingDoc({ ...editingDoc, details: updatedDetails });
                          }}
                          className="flex-grow bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-lg p-2 text-xs outline-none transition-all font-light text-slate-600"
                          placeholder="Specification value"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDoc({
                              ...editingDoc,
                              details: editingDoc.details.filter((_: any, idx: number) => idx !== dIdx)
                            });
                          }}
                          className="text-red-500 hover:text-red-700 p-1.5 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic font-light text-center py-2">
                    Nog geen extra specificaties toegevoegd.
                  </p>
                )}
              </div>
            </div>

            {/* Modal actions footer */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setEditingDoc(null);
                  setNewDocMode(false);
                }}
                className="px-4 py-2 text-xs font-semibold hover:bg-slate-100 border border-slate-200 hover:text-slate-900 rounded-xl transition-all cursor-pointer text-slate-500"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newDocMode) {
                    setDraftDocuments([...draftDocuments, editingDoc]);
                  } else {
                    setDraftDocuments(draftDocuments.map((d: any) => d.id === editingDoc.id ? editingDoc : d));
                  }
                  setEditingDoc(null);
                  setNewDocMode(false);
                }}
                className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl shadow-md cursor-pointer hover:bg-slate-800"
              >
                Toepassen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive PDF Document Viewer Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          {/* Main viewer container */}
          <div className="relative bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-700/60 ring-4 ring-black/40">
            
            {/* Viewer Top Titlebar */}
            <div className="bg-slate-900 text-slate-100 px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0 select-none">
              <div className="flex items-center space-x-3">
                <div className="bg-primary-600 p-1.5 rounded-lg text-white">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                    📄 ACROBAT PDF READER v22.1
                  </span>
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {selectedDoc.title[language] || dt(selectedDoc.title['nl'])}
                  </h3>
                </div>
              </div>

              {/* Toolbar Zoom & Actions */}
              <div className="hidden sm:flex items-center space-x-3 bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-1 text-xs">
                <button 
                  onClick={() => setPdfZoom(Math.max(50, pdfZoom - 10))}
                  className="text-slate-400 hover:text-white font-bold p-1 hover:bg-slate-700 rounded transition-colors"
                >
                  -
                </button>
                <span className="font-mono font-bold text-slate-300 min-w-[40px] text-center">
                  {pdfZoom}%
                </span>
                <button 
                  onClick={() => setPdfZoom(Math.min(150, pdfZoom + 10))}
                  className="text-slate-400 hover:text-white font-bold p-1 hover:bg-slate-700 rounded transition-colors"
                >
                  +
                </button>
              </div>

              {/* Main Actions block */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadDocumentPDF(selectedDoc)}
                  className="flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-wider bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-xl transition-all cursor-pointer"
                  title="Offline PDF download"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden xs:inline">PDF</span>
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-all cursor-pointer"
                  title="Print Document"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 bg-red-600/10 border border-red-500/20 hover:bg-red-600 text-red-400 hover:text-white rounded-xl transition-all cursor-pointer ml-2"
                  title="Close Viewer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document body viewport */}
            {selectedDoc.pdfFile ? (
              <div className="flex-grow overflow-hidden bg-slate-950 p-2 sm:p-4 flex flex-col items-center justify-center relative w-full h-full">
                {selectedDoc.pdfFile.startsWith('http') && (
                  <div className="absolute top-4 left-4 z-[40] animate-fade-in">
                    <a
                      href={selectedDoc.pdfFile}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-2 text-[11px] font-bold text-emerald-400 bg-slate-900/95 hover:bg-slate-900 border border-emerald-500/35 hover:border-emerald-500 rounded-xl px-4 py-2.5 transition-all shadow-lg active:scale-95"
                    >
                      <Eye className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>{dt('Open originele PDF in nieuw venster')}</span>
                    </a>
                  </div>
                )}
                <iframe
                  src={selectedDoc.pdfFile}
                  title={selectedDoc.title[language] || dt(selectedDoc.title['nl'])}
                  className="w-full h-full rounded-xl border border-slate-800 shadow-xl"
                  id="pdf-iframe-viewer"
                />
              </div>
            ) : (
              <div className="flex-grow overflow-auto p-6 bg-slate-900 border-b border-slate-800 flex flex-col items-center w-full">
              
              {/* Outer scaling box: allocates the scaled height inside the scroll parent */}
              <div 
                style={{ 
                  width: '100%',
                  maxWidth: '56rem',
                  height: `${2250 * (pdfZoom / 100)}px`
                }}
                className="relative transition-all duration-200 select-text shrink-0"
              >
                {/* Inner zoom canvas: styled with FIXED dimensions and scaled visually */}
                <div
                  style={{
                    transform: `scale(${pdfZoom / 100})`,
                    transformOrigin: 'top center',
                    width: '100%',
                    height: '2250px',
                    position: 'absolute',
                    top: 0,
                    left: 0
                  }}
                  className="flex flex-col gap-8 text-left"
                >
                
                {/* --- PAGE 1 --- */}
                <div className="bg-white text-slate-800 px-10 py-12 shadow-2xl rounded border border-slate-300 w-full min-h-[1050px] font-sans flex flex-col justify-between shrink-0">
                <div>
                  {/* RECONSTRUCT SHEET HEADER */}
                  {selectedDoc.id === 'epc' && (
                    <div className="border-b-4 border-lime-500 pb-4 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-lime-600 block uppercase font-mono tracking-widest">
                            Vlaams Agentschap van Energie & Klimaat
                          </span>
                          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">
                            Energieprestatiecertificaat (EPC)
                          </h1>
                          <p className="text-[11px] text-slate-500 font-mono mt-1 uppercase">
                            Residentiële Eenheid / Appartement
                          </p>
                        </div>
                        <div className="text-right font-mono text-[10px] text-slate-400 bg-slate-50 p-2 border border-slate-200 rounded">
                          <p className="font-extrabold text-slate-700">CERTIFICAATNUMMER</p>
                          <p className="text-[11px] text-slate-900 font-black">20221222-0002760563-RES-1</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'asbest' && (
                    <div className="border-b-4 border-yellow-500 pb-4 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 bg-yellow-500 text-yellow-950 font-black text-[9px] uppercase tracking-wider rounded">
                              OVAM Conform
                            </span>
                            <span className="text-[10px] font-bold text-slate-500 font-mono uppercase tracking-widest">
                              Vlaanderen is materiaalbewust
                            </span>
                          </div>
                          <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mt-1">
                            Asbestinventarisattest
                          </h1>
                          <p className="text-[11px] text-slate-500 font-mono mt-1">
                            Krachtens het Decreet van 24 april 2009 betreffende de bodemsanering en asbestveiligheid
                          </p>
                        </div>
                        <div className="text-right font-mono text-[10px] text-slate-400 bg-slate-50 p-2 border border-slate-200 rounded">
                          <p className="font-extrabold text-slate-700">ATTESTNUMMER</p>
                          <p className="text-[11px] text-slate-900 font-black">20230219-000043.001</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'bodem' && (
                    <div className="border-b-4 border-teal-500 pb-4 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-teal-600 block uppercase tracking-widest">
                            OPENBARE VLAAMSE AFVALSTOFFENMAATSCHAPPIJ
                          </span>
                          <h1 className="text-3xl font-black text-slate-950 tracking-tight uppercase leading-none mt-1">
                            BODEMATTEST
                          </h1>
                          <p className="text-xs text-slate-500 mt-1 italic">
                            Uitgegeven overeenkomstig de bepalingen van het Bodemdecreet
                          </p>
                        </div>
                        <div className="text-right font-mono text-[10px] text-slate-400 bg-slate-50 p-2 border border-slate-200 rounded">
                          <p className="font-bold text-slate-700">ONS KENMERK</p>
                          <p className="text-slate-900 font-bold">20230050758</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'kadaster_opzoeking' && (
                    <div className="border-b-4 border-indigo-600 pb-4 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] font-bold text-indigo-600 block uppercase tracking-widest font-mono">
                            KONINKLIJKE FEDERATIE VAN BELGISCH NOTARIAAT
                          </span>
                          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1">
                            Kadastrale Opzoeking & Eigendomsinformatie
                          </h1>
                          <p className="text-xs text-slate-500 mt-1">
                            Gecertificeerde inlichtingen ten behoeve van onroerende verkoopstransactie
                          </p>
                        </div>
                        <div className="text-right font-mono text-[10px] bg-slate-50 p-2 border border-slate-200 rounded">
                          <p className="font-bold text-slate-700">DOSSIERNR</p>
                          <p className="text-slate-900 font-bold">KD/W.1951/2230025</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'kadaster_percelenplan' && (
                    <div className="border-b-4 border-rose-500 pb-4 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-rose-600 block uppercase tracking-widest font-mono">
                            FEDERALE OVERHEIDSDIENST FINANCIËN / AAPD
                          </span>
                          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1">
                            Extract van het Kadastraal Percelenplan
                          </h1>
                          <p className="text-xs text-slate-500 mt-1 font-mono uppercase">
                            Gecentreerd op GERAARDSBERGEN 1 AFD / Schaal 1:250
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold bg-slate-100 border border-slate-300 text-slate-700 px-3 py-1 rounded">
                          Meest recente toestand
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'overstroming' && (
                    <div className="border-b-4 border-blue-500 pb-4 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-blue-600 block uppercase tracking-widest">
                            INTEGRAAL WATERBELEID / VLAANDEREN IS MILIEU
                          </span>
                          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1">
                            Watertoetstabel & Risicozones Overstromingen
                          </h1>
                          <p className="text-xs text-slate-500 mt-1 font-mono">
                            Kaartversie: januari 2018 / Datum afdruk: 23/01/2023
                          </p>
                        </div>
                        <span className="text-xs font-mono font-bold bg-blue-50 border border-blue-200 text-blue-700 px-3 py-1 rounded">
                          Klasse A Conform
                        </span>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'erfgoed' && (
                    <div className="border-b-4 border-violet-500 pb-4 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-violet-600 block uppercase tracking-widest">
                            AGENTSCHAP ONROEREND ERFGOED / VLAAMSE OVERHEID
                          </span>
                          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1">
                            Perceelrapport Onroerend Erfgoed
                          </h1>
                          <p className="text-xs text-slate-500 mt-1 italic">
                            Inlichtingen aangaande erfgoedrechtelijke gevolgen en beschermingen
                          </p>
                        </div>
                        <div className="text-right font-mono text-[10px] bg-slate-50 p-2 border border-slate-200 rounded">
                          <p className="font-bold text-slate-700">CAPAKEY</p>
                          <p className="text-slate-900 font-bold">41018A0714/00E000</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'klip' && (
                    <div className="border-b-4 border-amber-500 pb-4 mb-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[9px] font-bold text-amber-600 block uppercase tracking-widest">
                            KABEL- EN LEIDINGINFORMATIEPORTAAL (KLIP VLAANDEREN)
                          </span>
                          <h1 className="text-xl font-bold text-slate-900 tracking-tight leading-none mt-1">
                            Gedelegeerd KLIP-Inlichtingenverslag
                          </h1>
                          <p className="text-xs text-slate-500 mt-1">
                            Inquiry of registered pipeline & utility operators for construction and safety
                          </p>
                        </div>
                        <div className="text-right font-mono text-[10px] bg-slate-50 p-2 border border-slate-200 rounded">
                          <p className="font-bold text-slate-700">REF. KD/W</p>
                          <p className="text-slate-900 font-bold">1951/2230025</p>
                        </div>
                      </div>
                    </div>
                  )}


                  {/* RECONSTRUCT BODY SECTION */}

                  {/* Property Info block */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6 text-xs text-slate-600 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] mb-1">
                        BETREFT LOCATIE / ADRES
                      </p>
                      <p className="font-bold text-slate-800 text-sm">Hunnegemstraat 10 - 12</p>
                      <p className="font-medium">9500 Geraardsbergen, België</p>
                      <p className="mt-2 font-medium">Gemeente: <span className="font-bold text-slate-800">Geraardsbergen</span></p>
                    </div>
                    <div className="sm:border-l sm:border-slate-200 sm:pl-4">
                      <p className="font-extrabold text-slate-400 uppercase tracking-widest text-[9px] mb-1">
                        KADASTRALE IDENTIFICATIE
                      </p>
                      <p className="font-mono text-slate-800 font-bold">AFDELING 1 [41018]</p>
                      <p className="font-mono">Sectie: <span className="font-bold text-slate-800">A</span></p>
                      <p className="font-mono">Perceelnummer: <span className="font-bold text-slate-800">0714/00E000 / 0714EP0000</span></p>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-8 flex items-center space-x-4">
                    <div className="p-3 bg-emerald-600 text-white rounded-full shrink-0">
                      <Check className="w-5 h-5 font-black" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-emerald-800 tracking-wider">
                        {dt('STATUS VAN CONFORMITEIT')}
                      </h4>
                      <p className="text-lg font-black text-slate-900 mt-0.5 leading-snug">
                        {selectedDoc.conclusion}
                      </p>
                      <p className="text-xs text-slate-500 font-light mt-1">
                        {dt('Dit document is volledig goedgekeurd, gevalideerd door overheidsinstanties en onherroepelijk conform bevonden.')}
                      </p>
                    </div>
                  </div>

                  {/* DOCUMENT SPECIFIC SECTIONS RECONSTRUCTION */}

                  {selectedDoc.id === 'epc' && (
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 border-b border-slate-100 pb-2">
                        GEDETAILLEERDE PRESTATIETABEL (ENERGIELABEL)
                      </h3>
                      
                      {/* Interactive Slider recreation */}
                      <div className="space-y-2 select-none">
                        <div className="flex justify-between text-[11px] font-black font-mono">
                          <span className="text-slate-400">...</span>
                          <span className="text-slate-400">500</span>
                          <span className="text-slate-400">400</span>
                          <span className="text-slate-400">300</span>
                          <span className="text-slate-400">200</span>
                          <span className="text-slate-400">100</span>
                          <span className="text-slate-400">0</span>
                          <span className="text-slate-400">-100</span>
                        </div>
                        {/* Interactive label range */}
                        <div className="h-6 rounded-full flex overflow-hidden border border-slate-350 shadow-inner font-mono text-[10px] font-black text-white relative">
                          <div className="bg-red-500 w-[15%] flex items-center justify-center">F</div>
                          <div className="bg-amber-600 w-[15%] flex items-center justify-center">E</div>
                          <div className="bg-amber-500 w-[15%] flex items-center justify-center">D</div>
                          <div className="bg-yellow-400 w-[15%] flex items-center justify-center">C</div>
                          <div className="bg-lime-500 w-[15%] flex items-center justify-center relative">
                            <span>B</span>
                            {/* Current Target indicator */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 flex flex-col items-center">
                              <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-slate-900"></div>
                              <span className="bg-slate-900 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded shadow-md mt-0.5 shrink-0 whitespace-nowrap">
                                NU: 130 kWh/m² (B)
                              </span>
                            </div>
                          </div>
                          <div className="bg-emerald-500 w-[15%] flex items-center justify-center">A</div>
                          <div className="bg-emerald-600 w-[10%] flex items-center justify-center">A+</div>
                        </div>
                      </div>

                      {/* Spaces stats list */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-12 pt-8 text-xs">
                        <div className="space-y-3">
                          <h4 className="font-extrabold text-slate-800 border-b pb-1 font-mono uppercase text-[9px] tracking-wider">HUIDIGE ISOLATIESTAAT</h4>
                          <ul className="space-y-2">
                            <li className="flex justify-between border-b border-slate-50 pb-2">
                              <span className="text-slate-500">Daken (U = 0.28 W/m²K)</span>
                              <span className="font-extrabold text-emerald-600">✓ Voldoet (200mm MW)</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-50 pb-2">
                              <span className="text-slate-500">Muren (U = 0.78 W/m²K)</span>
                              <span className="font-bold text-slate-700">✓ Conform</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-50 pb-2">
                              <span className="text-slate-500">Vensters (Beglazing)</span>
                              <span className="font-bold text-slate-700">✓ HR-glas b (U = 1.82)</span>
                            </li>
                          </ul>
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-extrabold text-slate-800 border-b pb-1 font-mono uppercase text-[9px] tracking-wider">TECHNISCHE INSTALLATIES</h4>
                          <ul className="space-y-2">
                            <li className="flex justify-between border-b border-slate-50 pb-2">
                              <span className="text-slate-500">Verwarming</span>
                              <span className="font-bold text-slate-700">Centrale verwarming (gas)</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-50 pb-2">
                              <span className="text-slate-500">Keteltype</span>
                              <span className="font-extrabold text-emerald-600">Condenserende ketel</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-50 pb-2">
                              <span className="text-slate-500">Vlaamse Doelstelling</span>
                              <span className="font-bold text-slate-600">100 kWh / m² (Klasse A)</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'asbest' && (
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 border-b border-slate-100 pb-2">
                        INSPECTIE-RESULTATEN EN ASBEST-VEILIGHEID
                      </h3>

                      {/* Main counters bento style */}
                      <div className="grid grid-cols-3 gap-4 py-4 text-center">
                        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                          <p className="text-3xl font-black text-slate-900">0</p>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                            Asbestmaterialen
                          </p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                          <p className="text-3xl font-black text-slate-900">0</p>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                            Beperkingen
                          </p>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4">
                          <p className="text-3xl font-black text-slate-900">0</p>
                          <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1">
                            Uitsluitingen
                          </p>
                        </div>
                      </div>

                      {/* Specific inspected zones */}
                      <div className="bg-white border rounded-xl p-5 text-xs text-slate-600 space-y-3.5">
                        <h4 className="font-bold text-slate-800 font-mono uppercase text-[9px] tracking-wider pb-1.5 border-b">
                          GEÏNSPECTEERDE ELEMENTEN EN MONSTERS
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center py-1">
                            <span className="font-medium text-slate-700">1. Pleisterwerk nachthal (tweede verdieping)</span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[9.5px]">Geen asbesthoudend materiaal (conform)</span>
                          </div>
                          <div className="flex justify-between items-center py-1 border-t border-slate-100/50">
                            <span className="font-medium text-slate-700">2. Pleisterwerk keuken (gelijkvloers)</span>
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded text-[9.5px]">Geen asbesthoudend materiaal (conform)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'bodem' && (
                    <div className="space-y-5 text-sm font-light text-slate-600">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 border-b border-slate-100 pb-2">
                        UITSPRAAK EN INLICHTINGEN OVER DE BODEMKWALITEIT
                      </h3>
                      
                      <div className="space-y-4">
                        <p className="leading-relaxed">
                          <strong>1. KADASTRALE GEGEVENS</strong><br />
                          Betreft grond te Geraardsbergen, afdeling 1, sectie A met nummer 0714/00E000.
                        </p>
                        
                        <p className="leading-relaxed">
                          <strong>2. INHOUD VAN HET BODEMATTEST</strong><br />
                          De OVAM (Openbare Vlaamse Afvalstoffenmaatschappij) attesteert dat deze grond op de datum van uitgifte (26.01.2023) <strong>niet is opgenomen in het grondeninformatieregister (GIR)</strong>. 
                        </p>

                        <div className="bg-slate-50 border rounded-xl p-4 text-xs space-y-2.5 font-normal">
                          <p>✓ <strong>Informatie uit de gemeentelijke inventaris:</strong> De OVAM heeft geen enkele aanwijzing dat deze grond een risicogrond betreft.</p>
                          <p>✓ <strong>Bodemsanerings status:</strong> Geen saneringsverplichtingen, saneringsbesluiten of gebruiksbeperkingen van kracht.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'kadaster_opzoeking' && (
                    <div className="space-y-5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 border-b border-slate-100 pb-2">
                        BETROKKEN GOEDEREN & RECHTEN VAN DE EIGENAAR
                      </h3>

                      <table className="w-full text-left text-xs font-sans border-collapse">
                        <thead>
                          <tr className="bg-slate-55 bg-indigo-50/50 text-indigo-900 border-b font-extrabold">
                            <th className="py-2.5 px-3">Naam / Eigenaar</th>
                            <th className="py-2.5 px-3">Straat / Adres</th>
                            <th className="py-2.5 px-3">Gemeente</th>
                            <th className="py-2.5 px-3">Rechten</th>
                            <th className="py-2.5 px-3 text-right">Andere</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="border-b font-medium text-slate-700">
                            <td className="py-3 px-3 italic">Mede-eigenaren conform quotiteiten</td>
                            <td className="py-3 px-3">Hunnegemstraat 10/12</td>
                            <td className="py-3 px-3">Geraardsbergen</td>
                            <td className="py-3 px-3 font-bold text-indigo-700">VE 1/1</td>
                            <td className="py-3 px-3 text-right">Mede-eigendom</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="mt-4 bg-slate-50 border rounded-xl p-4 text-xs space-y-2.5 leading-relaxed text-slate-600">
                        <p><strong>Aard perceel:</strong> Ongebouwd & Privé-berging (Hunnegem residentie garage en duplex).</p>
                        <p><strong>Totale terreininvulling:</strong> Totale opp. 340.0 m² / Toestand op 23/01/2023.</p>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'kadaster_percelenplan' && (
                    <div className="space-y-5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 border-b border-slate-100 pb-2">
                        KADASTRALE PERCEELGRENZEN KAARTWEERGAVE (1:250)
                      </h3>

                      {/* SVG Percelenplan diagram recreation */}
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center">
                        <svg className="w-full max-w-[480px] h-64 border rounded-xl bg-white shadow-inner" viewBox="60 40 400 320">
                          {/* Layout Lines representing cadastral roads and grids */}
                          <line x1="80" y1="40" x2="380" y2="340" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3,3" />
                          <line x1="380" y1="40" x2="380" y2="340" stroke="#f1f5f9" strokeWidth="2" />
                          
                          {/* Street Label */}
                          <line x1="300" y1="50" x2="380" y2="280" stroke="#94a3b8" strokeWidth="20" strokeLinecap="round" opacity="0.15" />
                          <text x="350" y="240" fill="#475569" fontSize="10" className="font-bold font-mono tracking-widest" transform="rotate(71, 350, 240)">
                            HUNNEGEMSTRAAT
                          </text>

                          {/* Parcel Polygon A714e */}
                          <polygon points="120,60 210,50 350,110 320,180 180,240 180,210 110,210 140,110" fill="#fef3c7" stroke="#f59e0b" strokeWidth="2" />
                          <text x="220" y="140" fill="#b45309" fontSize="13" className="font-extrabold text-[12px]">
                            10/12 (A714e)
                          </text>

                          {/* Neighbouring plots */}
                          <polygon points="210,50 300,40 380,80 350,110" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" opacity="0.6" />
                          <text x="290" y="70" fill="#64748b" fontSize="9" className="font-bold">14 (A718x2)</text>

                          <polygon points="300,40 340,30 380,50 380,80" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" opacity="0.6" />
                          <text x="350" y="45" fill="#64748b" fontSize="8">16 (A718n2)</text>

                          <polygon points="180,240 320,180 340,240 240,285" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1" opacity="0.6" />
                          <text x="245" y="225" fill="#64748b" fontSize="9" className="font-bold">8 (A713k)</text>

                          {/* Compass North arrow */}
                          <g transform="translate(360, 60)">
                            <line x1="0" y1="20" x2="0" y2="-20" stroke="#000" strokeWidth="2" />
                            <polygon points="0,-20 -5,-10 5,-10" fill="#000" />
                            <text x="2" y="-12" fontSize="10" className="font-black">N</text>
                          </g>
                        </svg>

                        <p className="text-[10px] text-slate-400 mt-3 font-mono">
                          Bovengenoemd diagram herleidt de officiële kadastrale grenzen voor het duplex kavel 10/12.
                        </p>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'overstroming' && (
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 border-b border-slate-100 pb-2">
                        OVERSTROOOMINGSRISICO EN WATERBEHEERSING
                      </h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                        <div className="bg-slate-50 p-4 border rounded-xl">
                          <p className="font-black text-slate-800 text-[10px] uppercase font-mono tracking-wider mb-2">
                            P-SCORE (PERCEEL)
                          </p>
                          <span className="text-2xl font-black text-emerald-600 block">KLASSE A</span>
                          <p className="text-[11px] text-slate-500 mt-1 font-light leading-relaxed">
                            Geen overstromingsrisico onder invloed van intense neerslag of drempelleidingen.
                          </p>
                        </div>
                        <div className="bg-slate-50 p-4 border rounded-xl">
                          <p className="font-black text-slate-800 text-[10px] uppercase font-mono tracking-wider mb-2">
                            G-SCORE (GEBOUW)
                          </p>
                          <span className="text-2xl font-black text-emerald-600 block">KLASSE A</span>
                          <p className="text-[11px] text-slate-500 mt-1 font-light leading-relaxed">
                            Het gebouw is uiterst veilig en kent statistisch geen enkele overstromingsdreiging.
                          </p>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-4 border rounded-xl text-xs leading-relaxed text-slate-600 font-light">
                        <p>✓ <strong>Signaalgebied:</strong> Nee (geen aangeduid signaalgebied, dus geen belemmering op onroerend recht).</p>
                        <p>✓ <strong>Natuurrampenverzekering:</strong> Volledig gedekt onder reguliere premies zonder meerkost of sancties.</p>
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'erfgoed' && (
                    <div className="space-y-6">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 border-b border-slate-100 pb-2">
                        ERFGOEDRECHTELIJKE BEPALINGEN EN INRICHTING
                      </h3>

                      <ul className="space-y-3 font-sans text-xs">
                        {[
                          { l: 'Overgangszone', v: 'Nee' },
                          { l: 'Beschermd monument', v: 'Nee' },
                          { l: 'Beschermd cultuurhistorisch landschap', v: 'Nee' },
                          { l: 'Beschermde archeologische site', v: 'Nee' },
                          { l: 'Vastgestelde archeologische zone', v: 'Ja (Historische stadskern van Geraardsbergen)' },
                          { l: 'Vastgesteld erfgoed of dorpsgezicht', v: 'Nee' }
                        ].map((item, idx) => (
                          <li key={idx} className="flex justify-between items-center py-2 border-b border-slate-100 leading-snug">
                            <span className="text-slate-500 font-medium">{item.l}</span>
                            <span className={`px-2.5 py-0.5 rounded font-bold ${item.v.startsWith('Ja') ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                              {item.v}
                            </span>
                          </li>
                        ))}
                      </ul>

                      <div className="bg-slate-50 p-4 border rounded-xl text-[11px] leading-relaxed text-slate-500 font-light">
                        Inlichtingen aangaande de archeologische kern ontsluiten dat er <strong>geen restricties, pre-emption claims of onderhoudsplichten</strong> gelden op het appartement zelf voor gewone herstellingen.
                      </div>
                    </div>
                  )}

                  {selectedDoc.id === 'klip' && (
                    <div className="space-y-5">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 border-b border-slate-100 pb-2">
                        NUTS- EN LEIDINGBEHEERDERS DIRECTORY
                      </h3>

                      <table className="w-full text-xs font-mono border border-slate-205 border-slate-100 font-light">
                        <thead>
                          <tr className="bg-slate-50 text-slate-700 font-extrabold text-[10px]">
                            <th className="p-2 border-b">Beheerder</th>
                            <th className="p-2 border-b">Nettype</th>
                            <th className="p-2 border-b">Noodnummer</th>
                            <th className="p-2 border-b">Inlichting</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { n: 'AWV KLIP info', t: 'Wegen & Infra', p: '+32 3 443 6285', c: 'In orde' },
                            { n: 'De Watergroep', t: 'Drinkwater', p: '+32 2 238 9699', c: 'Gekarteerd' },
                            { n: 'Fluvius (Gas/Elec)', t: 'Energie', p: '+32 78 35 3534', c: 'Gecertificeerd' },
                            { n: 'Proximus', t: 'Telecom net', p: '+32 800 20065', c: 'Aangesloten' },
                            { n: 'Telenet BVBA', t: 'Kabelnet', p: '+32 015 333 596', c: 'Geautoriseerd' }
                          ].map((item, idx) => (
                            <tr key={idx} className="border-b hover:bg-slate-50/50">
                              <td className="p-2 font-bold text-slate-800">{item.n}</td>
                              <td className="p-2">{item.t}</td>
                              <td className="p-2 text-red-600 font-bold">{item.p}</td>
                              <td className="p-2 text-slate-500">{item.c}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {!['epc', 'asbest', 'bodem', 'kadaster_opzoeking', 'kadaster_percelenplan', 'overstroming', 'erfgoed', 'klip'].includes(selectedDoc.id) && (
                    <div className="space-y-6 text-left">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                        {dt('INFORMATIEDETAILS & SPECIFICATIES')}
                      </h3>
                      {selectedDoc.details && selectedDoc.details.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium">
                          {selectedDoc.details.map((detail: any, dIdx: number) => (
                            <div key={dIdx} className="bg-slate-50 p-4 border border-slate-150 rounded-xl shadow-sm">
                              <p className="font-extrabold text-slate-400 uppercase tracking-wider text-[9px] mb-1 font-mono">
                                {detail.label}
                              </p>
                              <span className="text-sm font-bold text-slate-800 leading-snug">{detail.value}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-500 font-light">
                          {dt('Geen aanvullende details gespecificeerd.')}
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* SHEET FOOTER */}
                <div className="border-t border-slate-200 pt-5 mt-10 text-[10px] text-slate-400 font-light flex justify-between items-center bg-transparent shrink-0 select-none">
                  <div>
                    <p className="font-bold text-slate-650">{dt('Geraadpleegde documentreferentie:')} Hunnegemresidentie</p>
                    <p className="mt-0.5">{dt('Officiële onlinedocumentversie in AI-archief • Versie 2026')}</p>
                  </div>
                  <div className="text-right font-semibold">
                    <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-650 font-black rounded uppercase text-[9px]">
                      PAGINA 1 van 2
                    </span>
                  </div>
                </div>

              {/* --- PAGE 2 --- */}
              <div className="bg-white text-slate-800 px-10 py-12 shadow-2xl rounded border border-slate-300 w-full min-h-[1050px] font-sans flex flex-col justify-between shrink-0">
                <div>
                  {/* Page 2 Simplified Header */}
                  <div className="border-b-4 border-slate-900 pb-4 mb-6">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="text-[10px] font-black text-slate-500 block uppercase font-mono tracking-widest">
                          {dt('Hunnegemresidentie Appartementen-Dossier')}
                        </span>
                        <h2 className="text-md font-black text-slate-900 tracking-tight leading-none mt-1">
                          {dt('BIJLAGE II - VERVOLG ANALYSE, WETGEVING & INSTRUCTIES')}
                        </h2>
                      </div>
                      <span className="font-mono text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                        {dt('Referentie:')} {getSafeDocRef(selectedDoc.certificateNumber)}
                      </span>
                    </div>
                  </div>

                  {/* Page 2 Specific Section Content */}
                  <div className="space-y-6">
                    
                    {selectedDoc.id === 'epc' && (
                      <div className="space-y-5 text-left">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 border-b border-slate-100 pb-2">
                          {dt('AANBEVOLEN ENERGIEBESPARENDE INGREPEN')}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-light">
                          {dt('Om een EPC-label A (< 100 kWh/m² jaar) te bereiken voor dit appartement, adviseert het energieagentschap de volgende stappenplannen en structurele maatregelen:')}
                        </p>
                        <div className="grid grid-cols-1 gap-4 text-xs font-medium mt-3">
                          <div className="bg-slate-50 p-4 border rounded-xl">
                            <h4 className="font-bold text-slate-900 font-mono text-[10px] uppercase">{dt('1. Zonnepanelen (PV-installatie)')}</h4>
                            <p className="text-slate-500 mt-1 leading-relaxed font-light">
                              {dt('Plaatsing van 8-10 fotovoltaïsche panelen op het ruime dakterras (40 m²). Dit wekt voldoende zonne-energie op om de score direct onder de 100 kWh/m² te trekken. Raming: € 4.500,- (Terugverdientijd: 4 jaar).')}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-4 border rounded-xl">
                            <h4 className="font-bold text-slate-900 font-mono text-[10px] uppercase">{dt('2. Hybride Warmtepomp Upgrade')}</h4>
                            <p className="text-slate-500 mt-1 leading-relaxed font-light">
                              {dt('Aansluiting van een hybride lucht-water warmtepomp op de bestaande en uitstekend presterende vloerverwarmingscollectoren op aardgas. Raming: € 6.500,- (Subsidiabel tot 40%).')}
                            </p>
                          </div>
                          <div className="bg-slate-50 p-4 border rounded-xl">
                            <h4 className="font-bold text-slate-900 font-mono text-[10px] uppercase">{dt('3. Zonneboiler')}</h4>
                            <p className="text-slate-500 mt-1 leading-relaxed font-light">
                              {dt('Integratie van zonnecollectoren op de zuid-west georiënteerde dakoppervlakte ten behoeve van sanitair warm water. Raming: € 3.200,-.')}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedDoc.id === 'asbest' && (
                      <div className="space-y-5 text-left">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 border-b border-slate-100 pb-2">
                          {dt('INSTRUCTIES ASBESTVEILIGHEID EN REGULERINGEN')}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-light">
                          {dt('Aangezien de eindconclusie asbestveilig is (0 asbestmaterialen gedetecteerd), gelden er geen onmiddellijke gebruiksbeperkingen op de bewoonbare oppervlakten. Bij eventuele renovatiewerken gelden de volgende richtlijnen van OVAM:')}
                        </p>
                        <div className="bg-emerald-50/50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-4 leading-relaxed mt-2 font-medium">
                          <span className="font-bold block uppercase tracking-wider text-[10px] mb-1">✓ {dt('GEEN DIRECTE ACTIEOVERLICHT')}</span>
                          {dt('U kunt zonder zorgen boren, spijkeren, schilderen en herinrichten in het appartement. Er is geen enkel risico op vrijkomende asbestvezels.')}
                        </div>
                        <div className="bg-amber-50/50 border border-amber-200 text-amber-800 text-xs rounded-xl p-4 leading-relaxed mt-4 font-medium">
                          <span className="font-bold block uppercase tracking-wider text-[10px] mb-1">⚠ {dt('ALERTHEID BIJ BIJZONDERE RENOVATIES')}</span>
                          {dt('Mocht u in de toekomst zware constructieve afbraakwerken in de oudere dieper gelegen gevelmuren of fundamentplaten uitvoeren, dient u altijd waakzaam te blijven voor eventuele verborgen materialen. Neem bij twijfel contact op met een gecertificeerd labo of asbestdeskundige.')}
                        </div>
                      </div>
                    )}

                    {selectedDoc.id === 'bodem' && (
                      <div className="space-y-5 text-left">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-550 border-b border-slate-100 pb-2">
                          {dt('TOELICHTING BIJ HET VLAAMS BODEMDECREET')}
                        </h3>
                        <div className="space-y-3.5 text-xs text-slate-650 font-medium">
                          <p className="leading-relaxed text-slate-500 font-light">
                            {dt('Een bodemattest is een verplicht document bij de overdracht van in Vlaanderen gelegen gronden. De wetgeving beschermt kopers tegen de financiële gevolgen van bodemverontreiniging.')}
                          </p>
                          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3 font-normal">
                            <p>✓ <strong>{dt('Geen risico-activiteit gekend:')}</strong> {dt('Op de desbetreffende kadastrale coördinaten is historisch nooit een activiteit geregistreerd die bodemverontreiniging kan veroorzaken (geen tankstations, chemie, of metaalbewerking).')}</p>
                            <p>✓ <strong>{dt('Onherroepelijke uitsluiting:')}</strong> {dt('Aangezien de grond niet is opgenomen in het Grondeninformatieregister (GIR), wordt de koper onherroepelijk gevrijwaard van bodemsaneringsverplichtingen onder toezicht van de OVAM.')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedDoc.id === 'kadaster_opzoeking' && (
                      <div className="space-y-5 text-left">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-555 border-b border-slate-100 pb-2">
                          {dt('NOTARIËLE TOELICHTING & VERKOOPSINFORMATIE')}
                        </h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-light">
                          {dt('Alle kadastrale gegevens in dit rapport zijn geverifieerd door de federale overheidsdienst Patrimoniumdocumentatie en de Koninklijke Federatie van het Belgisch Notariaat:')}
                        </p>
                        <div className="grid grid-cols-1 gap-4 text-xs font-medium mt-3">
                          <div className="bg-slate-50 p-4 border rounded-xl leading-relaxed">
                            <span className="font-bold text-slate-900 block font-mono text-[9.5px] uppercase tracking-wider mb-1">{dt('1. Vrijdom van Hypotheek')}</span>
                            {dt('De hypothecaire staat is blanco opgevraagd. Het duplex appartement is volledig vrij van onrechtmatige beslagen, bevoorrechte schulden of claims van derden.')}
                          </div>
                          <div className="bg-slate-50 p-4 border rounded-xl leading-relaxed">
                            <span className="font-bold text-slate-900 block font-mono text-[9.5px] uppercase tracking-wider mb-1">{dt('2. Mede-eigendom aandelen (quotiteiten)')}</span>
                            {dt('De aankoop behelst de privatieve eigendom van het duplex appartement en de garage, samen met de vastgestelde duizendste (1/1000) aandelen in de gemene delen van de residentie.')}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedDoc.id === 'kadaster_percelenplan' && (
                      <div className="space-y-5 text-left">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-555 border-b border-slate-100 pb-2">
                          {dt('GEOMETRISCHE SPECIFICATIES EN GEMENE GRENZEN')}
                        </h3>
                        <div className="space-y-4 text-xs text-slate-600 font-light leading-relaxed">
                          <p>
                            {dt('Het getekende diagram aan de voorzijde geeft de officiële geometrische afpaling van het perceel 10/12 (A714e) weer, opgesteld door het AAPD.')}
                          </p>
                          <div className="bg-slate-50 border p-4 rounded-xl font-mono text-[11px] leading-relaxed">
                            <p className="font-bold text-slate-800 text-xs mb-1 uppercase font-sans tracking-wide">{dt('Mede-eigendomsgrenzen & Wegenis:')}</p>
                            <p>• {dt('De noord- en oostgrenzen grenzen rechtstreeks aan de Hunnegemstraat en zijn openbaar domein.')}</p>
                            <p>• {dt('De scheidingsmuren met aanpalende garageboxen zijn privatief eigendom conform de statuten.')}</p>
                            <p>• {dt('Er rusten geen erfdienstbaarheden van doorgang op het private perceel.')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedDoc.id === 'overstroming' && (
                      <div className="space-y-5 text-left">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-555 border-b border-slate-100 pb-2">
                          {dt('TOELICHTING BIJ DE OVERSTROOMINGSKLASSEN (WETTOETS)')}
                        </h3>
                        <div className="space-y-3.5 text-xs text-slate-650 leading-relaxed font-light">
                          <p>
                            {dt('In Vlaanderen wordt elk onroerend goed gesignaleerd met een P-score (perceel) en G-score (gebouw) om klimaatrisico’s en stormveiligheid transparant in kaart te brengen.')}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 font-normal">
                            <div className="border border-slate-200 bg-emerald-50/40 p-4 rounded-xl">
                              <span className="font-bold text-emerald-800 block text-[10px] uppercase font-mono mb-1">{dt('Betekenis Klasse A')}</span>
                              {dt('Zowel de bodem als het gebouw van de Hunnegemresidentie vallen in de hoogste veiligheidsklasse. Statische kans op overstroming is nul.')}
                            </div>
                            <div className="border border-slate-200 bg-slate-50 p-4 rounded-xl">
                              <span className="font-bold text-slate-800 block text-[10px] uppercase font-mono mb-1">{dt('Verzekeringsacceptatie')}</span>
                              {dt('Brand- en stormverzekeraars zijn wettelijk verplicht dit goed te accepteren onder de reguliere en goedkoopst mogelijke premies zonder risico-toeslag.')}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedDoc.id === 'erfgoed' && (
                      <div className="space-y-5 text-left">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-555 border-b border-slate-100 pb-2">
                          {dt('INRICHTINGSVOORWAARDEN HISTORISCHE STADSKERN')}
                        </h3>
                        <div className="space-y-3 text-xs text-slate-650 leading-relaxed font-light">
                          <p className="text-slate-500">
                            {dt('Aangezien de duplex gesitueerd is binnen de vastgestelde archeologische zone "Historische stadskern van Geraardsbergen", gelden de volgende bepalingen van het Agentschap Onroerend Erfgoed:')}
                          </p>
                          <ul className="space-y-2 border border-slate-150 p-4 rounded-xl bg-slate-50 font-medium">
                            <li className="flex items-start gap-2">
                              <span className="text-emerald-600 font-bold">✓</span>
                              <span><strong>{dt('Geen renovatierestricties:')}</strong> {dt('Het gebouw zelf is geen beschermd monument. Binnenhuisrenovatie, herindelingen en isolatiewerken zijn 100% vergunningsvrij.')}</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-amber-600 font-bold">✓</span>
                              <span><strong>{dt('Archeologische meldeplicht:')}</strong> {dt('Enkel indien u mechanische graafwerken uitvoert dieper dan 30 cm onder de kelder- of funderingsplaat, dient u voorafgaandelijk een digitale melding te verrichten.')}</span>
                            </li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {selectedDoc.id === 'klip' && (
                      <div className="space-y-5 text-left">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-555 border-b border-slate-100 pb-2">
                          {dt('VEILIGHEIDSMAATREGELEN EN NUTSOVERZICHT')}
                        </h3>
                        <div className="space-y-3 text-xs text-slate-650 leading-relaxed font-light">
                          <p className="text-slate-500">
                            {dt('Voorafgaand aan enige breek- of graafwerken op het perceel dient u te allen tijde de veiligheidsprotocollen van het KLIP-kabelbeheer te respecteren:')}
                          </p>
                          <div className="bg-slate-50 border p-4 rounded-xl font-mono text-[10.5px] font-medium">
                            <p className="font-bold text-slate-800 text-xs mb-1 uppercase font-sans">{dt('KLIP Graafprotocol:')}</p>
                            <p>1. {dt('Vraag altijd actuele leidingkaarten op via KLIP Vlaanderen alvorens pinnen of zware ankers te slaan.')}</p>
                            <p>2. {dt('Respecteer de minimum afstand (0.5 meter) tot ondergrondse Fluvius en De Watergroep leidingen.')}</p>
                            <p>3. {dt('Meld eventuele beschadigingen direct aan de noodlijn (+32 78 35 35 34).')}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!['epc', 'asbest', 'bodem', 'kadaster_opzoeking', 'kadaster_percelenplan', 'overstroming', 'erfgoed', 'klip'].includes(selectedDoc.id) && (
                      <div className="space-y-5 text-left">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-555 border-b border-slate-100 pb-2">
                          {dt('AANVULLENDE SPECIFICATIES & RECHTSKRACHT')}
                        </h3>
                        <div className="bg-slate-50 border p-4 rounded-xl text-xs space-y-3 leading-relaxed font-light">
                          <p>✓ <strong>{dt('Conformiteitscontrole:')}</strong> {dt('Dit digitale object representeert een gecertificeerd stuk uit het archief van de Hunnegemresidentie, met uitsluiting van vervalsing.')}</p>
                          <p>✓ <strong>{dt('Notariële geldigheid:')}</strong> {dt('De inhoud is 100% conform de officiële papieren originelen die ter inzage liggen bij de verkopende partij of bevoegde notarissen.')}</p>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Signature section */}
                  <div className="flex justify-end mt-12">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 w-72 text-left shrink-0 select-none">
                      <span className="font-bold text-slate-700 block font-mono text-[9px] uppercase tracking-wider mb-1">{dt('OFFICIEEL GEVALIDEERD')}</span>
                      <p className="text-[10px] text-slate-500 font-light leading-snug">{dt('Systeem Gecertificeerd')}</p>
                      <p className="text-[10px] text-slate-500 font-light font-mono leading-snug">{dt('Archief ID: 2026-HUNNEGEM')}</p>
                      
                      <div className="border-t border-slate-200 my-2 pt-2 flex justify-between items-center">
                        <span className="text-[10px] text-slate-400 italic leading-snug">{dt('Kwaliteitsdienst Residentie')}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold rounded text-[8.5px] uppercase tracking-wide">
                          OK GECERTIFICEERD
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Page 2 Footer */}
                <div className="border-t border-slate-200 pt-5 mt-10 text-[10px] text-slate-400 font-light flex justify-between items-center bg-transparent shrink-0 select-none font-sans">
                  <div>
                    <p className="font-bold text-slate-650">{dt('Geraadpleegde documentreferentie:')} Hunnegemresidentie</p>
                    <p className="mt-0.5">{dt('Officiële onlinedocumentversie in AI-archief • Versie 2026')}</p>
                  </div>
                  <div className="text-right font-semibold">
                    <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-slate-650 font-black rounded uppercase text-[9px]">
                      PAGINA 2 van 2
                    </span>
                  </div>
                </div>
              </div>

                </div>
              </div>

            </div>
          </div>
          )}

          {/* Viewer Bottom Status Bar */}
          <div className="bg-slate-900 text-slate-400 px-6 py-3 border-t border-slate-800 shrink-0 text-xs flex justify-between items-center select-none font-mono">
            <span>Ready for printable output • 2 Pages (100% complete)</span>
            <span>100% Secure SSL Certificate</span>
          </div>

          </div>
        </div>
      )}

      {docToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in text-left">
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 p-6 flex flex-col">
            <h3 className="serif text-xl italic text-slate-900 mb-2">
              {dt('Document verwijderen?')}
            </h3>
            <p className="text-sm font-light text-slate-500 leading-relaxed mb-6 font-sans">
              {dt('Weet u zeker dat u')} <strong className="font-semibold text-slate-800">"{docToDelete.title[language] || dt(docToDelete.title['nl'])}"</strong> {dt('wilt verwijderen uit het archief? Deze actie is pas definitief nadat u de bewerkingsmodus verlaat door op "Opslaan" te klikken.')}
            </p>
            <div className="flex justify-end gap-3 font-sans">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                className="px-4 py-2.5 text-xs font-semibold hover:bg-slate-100 border border-slate-200 hover:text-slate-900 rounded-xl transition-all cursor-pointer text-slate-500"
              >
                {dt('Annuleren')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraftDocuments(draftDocuments.filter(d => d.id !== docToDelete.id));
                  setDocToDelete(null);
                }}
                className="px-4 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                {dt('Verwijderen')}
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Toegankelijkheid & Lift */}
      <div className="mt-8 bg-rose-950 text-rose-50 p-8 rounded-2xl border border-rose-900 shadow-xl relative overflow-hidden group hover:shadow-2xl hover:shadow-rose-950/30 hover:border-rose-805 transition-all duration-300 hover:-translate-y-0.5">
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-900/40 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none transition-transform duration-500 group-hover:scale-110" />
        <div className="relative z-10">
          <h3 className="text-xs font-black uppercase tracking-widest text-rose-300 mb-6 font-sans">
            {t('tech.accessibility')}
          </h3>
          <ul className="text-sm space-y-4">
            <li className="flex justify-between items-center border-b border-dashed border-rose-900/50 pb-3.5 font-light">
              <span className="text-rose-100/90">{t('tech.accessibility_property')}</span>
              <span className="font-bold text-rose-100 bg-rose-900/50 px-3 py-1 rounded-full text-xs">
                {t('tech.accessibility_value')}
              </span>
            </li>
            <li className="flex justify-between items-center border-b border-dashed border-rose-900/50 pb-3.5 font-light">
              <span className="text-rose-100/90">{t('tech.lift')}</span>
              <span className="font-bold text-rose-100 bg-rose-900/50 px-3 py-1 rounded-full text-xs">
                {t('tech.lift_value')}
              </span>
            </li>
            <li className="flex justify-between items-center border-b border-dashed border-rose-900/50 pb-3.5 font-light">
              <span className="text-rose-100/90">
                {dt('Goederenlift')}
              </span>
              <span className="font-bold text-rose-100 bg-rose-900/50 px-3 py-1 rounded-full text-xs text-right">
                {dt('Goederenlift , werkt maar is niet zo veilig.')}
              </span>
            </li>
            <li className="flex justify-between items-center font-light">
              <span className="text-rose-100/90">
                {dt('Energieprestatie (EPC)')}
              </span>
              <span className="font-bold text-rose-100 bg-rose-900/50 px-3 py-1 rounded-full text-xs text-right">
                {dt('EPC is B , A is mogelijk , zie attest.')}
              </span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
}

