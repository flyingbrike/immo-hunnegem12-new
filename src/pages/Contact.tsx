import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Phone, Mail, MapPin, Edit3, Save, X, LogOut, Trash2, Inbox, AlertCircle, CheckCircle } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebase-utils';
import { useLanguage } from '../context/LanguageContext';

const defaultPageData = {
  subtitle: "Neem contact op",
  titleLine1: "Interesse?",
  titleLine2: "Plan een Afspraak",
  description: "Heeft u interesse in een bezichtiging of wilt u meer informatie ontvangen? Neem gerust contact met ons op. We helpen u graag verder.",
  phoneLabel: "Telefoon en whatsapp",
  phoneValue: "0032 (0) 475 701549",
  phoneUrl: "https://wa.me/32475701549",
  emailLabel: "Email",
  emailValue: "eriksuniverse@gmail.com"
};

export default function Contact() {
  const { t, dt, language } = useLanguage();
  const [status, setStatus] = useState<null | 'sending' | 'success' | 'error'>(null);
  const [user, setUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  const cachedContactData = (() => {
    try {
      const cached = localStorage.getItem('cached_contact_data');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.error("Failed to parse cached contact data", e);
    }
    return null;
  })();

  // Editable pages fields
  const [pageData, setPageData] = useState(() => ({ ...defaultPageData, ...cachedContactData }));
  const [draftPageData, setDraftPageData] = useState(() => ({ ...defaultPageData, ...cachedContactData }));
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

    const unsubData = onSnapshot(doc(db, 'contact_data', 'page_content'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const updated = {
          ...defaultPageData,
          ...data
        };
        try {
          localStorage.setItem('cached_contact_data', JSON.stringify(updated));
        } catch (e) {}
        setPageData(updated);
        setDraftPageData(updated);
      }
    }, (err) => {
      console.warn("Failed to subscribe to contact_data page_content:", err);
    });

    return () => {
      unsubscribeAuth();
      unsubData();
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }

    const q = query(collection(db, 'contact_messages'));
    const unsubMessages = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort: newest first
      const sorted = (msgs || []).sort((a: any, b: any) => {
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
      setMessages(sorted);
    }, (err) => {
      console.warn("Error subscribing to contact messages:", err);
    });

    return () => {
      unsubMessages();
    };
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    
    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const data = {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        subject: formData.get('subject') as string,
        message: formData.get('message') as string,
      };

      // Real integration: write to Firestore contact_messages collection
      try {
        const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        await setDoc(doc(db, 'contact_messages', msgId), {
          id: msgId,
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          createdAt: new Date().toISOString()
        });
      } catch (fsErr) {
        console.error('Failed to save contact message to Firestore:', fsErr);
      }

      // Send actual SMTP email via full-stack /api/contact handler
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setStatus('success');
      } else {
        setStatus('error');
      }
    } catch (error) {
      console.error('Contact error:', error);
      setStatus('error');
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
                      await setDoc(doc(db, 'contact_data', 'page_content'), {
                        ...draftPageData,
                        updatedAt: new Date().toISOString(),
                        updatedBy: user.uid
                      }, { merge: true });
                      setPageData({ ...draftPageData });
                      setEditMode(false);
                    } catch (err) {
                      console.error("Save contact data error: ", err);
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

      <div className="py-12 px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-24">
          <div>
            {editMode ? (
              <div className="space-y-4 max-w-xl mb-8 bg-white p-6 rounded-2xl border border-slate-200 text-left">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Subtitel</label>
                  <input
                    type="text"
                    value={draftPageData.subtitle || ''}
                    onChange={(e) => setDraftPageData({ ...draftPageData, subtitle: e.target.value })}
                    className="w-full text-xs font-bold text-primary-600 border border-slate-200 rounded-lg p-2"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Titel Regel 1</label>
                  <input
                    type="text"
                    value={draftPageData.titleLine1 || ''}
                    onChange={(e) => setDraftPageData({ ...draftPageData, titleLine1: e.target.value })}
                    className="w-full text-md font-medium border border-slate-200 rounded-lg p-2 font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Titel Regel 2</label>
                  <input
                    type="text"
                    value={draftPageData.titleLine2 || ''}
                    onChange={(e) => setDraftPageData({ ...draftPageData, titleLine2: e.target.value })}
                    className="w-full text-md font-medium border border-slate-200 rounded-lg p-2 font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Beschrijving</label>
                  <textarea
                    value={draftPageData.description || ''}
                    onChange={(e) => setDraftPageData({ ...draftPageData, description: e.target.value })}
                    className="w-full text-xs font-light text-slate-600 border border-slate-200 rounded-lg p-2"
                    rows={4}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Telefoon Knop Tekst</label>
                  <input
                    type="text"
                    value={draftPageData.phoneLabel || ''}
                    onChange={(e) => setDraftPageData({ ...draftPageData, phoneLabel: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Telefoonnummer</label>
                  <input
                    type="text"
                    value={draftPageData.phoneValue || ''}
                    onChange={(e) => setDraftPageData({ ...draftPageData, phoneValue: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">WhatsApp link of telefoon URL</label>
                  <input
                    type="text"
                    value={draftPageData.phoneUrl || ''}
                    onChange={(e) => setDraftPageData({ ...draftPageData, phoneUrl: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">E-mail Label</label>
                  <input
                    type="text"
                    value={draftPageData.emailLabel || ''}
                    onChange={(e) => setDraftPageData({ ...draftPageData, emailLabel: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 font-sans"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">E-mailadres</label>
                  <input
                    type="text"
                    value={draftPageData.emailValue || ''}
                    onChange={(e) => setDraftPageData({ ...draftPageData, emailValue: e.target.value })}
                    className="w-full text-xs border border-slate-200 rounded-lg p-2 font-sans"
                  />
                </div>
              </div>
            ) : (
              <>
                <span className="text-primary-600 font-bold uppercase text-xs tracking-widest mb-2 block">{dt(pageData.subtitle, 'contact.subtitle')}</span>
                <h1 className="serif text-5xl italic mb-8 text-slate-900 leading-tight">
                  {dt(pageData.titleLine1, 'contact.title1')}<br />{dt(pageData.titleLine2, 'contact.title2')}
                </h1>
                <p className="text-lg font-light text-slate-600 leading-relaxed mb-8">
                  {dt(pageData.description, 'contact.desc')}
                </p>
              </>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 mb-6">
                  <Phone className="w-6 h-6" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{dt(pageData.phoneLabel)}</h4>
                <a href={pageData.phoneUrl} target="_blank" rel="noreferrer" className="text-lg font-bold text-slate-800 tracking-tight hover:text-primary-600 transition-colors block">
                  {dt(pageData.phoneValue)}
                </a>
              </div>
              <div className="p-8 bg-white rounded-2xl shadow-sm border border-slate-200">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center text-primary-600 mb-6">
                  <Mail className="w-6 h-6" />
                </div>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{dt(pageData.emailLabel)}</h4>
                <a href={`mailto:${pageData.emailValue}`} className="text-sm font-bold text-slate-800 truncate block hover:text-primary-600 transition-colors">
                  {dt(pageData.emailValue)}
                </a>
              </div>
            </div>
          </div>

          <div className="bg-primary-900 text-white p-10 rounded-[40px] shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/10 transition-colors bg-gradient-to-br from-white/10 to-transparent"></div>
            
            <div className="relative z-10 h-full flex flex-col">
              <h3 className="text-xs font-black uppercase tracking-widest text-primary-300 mb-8 font-sans">
                {t('contact.form_send')}
              </h3>
              
              {status === 'success' ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }} 
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-grow flex flex-col items-center justify-center text-center py-12"
                >
                  <div className="w-20 h-20 bg-white/10 text-emerald-400 rounded-full flex items-center justify-center mb-6 border-2 border-emerald-400/20">
                    <Send className="w-8 h-8" />
                  </div>
                  <h3 className="serif text-3xl mb-4 italic">
                    {t('contact.sent_title')}
                  </h3>
                  <p className="text-primary-100/60 font-light max-w-xs font-sans text-xs">
                    {t('contact.sent_desc')}
                  </p>
                  <button 
                    onClick={() => setStatus(null)}
                    className="mt-12 text-xs font-bold uppercase tracking-widest bg-white/10 px-8 py-3 rounded-full hover:bg-white/20 transition-colors"
                  >
                    {t('contact.new_message')}
                  </button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6 flex-grow">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary-300/60">
                        {t('contact.form_name')}
                      </label>
                      <input required name="name" type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary-400 focus:bg-white/10 transition-all font-light" placeholder={t('contact.form_name_placeholder')} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-primary-300/60">{t('contact.form_email')}</label>
                      <input required name="email" type="email" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary-400 focus:bg-white/10 transition-all font-light" placeholder={t('contact.form_email_placeholder')} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-300/60">
                      {t('contact.form_subject')}
                    </label>
                    <select name="subject" className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm focus:outline-none focus:border-primary-400 focus:bg-white/10 transition-all font-light appearance-none">
                      <option className="text-slate-900" value="Ik wil een bezichtiging plannen">
                        {t('contact.form_subject_option1')}
                      </option>
                      <option className="text-slate-900" value="Ik wil technische documentatie">
                        {t('contact.form_subject_option2')}
                      </option>
                      <option className="text-slate-900" value="Algemene vraag">
                        {t('contact.form_subject_option3')}
                      </option>
                    </select>
                  </div>
                  <div className="space-y-2 flex-grow flex flex-col">
                    <label className="text-[10px] font-black uppercase tracking-widest text-primary-300/60">
                      {t('contact.form_message')}
                    </label>
                    <textarea required name="message" rows={4} className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-sm placeholder:text-white/20 focus:outline-none focus:border-primary-400 focus:bg-white/10 transition-all font-light resize-none flex-grow" placeholder={t('contact.form_message_placeholder')}></textarea>
                  </div>
                  <button 
                    type="submit"
                    disabled={status === 'sending'}
                    className="w-full bg-white text-primary-900 font-black py-5 rounded-2xl text-[10px] uppercase tracking-widest hover:bg-primary-50 transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
                  >
                    {status === 'sending' 
                      ? t('contact.sending') 
                      : t('contact.form_send')}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Received Messages Section for Admin */}
      {user && (
        <div className="max-w-7xl mx-auto px-6 pb-20">
          <div className="bg-white rounded-[40px] p-8 md:p-12 border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-8 mb-8">
              <div>
                <span className="text-primary-600 font-bold uppercase text-[10px] tracking-widest mb-2 block">
                  CRM-beheer
                </span>
                <h3 className="serif text-3xl italic text-slate-900 flex items-center gap-3">
                  <Inbox className="w-6 h-6 text-primary-600" />
                  {dt('Ontvangen Berichten')}
                </h3>
              </div>
              <span className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full select-none">
                {messages.length} {messages.length === 1 ? dt('Bericht') : dt('Berichten')}
              </span>
            </div>

            {/* Quick Helper for SMTP server configuration */}
            <div className="bg-amber-50 rounded-2xl border border-amber-200/60 p-5 mb-8 flex items-start gap-3.5 text-left text-amber-900 text-xs leading-relaxed">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-1">
                  E-mail aflevering instellen (SMTP)
                </span>
                <span>
                  Momenteel worden alle contactberichten in real-time opgeslagen in uw duurzame Firestore-database en hieronder weergegeven. Om berichten eventueel ook direct in uw e-mail inbox (<strong className="font-semibold">{pageData.emailValue}</strong>) te ontvangen, configureert u de SMTP settings (<strong className="font-mono">SMTP_HOST</strong>, <strong className="font-mono">SMTP_USER</strong>, <strong className="font-mono">SMTP_PASS</strong>) in de beheer-omgeving van uw AI Studio Build settings.
                </span>
              </div>
            </div>

            {messages.length === 0 ? (
              <div className="text-center py-16 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-medium text-sm">Geen onbeantwoorde berichten gevonden.</p>
                <p className="text-[11px] text-slate-400 mt-1">Ingezonden contactformulieren verschijnen direct in dit beheerpaneel.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <AnimatePresence mode="popLayout">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-6 bg-slate-50 rounded-2xl border border-slate-200 relative group text-left hover:border-slate-300 hover:shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Header details */}
                        <div className="flex justify-between items-start gap-4 mb-3">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm leading-tight">{msg.name}</h4>
                            <a href={`mailto:${msg.email}`} className="text-xs text-primary-600 hover:underline leading-relaxed block mt-0.5">
                              {msg.email}
                            </a>
                          </div>
                          <button
                            onClick={async () => {
                              try {
                                if (confirm(dt('Weet u zeker dat u dit bericht wilt verwijderen?'))) {
                                  await deleteDoc(doc(db, 'contact_messages', msg.id));
                                }
                              } catch (err) {
                                console.error('Delete message failed:', err);
                              }
                            }}
                            className="text-slate-400 hover:text-red-500 hover:bg-slate-200/50 p-2 rounded-xl transition-all inline-flex items-center justify-center cursor-pointer"
                            title="Verwijder bericht"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Subject */}
                        <span className="inline-block bg-primary-100/60 text-primary-700 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md mb-4">
                          {msg.subject || 'Algemene Inlichtingen'}
                        </span>

                        {/* Message body */}
                        <p className="text-xs text-slate-600 font-light leading-relaxed whitespace-pre-wrap bg-white p-4 rounded-xl border border-slate-100/80 mb-4 h-32 overflow-y-auto">
                          {msg.message}
                        </p>
                      </div>

                      {/* Footer tracking */}
                      <div className="flex items-center justify-between mt-auto border-t border-slate-100 pt-3">
                        <span className="text-[9px] text-slate-400 font-mono">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleString('nl-BE') : ''}
                        </span>
                        <a
                          href={`mailto:${msg.email}?subject=Re: ${msg.subject || 'Hunnegemresidentie'}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 text-white text-[10px] uppercase font-black tracking-wider rounded-xl hover:bg-slate-800 transition-all shadow-sm"
                        >
                          <Send className="w-3 h-3" />
                          Beantwoorden
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
