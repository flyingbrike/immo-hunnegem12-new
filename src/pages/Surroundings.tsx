import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Coffee, ShoppingBag, TreePine, TrainFront, Waves, Heart, Plus, Trash2, Camera, LogIn, LogOut } from 'lucide-react';
import { db, auth, loginWithGoogle } from '../lib/firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, query } from 'firebase/firestore';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  createdAt: any;
  ownerId: string;
}

const locations = [
  { icon: <MapPin className="w-4 h-4" />, name: "Centrum & Markt", distance: "5 min" },
  { icon: <Waves className="w-4 h-4" />, name: "Wandelpad langs Dender jachtpad", distance: "2 min" },
  { icon: <Heart className="w-4 h-4" />, name: "Woonzorgcentra De Populier, Maretak en Hunnegem", distance: "5 min" },
  { icon: <Coffee className="w-4 h-4" />, name: "De Muur van Geraardsbergen", distance: "15 min" },
  { icon: <ShoppingBag className="w-4 h-4" />, name: "Winkels & Restaurants", distance: "3 min" },
  { icon: <TreePine className="w-4 h-4" />, name: "Provinciaal Domein De Gavers", distance: "15 min" },
  { icon: <TrainFront className="w-4 h-4" />, name: "Station Geraardsbergen", distance: "5 min" },
  { icon: <MapPin className="w-4 h-4" />, name: "Pairi Daiza", distance: "30 km" },
];

export default function Surroundings() {
  const [imageList, setImageList] = useState<GalleryImage[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const q = query(collection(db, 'surroundings_gallery'));
    const unsubscribeGallery = onSnapshot(q, (snapshot) => {
      const dbImages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GalleryImage[];
      
      const sortedDbImages = [...dbImages].sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt || 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt || 0);
        return timeB - timeA;
      });

      setImageList(sortedDbImages);
      setLoading(false);
    }, (error) => {
      console.warn("Firestore surroundings gallery access restricted.");
      setImageList([]);
      setLoading(false);
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, 'surroundings_gallery');
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeGallery();
    };
  }, []);

  const resizeImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 1200;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = dataUrl;
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      alert("Je moet ingelogd zijn om foto's toe te voegen.");
      return;
    }

    const file = event.target.files?.[0];
    if (file) {
      setIsUploading(true);
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawData = e.target?.result as string;
        try {
          const optimizedData = await resizeImage(rawData);
          const id = `surr_${Date.now()}`;
          await setDoc(doc(db, 'surroundings_gallery', id), {
            url: optimizedData,
            title: "Omgeving Beeld",
            createdAt: Date.now(),
            ownerId: user.uid
          });
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
          console.error("Upload failed:", error);
          alert("Het uploaden is mislukt.");
          handleFirestoreError(error, OperationType.WRITE, 'surroundings_gallery');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = async (id: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'surroundings_gallery', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `surroundings_gallery/${id}`);
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="py-24 px-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">De Locatie</span>
          <h1 className="serif text-5xl italic mb-8 text-slate-900 leading-tight">Ontdek de Omgeving</h1>
          <p className="text-lg font-light text-slate-600 leading-relaxed mb-10">
            Gelegen in het hart van de Vlaamse Ardennen, biedt dit appartement het beste van twee werelden: de levendigheid van de historische stad en de rust van de omliggende natuur.
          </p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden max-w-2xl mx-auto">
          {locations.map((loc, index) => (
            <div key={index} className="flex items-center justify-between p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                  {loc.icon}
                </div>
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">{loc.name}</span>
              </div>
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full uppercase tracking-tighter">{loc.distance}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-40">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 space-y-6 md:space-y-0">
          <div className="text-left">
            <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">Impressie</span>
            <h2 className="serif text-4xl italic text-slate-900">Beelden van de Buurt</h2>
          </div>

          <div className="flex items-center space-x-4">
            {!user ? (
              <button 
                onClick={handleLogin}
                className="flex items-center space-x-2 bg-white text-primary-950 px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black border border-slate-200 hover:bg-slate-50 transition-all shadow-sm group"
              >
                <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                <span>Login om te beheren</span>
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleLogout}
                  className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                  title="Uitloggen"
                >
                  <LogOut className="w-5 h-5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className={`flex items-center space-x-2 bg-primary-950 text-white px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all shadow-xl active:scale-95 group ${isUploading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-800'}`}
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                  )}
                  <span>{isUploading ? 'Verwerken...' : 'Foto Toevoegen'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {imageList.map((item, index) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3 }}
                className="group relative overflow-hidden rounded-3xl aspect-video shadow-md hover:shadow-2xl transition-all border border-white bg-white p-2"
              >
                <div className="w-full h-full overflow-hidden rounded-2xl relative">
                  <img 
                    src={item.url} 
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <span className="text-white font-medium tracking-wide">{item.title}</span>
                  </div>

                  {user && user.uid === item.ownerId && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(item.id);
                      }}
                      className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md p-3 rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-xl scale-90 group-hover:scale-100 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {!loading && imageList.length === 0 && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-400 space-y-4 bg-white border-2 border-dashed border-slate-200 rounded-[40px]">
              <Camera className="w-12 h-12 opacity-20" />
              <p className="text-sm italic font-light text-center px-6">Voeg sfeerbeelden van de omgeving toe aan deze galerij.</p>
            </div>
          )}

          {loading && (
            <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="mt-4 text-sm uppercase tracking-widest font-bold">Laden...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
