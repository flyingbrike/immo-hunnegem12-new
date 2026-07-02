import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Camera, LogIn, LogOut, Upload, X, CheckCircle, FileUp, AlertCircle, ArrowLeft, ArrowRight, Star, Layout, Edit3, Save } from 'lucide-react';
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

const DEFAULT_IMAGES = [
  { id: 'def1', url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&q=80&w=1000", title: "Lichtrijke Woonkamer", ownerId: 'system', createdAt: 0 },
  { id: 'def2', url: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=1000", title: "Zuidgericht Terras", ownerId: 'system', createdAt: 0 },
  { id: 'def3', url: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&q=80&w=1000", title: "Moderne Badkamer", ownerId: 'system', createdAt: 0 },
  { id: 'def4', url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=1000", title: "Ruime Keuken", ownerId: 'system', createdAt: 0 },
  { id: 'def5', url: "https://images.unsplash.com/photo-1560185127-6ed189bf02f4?auto=format&fit=crop&q=80&w=1000", title: "Gezellige Zithoek", ownerId: 'system', createdAt: 0 },
  { id: 'def6', url: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&q=80&w=1000", title: "Design Details", ownerId: 'system', createdAt: 0 },
];

export default function Gallery() {
  const { t, dt, language } = useLanguage();
  
  const cachedGalleryImages = (() => {
    try {
      const cached = localStorage.getItem('cached_gallery_images');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Failed to parse cached gallery images", e);
    }
    return DEFAULT_IMAGES;
  })();

  const cachedGalleryData = (() => {
    try {
      const cached = localStorage.getItem('cached_gallery_data');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error("Failed to parse cached gallery data", e);
    }
    return null;
  })();

  const [imageList, setImageList] = useState<GalleryImage[]>(cachedGalleryImages);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => !localStorage.getItem('cached_gallery_images'));
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Editable fields
  const [galleryTitle, setGalleryTitle] = useState(() => cachedGalleryData?.galleryTitle || "Galerij");
  const [gallerySubtitle, setGallerySubtitle] = useState(() => cachedGalleryData?.gallerySubtitle || "Impressie");
  const [draftTitle, setDraftTitle] = useState(() => cachedGalleryData?.galleryTitle || "Galerij");
  const [draftSubtitle, setDraftSubtitle] = useState(() => cachedGalleryData?.gallerySubtitle || "Impressie");
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

    // Real-time metadata subscription
    const unsubMeta = onSnapshot(doc(db, 'gallery_data', 'page_content'), (docSnap) => {
      if (docSnap.exists()) {
        const pageContent = docSnap.data();
        try {
          localStorage.setItem('cached_gallery_data', JSON.stringify(pageContent));
        } catch (e) {}
        if (pageContent.galleryTitle) {
          setGalleryTitle(pageContent.galleryTitle);
          setDraftTitle(pageContent.galleryTitle);
        }
        if (pageContent.gallerySubtitle) {
          setGallerySubtitle(pageContent.gallerySubtitle);
          setDraftSubtitle(pageContent.gallerySubtitle);
        }
      }
    }, (err) => {
      console.warn("Failed to subscribe to gallery_data metadata:", err);
    });

    // Real-time gallery images subscription
    const q = query(collection(db, 'gallery'));
    const unsubGallery = onSnapshot(q, (snapshot) => {
      let dbImages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as GalleryImage[];
      
      if (!dbImages || dbImages.length === 0) {
        // If an admin is logged in, seed the DEFAULT_IMAGES into Firestore so they are manageable!
        const currentUser = auth.currentUser || JSON.parse(localStorage.getItem('local_admin_user') || 'null');
        if (currentUser) {
          DEFAULT_IMAGES.forEach(async (img, idx) => {
            const docId = img.id;
            const seededImg = {
              ...img,
              ownerId: currentUser.uid,
              createdAt: new Date().toISOString(),
              order: idx
            };
            try {
              await setDoc(doc(db, 'gallery', docId), seededImg);
            } catch (e) {
              console.error("Failed to seed default gallery image:", e);
            }
          });
          return;
        }
        dbImages = DEFAULT_IMAGES;
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
          localStorage.setItem('cached_gallery_images', JSON.stringify(sortedDbImages));
        } catch (e) {}
      }
    }, (err) => {
      try {
        handleFirestoreError(err, OperationType.LIST, 'gallery');
      } catch (e) {
        setQuotaExceeded(true);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubMeta();
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
      preview: URL.createObjectURL(file), // This is fine for preview
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
        const docId = `img_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        
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
          title: "Nieuwe Foto",
          createdAt: new Date().toISOString(),
          ownerId: user.uid,
          order: minOrder - 1,
          isHero: false,
          isSection: false
        };

        // 2. Save to Firestore
        try {
          await setDoc(doc(db, 'gallery', docId), newImg);
        } catch (fsErr) {
          handleFirestoreError(fsErr, OperationType.CREATE, `gallery/${docId}`);
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
          await setDoc(doc(db, 'gallery', item.id), { ...item, order: i });
        }
      }
    } catch (error) {
      console.error("Order update failed:", error);
    }
  };

  const setAsHero = async (id: string) => {
    if (!user) return;
    
    try {
      const otherHeros = imageList.filter(img => img.isHero && img.id !== id);
      for (const img of otherHeros) {
        await setDoc(doc(db, 'gallery', img.id), { ...img, isHero: false });
      }
      
      const currentImg = imageList.find(img => img.id === id);
      const newValue = !currentImg?.isHero;
      if (currentImg) {
        const updatedImg = { ...currentImg, isHero: newValue };
        await setDoc(doc(db, 'gallery', id), updatedImg);
      }
      
      if (newValue) alert(t('ui.hero_set_success'));
    } catch (error) {
      console.error("Set Hero failed:", error);
      alert(t('ui.hero_set_failed'));
    }
  };

  const setAsSection = async (id: string) => {
    if (!user) return;
    
    try {
      const otherSections = imageList.filter(img => img.isSection && img.id !== id);
      for (const img of otherSections) {
        await setDoc(doc(db, 'gallery', img.id), { ...img, isSection: false });
      }
      
      const currentImg = imageList.find(img => img.id === id);
      const newValue = !currentImg?.isSection;
      if (currentImg) {
        const updatedImg = { ...currentImg, isSection: newValue };
        await setDoc(doc(db, 'gallery', id), updatedImg);
      }
      
      if (newValue) alert(t('ui.section_set_success'));
    } catch (error) {
      console.error("Set Section failed:", error);
      alert(t('ui.section_set_failed'));
    }
  };

  const removeImage = async (id: string) => {
    if (!user) return;
    
    try {
      // Clean up physical file on the server if it exists
      try {
        await fetch(`/api/db/gallery/${id}`, { method: 'DELETE' });
      } catch (err) {
        console.warn("Local physical file delete failed/skipped:", err);
      }

      await deleteDoc(doc(db, 'gallery', id));
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

  const currentDisplayImages = imageList;

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
                  setDraftTitle(galleryTitle);
                  setDraftSubtitle(gallerySubtitle);
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
                      await setDoc(doc(db, 'gallery_data', 'page_content'), {
                        galleryTitle: draftTitle,
                        gallerySubtitle: draftSubtitle,
                        updatedAt: new Date().toISOString(),
                        updatedBy: user.uid
                      }, { merge: true });
                      setGalleryTitle(draftTitle);
                      setGallerySubtitle(draftSubtitle);
                      setEditMode(false);
                    } catch (err) {
                      console.error("Save gallery data error: ", err);
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-4 border-b border-slate-200 pb-8 space-y-6 md:space-y-0">
          <div>
            {editMode ? (
              <div className="space-y-4 max-w-lg mb-2">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subtitel</label>
                  <input
                    type="text"
                    value={draftSubtitle}
                    onChange={(e) => setDraftSubtitle(e.target.value)}
                    className="w-full text-xs font-bold text-primary-600 border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Titel</label>
                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="w-full text-xl serif italic border border-slate-200 rounded-lg p-2"
                  />
                </div>
              </div>
            ) : (
              <>
                <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">{dt(gallerySubtitle, 'home.impression')}</span>
                <div className="flex items-center space-x-4">
                  <h1 className="serif text-5xl italic text-slate-900">{dt(galleryTitle, 'nav.gallery')}</h1>
                  <span className="bg-primary-100 text-primary-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-tighter shadow-sm border border-primary-200">
                    {currentDisplayImages.length} {t('ui.photos')}
                  </span>
                </div>
              </>
            )}
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
          {currentDisplayImages.map((img) => (
            <motion.div
              layout
              key={img.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.3 }}
              onClick={() => setSelectedImage(img)}
              className="group relative overflow-hidden rounded-3xl aspect-[4/3] shadow-md hover:shadow-2xl transition-all border border-slate-200 bg-white p-3 cursor-pointer"
            >
              <div className="w-full h-full overflow-hidden rounded-2xl relative bg-slate-100">
                {brokenImages[img.id] ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 p-4">
                    <AlertCircle className="w-8 h-8 mb-2 text-slate-300 animate-pulse" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Niet laden</span>
                  </div>
                ) : (
                  <img 
                    src={img.url} 
                    alt={img.title} 
                    onError={() => {
                      setBrokenImages(prev => ({ ...prev, [img.id]: true }));
                    }}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                )}
                
                {/* Overlay Info */}
                <div className="absolute inset-0 bg-gradient-to-t from-primary-950/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-6">
                  <div className="flex flex-col space-y-2 text-white">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white/20 backdrop-blur-md rounded-lg">
                        <Camera className="w-4 h-4" />
                      </div>
                      <span className="text-xs uppercase tracking-widest font-black">
                        {dt(img.title)}
                      </span>
                    </div>
                    {img.isHero && (
                      <div className="flex items-center space-x-2 text-amber-300">
                        <Star className="w-3 h-3 fill-amber-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {t('gallery.hero_badge')}
                        </span>
                      </div>
                    )}
                    {img.isSection && (
                      <div className="flex items-center space-x-2 text-sky-300">
                        <Layout className="w-3 h-3 fill-sky-300" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          {t('gallery.section_badge')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Admin Management Controls */}
                {user && (
                  <div className="absolute top-4 left-4 flex flex-col space-y-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAsHero(img.id);
                      }}
                      className={`p-3 rounded-xl backdrop-blur-md shadow-xl transition-all ${img.isHero ? 'bg-amber-500 text-white' : 'bg-white/90 text-amber-500 hover:bg-amber-100'}`}
                      title={img.isHero ? "Verwijder van Hero" : "Instellen als Hero (Hoofdfoto)"}
                    >
                      <Star className={`w-4 h-4 ${img.isHero ? 'fill-white' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAsSection(img.id);
                      }}
                      className={`p-3 rounded-xl backdrop-blur-md shadow-xl transition-all ${img.isSection ? 'bg-sky-500 text-white' : 'bg-white/90 text-sky-500 hover:bg-sky-100'}`}
                      title={img.isSection ? "Verwijder van Section" : "Instellen als Section Foto"}
                    >
                      <Layout className={`w-4 h-4 ${img.isSection ? 'fill-white' : ''}`} />
                    </button>
                  </div>
                )}

                {/* Move Controls - Only for logged-in admins */}
                {user && (
                  <div className="absolute bottom-4 right-4 flex space-x-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveImage(img.id, 'up');
                      }}
                      disabled={imageList.indexOf(img) === 0}
                      className="p-2 bg-white/90 backdrop-blur-md rounded-lg text-primary-600 hover:bg-primary-600 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white/90 disabled:hover:text-primary-600 shadow-lg"
                      title="Verplaats naar voren"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        moveImage(img.id, 'down');
                      }}
                      disabled={imageList.indexOf(img) === imageList.length - 1}
                      className="p-2 bg-white/90 backdrop-blur-md rounded-lg text-primary-600 hover:bg-primary-600 hover:text-white transition-all disabled:opacity-30 disabled:hover:bg-white/90 disabled:hover:text-primary-600 shadow-lg"
                      title="Verplaats naar achteren"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Delete Button - Only if user is logged in as admin */}
                {user && (
                  <div className="absolute top-4 right-4 z-10">
                    {deletingId === img.id ? (
                      <div className="flex items-center space-x-2 bg-white/95 backdrop-blur-md p-1.5 rounded-xl shadow-xl border border-red-100">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            removeImage(img.id);
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
                          setDeletingId(img.id);
                        }}
                        className="bg-white/90 backdrop-blur-md p-3 rounded-xl text-red-500 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-xl scale-90 group-hover:scale-100 cursor-pointer"
                        aria-label="Verwijder foto"
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
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="col-span-full py-32 flex flex-col items-center justify-center text-slate-400 space-y-4 bg-white border-2 border-dashed border-slate-200 rounded-[40px]"
          >
            <Camera className="w-12 h-12 opacity-20" />
            <p className="text-sm italic font-light text-center px-6">Er zijn nog geen foto's in de galerij. Login om foto's toe te voegen.</p>
          </motion.div>
        )}

        {loading && (
          <div className="col-span-full py-32 flex flex-col items-center justify-center text-slate-400">
            <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-sm uppercase tracking-widest font-bold">Laden...</p>
          </div>
        )}
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
              className="relative max-w-5xl w-full aspect-[4/3] bg-white rounded-[2rem] overflow-hidden shadow-2xl"
            >
              <img 
                src={selectedImage.url} 
                alt={selectedImage.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950/80 to-transparent text-white">
                <h3 className="text-2xl font-bold italic serif">{dt(selectedImage.title)}</h3>
                <p className="text-sm text-slate-300">
                  {t('gallery.interior_impression')}
                </p>
              </div>
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-6 right-6 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white p-3 rounded-full transition-colors"
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

