
import React, { useMemo } from 'react';
import { Wallet, TrendingUp, PieChart as PieIcon, Calculator, ChevronRight } from 'lucide-react';
import { Subscription } from '../types';

interface Props {
  subscriptions: Subscription[];
}

const CATEGORY_COLORS: Record<string, string> = {
  'Entertainment': '#4f46e5',
  'Gaming': '#8b5cf6',
  'Education': '#06b6d4',
  'Fitness': '#10b981',
  'News': '#f59e0b',
  'Work': '#3b82f6',
  'Utility': '#64748b',
  'Lifestyle': '#ec4899',
  'Other': '#94a3b8',
};

const DashboardStats: React.FC<Props> = ({ subscriptions }) => {
  const calculateMonthlyEffect = (sub: Subscription) => {
    switch(sub.billingCycle) {
      case 'Weekly': return sub.price * 4.33; // Average weeks per month
      case 'Quarterly': return sub.price / 3;
      case 'Yearly': return sub.price / 12;
      case 'One-time': return 0;
      case 'Monthly':
      default: return sub.price;
    }
  };

  const monthlyTotal = subscriptions.reduce((sum, sub) => sum + calculateMonthlyEffect(sub), 0);
  const yearlyTotal = monthlyTotal * 12;

  const nextSub = useMemo(() => {
    const today = new Date().getTime();
    return [...subscriptions]
      .filter(s => !s.isArchived)
      .sort((a, b) => new Date(a.renewalDate).getTime() - new Date(b.renewalDate).getTime())[0];
  }, [subscriptions]);

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    subscriptions.forEach(sub => {
      const effect = calculateMonthlyEffect(sub);
      totals[sub.category] = (totals[sub.category] || 0) + effect;
    });
    
    return Object.entries(totals)
      .map(([name, value], index) => {
        const fallbackColors = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];
        const color = CATEGORY_COLORS[name] || fallbackColors[index % fallbackColors.length];
        
        return {
          name,
          value,
          percent: monthlyTotal > 0 ? (value / monthlyTotal) * 100 : 0,
          color
        };
      })
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [subscriptions, monthlyTotal]);

  const formatINR = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 bg-indigo-600 p-8 rounded-[48px] shadow-premium flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 text-white opacity-10 group-hover:opacity-20 transition-all duration-1000 rotate-12 group-hover:rotate-0">
              <TrendingUp size={120} strokeWidth={1} />
          </div>
          
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="w-8 h-8 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <Wallet size={16} className="text-white" />
            </div>
            <span className="text-indigo-100 font-black text-[11px] uppercase tracking-[0.2em]">Monthly Burn Rate</span>
          </div>

          <div className="flex items-baseline gap-2 relative z-10">
            <span className="text-5xl font-black text-white tracking-tighter">₹{formatINR(monthlyTotal)}</span>
            <span className="text-indigo-200 font-bold text-lg uppercase">INR</span>
          </div>
          
          <div className="mt-6 flex items-center gap-2 bg-black/10 self-start px-4 py-2 rounded-2xl backdrop-blur-sm relative z-10">
            <Calculator size={12} className="text-indigo-200" />
            <span className="text-indigo-100 text-[10px] font-black uppercase tracking-widest">Prorated Estimate</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[36px] shadow-sm border border-white flex flex-col justify-between min-h-[110px]">
          <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest block mb-2">Yearly Savings Pot</span>
          <div className="text-xl font-black text-slate-900 tracking-tight">₹{formatINR(yearlyTotal)}</div>
          <div className="text-[8px] font-bold text-slate-300 uppercase mt-1">Projected Cost</div>
        </div>

        <div className="bg-white p-6 rounded-[36px] shadow-sm border border-white flex flex-col justify-between min-h-[110px] group active:scale-95 transition-transform cursor-pointer">
          <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest block mb-2">Upcoming Bill</span>
          <div className="flex items-center justify-between">
            <div className="text-[14px] font-black text-indigo-600 truncate tracking-tight pr-2">
              {nextSub ? nextSub.name : 'No Bills'}
            </div>
            <ChevronRight size={14} className="text-slate-200 group-hover:text-indigo-400" />
          </div>
          <div className="text-[8px] font-bold text-slate-300 uppercase mt-1">
             {nextSub ? new Date(nextSub.renewalDate).toLocaleDateString('en-IN', {day:'numeric', month:'short'}) : 'All clear'}
          </div>
        </div>
      </div>

      {/* Categories */}
      {subscriptions.length > 0 && categoryData.length > 0 && (
        <div className="bg-white p-7 rounded-[48px] shadow-sm border border-white">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center">
                <PieIcon size={18} className="text-indigo-600" />
              </div>
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Budget Split</h3>
            </div>
            <span className="text-[10px] font-black text-slate-300 uppercase">{categoryData.length} Tags</span>
          </div>

          <div className="space-y-5">
            {categoryData.slice(0, 4).map((item, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-[13px] font-black text-slate-700">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[13px] font-black text-slate-900">₹{formatINR(item.value)}</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100/50">
                  <div 
                    className="h-full rounded-full" 
                    style={{ width: `${item.percent}%`, backgroundColor: item.color }} 
                  />
                </div>
              </div>
            ))}
            {categoryData.length > 4 && (
              <p className="text-[9px] font-black text-slate-300 uppercase text-center pt-2">Plus {categoryData.length - 4} other categories</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardStats;
