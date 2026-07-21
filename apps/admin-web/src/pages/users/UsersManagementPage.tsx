import { useEffect, useMemo, useState } from 'react';
import { useAppLayoutHeader } from '@/context/AppLayoutContext';
import { Button } from '@/components/ui/Button';
import { SearchInput } from '@/components/ui/SearchInput';
import { ToastContainer, useToast } from '@/components/ui/Toast';
import { useUsers } from '@/hooks/useUsers';
import { ApiClientError } from '@/api/client';
import { UserFormModal } from './components/UserFormModal';
import { Can } from '@/components/Can';
import { usePermissions } from '@/hooks/usePermissions';
import type { AdminUser } from '@/api/users.api';

const PAGE_SIZE = 6;

export function UsersManagementPage() {
  const { users, roles, loading, error, refetch, createUser, updateUser, deleteUser } = useUsers();
  const { toasts, addToast, removeToast } = useToast();
  const { can } = usePermissions();
  const canUpdateUser = can('user:update');

  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState<string>('all');
  // null = mặc định (dữ liệu mới nhất lên đầu, tức đảo ngược thứ tự gốc trả về từ API)
  const [sortField, setSortField] = useState<'email' | 'role' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const handleSortClick = (field: 'email' | 'role') => {
    if (sortField !== field) {
      setSortField(field);
      setSortDir('asc');
    } else if (sortDir === 'asc') {
      setSortDir('desc');
    } else {
      // Bấm lần 3: quay về mặc định (mới nhất lên đầu)
      setSortField(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !term ||
        user.email.toLowerCase().includes(term) ||
        user.role.name.toLowerCase().includes(term);

      const matchesRole = roleFilter === 'all' || user.roleId === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [search, users, roleFilter]);

  const sortedUsers = useMemo(() => {
    if (!sortField) {
      // Mặc định: đảo ngược thứ tự trả về từ API (email asc) → dữ liệu mới nhất lên đầu
      return [...filteredUsers].reverse();
    }
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredUsers].sort((a, b) => {
      const av = sortField === 'email' ? a.email : a.role.name;
      const bv = sortField === 'email' ? b.email : b.role.name;
      return av.localeCompare(bv) * dir;
    });
  }, [filteredUsers, sortField, sortDir]);

  const total = filteredUsers.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Reset về trang 1 khi search / role filter thay đổi
  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  // Đảm bảo page không vượt quá totalPages (vd sau khi xoá user ở trang cuối)
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sortedUsers.slice(start, start + PAGE_SIZE);
  }, [sortedUsers, page]);

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

  useAppLayoutHeader({
    title: 'Content Management',
    actions: (
      <>
          <SearchInput
            placeholder="Search users..."
            value={search}
            onChange={setSearch}
          />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="h-9 px-sm rounded-lg border border-outline-variant bg-surface-container-lowest text-body-md text-on-background focus:outline-none focus:ring-2 focus:ring-primary/30"
            title="Filter by role"
          >
            <option value="all">All roles</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          <Can permission="user:create">
            <Button variant="primary" icon="person_add" size="md" onClick={() => setShowCreate(true)}>
              New User
            </Button>
          </Can>
        </>
    ),
  });

  return (
    <>
      <div className="p-xl">
        <div className="max-w-max_content_width mx-auto">
          {/* <div className="flex items-center justify-between mb-xl">
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
          </div> */}

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
                {search || roleFilter !== 'all'
                  ? 'Try adjusting your search or role filter.'
                  : 'Create the first user account for your team.'}
              </p>
              {(search || roleFilter !== 'all') ? (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              ) : (
                <Button variant="primary" icon="person_add" onClick={() => setShowCreate(true)}>
                  Create User
                </Button>
              )}
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
                          {h === 'Email' ? (
                            <button
                              type="button"
                              onClick={() => handleSortClick('email')}
                              className="flex items-center gap-[2px] uppercase tracking-wider hover:text-on-background transition-colors"
                              title="Click để sắp xếp theo Email"
                            >
                              <span>{h}</span>
                              <SortArrow active={sortField === 'email'} dir={sortDir} />
                            </button>
                          ) : h === 'Role' ? (
                            <button
                              type="button"
                              onClick={() => handleSortClick('role')}
                              className="flex items-center gap-[2px] uppercase tracking-wider hover:text-on-background transition-colors"
                              title="Click để sắp xếp theo Role"
                            >
                              <span>{h}</span>
                              <SortArrow active={sortField === 'role'} dir={sortDir} />
                            </button>
                          ) : (
                            h
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {paginatedUsers.map((user) => {
                      return (
                        <tr
                          key={user.id}
                          onClick={canUpdateUser ? () => setEditUser(user) : undefined}
                          className={`transition-colors group h-[74.133px] ${
                            canUpdateUser ? 'hover:bg-primary/5 cursor-pointer' : 'cursor-default'
                          }`}
                        >
                          <td className="p-[8px]">
                            <div className="flex items-center gap-sm">
                              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">person</span>
                              <div>
                                <p className="text-[14px] font-semibold text-on-background">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-[8px]">
                            <span className="inline-flex items-center gap-xs px-sm py-1 rounded-full text-label-md font-label-md bg-primary/10 text-primary capitalize">
                              {user.role.name}
                            </span>
                          </td>
                          <td className="p-[8px] text-right">
                            <div className="flex items-center justify-end gap-xs">
                              <Can permission="user:delete">
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
                              </Can>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="bg-surface-container-low border-t border-outline-variant p-md flex items-center justify-between">
                  <p className="text-body-md text-on-surface-variant">
                    Showing{' '}
                    <span className="font-bold">{(page - 1) * PAGE_SIZE + 1}</span> to{' '}
                    <span className="font-bold">{Math.min(page * PAGE_SIZE, total)}</span> of{' '}
                    <span className="font-bold">{total}</span> users
                  </p>
                  <div className="flex items-center gap-xs">
                    <PaginationButton disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                      <span className="material-symbols-outlined">chevron_left</span>
                    </PaginationButton>
                    {getPageNumbers(page, totalPages).map((p) => (
                      <PaginationButton key={p} active={p === page} onClick={() => setPage(p)}>
                        {p}
                      </PaginationButton>
                    ))}
                    <PaginationButton
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <span className="material-symbols-outlined">chevron_right</span>
                    </PaginationButton>
                  </div>
                </div>
              )}
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
    </>
  );
}

/**
 * Trả về danh sách tối đa 5 số trang để hiển thị, luôn chứa trang hiện tại
 * (thay vì luôn lấy 5 trang đầu tiên như trong đoạn code tham khảo).
 */
function getPageNumbers(page: number, totalPages: number): number[] {
  const maxButtons = 5;
  if (totalPages <= maxButtons) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  let start = Math.max(1, page - Math.floor(maxButtons / 2));
  const end = Math.min(totalPages, start + maxButtons - 1);
  start = Math.max(1, end - maxButtons + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function SortArrow({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <span
      className={`material-symbols-outlined text-[14px] transition-transform ${
        active ? 'text-primary' : 'text-outline-variant'
      } ${active && dir === 'desc' ? 'rotate-180' : ''}`}
    >
      arrow_upward
    </span>
  );
}

function PaginationButton({
  children,
  active,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`min-w-[36px] h-9 px-sm rounded-lg text-label-md font-label-md flex items-center justify-center transition-colors ${
        active
          ? 'bg-primary text-on-primary'
          : 'text-on-surface-variant hover:bg-primary/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed'
      }`}
    >
      {children}
    </button>
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