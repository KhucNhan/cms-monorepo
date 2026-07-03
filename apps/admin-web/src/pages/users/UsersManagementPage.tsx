import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { useUsers } from '@/hooks/useUsers';
import { ApiClientError } from '@/api/client';
import { UserFormModal } from './components/UserFormModal';
import type { AdminUser } from '@/api/users.api';

export function UsersManagementPage() {
  const { users, roles, loading, error, refetch, createUser, updateUser, deleteUser } = useUsers();
  const { toasts, addToast, removeToast } = useToast();

  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((user) =>
      user.email.toLowerCase().includes(term) ||
      user.role.name.toLowerCase().includes(term),
    );
  }, [search, users]);

  const handleCreate = async (payload: { email?: string; password?: string; roleId?: string }) => {
    try {
      if (!payload.email || !payload.password || !payload.roleId) {
        throw new Error('Email, password, and role are required.');
      }
      await createUser({
        email: payload.email,
        password: payload.password,
        roleId: payload.roleId,
      });
      setShowCreate(false);
      addToast('User created successfully', 'success');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to create user.';
      addToast(msg, 'error');
      throw err;
    }
  };

  const handleUpdate = async (payload: { email?: string; password?: string; roleId?: string }) => {
    if (!editUser) return;
    try {
      await updateUser(editUser.id, payload);
      setEditUser(null);
      addToast('User updated successfully', 'success');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to update user.';
      addToast(msg, 'error');
      throw err;
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteUser(deleteId);
      addToast('User deleted', 'info');
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : 'Failed to delete user.';
      addToast(msg, 'error');
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <AppLayout
      title="Settings"
      actions={
        <>
          <SearchInput
            placeholder="Search users..."
            value={search}
            onChange={setSearch}
          />
          <Button variant="primary" icon="person_add" size="md" onClick={() => setShowCreate(true)}>
            New User
          </Button>
        </>
      }
    >
      <div className="p-xl">
        <div className="max-w-max_content_width mx-auto">
          <div className="flex items-center justify-between mb-xl">
            <div>
              <h1 className="text-h1 font-h1 text-on-background">User Management</h1>
              <p className="text-body-md text-on-surface-variant mt-xs">
                Create, update, and delete admin users and their roles.
              </p>
            </div>
            <button
              onClick={refetch}
              className="flex items-center gap-sm text-primary text-label-md font-label-md hover:bg-primary/5 px-md py-2 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">refresh</span>
              Refresh
            </button>
          </div>

          {loading && (
            <div className="flex items-center justify-center p-xl text-on-surface-variant gap-sm">
              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading users…
            </div>
          )}

          {error && !loading && (
            <div className="flex items-center gap-sm p-md rounded-xl bg-error/10 border border-error/20 text-error text-body-md mb-lg">
              <span className="material-symbols-outlined">error</span>
              {error}
              <button onClick={refetch} className="ml-auto underline text-label-md">Retry</button>
            </div>
          )}

          {!loading && !error && filteredUsers.length === 0 && (
            <div className="flex flex-col items-center justify-center p-xl border-2 border-dashed border-outline-variant rounded-xl text-center">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-md">group</span>
              <h3 className="text-h3 font-h3 text-on-background">No users found</h3>
              <p className="text-body-md text-on-surface-variant max-w-sm mb-lg mt-sm">
                Create the first user account for your team.
              </p>
              <Button variant="primary" icon="person_add" onClick={() => setShowCreate(true)}>
                Create User
              </Button>
            </div>
          )}

          {!loading && filteredUsers.length > 0 && (
            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-outline-variant">
                      {['Email', 'Role', 'Actions'].map((h, i, arr) => (
                        <th
                          key={h}
                          className={`p-md text-label-md font-label-md text-on-surface-variant uppercase tracking-wider ${i === arr.length - 1 ? 'text-right' : 'text-left'}`}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {filteredUsers.map((user) => {
                      return (
                        <tr
                          key={user.id}
                          onClick={() => setEditUser(user)}
                          className="hover:bg-primary/5 transition-colors group cursor-pointer"
                        >
                          <td className="p-md">
                            <div className="flex items-center gap-sm">
                              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">person</span>
                              <div>
                                <p className="text-[14px] font-semibold text-on-background">{user.email}</p>
                                <p className="text-[11px] text-on-surface-variant font-mono">{user.id.slice(0, 8)}…</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-md">
                            <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full text-label-md font-label-md bg-primary/10 text-primary capitalize">
                              {user.role.name}
                            </span>
                          </td>
                          <td className="p-md text-right">
                            <div className="flex items-center justify-end gap-xs">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteId(user.id);
                                }}
                                className="p-2 text-on-surface-variant hover:text-error hover:bg-error/10 rounded-lg transition-all"
                                title="Delete user"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <UserFormModal
          mode="create"
          roles={roles}
          onSubmit={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {editUser && (
        <UserFormModal
          mode="edit"
          roles={roles}
          user={editUser}
          onSubmit={handleUpdate}
          onClose={() => setEditUser(null)}
        />
      )}

      {deleteId && (
        <DeleteUserModal
          email={users.find((u) => u.id === deleteId)?.email ?? ''}
          onConfirm={handleDelete}
          onCancel={() => setDeleteId(null)}
        />
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </AppLayout>
  );
}

function DeleteUserModal({
  email,
  onConfirm,
  onCancel,
}: {
  email: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-surface rounded-xl p-xl shadow-2xl border border-outline-variant w-full max-w-sm mx-md">
        <div className="flex items-center gap-md mb-md">
          <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-error">delete</span>
          </div>
          <h3 className="text-h3 font-h3 text-on-surface">Delete user?</h3>
        </div>
        <p className="text-body-md text-on-surface-variant mb-xl">
          Permanently delete <strong>{email}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-md justify-end">
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" onClick={onConfirm}>Delete</Button>
        </div>
      </div>
    </div>
  );
}