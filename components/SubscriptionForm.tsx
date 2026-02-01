
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar as CalendarIcon, Zap, ChevronLeft, Search, Globe, Plus, RefreshCw, CheckCircle2, Repeat, Filter, Bell, Gamepad2, Tv, BookOpen, Heart } from 'lucide-react';
import { Subscription, BillingCycle } from '../types';
import { GoogleGenAI } from "@google/genai";

interface Plan {
  name: string;
  price: string;
  type: BillingCycle;
}

interface Service {
  name: string;
  color: string;
  category: string;
  logoUrl: string;
  plans: Plan[];
}

interface Props {
  onSubmit: (sub: Subscription) => void;
  onClose: () => void;
  initialData?: Subscription;
  categories: string[];
  customCategories: string[];
  onAddCategory?: (category: string) => void;
  onDeleteCategory?: (category: string) => void;
}

const COLORS = ['#4F46E5', '#EF4444', '#10B981', '#F59E0B', '#6366F1', '#EC4899', '#8B5CF6', '#1DB954', '#FF0000'];
const CYCLES: { id: BillingCycle; label: string }[] = [
  { id: 'Weekly', label: 'Wk' },
  { id: 'Monthly', label: 'Mo' },
  { id: 'Quarterly', label: 'Qt' },
  { id: 'Yearly', label: 'Yr' },
  { id: 'One-time', label: '1x' }
];

const REMINDER_OPTIONS = [1, 2, 3, 5, 7];

const POPULAR_SERVICES_DATA: Service[] = [
  // Entertainment
  { name: 'Netflix', color: '#E50914', category: 'Entertainment', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Netflix-new-icon.png', plans: [{ name: 'Basic', price: '199', type: 'Monthly' }, { name: 'Standard', price: '499', type: 'Monthly' }, { name: 'Premium', price: '649', type: 'Monthly' }] },
  { name: 'Spotify', color: '#1DB954', category: 'Entertainment', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Spotify_logo_without_text.svg', plans: [{ name: 'Individual', price: '119', type: 'Monthly' }, { name: 'Family', price: '179', type: 'Monthly' }] },
  { name: 'YouTube', color: '#FF0000', category: 'Entertainment', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/09/YouTube_full-color_icon_%282017%29.svg', plans: [{ name: 'Premium', price: '139', type: 'Monthly' }] },
  { name: 'Disney+', color: '#006E99', category: 'Entertainment', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/Disney%2B_Hotstar_logo.svg', plans: [{ name: 'Super', price: '899', type: 'Yearly' }, { name: 'Premium', price: '1499', type: 'Yearly' }] },
  
  // Gaming
  { name: 'Xbox Pass', color: '#107C10', category: 'Gaming', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/f9/Xbox_one_logo.svg', plans: [{ name: 'Ultimate', price: '549', type: 'Monthly' }] },
  { name: 'PS Plus', color: '#003087', category: 'Gaming', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/0/00/PlayStation_Plus_logo_2022.svg', plans: [{ name: 'Essential', price: '499', type: 'Monthly' }, { name: 'Extra', price: '749', type: 'Monthly' }] },
  { name: 'Nitro', color: '#5865F2', category: 'Gaming', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/73/Discord_Color_Logo.svg', plans: [{ name: 'Nitro', price: '299', type: 'Monthly' }] },
  
  // Education
  { name: 'Duolingo', color: '#58CC02', category: 'Education', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Duolingo_logo_%282019%29.svg', plans: [{ name: 'Super', price: '129', type: 'Monthly' }] },
  { name: 'Skillshare', color: '#00ff84', category: 'Education', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c1/Skillshare_logo_2020.svg', plans: [{ name: 'Annual', price: '4000', type: 'Yearly' }] },
  { name: 'Coursera', color: '#0056D2', category: 'Education', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/97/Coursera-Logo_600x600.svg', plans: [{ name: 'Plus', price: '4999', type: 'Yearly' }] },

  // Lifestyle
  { name: 'Swiggy', color: '#FC8019', category: 'Lifestyle', logoUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Swiggy_logo.svg/1200px-Swiggy_logo.svg.png', plans: [{ name: 'One', price: '299', type: 'Quarterly' }] },
  { name: 'Zomato', color: '#CB202D', category: 'Lifestyle', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Zomato_logo.png/600px-Zomato_logo.png', plans: [{ name: 'Gold', price: '299', type: 'Quarterly' }] },
  { name: 'Jio', color: '#0a288f', category: 'Lifestyle', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Reliance_Jio_Logo.svg', plans: [{ name: 'Monthly', price: '299', type: 'Monthly' }] },
  { name: 'Airtel', color: '#e40000', category: 'Lifestyle', logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/3/3a/Airtel_logo-01.png', plans: [{ name: 'Monthly', price: '299', type: 'Monthly' }] }
];

// --- Custom Calendar Component ---
interface CalendarPickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
  onClose: () => void;
}

const CustomCalendarPicker: React.FC<CalendarPickerProps> = ({ value, onChange, label, onClose }) => {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  });
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date(value);
    return isNaN(d.getTime()) ? new Date() : d;
  });

  const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const handleSelectDate = (day: number) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    setSelectedDate(newDate);
    onChange(newDate.toISOString().split('T')[0]);
    if ('vibrate' in navigator) navigator.vibrate(10);
    setTimeout(onClose, 150);
  };

  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();

  return (
    <div className="bg-white rounded-[40px] p-6 space-y-6 shadow-premium border border-slate-50 animate-in zoom-in-95 duration-200 w-full max-w-[340px]">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">{label}</h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1))} className="p-2 bg-slate-50 rounded-xl group active:scale-95 transition-transform"><ChevronLeft size={16} className="text-slate-400 group-hover:text-indigo-600" /></button>
          <span className="text-sm font-black text-slate-800 w-24 text-center">{monthName}</span>
          <button type="button" onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1))} className="p-2 bg-slate-50 rounded-xl group active:scale-95 transition-transform"><ChevronLeft size={16} className="rotate-180 text-slate-400 group-hover:text-indigo-600" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[9px] font-black text-slate-300 pb-2">{d}</div>)}
        {Array.from({ length: firstDayOfMonth(currentDate.getMonth(), year) }).map((_, i) => <div key={`p-${i}`} />)}
        {Array.from({ length: daysInMonth(currentDate.getMonth(), year) }).map((_, i) => {
          const d = i + 1;
          const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
          return (
            <button key={d} type="button" onClick={() => handleSelectDate(d)} className={`h-9 w-full rounded-xl flex items-center justify-center text-xs font-bold transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg scale-110 z-10' : 'text-slate-700 hover:bg-slate-50'}`}>
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const SubscriptionForm: React.FC<Props> = ({ onSubmit, onClose, initialData, categories, customCategories }) => {
  const [name, setName] = useState(initialData?.name || '');
  const [price, setPrice] = useState(initialData?.price.toString() || '');
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(initialData?.billingCycle || 'Monthly');
  
  const [startDate, setStartDate] = useState(() => {
    return initialData?.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
  });

  const [endDate, setEndDate] = useState(() => {
    return initialData?.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '';
  });

  const [reminder, setReminder] = useState(initialData?.reminderDays || 1);
  const [category, setCategory] = useState<string>(initialData?.category || 'Entertainment');
  const [color, setColor] = useState(initialData?.color || COLORS[0]);
  const [logoUrl, setLogoUrl] = useState<string | undefined>(initialData?.logoUrl);
  
  const [isSearchingLogo, setIsSearchingLogo] = useState(false);
  const [activePicker, setActivePicker] = useState<'start' | 'end' | null>(null);

  const [popularSearch, setPopularSearch] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isManualEntry, setIsManualEntry] = useState(!!initialData);

  useEffect(() => {
    if (!startDate || !billingCycle) return;
    const start = new Date(startDate);
    if (isNaN(start.getTime())) return;

    const next = new Date(start);
    switch(billingCycle) {
      case 'Weekly': next.setDate(next.getDate() + 7); break;
      case 'Monthly': next.setMonth(next.getMonth() + 1); break;
      case 'Quarterly': next.setMonth(next.getMonth() + 3); break;
      case 'Yearly': next.setFullYear(next.getFullYear() + 1); break;
      case 'One-time': break;
    }
    
    if (billingCycle !== 'One-time') {
      setEndDate(next.toISOString().split('T')[0]);
    } else {
      setEndDate('');
    }
  }, [startDate, billingCycle]);

  const filteredPopularServices = useMemo(() => {
    const search = popularSearch.toLowerCase().trim();
    const services = search 
      ? POPULAR_SERVICES_DATA.filter(s => s.name.toLowerCase().includes(search) || s.category.toLowerCase().includes(search))
      : POPULAR_SERVICES_DATA;

    const grouped: Record<string, Service[]> = {};
    services.forEach(s => {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    });
    return grouped;
  }, [popularSearch]);

  const vibrate = (ms: number = 10) => { if ('vibrate' in navigator) navigator.vibrate(ms); };

  const handleSearchLogo = async () => {
    if (!name.trim()) return;
    vibrate(15);
    setIsSearchingLogo(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Provide the official high-resolution transparent PNG or SVG logo URL for the service: ${name}. Only return the direct URL string.`,
      });
      const url = response.text?.trim();
      if (url && url.startsWith('http')) setLogoUrl(url);
    } catch (e) { console.error(e); } finally { setIsSearchingLogo(false); }
  };

  const handleSelectService = (service: Service) => {
    vibrate(12);
    setSelectedService(service);
  };

  const handleSelectPlan = (plan: Plan) => {
    if (!selectedService) return;
    vibrate(20);
    setName(`${selectedService.name} ${plan.name}`);
    setPrice(plan.price);
    setBillingCycle(plan.type);
    setCategory(selectedService.category);
    setColor(selectedService.color);
    setLogoUrl(selectedService.logoUrl);
    setSelectedService(null);
    setPopularSearch('');
    setIsManualEntry(true); // Switch to form view
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !price) return;
    vibrate(25);
    onSubmit({
      id: initialData?.id || Math.random().toString(36).substr(2, 9),
      name,
      price: parseFloat(price),
      currency: 'INR',
      renewalDate: endDate || startDate,
      startDate: new Date(startDate).toISOString(),
      endDate: new Date(endDate || startDate).toISOString(),
      billingCycle,
      reminderDays: reminder,
      category,
      color,
      logoUrl,
      isArchived: initialData?.isArchived,
    });
  };

  const categoryIcons: Record<string, any> = {
    'Entertainment': <Tv size={14} />,
    'Gaming': <Gamepad2 size={14} />,
    'Education': <BookOpen size={14} />,
    'Lifestyle': <Heart size={14} />
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 bg-slate-900/60 backdrop-blur-md overflow-hidden">
      <div className="w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[96vh] flex flex-col">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
        <div className="flex items-center justify-between px-8 py-4 border-b border-slate-50">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            {initialData ? 'Edit Tracker' : selectedService ? 'Pick a Plan' : isManualEntry ? 'Finish Setup' : 'Add New Plan'}
          </h2>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-full text-slate-500 active:scale-90 transition-transform"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto pb-12 scrollbar-hide relative flex-1">
          {activePicker && (
            <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-sm flex items-center justify-center p-6">
              <CustomCalendarPicker 
                label={activePicker === 'start' ? 'First Payment' : 'Renewal Due'}
                value={activePicker === 'start' ? startDate : endDate}
                onChange={(d) => activePicker === 'start' ? setStartDate(d) : setEndDate(d)}
                onClose={() => setActivePicker(null)}
              />
            </div>
          )}

          {/* Discovery View (App Selection) */}
          {!isManualEntry && !selectedService && (
            <div className="space-y-6 animate-in fade-in">
              <div className="relative group">
                <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                  <Search size={18} />
                </div>
                <input 
                  type="text" 
                  placeholder="Search popular apps..." 
                  value={popularSearch} 
                  onChange={(e) => setPopularSearch(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-800 outline-none focus:border-indigo-500 focus:bg-white transition-all shadow-sm" 
                />
              </div>

              <div className="space-y-8">
                {Object.entries(filteredPopularServices).length > 0 ? (
                  Object.entries(filteredPopularServices).map(([cat, services]) => (
                    <div key={cat} className="space-y-4">
                      <div className="flex items-center gap-2 px-2">
                        <span className="text-indigo-500">{categoryIcons[cat] || <Plus size={14} />}</span>
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cat}</h3>
                        <div className="h-px flex-1 bg-slate-50" />
                        <span className="text-[9px] font-bold text-slate-300">{services.length}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        {services.map(s => (
                          <button 
                            key={s.name} 
                            type="button" 
                            onClick={() => handleSelectService(s)}
                            className="flex flex-col items-center gap-2 group active:scale-90 transition-transform"
                          >
                            <div className="w-14 h-14 rounded-2xl border-2 border-slate-100 bg-white p-2.5 shadow-sm group-hover:border-indigo-200 transition-colors flex items-center justify-center overflow-hidden">
                              <img src={s.logoUrl} alt={s.name} className="w-full h-full object-contain" />
                            </div>
                            <span className="text-[9px] font-black text-slate-600 truncate w-full text-center uppercase tracking-tighter">{s.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-slate-400 text-xs font-bold italic">Can't find it? Use custom setup below.</p>
                  </div>
                )}
                
                <button 
                  type="button"
                  onClick={() => { vibrate(5); setIsManualEntry(true); }}
                  className="w-full py-4 rounded-2xl border-2 border-dashed border-indigo-100 bg-indigo-50/30 text-indigo-500 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors"
                >
                  + Setup Custom Subscription
                </button>
              </div>
            </div>
          )}

          {/* Plan Selection View */}
          {selectedService && (
             <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-3xl border border-slate-100">
                   <div className="w-12 h-12 bg-white rounded-xl p-2 shadow-sm border border-slate-100">
                      <img src={selectedService.logoUrl} className="w-full h-full object-contain" />
                   </div>
                   <div className="flex-1">
                      <h3 className="font-black text-slate-800 text-lg">{selectedService.name}</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedService.category}</p>
                   </div>
                   <button onClick={() => setSelectedService(null)} className="text-indigo-600 font-black text-[10px] uppercase tracking-widest px-3 py-2 bg-white rounded-xl shadow-sm">Back</button>
                </div>

                <div className="grid grid-cols-1 gap-3">
                   {selectedService.plans.map((p, i) => (
                      <button 
                        key={i} 
                        onClick={() => handleSelectPlan(p)}
                        className="flex items-center justify-between bg-white border-2 border-slate-100 rounded-2xl p-5 text-left hover:border-indigo-500 hover:shadow-lg transition-all group active:scale-[0.98]"
                      >
                         <div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">{p.type}</span>
                            <span className="font-extrabold text-slate-800 text-lg">{p.name}</span>
                         </div>
                         <div className="text-right flex items-center gap-4">
                            <div className="text-right">
                               <span className="font-black text-indigo-600 text-xl tracking-tighter">₹{p.price}</span>
                            </div>
                            <span className="text-slate-200 group-hover:text-indigo-500 transition-colors"><CheckCircle2 size={24} /></span>
                         </div>
                      </button>
                   ))}
                </div>
             </div>
          )}

          {/* Detailed Setup Form */}
          {isManualEntry && (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in fade-in">
              <div className="flex items-center gap-4 py-2">
                <button type="button" onClick={() => { setIsManualEntry(false); setName(''); }} className="p-2 bg-slate-50 rounded-lg text-slate-400 active:scale-90"><ChevronLeft size={16} /></button>
                <div className="h-px flex-1 bg-slate-100" />
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Verify Details</span>
                <div className="h-px flex-1 bg-slate-100" />
              </div>

              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[28px] border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative group shrink-0 shadow-inner">
                  {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain p-2" /> : <Globe className="text-slate-300" size={32} />}
                  {isSearchingLogo && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-indigo-600" /></div>}
                  {name && !logoUrl && !isSearchingLogo && (
                    <button type="button" onClick={handleSearchLogo} className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Search className="text-indigo-600" /></button>
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tracker Name</label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all focus:bg-white" 
                    placeholder="e.g. Netflix, Gym" 
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₹)</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-800 focus:border-indigo-500 outline-none focus:bg-white" placeholder="0" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cycle</label>
                  <div className="flex bg-slate-50 p-1 rounded-2xl border-2 border-slate-100">
                      {CYCLES.slice(0, 4).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { vibrate(5); setBillingCycle(c.id); }}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${billingCycle === c.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-100 scale-105 z-10' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {c.label}
                        </button>
                      ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Date</label>
                  <button type="button" onClick={() => setActivePicker('start')} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 flex justify-between items-center group active:scale-95 transition-transform hover:bg-white">
                    <span className="truncate">{new Date(startDate).toLocaleDateString('en-IN', {month:'short', day:'numeric'})}</span>
                    <CalendarIcon size={14} className="text-slate-400 group-hover:text-indigo-500" />
                  </button>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Renews On</label>
                  <button 
                    type="button" 
                    disabled={billingCycle === 'One-time'}
                    onClick={() => setActivePicker('end')} 
                    className={`w-full border-2 rounded-2xl px-6 py-4 font-black flex justify-between items-center transition-all ${billingCycle === 'One-time' ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed' : 'bg-indigo-50 border-indigo-100 text-indigo-700 active:scale-95 hover:bg-white'}`}
                  >
                    <span className="truncate">{endDate ? new Date(endDate).toLocaleDateString('en-IN', {month:'short', day:'numeric'}) : 'N/A'}</span>
                    <Repeat size={14} className={billingCycle !== 'One-time' ? 'text-indigo-400' : 'text-slate-300'} />
                  </button>
                </div>
              </div>

              {/* Final Alert Reminder Selection */}
              <div className="space-y-3 bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 shadow-inner">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600">
                    <Bell size={16} fill="currentColor" />
                  </div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Alert me before</label>
                </div>
                <div className="flex bg-slate-100/50 p-1.5 rounded-[22px] border-2 border-white/50">
                  {REMINDER_OPTIONS.map(days => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => { vibrate(5); setReminder(days); }}
                      className={`flex-1 py-3 rounded-[18px] text-[10px] font-black transition-all ${reminder === days ? 'bg-white text-indigo-600 shadow-md border border-slate-100 scale-105 z-10' : 'text-slate-400 hover:text-slate-500'}`}
                    >
                      {days}D
                    </button>
                  ))}
                </div>
                <p className="text-[10px] font-bold text-slate-400 px-1 italic">
                  Notification will arrive {reminder} day{reminder > 1 ? 's' : ''} before the renewal date.
                </p>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categorization</label>
                <div className="flex gap-4">
                  <div className="flex-1 relative">
                      <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 appearance-none outline-none focus:border-indigo-500 focus:bg-white">
                          {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Filter size={14} /></div>
                  </div>
                  <div className="flex gap-1.5 bg-slate-50 border-2 border-slate-100 rounded-2xl p-2 items-center">
                    {COLORS.slice(0, 4).map(c => (
                      <button key={c} type="button" onClick={() => { vibrate(5); setColor(c); }} className={`w-8 h-8 rounded-full transition-all active:scale-90 ${color === c ? 'scale-110 border-4 border-white shadow-lg' : 'opacity-40 scale-90 hover:opacity-100'}`} style={{backgroundColor:c}} />
                    ))}
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[28px] shadow-premium text-lg active:scale-[0.97] transition-all mt-4 flex items-center justify-center gap-2 hover:bg-indigo-700">
                <Zap size={20} fill="currentColor" /> {initialData ? 'Update Tracking' : 'Activate Tracking'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionForm;
