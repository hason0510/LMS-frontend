import React, { useEffect } from "react";

export default function NotificationToastStack({ toasts, onDismiss }) {
  useEffect(() => {
    if (!toasts || toasts.length === 0) return undefined;
    const timer = window.setInterval(() => {
      const lastToast = toasts[toasts.length - 1];
      if (lastToast) {
        onDismiss(lastToast.id);
      }
    }, 4500);
    return () => window.clearInterval(timer);
  }, [toasts, onDismiss]);

  if (!toasts || toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 z-[100] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-3">
      {toasts.slice(0, 3).map((toast) => (
        <button
          type="button"
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left shadow-lg transition hover:border-primary/30 dark:border-slate-700 dark:bg-slate-800"
        >
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-50">
            {toast.title}
          </p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
            {toast.message}
          </p>
        </button>
      ))}
    </div>
  );
}
