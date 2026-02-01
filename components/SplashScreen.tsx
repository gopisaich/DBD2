
import React, { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';

interface Props {
  onFinish: () => void;
}

const SplashScreen: React.FC<Props> = ({ onFinish }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Show splash for 2 seconds then fade out
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500); // Wait for fade animation
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className={`fixed inset-0 z-[100] bg-indigo-600 flex flex-col items-center justify-center transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="relative">
        <div className="w-24 h-24 bg-white rounded-[32px] flex items-center justify-center shadow-2xl animate-bounce">
          <Bell size={48} className="text-indigo-600 fill-indigo-50" strokeWidth={2.5} />
        </div>
        {/* Animated Rings */}
        <div className="absolute inset-0 w-24 h-24 bg-white/20 rounded-[32px] animate-ping" />
      </div>
      
      <div className="mt-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h1 className="text-4xl font-black text-white tracking-tighter">SUBZS</h1>
        <p className="text-indigo-100 font-bold text-sm uppercase tracking-[0.2em] mt-2 opacity-80">Track • Save • Relax</p>
      </div>

      <div className="absolute bottom-12 flex flex-col items-center gap-2">
        <div className="flex gap-1.5">
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" />
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse [animation-delay:200ms]" />
          <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse [animation-delay:400ms]" />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
