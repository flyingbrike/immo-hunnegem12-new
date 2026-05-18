import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Coffee, ShoppingBag, TreePine, TrainFront, Waves, Heart, Plus, Trash2, Camera, LogIn, LogOut, Upload, X, CheckCircle, FileUp, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { db, auth, loginWithGoogle } from '../lib/firebase';
import { collection, onSnapshot, setDoc, doc, deleteDoc, query, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  createdAt: any;
  ownerId: string;
  order?: number;
}

interface UploadQueueItem {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

const locations = [
  { icon: <MapPin className="w-4 h-4" />, name: "Centrum & Markt", distance: "5 min" },
  { icon: <Waves className="w-4 h-4" />, name: "Wandelpad langs Dender jachtpad", distance: "2 min" },
  { icon: <Heart className="w-4 h-4" />, name: "Woonzorgcentra De Populier, Maretak en Hunnegem", distance: "2MIN" },
  { icon: <Coffee className="w-4 h-4" />, name: "De Muur van Geraardsbergen", distance: "15 min" },
  { icon: <ShoppingBag className="w-4 h-4" />, name: "Winkels & Restaurants", distance: "3 min" },
  { icon: <TreePine className="w-4 h-4" />, name: "Provinciaal Domein De Gavers", distance: "15 min" },
  { icon: <TrainFront className="w-4 h-4" />, name: "Station Geraardsbergen", distance: "5 min" },
  { icon: <MapPin className="w-4 h-4" />, name: "Pairi Daiza", distance: "30 km" },
];

const DEFAULT_SURROUNDINGS = [
  { id: 'sur1', url: "https://images.unsplash.com/photo-1549144511-f099e773c147?auto=format&fit=crop&q=80&w=1000", title: "Karaktervol Geraardsbergen", ownerId: 'system', createdAt: 0 },
  { id: 'sur2', url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1000", title: "Natuur in de Vlaamse Ardennen", ownerId: 'system', createdAt: 0 },
  { id: 'sur3', url: "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&q=80&w=1000", title: "Historische Stadskern", ownerId: 'system', createdAt: 0 },
  { id: 'sur4', url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1000", title: "Rivieruitzicht", ownerId: 'system', createdAt: 0 },
  { id: 'sur5', url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=1000", title: "Bosrijke Omgeving", ownerId: 'system', createdAt: 0 },
  { id: 'sur6', url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=1000", title: "Parkwandeling", ownerId: 'system', createdAt: 0 },
];

export default function Surroundings() {
  const [imageList, setImageList] = useState<GalleryImage[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });

    const q = query(collection(db, 'surroundings_gallery'));
    const unsubscribeGallery = onSnapshot(q, (snapshot) => {
      const dbImages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((img: any) => img.url) as GalleryImage[];
      
      console.log(`Surroundings updated: ${dbImages.length} images found`);
      
      const sortedDbImages = [...dbImages].sort((a, b) => {
        // First priority: user-defined order
        if (a.order !== undefined && b.order !== undefined) {
          if (a.order !== b.order) return a.order - b.order;
        } else if (a.order !== undefined) {
          return -1; // Images with order come first
        } else if (b.order !== undefined) {
          return 1;
        }

        // Second priority: createdAt descending
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : (a.createdAt?.toMillis ? a.createdAt.toMillis() : (Number(a.createdAt) || Date.now() + 1000));
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : (b.createdAt?.toMillis ? b.createdAt.toMillis() : (Number(b.createdAt) || Date.now() + 1000));
        return timeB - timeA;
      });

      setImageList(sortedDbImages);
      setLoading(false);
      setQuotaExceeded(false);
    }, (error: any) => {
      console.error("Firestore surroundings gallery error:", error);
      const isQuota = error.message?.toLowerCase().includes('quota') || error.code === 'resource-exhausted';
      if (isQuota) {
        setQuotaExceeded(true);
      }
      
      if (imageList.length === 0) {
        setImageList([]);
      }
      setLoading(false);
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
        const MAX_SIZE = 800;
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
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.src = dataUrl;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      alert("Je moet ingelogd zijn om foto's toe te voegen.");
      return;
    }

    const files = event.target.files;
    if (files && files.length > 0) {
      await processFiles(Array.from(files));
    }
  };

  const processFiles = async (files: File[]) => {
    if (!user) return;

    const newItems: UploadQueueItem[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'pending'
    }));

    setUploadQueue(prev => [...prev, ...newItems]);
  };

  useEffect(() => {
    const uploadNext = async () => {
      const nextItem = uploadQueue.find(item => item.status === 'pending');
      if (!nextItem || isUploading || !user) return;

      setIsUploading(true);
      setUploadQueue(prev => prev.map(item => 
        item.id === nextItem.id ? { ...item, status: 'uploading' } : item
      ));

      try {
        const reader = new FileReader();
        const rawData = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(nextItem.file);
        });

        const optimizedData = await resizeImage(rawData);
        const docId = `surr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
        // New images get an order that puts them at the front by default (min current order - 1)
        const minOrder = imageList.length > 0 
          ? Math.min(...imageList.map(img => img.order ?? 0)) 
          : 0;

        await setDoc(doc(db, 'surroundings_gallery', docId), {
          url: optimizedData,
          title: "Omgeving Beeld",
          createdAt: serverTimestamp(),
          ownerId: user.uid,
          order: minOrder - 1
        });

        console.log("Upload successful for:", docId);
        alert("Upload succesvol! Het omgevingsbeeld verschijnt nu in de galerij.");

        setUploadQueue(prev => prev.map(item => 
          item.id === nextItem.id ? { ...item, status: 'completed', progress: 100 } : item
        ));

        setTimeout(() => {
          setUploadQueue(prev => {
            const itemToRemove = prev.find(item => item.id === nextItem.id);
            if (itemToRemove && itemToRemove.status === 'completed') {
              URL.revokeObjectURL(itemToRemove.preview);
              return prev.filter(item => item.id !== nextItem.id);
            }
            return prev;
          });
        }, 5000);

      } catch (error: any) {
        console.error("Upload failed:", error);
        setUploadQueue(prev => prev.map(item => 
          item.id === nextItem.id ? { ...item, status: 'error' } : item
        ));
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.toLowerCase().includes('permission-denied')) {
          alert("Upload geweigerd door beveiligingsregels. Heb je de juiste rechten?");
        } else if (errorMessage.toLowerCase().includes('quota')) {
          alert("Upload limiet bereikt voor vandaag. Probeer het morgen opnieuw.");
        } else {
          alert("Upload mislukt: " + errorMessage);
        }
        
        handleFirestoreError(error, OperationType.WRITE, 'surroundings_gallery');
      } finally {
        setIsUploading(false);
      }
    };

    uploadNext();
  }, [uploadQueue, isUploading, user]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(Array.from(e.dataTransfer.files));
    }
  };

  const moveImage = async (id: string, direction: 'up' | 'down') => {
    if (!user) return;
    
    const currentIndex = imageList.findIndex(img => img.id === id);
    if (currentIndex === -1) return;
    
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= imageList.length) return;
    
    const currentImg = imageList[currentIndex];
    const targetImg = imageList[targetIndex];
    
    try {
      // Ensure both have order values
      const currentOrder = currentImg.order ?? currentIndex;
      let targetOrder = targetImg.order ?? targetIndex;
      
      // If order values are same or missing, redistribute
      if (currentOrder === targetOrder) {
        targetOrder = currentOrder + (direction === 'up' ? -1 : 1);
      }
      
      // Simple swap
      await setDoc(doc(db, 'surroundings_gallery', currentImg.id), { ...currentImg, order: targetOrder }, { merge: true });
      await setDoc(doc(db, 'surroundings_gallery', targetImg.id), { ...targetImg, order: currentOrder }, { merge: true });
      
    } catch (error) {
      console.error("Order update failed:", error);
    }
  };

  const removeImage = async (id: string) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, 'surroundings_gallery', id));
      alert("Foto succesvol verwijderd!");
      setDeletingId(null);
    } catch (error: any) {
      console.error("Delete failed:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.toLowerCase().includes('permission-denied')) {
        alert("Verwijderen mislukt: Je hebt niet de juiste rechten.");
      } else if (errorMessage.toLowerCase().includes('quota')) {
        alert("Verwijderen mislukt: Quota limiet bereikt.");
      } else {
        alert("Verwijderen mislukt: " + errorMessage);
      }
      setDeletingId(null);
      handleFirestoreError(error, OperationType.DELETE, `surroundings_gallery/${id}`);
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error("Login failed:", error);
      alert("Inloggen mislukt: " + (error.message || "Onbekende fout"));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const currentDisplayImages = imageList;

  return (
    <div className="py-8 px-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="max-w-3xl mx-auto mb-6">
        <div className="text-center">
          <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">De Locatie</span>
          <h1 className="serif text-5xl italic mb-8 text-slate-900 leading-tight">Ontdek de Omgeving</h1>
          <p className="text-lg font-light text-slate-600 leading-relaxed">
            Gelegen in het hart van de Vlaamse Ardennen, biedt dit appartement het beste van twee werelden: de levendigheid van de historische stad en de rust van de omliggende natuur.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 space-y-6 md:space-y-0">
          <div className="text-left">
            <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">Impressie</span>
            <h2 className="serif text-4xl italic text-slate-900">Beelden van de Buurt</h2>
          </div>

          <div className="flex items-center space-x-4">
            {quotaExceeded && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-xs flex items-center space-x-2 animate-pulse">
                <AlertCircle className="w-4 h-4" />
                <span>Quota limiet bereikt. Sommige foto's kunnen ontbreken.</span>
              </div>
            )}
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
                  multiple
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || uploadQueue.length > 5}
                  className={`flex items-center space-x-2 bg-primary-950 text-white px-8 py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all shadow-xl active:scale-95 group ${(isUploading || uploadQueue.length > 5) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-800'}`}
                >
                  <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                  <span>Foto Toevoegen</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {user && (
          <div className="mb-12">
            {uploadQueue.length > 0 ? (
              <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200 border-dashed">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center text-primary-600">
                      <FileUp className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 uppercase tracking-wider text-xs">Upload Wachtrij</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest">{uploadQueue.length} items in de wachtrij</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  <AnimatePresence mode="popLayout">
                    {uploadQueue.map((item) => (
                      <motion.div
                        layout
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-100 bg-slate-50"
                      >
                        <img src={item.preview} alt="Upload preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          {item.status === 'uploading' && (
                            <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          )}
                          {item.status === 'completed' && (
                            <CheckCircle className="w-8 h-8 text-green-400" />
                          )}
                          {item.status === 'error' && (
                            <AlertCircle className="w-8 h-8 text-red-400" />
                          )}
                        </div>
                        <button 
                          onClick={() => {
                            URL.revokeObjectURL(item.preview);
                            setUploadQueue(q => q.filter(i => i.id !== item.id));
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <motion.div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative py-16 flex flex-col items-center justify-center border-2 border-dashed rounded-[2.5rem] transition-all duration-300 group overflow-hidden ${dragActive ? 'bg-primary-50 border-primary-400 scale-[0.99] shadow-inner' : 'bg-white border-slate-200 hover:border-primary-300 hover:bg-slate-50/50'}`}
              >
                {dragActive && (
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center bg-primary-100/10">
                    <div className="absolute inset-0 border-4 border-primary-600/20 m-2 rounded-[2rem] animate-pulse" />
                  </div>
                )}
                
                <div className={`p-6 rounded-[2rem] mb-4 transition-transform duration-500 ${dragActive ? 'scale-110 bg-primary-100 text-primary-600' : 'bg-slate-100 text-slate-400 group-hover:scale-110 group-hover:bg-primary-50 group-hover:text-primary-400'}`}>
                  <Upload className={`w-8 h-8 ${dragActive ? 'animate-bounce' : ''}`} />
                </div>
                
                <div className="text-center px-6">
                  <h3 className={`font-bold uppercase tracking-widest text-xs mb-2 transition-colors ${dragActive ? 'text-primary-800' : 'text-slate-900'}`}>
                    {dragActive ? 'Laat de Foto\'s Los!' : 'Sleep Foto\'s Hierheen'}
                  </h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-light">OF CLICK OP DE KNOP HIERBOVEN OM TE SELECTEREN</p>
                </div>
              </motion.div>
            )}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {currentDisplayImages.map((item, index) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.3 }}
                onClick={() => setSelectedImage(item)}
                className="group relative overflow-hidden rounded-3xl aspect-video shadow-md hover:shadow-2xl transition-all border border-white bg-white p-2 cursor-pointer"
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

                  {/* Move Controls - Only for owners/admins */}
                  {(user && item.ownerId !== 'system' && (user.uid === item.ownerId || user.email?.toLowerCase() === 'eriksuniverse@gmail.com')) && (
                    <div className="absolute bottom-4 right-4 flex space-x-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveImage(item.id, 'up');
                        }}
                        disabled={imageList.indexOf(item) === 0}
                        className="p-2 bg-white/90 backdrop-blur-md rounded-lg text-primary-600 hover:bg-primary-600 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white/90 disabled:hover:text-primary-600 shadow-lg"
                        title="Verplaats naar voren"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveImage(item.id, 'down');
                        }}
                        disabled={imageList.indexOf(item) === imageList.length - 1}
                        className="p-2 bg-white/90 backdrop-blur-md rounded-lg text-primary-600 hover:bg-primary-600 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white/90 disabled:hover:text-primary-600 shadow-lg"
                        title="Verplaats naar achteren"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {(user && item.ownerId !== 'system' && (user.uid === item.ownerId || user.email?.toLowerCase() === 'eriksuniverse@gmail.com')) && (
                    <div className="absolute top-4 right-4 z-10">
                      {deletingId === item.id ? (
                        <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-md p-1.5 rounded-xl shadow-xl border border-red-100">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeImage(item.id);
                            }}
                            className="bg-red-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-colors"
                          >
                            Bevestig
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(null);
                            }}
                            className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors"
                          >
                            Annuleer
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingId(item.id);
                          }}
                          className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md p-3 rounded-xl text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-xl scale-90 group-hover:scale-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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

      <div className="mt-10 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">Mobiliteit</span>
          <h2 className="serif text-3xl italic text-slate-900">Nabije Voorzieningen</h2>
        </div>
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden">
          {locations.map((loc, index) => (
            <div key={index} className="flex items-center justify-between p-6 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all">
                  {loc.icon}
                </div>
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">{loc.name}</span>
              </div>
              <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full uppercase tracking-tighter">{loc.distance}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-12"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-5xl w-full aspect-video bg-white rounded-[2rem] overflow-hidden shadow-2xl"
            >
              <img 
                src={selectedImage.url} 
                alt={selectedImage.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950/80 to-transparent text-white">
                <h3 className="text-2xl font-bold italic serif">{selectedImage.title}</h3>
                <p className="text-sm text-slate-300">Sfeerbeeld van de omgeving</p>
              </div>
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-6 right-6 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-3 rounded-full transition-colors"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
