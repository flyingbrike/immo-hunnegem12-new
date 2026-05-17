import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Camera, LogIn, LogOut } from 'lucide-react';
import { db, auth, loginWithGoogle } from '../lib/firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  createdAt: any;
  ownerId: string;
}

export default function Gallery() {
  const [imageList, setImageList] = useState<GalleryImage[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const q = query(collection(db, 'gallery'));
    const unsubscribeGallery = onSnapshot(q, (snapshot) => {
      const dbImages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GalleryImage[];
      
      // Sort on client side to avoid issues with server-side ordering of new documents (which have null timestamps locally)
      const sortedDbImages = [...dbImages].sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt || 0);
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt || 0);
        return timeB - timeA;
      });

      setImageList(sortedDbImages);
      setLoading(false);
    }, (error) => {
      console.warn("Firestore access restricted.");
      setImageList([]);
      setLoading(false);
      if (auth.currentUser) {
        handleFirestoreError(error, OperationType.GET, 'gallery');
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

        // Max pixels (approx 1024x1024 or similar) to keep it well under 1MB
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
        
        // Output as slightly compressed JPEG
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
          // Resize image before uploading
          const optimizedData = await resizeImage(rawData);
          
          const id = `img_${Date.now()}`;
          const path = `gallery/${id}`;
          
          await setDoc(doc(db, 'gallery', id), {
            url: optimizedData,
            title: "Nieuwe Foto",
            createdAt: Date.now(),
            ownerId: user.uid
          });
          
          if (fileInputRef.current) fileInputRef.current.value = '';
        } catch (error: any) {
          console.error("Upload failed:", error);
          alert("Het uploaden is mislukt. Zorg dat de foto niet te groot is.");
          handleFirestoreError(error, OperationType.WRITE, 'gallery');
        } finally {
          setIsUploading(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = async (id: string) => {
    if (!user) return;
    const path = `gallery/${id}`;
    try {
      await deleteDoc(doc(db, 'gallery', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 border-b border-slate-200 pb-8 space-y-6 md:space-y-0">
        <div>
          <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">Impressie</span>
          <div className="flex items-center space-x-4">
            <h1 className="serif text-5xl italic text-slate-900">Galerij</h1>
            <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter shadow-sm border border-primary-200">
              {imageList.length} Foto's
            </span>
          </div>
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
          {imageList.map((img) => (
            <motion.div
              layout
              key={img.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
              className="group relative overflow-hidden rounded-3xl aspect-[4/3] shadow-md hover:shadow-2xl transition-all border border-slate-200 bg-white p-3"
            >
              <div className="w-full h-full overflow-hidden rounded-2xl relative">
                <img 
                  src={img.url} 
                  alt={img.title} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                
                {/* Overlay Info */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-6">
                  <div className="flex items-center space-x-3 text-white">
                    <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                      <Camera className="w-4 h-4" />
                    </div>
                    <span className="text-xs uppercase tracking-widest font-black">
                      {img.title}
                    </span>
                  </div>
                </div>

                {/* Delete Button - Only if user owns it */}
                {user && user.uid === img.ownerId && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeImage(img.id);
                    }}
                    className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md p-3 rounded-xl text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-xl scale-90 group-hover:scale-100 cursor-pointer"
                    aria-label="Verwijder foto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {!loading && imageList.length === 0 && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full py-32 flex flex-col items-center justify-center text-slate-400 space-y-4 bg-white border-2 border-dashed border-slate-200 rounded-[40px]"
          >
            <Camera className="w-12 h-12 opacity-20" />
            <p className="text-sm italic font-light">Geen foto's meer beschikbaar. Voeg ze handmatig toe.</p>
          </motion.div>
        )}

        {loading && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-400">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm uppercase tracking-widest font-bold">Laden...</p>
          </div>
        )}
      </div>
    </div>
  );
}

