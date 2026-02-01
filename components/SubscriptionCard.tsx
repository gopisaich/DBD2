
import React, { useState } from 'react';
import { Trash2, Calendar, Edit3, Search, Clock, Tag } from 'lucide-react';
import { Subscription } from '../types';

interface Props {
  subscription: Subscription;
  onDelete: () => void;
  onEdit: () => void;
  onFixLogo?: () => void;
  onArchive?: () => void;
  isHistory?: boolean;
}

const SubscriptionCard: React.FC<Props> = ({ subscription, onDelete, onEdit, onFixLogo, isHistory }) => {
  const [imageError, setImageError] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  
  const today = new Date();
  const endDate = new Date(subscription.endDate);
  const startDate = new Date(subscription.startDate);
  
  const isInvalidDate = isNaN(endDate.getTime()) || isNaN(startDate.getTime());
  
  const totalDuration = !isInvalidDate ? endDate.getTime() - startDate.getTime() : 1;
  const elapsed = !isInvalidDate ? today.getTime() - startDate.getTime() : 0;
  const timeLeft = !isInvalidDate ? endDate.getTime() - today.getTime() : 0;
  
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
  const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

  const formattedDate = isInvalidDate ? 'No Date' : endDate.toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric'
  });

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleFixLogoAction = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onFixLogo || isFixing) return;
    setIsFixing(true);
    await onFixLogo();
    setIsFixing(false);
    setImageError(false);
  };

  return (
    <div 
      className={`bg-white rounded-[32px] p-6 shadow-sm border border-white flex flex-col gap-5 relative overflow-hidden transition-all duration-300 hover:shadow-md active:scale-[0.99] ${isHistory ? 'opacity-70 grayscale-[0.2]' : ''}`}
    >
      <div 
        className="absolute left-0 top-0 bottom-0 w-2.5 transition-all duration-300"
        style={{ backgroundColor: subscription.color }}
      />

      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-[24px] flex items-center justify-center shadow-inner overflow-hidden shrink-0 bg-slate-50 border border-slate-100 p-2 relative group">
          {(subscription.logoUrl && !imageError) ? (
            <img 
              src={subscription.logoUrl} 
              alt={subscription.name} 
              className="w-full h-full object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center rounded-2xl text-white font-black text-2xl relative" style={{ backgroundColor: subscription.color }}>
              {subscription.name.charAt(0)}
              {imageError && !isHistory && onFixLogo && (
                <button 
                  onClick={handleFixLogoAction}
                  disabled={isFixing}
                  className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl"
                >
                  <Search size={24} className={isFixing ? 'animate-spin' : 'text-white'} />
                </button>
              )}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <h3 className="font-extrabold text-slate-900 truncate text-[17px] tracking-tight">{subscription.name}</h3>
            {!isHistory && (
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-500 text-[8px] font-black uppercase tracking-widest border border-indigo-100/50">
                {subscription.billingCycle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <Calendar size={13} className="text-slate-300" />
              <span>{formattedDate}</span>
            </div>
            {!isHistory && !isInvalidDate && (
               <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${daysLeft <= 3 ? 'text-rose-500' : 'text-slate-400'}`}>
                <Clock size={13} className={daysLeft <= 3 ? 'text-rose-300' : 'text-slate-300'} />
                <span>{daysLeft <= 0 ? 'DUE TODAY' : `${daysLeft}D LEFT`}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-right flex flex-col items-end pt-1">
          <div className="font-black text-slate-900 text-xl tracking-tighter">₹{formatINR(subscription.price)}</div>
          <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">
            {subscription.billingCycle === 'One-time' ? 'Total' : `per ${subscription.billingCycle.replace('ly', '').toLowerCase()}`}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          {!isHistory && !isInvalidDate && daysLeft > 0 && (
            <div className="space-y-1.5">
              <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                <div 
                  className="h-full rounded-full transition-all duration-1000 shadow-sm"
                  style={{ width: `${progress}%`, backgroundColor: subscription.color }}
                />
              </div>
            </div>
          )}
          {isHistory && (
             <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                <Tag size={12} /> {subscription.category}
             </div>
          )}
        </div>
        
        <div className="flex gap-2">
          {!isHistory && (
            <button 
              type="button"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="h-11 w-11 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 active:scale-90 transition-all border border-slate-100 hover:text-indigo-600 hover:bg-white"
            >
              <Edit3 size={18} strokeWidth={2.5} />
            </button>
          )}
          <button 
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="h-11 w-11 rounded-2xl flex items-center justify-center bg-slate-50 text-slate-400 active:scale-90 transition-all border border-slate-100 hover:text-rose-500 hover:bg-rose-50"
          >
            <Trash2 size={18} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionCard;
