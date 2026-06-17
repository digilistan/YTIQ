import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ICONS = {
  success: <CheckCircle size={15} className="text-emerald-400 shrink-0" />,
  error:   <XCircle    size={15} className="text-rose-400 shrink-0" />,
  warning: <AlertCircle size={15} className="text-amber-400 shrink-0" />,
  info:    <Info        size={15} className="text-indigo-400 shrink-0" />,
};

const COLORS = {
  success: 'bg-slate-900 border-emerald-500/30 text-emerald-100',
  error:   'bg-slate-900 border-rose-500/30    text-rose-100',
  warning: 'bg-slate-900 border-amber-500/30   text-amber-100',
  info:    'bg-slate-900 border-indigo-500/30  text-slate-200',
};

export function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`toast-enter pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl text-sm max-w-xs ${COLORS[t.type] ?? COLORS.info}`}
        >
          {ICONS[t.type] ?? ICONS.info}
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => dismiss(t.id)}
            className="text-slate-500 hover:text-slate-300 transition ml-1 shrink-0"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}
