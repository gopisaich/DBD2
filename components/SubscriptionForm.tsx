
import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar as CalendarIcon, Zap, ChevronLeft, Search, Globe, Plus, RefreshCw, CheckCircle2, Repeat } from 'lucide-react';
import { Subscription, BillingCycle } from '../types';
import { GoogleGenAI } from "@google/genai";

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

// --- Custom Calendar Component (Simplified for brevity as it works well) ---
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
          <button type="button" onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1))} className="p-2 bg-slate-50 rounded-xl"><ChevronLeft size={16} /></button>
          <span className="text-sm font-black text-slate-800 w-24 text-center">{monthName}</span>
          <button type="button" onClick={() => setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1))} className="p-2 bg-slate-50 rounded-xl"><ChevronLeft size={16} className="rotate-180" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-center text-[9px] font-black text-slate-300 pb-2">{d}</div>)}
        {Array.from({ length: firstDayOfMonth(currentDate.getMonth(), year) }).map((_, i) => <div key={`p-${i}`} />)}
        {Array.from({ length: daysInMonth(currentDate.getMonth(), year) }).map((_, i) => {
          const d = i + 1;
          const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === currentDate.getMonth() && selectedDate.getFullYear() === currentDate.getFullYear();
          return (
            <button key={d} type="button" onClick={() => handleSelectDate(d)} className={`h-9 w-full rounded-xl flex items-center justify-center text-xs font-bold ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-700 hover:bg-slate-50'}`}>
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

  const vibrate = (ms: number = 10) => { if ('vibrate' in navigator) navigator.vibrate(ms); };

  const handleSearchLogo = async () => {
    if (!name.trim()) return;
    vibrate(15);
    setIsSearchingLogo(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Direct official high-res transparent PNG logo URL for: ${name}. Only return the direct URL string.`,
      });
      const url = response.text?.trim();
      if (url && url.startsWith('http')) setLogoUrl(url);
    } catch (e) { console.error(e); } finally { setIsSearchingLogo(false); }
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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 bg-slate-900/60 backdrop-blur-md overflow-hidden">
      <div className="w-full max-w-lg bg-white rounded-t-[40px] sm:rounded-[40px] shadow-2xl animate-in slide-in-from-bottom duration-500 max-h-[96vh] flex flex-col">
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-4 mb-2" />
        <div className="flex items-center justify-between px-8 py-4 border-b border-slate-50">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{initialData ? 'Update Plan' : 'New Subscription'}</h2>
          <button onClick={onClose} className="p-3 bg-slate-100 rounded-full text-slate-500 active:scale-90 transition-transform"><X size={20} /></button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto pb-12 scrollbar-hide relative">
          {activePicker && (
            <div className="absolute inset-0 z-[60] bg-white/95 backdrop-blur-sm flex items-center justify-center p-6">
              <CustomCalendarPicker 
                label={activePicker === 'start' ? 'Last Payment Date' : 'Renewal Due'}
                value={activePicker === 'start' ? startDate : endDate}
                onChange={(d) => activePicker === 'start' ? setStartDate(d) : setEndDate(d)}
                onClose={() => setActivePicker(null)}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name and Logo */}
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-[28px] border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden relative group shrink-0">
                {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain p-2" /> : <Globe className="text-slate-300" size={32} />}
                {isSearchingLogo && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><RefreshCw size={20} className="animate-spin text-indigo-600" /></div>}
                {name && !logoUrl && !isSearchingLogo && (
                  <button type="button" onClick={handleSearchLogo} className="absolute inset-0 bg-indigo-600/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Search className="text-indigo-600" /></button>
                )}
              </div>
              <div className="flex-1 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Subscription Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={e => setName(e.target.value)} 
                  className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-indigo-500 outline-none transition-all" 
                  placeholder="e.g. Netflix, Spotify" 
                  required 
                />
              </div>
            </div>

            {/* Price and Cycle Segmented Control */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Price (₹)</label>
                  <input type="number" value={price} onChange={e => setPrice(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-black text-slate-800 focus:border-indigo-500 outline-none" placeholder="0" required />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Billing Cycle</label>
                   <div className="flex bg-slate-50 p-1 rounded-2xl border-2 border-slate-100">
                      {CYCLES.slice(0, 4).map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => { vibrate(5); setBillingCycle(c.id); }}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black transition-all ${billingCycle === c.id ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400'}`}
                        >
                          {c.label}
                        </button>
                      ))}
                   </div>
                </div>
              </div>
              
              <button 
                type="button" 
                onClick={() => setBillingCycle('One-time')}
                className={`w-full py-2.5 rounded-xl text-[10px] font-black border-2 transition-all ${billingCycle === 'One-time' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
              >
                {billingCycle === 'One-time' && <CheckCircle2 size={12} className="inline mr-1" />}
                ONE-TIME PAYMENT
              </button>
            </div>

            {/* Date Previews */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">First Payment</label>
                <button type="button" onClick={() => setActivePicker('start')} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 flex justify-between items-center group active:scale-95 transition-transform">
                  <span className="truncate">{new Date(startDate).toLocaleDateString('en-IN', {month:'short', day:'numeric', year:'numeric'})}</span>
                  <CalendarIcon size={14} className="text-slate-400 group-hover:text-indigo-500" />
                </button>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Next Renewal</label>
                <button 
                  type="button" 
                  disabled={billingCycle === 'One-time'}
                  onClick={() => setActivePicker('end')} 
                  className={`w-full border-2 rounded-2xl px-6 py-4 font-black flex justify-between items-center transition-all ${billingCycle === 'One-time' ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60' : 'bg-indigo-50 border-indigo-100 text-indigo-700 active:scale-95'}`}
                >
                  <span className="truncate">{endDate ? new Date(endDate).toLocaleDateString('en-IN', {month:'short', day:'numeric'}) : 'N/A'}</span>
                  <Repeat size={14} className={billingCycle !== 'One-time' ? 'text-indigo-400' : 'text-slate-300'} />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category & Style</label>
              <div className="flex gap-4">
                 <div className="flex-1 relative">
                    <select value={category} onChange={e => setCategory(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 appearance-none outline-none focus:border-indigo-500">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400"><Plus size={16} className="rotate-45" /></div>
                 </div>
                 <div className="flex gap-1.5 bg-slate-50 border-2 border-slate-100 rounded-2xl p-2 items-center">
                   {COLORS.slice(0, 4).map(c => (
                     <button key={c} type="button" onClick={() => { vibrate(5); setColor(c); }} className={`w-8 h-8 rounded-full transition-all ${color === c ? 'scale-110 border-4 border-white shadow-md' : 'opacity-40 scale-90'}`} style={{backgroundColor:c}} />
                   ))}
                 </div>
              </div>
            </div>

            <button type="submit" className="w-full bg-indigo-600 text-white font-black py-5 rounded-[28px] shadow-premium text-lg active:scale-[0.97] transition-all mt-4 flex items-center justify-center gap-2">
              <Zap size={20} fill="currentColor" /> {initialData ? 'Save Changes' : 'Add Subscription'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionForm;
