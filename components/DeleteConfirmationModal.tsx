
import React from 'react';
import { AlertCircle, Trash2, X } from 'lucide-react';
import { Subscription } from '../types';

interface Props {
  subscription: Subscription;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<Props> = ({ subscription, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-6 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="w-full max-w-sm bg-white rounded-[40px] shadow-2xl p-8 flex flex-col items-center text-center animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-20 h-20 bg-red-50 rounded-[32px] flex items-center justify-center mb-6 text-red-500 shadow-inner">
          <Trash2 size={36} strokeWidth={2.5} />
        </div>
        
        <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">Delete Subscription?</h3>
        <p className="mt-3 text-slate-500 font-medium leading-relaxed">
          Are you sure you want to remove <span className="text-slate-900 font-bold">"{subscription.name}"</span>? This action cannot be undone.
        </p>

        <div className="mt-8 w-full space-y-3">
          <button 
            onClick={onConfirm}
            className="w-full bg-red-500 text-white font-black py-5 rounded-[24px] shadow-lg shadow-red-200 active:scale-[0.96] transition-all text-base"
          >
            Delete Permanently
          </button>
          
          <button 
            onClick={onCancel}
            className="w-full bg-slate-50 text-slate-500 font-black py-5 rounded-[24px] active:scale-[0.96] transition-all text-base"
          >
            Keep Subscription
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
