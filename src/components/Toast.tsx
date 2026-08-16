import React, { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed top-3 sm:top-5 left-1/2 sm:left-auto -translate-x-1/2 sm:translate-x-0 sm:right-5 z-[99999] flex flex-col gap-1.5 w-[90vw] max-w-[360px] sm:max-w-md pointer-events-none items-center sm:items-end">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  
  const bgColor = isSuccess 
    ? 'bg-emerald-600/95 border-emerald-400/40 text-white' 
    : isError 
    ? 'bg-rose-600/95 border-rose-400/40 text-white' 
    : 'bg-indigo-600/95 border-indigo-400/40 text-white';

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between gap-2.5 sm:gap-3 ${bgColor} border backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl shadow-xl transition-all duration-300 w-full animate-bounce-subtle text-xs sm:text-sm font-semibold`}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
        {isSuccess ? (
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-emerald-200" />
        ) : (
          <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 shrink-0 text-rose-200" />
        )}
        <span className="leading-snug break-words">{toast.message}</span>
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg transition shrink-0 cursor-pointer"
        aria-label="Tutup Notifikasi"
      >
        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      </button>
    </div>
  );
};
