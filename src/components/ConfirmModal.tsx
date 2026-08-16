import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  type = 'danger',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const btnBg =
    type === 'danger'
      ? 'bg-rose-600 hover:bg-rose-700 text-white'
      : type === 'warning'
      ? 'bg-amber-600 hover:bg-amber-700 text-white'
      : 'bg-indigo-600 hover:bg-indigo-700 text-white';

  const iconBg =
    type === 'danger'
      ? 'bg-rose-100 text-rose-600'
      : type === 'warning'
      ? 'bg-amber-100 text-amber-600'
      : 'bg-indigo-100 text-indigo-600';

  return (
    <div className="fixed inset-0 z-[9990] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-[92vw] sm:max-w-md w-full overflow-hidden animate-fade-in z-10 border border-slate-100 dark:border-slate-800">
        <button
          onClick={onCancel}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <div className="text-center">
          <div className={`w-11 h-11 sm:w-14 sm:h-14 ${iconBg} rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-2xs`}>
            <AlertTriangle className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <h3 className="font-bold text-base sm:text-xl text-slate-900 dark:text-white mb-1.5 sm:mb-2 leading-tight">{title}</h3>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-5 sm:mb-6">{message}</p>

          <div className="flex gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 ${btnBg} py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm shadow-md transition transform active:scale-95 cursor-pointer`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
