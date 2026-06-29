import { useEffect, useState } from 'react';
import { cn } from '@/config/cn';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

const config: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: 'bg-primary',  icon: 'check_circle' },
  error:   { bg: 'bg-error',    icon: 'error' },
  info:    { bg: 'bg-secondary', icon: 'info' },
};

function Toast({ toast, onRemove }: ToastProps) {
  const [visible, setVisible] = useState(false);
  const c = config[toast.type];

  useEffect(() => {
    // Trigger entry animation
    const t1 = setTimeout(() => setVisible(true), 10);
    // Auto-dismiss
    const t2 = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onRemove(toast.id), 300);
    }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [toast.id, onRemove]);

  return (
    <div
      className={cn(
        c.bg,
        'text-white px-md py-sm rounded-lg shadow-xl flex items-center gap-sm',
        'transform transition-all duration-300',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      )}
    >
      <span className="material-symbols-outlined text-[20px]">{c.icon}</span>
      <span className="text-label-md font-label-md">{toast.message}</span>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed bottom-lg right-lg flex flex-col gap-sm z-[100] pointer-events-none">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Simple hook for managing toasts
let _toastCounter = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (message: string, type: ToastType = 'info') => {
    const id = String(++_toastCounter);
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, removeToast };
}
