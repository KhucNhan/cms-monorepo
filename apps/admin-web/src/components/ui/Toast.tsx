import { toast as sonnerToast } from 'sonner';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastData {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContainerProps {
  toasts: ToastData[];
  onRemove: (id: string) => void;
}

/**
 * UI thật đã chuyển sang <Toaster /> (sonner) render 1 lần ở root (main.tsx).
 * Component này giữ lại CHỈ để không phá vỡ 5 call-site đang render
 * <ToastContainer toasts={toasts} onRemove={removeToast} /> tại vị trí cũ trong JSX.
 * Cố tình render null — không được xoá hẳn export này nếu chưa dọn call-site.
 */
export function ToastContainer(_props: ToastContainerProps) {
  return null;
}

// Giữ nguyên signature cũ để 5 page không cần sửa gì:
// const { toasts, addToast, removeToast } = useToast();
export function useToast() {
  const addToast = (message: string, type: ToastType = 'info') => {
    if (type === 'success') sonnerToast.success(message);
    else if (type === 'error') sonnerToast.error(message);
    else sonnerToast(message);
  };

  // Không còn state cục bộ — sonner tự quản lý stack toast của riêng nó.
  // toasts/removeToast giữ lại chỉ để khớp type cũ, không còn tác dụng thật.
  const toasts: ToastData[] = [];
  const removeToast = (_id: string) => {};

  return { toasts, addToast, removeToast };
}