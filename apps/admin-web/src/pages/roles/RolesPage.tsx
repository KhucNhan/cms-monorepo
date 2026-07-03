import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { useRoles } from '@/hooks/useRoles';
import { usePermissions } from '@/hooks/usePermissions';
import { ApiClientError } from '@/api/client';
import type { Role } from '@/api/roles.api';

export function RolesPage() {
  const { roles, allPermissions, loading, error, refetch, createRole, renameRole, setPermissions, deleteRole } = useRoles();
  const { can } = usePermissions();
  const { toasts, addToast, removeToast } = useToast();

  // Centralized check, same "resource:action" string used by backend @RequirePermissions
  const canManage = can('role:update');

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [draftPermissionIds, setDraftPermissionIds] = useState<Set<string>>(new Set());
  const [newRoleName, setNewRoleName] = useState('');
  const [renamingName, setRenamingName] = useState('');
  const [savingPerms, setSavingPerms] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const selectedRole: Role | undefined = roles.find((r) => r.id === selectedRoleId);

  const selectRole = (role: Role) => {
  setSelectedRoleId(role.id);
  setRenamingName(role.name);

  setDraftPermissionIds(
    new Set((role.permissions ?? []).map((p) => p.id))
  );
};

  const togglePermission = (permId: string) => {
    if (!canManage) return;
    setDraftPermissionIds((prev) => {
      const next = new Set(prev);
      next.has(permId) ? next.delete(permId) : next.add(permId);
      return next;
    });
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) return;
    try {
      const role = await createRole(newRoleName.trim());
      setNewRoleName('');
      selectRole({ ...role, permissions: role.permissions ?? [], });
      addToast('A new role has been created.', 'success');
    } catch (err) {
      addToast(err instanceof ApiClientError ? err.message : 'Creating a role failed.', 'error');
    }
  };

  const handleRename = async () => {
    if (!selectedRole || !renamingName.trim() || renamingName === selectedRole.name) return;
    try {
      await renameRole(selectedRole.id, renamingName.trim());
      addToast('The role name has been changed.', 'success');
    } catch (err) {
      addToast(err instanceof ApiClientError ? err.message : 'The name change failed.', 'error');
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSavingPerms(true);
    try {
      await setPermissions(selectedRole.id, Array.from(draftPermissionIds));
      addToast(`Permissions for "${selectedRole.name}" have been updated.`, 'success');
    } catch (err) {
      addToast(err instanceof ApiClientError ? err.message : 'Update permission failed.', 'error');
    } finally {
      setSavingPerms(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRole(deleteId);
      if (selectedRoleId === deleteId) setSelectedRoleId(null);
      addToast('Role has been deleted.', 'info');
    } catch (err) {
      addToast(err instanceof ApiClientError ? err.message : 'Delete role failed.', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const groupedPermissions = useMemo(() => {
    const groups: Record<string, typeof allPermissions> = {};
    for (const p of allPermissions) {
      groups[p.resource] = groups[p.resource] ? [...groups[p.resource], p] : [p];
    }
    return groups;
  }, [allPermissions]);

  return (
    <AppLayout title="Roles & Permissions">
      <div className="p-xl grid grid-cols-[280px_1fr] gap-xl">
        {/* Cột trái: danh sách role */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md h-fit">
          <h3 className={!canManage ? 'text-h3 font-h3 text-on-background capitalize mb-[8px]' : 'text-h3 font-h3 text-on-background capitalize mb-[24px]'}>Roles</h3>

          {loading && <p className="text-body-md text-on-surface-variant">Loading...</p>}
          {error && (
            <div className="text-body-md text-error mb-sm">
              {error} <button onClick={refetch} className="underline">Try again</button>
            </div>
          )}

          <div className="flex flex-col gap-xs mb-md">
            {roles.map((role) => (
              <div
                key={role.id}
                className={`flex items-center justify-between px-md py-2 rounded-lg text-left text-body-md capitalize transition-colors group ${
                  selectedRoleId === role.id ? 'bg-primary/10 text-primary' : 'hover:bg-surface-container-low text-on-surface'
                }`}
              >
                <button onClick={() => selectRole(role)} className="flex-1 text-left">
                  {role.name}
                  <span className="block text-[11px] text-on-surface-variant normal-case">{role.userCount} user(s)</span>
                </button>
                {canManage && (
                  <button
                    onClick={() => setDeleteId(role.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-on-surface-variant hover:text-error"
                    title="Xoá role"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                )}
              </div>
            ))}
          </div>

          {canManage && (
            <div className="flex gap-xs border-t border-outline-variant pt-md">
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="New role name"
              />
              <Button variant="ghost" icon="add" onClick={handleCreateRole} />
            </div>
          )}
        </div>

        {/* Cột phải: chi tiết + ma trận permission */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant p-xl pt-md">
          {selectedRole && (
            <>
              <div className={!canManage ? 'flex flex-col items-start' : 'flex flex-row mb-[16px]'}>
                <div className={!canManage ? 'mb-md' : ''}>
                  <h3 className="text-h3 h-full content-center font-h3 text-on-background capitalize"> {selectedRole ? `${selectedRole.name} Permissions` : 'Permissions'} </h3>
                
                  {!canManage && (
                    <span className="text-body-md text-on-surface-variant">
                      You only have viewing rights. Only administrators can grant/revoke permissions.
                    </span>
                  )}
                </div>
                
                {canManage && (
                  <Button variant="primary" size="sm" className="ml-auto" onClick={handleSavePermissions} disabled={savingPerms}>
                    {savingPerms ? 'Saving…' : 'Save Permissions'}
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-lg">
                {Object.entries(groupedPermissions).map(([resource, perms]) => (
                  <div key={resource} className="border border-outline-variant rounded-lg p-md">
                    <h4 className="text-label-md font-label-md text-on-surface-variant uppercase mb-sm">
                      {resource}
                    </h4>
                    <div className="flex flex-col gap-xs">
                      {perms.map((perm) => (
                        <label
                          key={perm.id}
                          className={`flex items-center gap-sm text-body-md ${canManage ? 'cursor-pointer' : 'cursor-default opacity-80'}`}
                        >
                          <input
                            type="checkbox"
                            checked={draftPermissionIds.has(perm.id)}
                            disabled={!canManage}
                            onChange={() => togglePermission(perm.id)}
                          />
                          {perm.action}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        
          {!selectedRole && (
            <div className="flex flex-col items-center justify-center text-on-surface-variant p-xl">
              <span className="material-symbols-outlined text-[48px] mb-md">shield</span>
              Select a role on the left to view or grant permissions.
            </div>
          )}
        </div>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-surface rounded-xl p-xl shadow-2xl border border-outline-variant w-full max-w-sm mx-md">
            <h3 className="text-h3 font-h3 text-on-surface mb-md">Delete role?</h3>
            <p className="text-body-md text-on-surface-variant mb-xl">
              This action cannot be undone. The role assigned to the user cannot be deleted.
            </p>
            <div className="flex gap-md justify-end">
              <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
              <Button variant="danger" onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  );
}