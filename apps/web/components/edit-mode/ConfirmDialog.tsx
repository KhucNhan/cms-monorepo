'use client';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg bg-white p-4 shadow-xl">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}