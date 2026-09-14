import React, { useEffect } from 'react';
import { Check, Info, AlertCircle, X } from 'lucide-react';

interface Props {
  message: string | null;
  onClose: () => void;
  type?: 'success' | 'info' | 'error';
  duration?: number;
}

export function Toast({ message, onClose, type = 'success', duration = 2500 }: Props) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-center gap-2.5 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700/80">
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
          {type === 'success' ? (
            <Check size={13} className="text-emerald-400" />
          ) : type === 'error' ? (
            <AlertCircle size={13} className="text-rose-400" />
          ) : (
            <Info size={13} className="text-teal-400" />
          )}
        </div>
        <span className="text-xs font-bold text-slate-100">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 text-slate-400 hover:text-white p-0.5 rounded-lg hover:bg-slate-800"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
