'use client';

import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastProps {
  toast: ToastMessage | null;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, duration, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 right-4 sm:right-6 z-50 max-w-sm w-[calc(100vw-2rem)] sm:w-auto animate-fade-in"
    >
      <div
        className={`flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all ${
          isSuccess
            ? 'bg-emerald-900/95 text-white border-emerald-700/80'
            : isError
            ? 'bg-red-900/95 text-white border-red-700/80'
            : 'bg-stone-900/95 text-white border-stone-700/80'
        }`}
      >
        <div className="shrink-0 mt-0.5">
          {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
          {isError && <AlertCircle className="w-5 h-5 text-red-300" />}
          {!isSuccess && !isError && <Info className="w-5 h-5 text-stone-300" />}
        </div>

        <div className="flex-1 pr-1 text-xs">
          {toast.title && <div className="font-bold text-sm leading-tight mb-0.5">{toast.title}</div>}
          <div className="text-stone-200 leading-relaxed">{toast.message}</div>
        </div>

        <button
          onClick={onClose}
          className="shrink-0 p-1 rounded-lg text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Fermer la notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
