import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { AdminUser, RoleOption } from '@/api/users.api';

interface UserFormModalProps {
  mode: 'create' | 'edit';
  roles: RoleOption[];
  user?: AdminUser;
  onSubmit: (payload: { email?: string; password?: string; roleId?: string }) => Promise<void>;
  onClose: () => void;
}

export function UserFormModal({ mode, roles, user, onSubmit, onClose }: UserFormModalProps) {
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState(user?.roleId ?? roles[0]?.id ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCreate = mode === 'create';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isCreate && !password) {
      setError('Password is required');
      return;
    }
    if (password && password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (!roleId) {
      setError('Please select a role');
      return;
    }

    setSubmitting(true);
    try {
      if (isCreate) {
        await onSubmit({ email, password, roleId });
      } else {
        const payload: { email?: string; password?: string; roleId?: string } = {};
        if (email !== user?.email) payload.email = email;
        if (password) payload.password = password;
        if (roleId !== user?.roleId) payload.roleId = roleId;
        if (Object.keys(payload).length === 0) {
          onClose();
          return;
        }
        await onSubmit(payload);
      }
    } catch {
      // Toast handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => {/* no-op: chỉ đóng qua nút X hoặc Cancel */}}>
      <DialogContent
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        showCloseButton={false}
        className="bg-surface rounded-xl p-xl shadow-2xl border border-outline-variant w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-lg">
          <h3 className="text-h3 font-h3 text-on-surface">
            {isCreate ? 'Create User' : 'Edit User'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-surface-container-high rounded-full transition-colors text-on-surface-variant"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-md">
          <div className="flex flex-col gap-xs">
            <label className="text-label-md font-bold text-on-surface">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none"
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="text-label-md font-bold text-on-surface">
              Password {isCreate ? '' : '(leave blank to keep current)'}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={isCreate}
              minLength={isCreate ? 8 : undefined}
              className="bg-surface border border-outline-variant rounded-lg px-sm py-2 text-body-md focus:border-primary outline-none"
              placeholder={isCreate ? 'Min. 8 characters' : '••••••••'}
            />
          </div>

          <div className="flex flex-col gap-xs">
            <label className="text-label-md font-bold text-on-surface">Role</label>
            <Select value={roleId} onValueChange={(value) => setRoleId(value)}>
              <SelectTrigger className="bg-surface border-outline-variant">
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent className="bg-surface text-on-surface border border-outline-variant">
                <SelectGroup>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {error && (
            <p className="text-body-md text-error flex items-center gap-xs">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {error}
            </p>
          )}

          <div className="flex gap-md justify-end pt-sm">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={submitting}>
              {isCreate ? 'Create User' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}