
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Bell, Wallet, Sparkles, ArrowRight, WifiOff, LayoutDashboard, Search, History, List, Hourglass, Home, Filter, Volume2 } from 'lucide-react';
import { Subscription, DEFAULT_CATEGORIES } from './types';
import SubscriptionForm from './components/SubscriptionForm';
import SubscriptionCard from './components/SubscriptionCard';
import DashboardStats from './components/DashboardStats';
import SplashScreen from './components/SplashScreen';
import DeleteConfirmationModal from './components/DeleteConfirmationModal';
import CategoryFilter from './components/CategoryFilter';
import { GoogleGenAI } from "@google/genai";

const STORAGE_KEY = 'subtracker_data_v2';
const CAT_STORAGE_KEY = 'subtracker_categories_v2';

const SOUNDS: Record<string, string> = {
  'Digital': 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
  'Bell': 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  'Playful': 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
  'Gentle': 'https://assets.mixkit.co/active_storage/sfx/2190/2190-preview.mp3',
};

const App: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [mainTab, setMainTab] = useState<'home' | 'active' | 'lifecycle'>('home');
  const [lifecycleSubTab, setLifecycleSubTab] = useState<'ending' | 'history'>('ending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | undefined>(undefined);
  const [subToDelete, setSubToDelete] = useState<Subscription | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [geminiAdvice, setGeminiAdvice] = useState<string | null>(null);
  const [isLoadingAdvice, setIsLoadingAdvice] = useState(false);

  const allCategories = useMemo(() => {
    const fromSubs = subscriptions.map(s => s.category);
    const unique = Array.from(new Set([...DEFAULT_CATEGORIES, ...customCategories, ...fromSubs]));
    return unique.sort();
  }, [customCategories, subscriptions]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    try {
      const savedSubs = localStorage.getItem(STORAGE_KEY);
      if (savedSubs) setSubscriptions(JSON.parse(savedSubs));
      
      const savedCats = localStorage.getItem(CAT_STORAGE_KEY);
      if (savedCats) setCustomCategories(JSON.parse(savedCats));
    } catch (e) { console.error(e); }
    
    if ('Notification' in window) setPermission(Notification.permission);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(subscriptions));
    checkUpcomingRenewals();
  }, [subscriptions]);

  useEffect(() => {
    localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(customCategories));
  }, [customCategories]);

  const vibrate = (pattern: number | number[] = 10) => {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  };

  const requestPermission = async () => {
    vibrate(25);
    if ('Notification' in window) {
      const res = await Notification.requestPermission();
      setPermission(res);
    }
  };

  const checkUpcomingRenewals = useCallback(() => {
    const today = new Date();
    subscriptions.forEach(sub => {
      if (sub.isArchived) return;
      const renewalDate = new Date(sub.renewalDate);
      const reminderDate = new Date(renewalDate);
      reminderDate.setDate(renewalDate.getDate() - sub.reminderDays);

      if (today.toDateString() === reminderDate.toDateString()) {
        if (permission === 'granted') {
          new Notification('Renewal Reminder', {
            body: `Your ${sub.name} subscription renews in ${sub.reminderDays} day(s)!`,
            icon: sub.logoUrl || 'https://img.icons8.com/fluency/128/null/recurring-appointment.png'
          });
        }

        if (sub.soundTone && SOUNDS[sub.soundTone]) {
          const audio = new Audio(SOUNDS[sub.soundTone]);
          audio.play().catch(e => console.log('Audio play failed:', e));
        }
      }
    });
  }, [subscriptions, permission]);

  const handleFixLogo = async (subId: string) => {
    const sub = subscriptions.find(s => s.id === subId);
    if (!sub || !isOnline) return;

    try {
      // Initialize Gemini SDK with the API key from environment variables
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Find the official, high-resolution transparent PNG or SVG logo URL for the subscription service "${sub.name}". Return ONLY the direct URL string starting with https.`,
        config: { tools: [{ googleSearch: {} }] }
      });

      // Directly access the .text property as per GenerateContentResponse guidelines
      const url = response.text?.trim();
      
      // Compliance: Always check and handle grounding metadata when using Google Search
      if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        console.debug('Logo search sources:', response.candidates[0].groundingMetadata.groundingChunks);
      }

      if (url && url.startsWith('http')) {
        setSubscriptions(prev => prev.map(s => s.id === subId ? { ...s, logoUrl: url } : s));
        vibrate(20);
      }
    } catch (e) {
      console.error('Failed to fix logo:', e);
    }
  };

  const handleFormSubmit = (updatedSub: Subscription) => {
    vibrate([15, 30, 15]);
    if (editingSub) {
      setSubscriptions(prev => prev.map(s => s.id === updatedSub.id ? updatedSub : s));
    } else {
      setSubscriptions(prev => [updatedSub, ...prev]);
      setMainTab('active');
    }
    setIsFormOpen(false);
    setEditingSub(undefined);
  };

  const handleEdit = (sub: Subscription) => {
    setEditingSub(sub);
    setIsFormOpen(true);
  };

  const handleAddCategory = (newCat: string) => {
    if (!newCat.trim()) return;
    if (!customCategories.includes(newCat) && !DEFAULT_CATEGORIES.includes(newCat)) {
      setCustomCategories(prev => [...prev, newCat]);
    }
  };

  const handleDeleteCategory = (catToDelete: string) => {
    vibrate(15);
    setCustomCategories(prev => prev.filter(c => c !== catToDelete));
    if (selectedCategory === catToDelete) setSelectedCategory('All');
  };

  const confirmDelete = (sub: Subscription) => {
    vibrate(20);
    setSubToDelete(sub);
  };

  const handleDelete = () => {
    if (subToDelete) {
      vibrate([40, 30, 40]);
      setSubscriptions(prev => prev.filter(s => s.id !== subToDelete.id));
      setSubToDelete(null);
    }
  };

  const activeSubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const isExpired = new Date(sub.endDate).getTime() < new Date().getTime();
      return !sub.isArchived && !isExpired;
    });
  }, [subscriptions]);

  const historySubscriptions = useMemo(() => {
    return subscriptions.filter(sub => {
      const isExpired = new Date(sub.endDate).getTime() < new Date().getTime();
      return sub.isArchived || isExpired;
    });
  }, [subscriptions]);

  const endingSoonSubscriptions = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    nextWeek.setHours(23, 59, 59, 999);

    return activeSubscriptions.filter(sub => {
      const end = new Date(sub.endDate);
      return end >= today && end <= nextWeek;
    });
  }, [activeSubscriptions]);

  const filteredList = useMemo(() => {
    let base = [];
    if (mainTab === 'active') base = activeSubscriptions;
    else if (mainTab === 'lifecycle') {
      base = lifecycleSubTab === 'ending' ? endingSoonSubscriptions : historySubscriptions;
    }
    
    return base.filter(sub => {
      const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || sub.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [mainTab, lifecycleSubTab, activeSubscriptions, endingSoonSubscriptions, historySubscriptions, searchQuery, selectedCategory]);

  const getSmartAdvice = async () => {
    if (!isOnline || subscriptions.length === 0) return;
    vibrate(12);
    setIsLoadingAdvice(true);
    try {
      // Re-initialize for fresh request handling
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const subList = activeSubscriptions.map(s => `${s.name}: ₹${s.price}`).join(', ');
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `My subscriptions: ${subList}. Give a short, 1-sentence witty money-saving advice for an Indian user. Keep it brief.`,
        config: { 
          thinkingConfig: { thinkingBudget: 0 } // Disabling thinking for lower latency on simple text tasks
        }
      });
      // Correct property access for extracted text content
      setGeminiAdvice(response.text || "Budget wisely and save more!");
    } catch (err) {
      console.error('Gemini Advice error:', err);
    } finally {
      setIsLoadingAdvice(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col no-select pb-32">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      <header className="sticky top-0 z-30 glass-header px-6 py-5 flex justify-between items-center safe-pt">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-premium">
            {mainTab === 'home' && <Home size={20} strokeWidth={2.5} />}
            {mainTab === 'active' && <List size={20} strokeWidth={2.5} />}
            {mainTab === 'lifecycle' && <Hourglass size={20} strokeWidth={2.5} />}
          </div>
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-900 leading-tight">
              {mainTab === 'home' ? 'SUBZS Overview' : mainTab === 'active' ? 'Active Plans' : 'Lifecycle'}
            </h1>
            {!isOnline && (
              <div className="flex items-center gap-1 text-[9px] font-black text-amber-600 uppercase tracking-widest mt-0.5">
                <WifiOff size={10} />
                <span>Offline</span>
              </div>
            )}
          </div>
        </div>
        
        {permission !== 'granted' && (subscriptions.length > 0) && (
          <button onClick={requestPermission} className="bg-white/50 text-indigo-600 px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-xs border border-white/80 active:scale-95 transition-transform shadow-sm">
            <Bell size={14} /> Alerts
          </button>
        )}
      </header>

      <main className="flex-1 w-full max-w-md mx-auto p-6 space-y-8 overflow-x-hidden">
        {subscriptions.length > 0 ? (
          <>
            {mainTab === 'home' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <DashboardStats subscriptions={activeSubscriptions} />
                
                {isOnline && activeSubscriptions.length > 0 && (
                  <div className="bg-indigo-600 p-6 rounded-[32px] shadow-premium relative overflow-hidden group active:scale-[0.98] transition-transform">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative z-10 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-indigo-100 font-bold text-[10px] uppercase tracking-widest">
                          <Sparkles size={14} className="text-amber-300 fill-amber-300" />
                          <span>AI Money Scout</span>
                        </div>
                        <button onClick={getSmartAdvice} disabled={isLoadingAdvice} className="bg-white/10 hover:bg-white/20 text-white text-[10px] uppercase tracking-widest font-extrabold px-4 py-2 rounded-xl transition-colors">
                          {isLoadingAdvice ? 'Thinking...' : 'Tip'}
                        </button>
                      </div>
                      <p className="text-white text-[15px] font-bold leading-relaxed italic">
                        "{geminiAdvice || "Tap refresh for smart Indian savings tips."}"
                      </p>
                    </div>
                  </div>
                )}

                <div className="bg-white p-6 rounded-[32px] shadow-sm border border-white space-y-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-1">Quick Insights</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl cursor-pointer active:scale-95 transition-transform" onClick={() => { setMainTab('lifecycle'); setLifecycleSubTab('ending'); }}>
                      <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Ending Soon</div>
                      <div className="text-xl font-black text-amber-600">{endingSoonSubscriptions.length}</div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl cursor-pointer active:scale-95 transition-transform" onClick={() => { setMainTab('lifecycle'); setLifecycleSubTab('history'); }}>
                      <div className="text-[9px] font-black text-slate-400 uppercase mb-1">Total History</div>
                      <div className="text-xl font-black text-slate-800">{historySubscriptions.length}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {mainTab === 'active' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                <div className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                      <Search size={18} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Search active plans..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className="w-full bg-white border border-slate-100 rounded-[24px] py-4 pl-12 pr-6 text-sm font-semibold text-slate-900 shadow-sm focus:shadow-md outline-none transition-all" 
                    />
                  </div>
                  
                  <CategoryFilter 
                    selected={selectedCategory} 
                    onSelect={(cat) => { vibrate(5); setSelectedCategory(cat); }} 
                    categories={['All', ...allCategories]}
                  />
                </div>

                <div className="space-y-4">
                  {filteredList.length > 0 ? (
                    filteredList.map(sub => (
                      <SubscriptionCard 
                        key={sub.id} 
                        subscription={sub} 
                        onDelete={() => confirmDelete(sub)} 
                        onEdit={() => handleEdit(sub)} 
                        onFixLogo={() => handleFixLogo(sub.id)}
                      />
                    ))
                  ) : (
                    <div className="py-20 text-center">
                      <div className="w-20 h-20 bg-slate-100 rounded-[28px] flex items-center justify-center mx-auto mb-4 text-slate-300">
                        {searchQuery || selectedCategory !== 'All' ? <Filter size={32} /> : <Search size={32} />}
                      </div>
                      <p className="text-slate-400 font-bold italic">
                        {searchQuery || selectedCategory !== 'All' ? 'No matches for your filters' : 'No active plans found'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {mainTab === 'lifecycle' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="flex p-1.5 bg-slate-200/50 rounded-[28px] shadow-inner">
                  <button 
                    onClick={() => { vibrate(10); setLifecycleSubTab('ending'); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${lifecycleSubTab === 'ending' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    <Hourglass size={14} /> Soon
                  </button>
                  <button 
                    onClick={() => { vibrate(10); setLifecycleSubTab('history'); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-widest transition-all ${lifecycleSubTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                  >
                    <History size={14} /> History
                  </button>
                </div>

                <div className="space-y-4">
                  {filteredList.length > 0 ? (
                    filteredList.map(sub => (
                      <SubscriptionCard 
                        key={sub.id} 
                        subscription={sub} 
                        onDelete={() => confirmDelete(sub)} 
                        onEdit={() => handleEdit(sub)}
                        onFixLogo={() => handleFixLogo(sub.id)}
                        isHistory={lifecycleSubTab === 'history'}
                      />
                    ))
                  ) : (
                    <div className="py-20 text-center">
                      <div className="w-20 h-20 bg-slate-100 rounded-[28px] flex items-center justify-center mx-auto mb-4 text-slate-300">
                        {lifecycleSubTab === 'ending' ? <Hourglass size={32} /> : <History size={32} />}
                      </div>
                      <p className="text-slate-400 font-bold italic">
                        {lifecycleSubTab === 'ending' ? 'No plans ending this week' : 'No history yet'}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 animate-in fade-in zoom-in duration-700">
            <div className="w-40 h-40 bg-white rounded-[48px] flex items-center justify-center mb-10 relative shadow-premium">
              <Wallet size={72} className="text-indigo-600" />
              <div className="absolute -top-3 -right-3 w-12 h-12 bg-amber-400 rounded-[20px] flex items-center justify-center text-white shadow-xl animate-bounce">
                <Plus size={28} strokeWidth={3} />
              </div>
            </div>
            <h2 className="text-4xl font-extrabold text-slate-900 tracking-tighter leading-tight">Master Your<br />Subscriptions</h2>
            <p className="text-slate-500 mt-5 font-medium leading-relaxed max-w-[280px]">Track every subscription from start to end. Never lose money again with SUBZS.</p>
            <button onClick={() => { vibrate(15); setIsFormOpen(true); }} className="mt-12 bg-indigo-600 text-white font-extrabold px-12 py-5 rounded-[28px] shadow-premium flex items-center gap-3 active:scale-95 transition-all text-lg">
              Start Tracking <ArrowRight size={22} />
            </button>
          </div>
        )}
      </main>

      {subscriptions.length > 0 && (
        <div className="fixed bottom-24 left-0 right-0 p-8 pointer-events-none flex justify-center z-40">
          <button onClick={() => { vibrate(15); setIsFormOpen(true); }} className="pointer-events-auto w-16 h-16 bg-indigo-600 rounded-[22px] flex items-center justify-center text-white shadow-premium hover:scale-105 active:scale-90 transition-all border-4 border-white">
            <Plus size={32} strokeWidth={3} />
          </button>
        </div>
      )}

      {subscriptions.length > 0 && (
        <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-slate-100 px-6 py-4 flex justify-around items-center safe-pb z-50">
          <button 
            onClick={() => { vibrate(8); setMainTab('home'); }}
            className={`flex flex-col items-center gap-1 transition-all ${mainTab === 'home' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
          >
            <Home size={22} strokeWidth={mainTab === 'home' ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">Home</span>
          </button>
          
          <button 
            onClick={() => { vibrate(8); setMainTab('active'); }}
            className={`flex flex-col items-center gap-1 transition-all ${mainTab === 'active' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
          >
            <List size={22} strokeWidth={mainTab === 'active' ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">Active</span>
          </button>

          <div className="w-12" />
          
          <button 
            onClick={() => { vibrate(8); setMainTab('lifecycle'); setLifecycleSubTab('ending'); }}
            className={`flex flex-col items-center gap-1 transition-all ${mainTab === 'lifecycle' && lifecycleSubTab === 'ending' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
          >
            <Hourglass size={22} strokeWidth={mainTab === 'lifecycle' && lifecycleSubTab === 'ending' ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">Ending</span>
          </button>

          <button 
            onClick={() => { vibrate(8); setMainTab('lifecycle'); setLifecycleSubTab('history'); }}
            className={`flex flex-col items-center gap-1 transition-all ${mainTab === 'lifecycle' && lifecycleSubTab === 'history' ? 'text-indigo-600 scale-110' : 'text-slate-400'}`}
          >
            <History size={22} strokeWidth={mainTab === 'lifecycle' && lifecycleSubTab === 'history' ? 2.5 : 2} />
            <span className="text-[9px] font-black uppercase tracking-widest">History</span>
          </button>
        </nav>
      )}

      {isFormOpen && (
        <SubscriptionForm 
          onSubmit={handleFormSubmit} 
          onClose={() => { setIsFormOpen(false); setEditingSub(undefined); }} 
          initialData={editingSub}
          categories={allCategories}
          customCategories={customCategories}
          onAddCategory={handleAddCategory}
          onDeleteCategory={handleDeleteCategory}
        />
      )}

      {subToDelete && (
        <DeleteConfirmationModal 
          subscription={subToDelete}
          onConfirm={handleDelete}
          onCancel={() => setSubToDelete(null)}
        />
      )}
    </div>
  );
};

export default App;
