import { Button } from '@/components/ui/Button';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  saving: boolean;
  onSaveAndLeave: () => void;
  onDiscardAndLeave: () => void;
  onCancel: () => void;
}

export function UnsavedChangesModal({
  isOpen,
  saving,
  onSaveAndLeave,
  onDiscardAndLeave,
  onCancel,
}: UnsavedChangesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface rounded-xl p-xl shadow-2xl border border-outline-variant w-full max-w-sm mx-md">
        <div className="flex items-center gap-md mb-md text-error">
          <span className="material-symbols-outlined text-[28px]">warning</span>
          <h3 className="text-h3 font-h3 text-on-surface">Unsaved Changes</h3>
        </div>
        
        <p className="text-body-md text-on-surface-variant mb-xl">
          You have unsaved block changes or layout ordering. What would you like to do before leaving?
        </p>
        
        <div className="flex flex-col gap-sm">
          <Button
            variant="primary"
            loading={saving}
            disabled={saving}
            onClick={onSaveAndLeave}
          >
            Save & Leave
          </Button>
          
          <Button
            variant="secondary"
            disabled={saving}
            onClick={onDiscardAndLeave}
          >
            Discard & Leave
          </Button>
          
          <Button
            variant="ghost"
            disabled={saving}
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
