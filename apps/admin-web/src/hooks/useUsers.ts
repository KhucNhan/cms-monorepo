import { useState, useEffect, useCallback } from 'react';
import { usersApi, type AdminUser, type RoleOption } from '@/api/users.api';
import { ApiClientError } from '@/api/client';

interface UsersState {
  users: AdminUser[];
  roles: RoleOption[];
  loading: boolean;
  error: string | null;
}

export function useUsers() {
  const [state, setState] = useState<UsersState>({
    users: [],
    roles: [],
    loading: true,
    error: null,
  });

  const fetch = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const [users, roles] = await Promise.all([usersApi.getAll(), usersApi.getRoles()]);
      setState({ users, roles, loading: false, error: null });
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : 'Failed to load users.';
      setState((s) => ({ ...s, loading: false, error: message }));
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const createUser = useCallback(async (payload: Parameters<typeof usersApi.create>[0]) => {
    const created = await usersApi.create(payload);
    setState((s) => ({ ...s, users: [...s.users, created].sort((a, b) => a.email.localeCompare(b.email)) }));
    return created;
  }, []);

  const updateUser = useCallback(async (id: string, payload: Parameters<typeof usersApi.update>[1]) => {
    const updated = await usersApi.update(id, payload);
    setState((s) => ({
      ...s,
      users: s.users.map((u) => (u.id === id ? updated : u)).sort((a, b) => a.email.localeCompare(b.email)),
    }));
    return updated;
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    await usersApi.delete(id);
    setState((s) => ({ ...s, users: s.users.filter((u) => u.id !== id) }));
  }, []);

  return {
    ...state,
    refetch: fetch,
    createUser,
    updateUser,
    deleteUser,
  };
}
