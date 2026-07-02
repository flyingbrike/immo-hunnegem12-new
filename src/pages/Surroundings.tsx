import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Coffee, ShoppingBag, TreePine, TrainFront, Waves, Heart, Plus, Trash2, Camera, LogIn, LogOut, Upload, X, CheckCircle, FileUp, AlertCircle, ArrowLeft, ArrowRight, Edit3, Save } from 'lucide-react';
import { auth, loginWithGoogle, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { useLanguage } from '../context/LanguageContext';
import { GalleryImage } from '../types';

interface UploadQueueItem {
  id: string;
  file: File;
  preview: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

const DEFAULT_SURROUNDINGS = [
  { id: 'sur1', url: "https://images.unsplash.com/photo-1549144511-f099e773c147?auto=format&fit=crop&q=80&w=1000", title: "Denderpad", ownerId: 'system', createdAt: 0 },
  { id: 'sur2', url: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&q=80&w=1000", title: "Natuur in de Vlaamse Ardennen", ownerId: 'system', createdAt: 0 },
  { id: 'sur3', url: "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&q=80&w=1000", title: "Historische Stadskern", ownerId: 'system', createdAt: 0 },
  { id: 'sur4', url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1000", title: "Rivieruitzicht", ownerId: 'system', createdAt: 0 },
  { id: 'sur5', url: "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=1000", title: "Bosrijke Omgeving", ownerId: 'system', createdAt: 0 },
  { id: 'sur6', url: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&q=80&w=1000", title: "Parkwandeling", ownerId: 'system', createdAt: 0 },
];

const defaultPageData = {
  subtitle: "De Locatie",
  title: "Ontdek de Omgeving",
  description: "Gelegen in het heart van de Vlaamse Ardennen, biedt dit appartement het beste van twee werelden: de levendigheid van de historische stad en de rust van de omliggende natuur.",
  locationsSubtitle: "Mobiliteit",
  locationsTitle: "Nabije Voorzieningen",
  locations: [
    { iconName: "MapPin", name: "Centrum & Markt", distance: "5 min" },
    { iconName: "Waves", name: "Wandelpad langs Dender jaagpad", distance: "2 min" },
    { iconName: "Heart", name: "Woonzorgcentra De Populier, Maretak en Hunnegem", distance: "2MIN" },
    { iconName: "Heart", name: "AZORG Ziekenhuis", distance: "500 m" },
    { iconName: "MapPin", name: "Musea Hunnegem", distance: "50 m" },
    { iconName: "Coffee", name: "De Muur van Geraardsbergen", distance: "15 min" },
    { iconName: "ShoppingBag", name: "Winkels & Restaurants", distance: "3 min" },
    { iconName: "Coffee", name: "Restaurant My LunchTime", distance: "50 m" },
    { iconName: "ShoppingBag", name: "Restaurants, tavernes en terrasjes", distance: "500 m" },
    { iconName: "ShoppingBag", name: "Supermarkt", distance: "10 min" },
    { iconName: "TreePine", name: "Provinciaal Domein De Gavers", distance: "15 min" },
    { iconName: "TrainFront", name: "Station Geraardsbergen", distance: "5 min" },
    { iconName: "MapPin", name: "Pairi Daiza", distance: "30 km" },
  ]
};

export default function Surroundings() {
  const { t, dt, language } = useLanguage();
  
  const cachedSurroundingsImages = (() => {
    try {
      const cached = localStorage.getItem('cached_surroundings_images');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to parse cached surroundings images", e);
    }
    return DEFAULT_SURROUNDINGS;
  })();

  const cachedSurroundingsData = (() => {
    try {
      const cached = localStorage.getItem('cached_surroundings_data');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error("Failed to parse cached surroundings data", e);
    }
    return null;
  })();

  const [imageList, setImageList] = useState<GalleryImage[]>(cachedSurroundingsImages);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !localStorage.getItem('cached_surroundings_images'));
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Editable descriptive block
  const [pageData, setPageData] = useState(() => ({ ...defaultPageData, ...cachedSurroundingsData }));
  const [draftPageData, setDraftPageData] = useState(() => ({ ...defaultPageData, ...cachedSurroundingsData }));
  const [editMode, setEditMode] = useState(false);

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

    setLoading(true);

    // Real-time surroundings data subscription
    const unsubData = onSnapshot(doc(db, 'surroundings_data', 'page_content'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        let modified = false;
        let locations = (data.locations || []).map((loc: any) => {
          if (loc.name === "Wandelpad langs Dender jachtpad") {
            modified = true;
            return { ...loc, name: "Wandelpad langs Dender jaagpad" };
          }
          return loc;
        });

        const hasSupermarket = locations.some((loc: any) => loc.name && loc.name.toLowerCase().includes('supermarkt'));
        if (!hasSupermarket) {
          locations = [...locations, { iconName: "ShoppingBag", name: "Supermarkt", distance: "10 min" }];
          modified = true;
        }

        const hasMuseaHunnegem = locations.some((loc: any) => loc.name && loc.name.toLowerCase().includes('musea hunnegem'));
        if (!hasMuseaHunnegem) {
          locations = [...locations, { iconName: "MapPin", name: "Musea Hunnegem", distance: "50 m" }];
          modified = true;
        }

        const hasAzorg = locations.some((loc: any) => loc.name && loc.name.toLowerCase().includes('azorg'));
        if (!hasAzorg) {
          locations = [...locations, { iconName: "Heart", name: "AZORG Ziekenhuis", distance: "500 m" }];
          modified = true;
        }

        const hasMyLunchTime = locations.some((loc: any) => loc.name && loc.name.toLowerCase().includes('mylunchtime') || loc.name && loc.name.toLowerCase().includes('my lunchtime'));
        if (!hasMyLunchTime) {
          locations = [...locations, { iconName: "Coffee", name: "Restaurant My LunchTime", distance: "50 m" }];
          modified = true;
        }

        const hasTerrasjes = locations.some((loc: any) => loc.name && loc.name.toLowerCase().includes('tavernes en terrasjes') || loc.name && loc.name.toLowerCase().includes('tavernes en terasjes'));
        if (!hasTerrasjes) {
          locations = [...locations, { iconName: "ShoppingBag", name: "Restaurants, tavernes en terrasjes", distance: "500 m" }];
          modified = true;
        }

        const cachedUser = auth.currentUser || JSON.parse(localStorage.getItem('local_admin_user') || 'null');
        if (modified && cachedUser) {
          setDoc(doc(db, 'surroundings_data', 'page_content'), {
            ...data,
            locations,
            updatedAt: new Date().toISOString(),
            updatedBy: cachedUser.uid
          }, { merge: true }).catch(err => console.error("Auto-syncing locations failed:", err));
        }

        const updated = {
          ...defaultPageData,
          ...data,
          locations
        };
        try {
          localStorage.setItem('cached_surroundings_data', JSON.stringify(updated));
        } catch (e) {}

        setPageData(updated);
        setDraftPageData(updated);
      } else {
        setPageData(defaultPageData);
        setDraftPageData(defaultPageData);
      }
    }, (err) => {
      console.warn("Failed to subscribe to surroundings_data metadata:", err);
    });

    // Real-time surroundings gallery images subscription
    const q = query(collection(db, 'surroundings_gallery'));
    const unsubGallery = onSnapshot(q, (snapshot) => {
      let dbImages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GalleryImage[];
      
      if (!dbImages || dbImages.length === 0) {
        // If an admin is logged in, seed the DEFAULT_SURROUNDINGS into Firestore so they are manageable!
        const currentUser = auth.currentUser || JSON.parse(localStorage.getItem('local_admin_user') || 'null');
        if (currentUser) {
          DEFAULT_SURROUNDINGS.forEach(async (img, idx) => {
            const docId = img.id;
            const seededImg = {
              ...img,
              ownerId: currentUser.uid,
              createdAt: new Date().toISOString(),
              order: idx
            };
            try {
              await setDoc(doc(db, 'surroundings_gallery', docId), seededImg);
            } catch (e) {
              console.error("Failed to seed default surroundings image:", e);
            }
          });
          return;
        }
        dbImages = DEFAULT_SURROUNDINGS;
      }

      const sortedDbImages = [...dbImages].sort((a, b) => {
        if (a.order !== undefined && b.order !== undefined) {
          if (a.order !== b.order) return a.order - b.order;
        } else if (a.order !== undefined) {
          return -1;
        } else if (b.order !== undefined) {
          return 1;
        }

        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      setImageList(sortedDbImages);
      setLoading(false);
      setQuotaExceeded(false);

      if (sortedDbImages.length > 0) {
        try {
          localStorage.setItem('cached_surroundings_images', JSON.stringify(sortedDbImages));
        } catch (e) {}
      }
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'surroundings_gallery');
      } catch (e) {
        setQuotaExceeded(true);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubData();
      unsubGallery();
    };
  }, []);

  const resizeImage = (dataUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDimension = 1200;
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        let quality = 0.75;
        let result = canvas.toDataURL('image/jpeg', quality);

        let attempts = 0;
        while (result.length > 800000 && attempts < 8) {
          attempts++;
          width = Math.round(width * 0.85);
          height = Math.round(height * 0.85);
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          quality = Math.max(0.4, quality - 0.05);
          result = canvas.toDataURL('image/jpeg', quality);
        }

        resolve(result);
      };
      img.src = dataUrl;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) {
      alert(t('error.must_login'));
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
        
        let fileUrl = optimizedData;
        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: nextItem.file.name,
              fileType: nextItem.file.type,
              base64Data: optimizedData
            })
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            if (uploadData.success && uploadData.url) {
              fileUrl = uploadData.url;
            }
          }
        } catch (uploadErr) {
          console.warn("Local server upload failed, falling back to base64 storage:", uploadErr);
        }

        // New images get an order that puts them at the front by default (min current order - 1)
        const minOrder = imageList.length > 0 
          ? Math.min(...imageList.map(img => img.order ?? 0)) 
          : 0;

        const newImg: GalleryImage = {
          id: docId,
          url: fileUrl,
          title: "Omgeving Beeld",
          createdAt: new Date().toISOString(),
          ownerId: user.uid,
          order: minOrder - 1
        };

        // 2. Save to Firestore
        try {
          await setDoc(doc(db, 'surroundings_gallery', docId), newImg);
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.CREATE, `surroundings_gallery/${docId}`);
        }

        console.log("Upload successful for:", docId);
        alert(t('ui.upload_success'));

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
        alert(t('error.upload_failed') + errorMessage);
      } finally {
        setIsUploading(false);
      }
    };

    uploadNext();
  }, [uploadQueue, isUploading, user, imageList]);

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
    
    try {
      const newImageList = [...imageList];
      const [movedItem] = newImageList.splice(currentIndex, 1);
      newImageList.splice(targetIndex, 0, movedItem);

      // Save each moved/updated item's order field to Firestore
      for (let i = 0; i < newImageList.length; i++) {
        const item = newImageList[i];
        if (item.order !== i) {
          await setDoc(doc(db, 'surroundings_gallery', item.id), { ...item, order: i });
        }
      }
    } catch (error) {
      console.error("Order update failed:", error);
    }
  };

  const removeImage = async (id: string) => {
    if (!user) return;
    
    try {
      // Clean up physical file on the server if it exists
      try {
        await fetch(`/api/db/surroundings/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn("Local physical file delete failed/skipped:", err);
      }

      await deleteDoc(doc(db, 'surroundings_gallery', id));
      alert(t('ui.delete_success'));
      setDeletingId(null);
    } catch (error: any) {
      console.error("Delete failed:", error);
      alert("Fout bij verwijderen: " + error.message);
      setDeletingId(null);
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
      alert(t('error.login_failed') + (error.message || "Onbekende fout"));
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const currentDisplayImages = imageList.length > 0 ? imageList : DEFAULT_SURROUNDINGS;

  const renderLocationIcon = (iconName: string) => {
    switch (iconName) {
      case 'Waves': return <Waves className="w-4 h-4" />;
      case 'Heart': return <Heart className="w-4 h-4" />;
      case 'Coffee': return <Coffee className="w-4 h-4" />;
      case 'ShoppingBag': return <ShoppingBag className="w-4 h-4" />;
      case 'TreePine': return <TreePine className="w-4 h-4" />;
      case 'TrainFront': return <TrainFront className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  return (
    <div className="relative bg-slate-50 min-h-screen">
      {/* Admin Floating Controller Bar */}
      {user && (
        <div className="sticky top-0 z-[40] bg-white/95 backdrop-blur-md border-b border-primary-100 shadow-sm px-6 py-3 flex items-center justify-between">
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
                  setDraftPageData({ ...pageData });
                  setEditMode(true);
                }}
                className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-wider bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{t('ui.edit_data')}</span>
              </button>
            ) : (
              <>
                <button
                  onClick={async () => {
                    try {
                      await setDoc(doc(db, 'surroundings_data', 'page_content'), {
                        ...draftPageData,
                        updatedAt: new Date().toISOString(),
                        updatedBy: user.uid
                      }, { merge: true });
                      setPageData({ ...draftPageData });
                      setEditMode(false);
                    } catch (err) {
                      console.error("Save surroundings data error: ", err);
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

      <div className="py-8 px-6 max-w-7xl mx-auto">
        <div className="max-w-3xl mx-auto mb-6">
          <div className="text-center">
            {editMode ? (
              <div className="space-y-4 text-left max-w-xl mx-auto mb-6 bg-white p-6 rounded-2xl border border-slate-200">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subtitel</label>
                  <input
                    type="text"
                    value={draftPageData.subtitle}
                    onChange={(e) => setDraftPageData({ ...draftPageData, subtitle: e.target.value })}
                    className="w-full text-xs font-bold text-primary-600 border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Titel</label>
                  <input
                    type="text"
                    value={draftPageData.title}
                    onChange={(e) => setDraftPageData({ ...draftPageData, title: e.target.value })}
                    className="w-full text-xl serif italic border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Beschrijving</label>
                  <textarea
                    value={draftPageData.description}
                    onChange={(e) => setDraftPageData({ ...draftPageData, description: e.target.value })}
                    className="w-full text-xs font-light text-slate-600 border border-slate-200 rounded-lg p-2"
                    rows={4}
                  />
                </div>
              </div>
            ) : (
              <>
                <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">{dt(pageData.subtitle, 'surr.subtitle')}</span>
                <h1 className="serif text-5xl italic mb-8 text-slate-900 leading-tight">{dt(pageData.title, 'surr.title')}</h1>
                <p className="text-lg font-light text-slate-600 leading-relaxed">
                  {dt(pageData.description, 'surr.desc')}
                </p>
              </>
            )}
          </div>
        </div>

      <div className="mt-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 space-y-6 md:space-y-0">
          <div className="text-left">
            <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">{t('surr.impression')}</span>
            <h2 className="serif text-4xl italic text-slate-900">{t('surr.images_neighborhood')}</h2>
          </div>

          <div className="flex items-center space-x-4">
            {quotaExceeded && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-xl text-xs flex items-center space-x-2 animate-pulse">
                <AlertCircle className="w-4 h-4" />
                <span>{t('surr.quota_exceeded')}</span>
              </div>
            )}
            {!user ? (
              <button 
                onClick={handleLogin}
                className="flex items-center space-x-2 bg-white text-primary-950 px-6 py-3 rounded-xl text-[10px] uppercase tracking-widest font-black border border-slate-200 hover:bg-slate-50 transition-all shadow-sm group"
              >
                <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                <span>{t('ui.login_manage')}</span>
              </button>
            ) : (
              <div className="flex items-center space-x-4">
                <button 
                  onClick={handleLogout}
                  className="p-3 text-slate-400 hover:text-red-500 transition-colors"
                  title={t('ui.logout')}
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
                  <span>{t('surr.add_photo')}</span>
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
            {currentDisplayImages.map((item, index) => {
              const displayTitle = item.id === 'sur1' ? 'Denderpad' : item.title;
              return (
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
                  <div className="w-full h-full overflow-hidden rounded-2xl relative bg-slate-100">
                    {brokenImages[item.id] ? (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4">
                        <AlertCircle className="w-8 h-8 mb-2 text-slate-300 animate-pulse" />
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Niet laden</span>
                      </div>
                    ) : (
                      <img 
                        src={item.url} 
                        alt={displayTitle}
                        onError={() => {
                          setBrokenImages(prev => ({ ...prev, [item.id]: true }));
                        }}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    )}
                    {/* Always visible clean title overlay at the bottom of the image */}
                    <div className="absolute bottom-0 left-0 right-0 bg-slate-900/75 backdrop-blur-xs py-3 px-4 text-white flex items-center justify-between border-t border-white/10">
                      <span className="text-xs sm:text-sm font-semibold tracking-wide truncate max-w-[70%]">{displayTitle}</span>
                    </div>

                    {/* Move Controls - Only for logged-in admins */}
                    {user && (
                      <div className="absolute bottom-12 right-4 flex space-x-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
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

                    {user && (
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
              );
            })}
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
          {editMode ? (
            <div className="space-y-4 max-w-lg mx-auto mb-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Voorzieningen Subtitel</label>
                <input
                  type="text"
                  value={draftPageData.locationsSubtitle || ''}
                  onChange={(e) => setDraftPageData({ ...draftPageData, locationsSubtitle: e.target.value })}
                  className="w-full text-xs font-bold text-primary-600 border border-slate-200 rounded-lg p-2 text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Voorzieningen Titel</label>
                <input
                  type="text"
                  value={draftPageData.locationsTitle || ''}
                  onChange={(e) => setDraftPageData({ ...draftPageData, locationsTitle: e.target.value })}
                  className="w-full text-xl serif italic border border-slate-200 rounded-lg p-2 text-center"
                />
              </div>
            </div>
          ) : (
            <>
              <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">{dt(pageData.locationsSubtitle, 'surr.mobility')}</span>
              <h2 className="serif text-3xl italic text-slate-900">{dt(pageData.locationsTitle, 'surr.amenities')}</h2>
            </>
          )}
        </div>
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-200 overflow-hidden p-6">
          {editMode ? (
            <div className="space-y-4">
              {draftPageData.locations.map((loc, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-2.5 items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <select
                    value={loc.iconName}
                    onChange={(e) => {
                      const updated = [...draftPageData.locations];
                      updated[idx].iconName = e.target.value;
                      setDraftPageData({ ...draftPageData, locations: updated });
                    }}
                    className="bg-white border border-slate-200 rounded-lg p-2 text-xs"
                  >
                    <option value="MapPin">MapPin (Locatie)</option>
                    <option value="Waves">Waves (Water)</option>
                    <option value="Heart">Heart (Zorg)</option>
                    <option value="Coffee">Coffee (Muur)</option>
                    <option value="ShoppingBag">ShoppingBag (Winkel)</option>
                    <option value="TreePine">TreePine (Natuur)</option>
                    <option value="TrainFront">TrainFront (Trein)</option>
                  </select>
                  <input
                    type="text"
                    value={loc.name}
                    placeholder="Locatie naam"
                    onChange={(e) => {
                      const updated = [...draftPageData.locations];
                      updated[idx].name = e.target.value;
                      setDraftPageData({ ...draftPageData, locations: updated });
                    }}
                    className="flex-grow bg-white border border-slate-200 rounded-lg p-2 text-xs"
                  />
                  <input
                    type="text"
                    value={loc.distance}
                    placeholder="Afstand"
                    onChange={(e) => {
                      const updated = [...draftPageData.locations];
                      updated[idx].distance = e.target.value;
                      setDraftPageData({ ...draftPageData, locations: updated });
                    }}
                    className="bg-white border border-slate-200 rounded-lg p-2 text-xs w-24"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const updated = draftPageData.locations.filter((_, i) => i !== idx);
                      setDraftPageData({ ...draftPageData, locations: updated });
                    }}
                    className="text-red-500 hover:text-red-700 p-2 border border-red-200 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => {
                  const updated = [...draftPageData.locations, { iconName: 'MapPin', name: 'Nieuwe Voorziening', distance: '10 min' }];
                  setDraftPageData({ ...draftPageData, locations: updated });
                }}
                className="text-xs text-primary-600 hover:text-primary-800 flex items-center space-x-1.5 font-bold pt-2 ml-2"
              >
                <Plus className="w-4 h-4" />
                <span>Voorziening Toevoegen</span>
              </button>
            </div>
          ) : (
            pageData.locations.map((loc, index) => (
              <div key={index} className="flex items-center justify-between p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all">
                    {renderLocationIcon(loc.iconName)}
                  </div>
                  <span className="text-sm font-bold text-slate-800 uppercase tracking-wide">{dt(loc.name)}</span>
                </div>
                <span className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1 rounded-full uppercase tracking-tighter">{dt(loc.distance)}</span>
              </div>
            ))
          )}
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
                alt={selectedImage.id === 'sur1' ? 'Denderpad' : selectedImage.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950/80 to-transparent text-white">
                <h3 className="text-2xl font-bold italic serif">{selectedImage.id === 'sur1' ? 'Denderpad' : selectedImage.title}</h3>
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
  </div>
  );
}
