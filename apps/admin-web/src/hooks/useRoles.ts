import { useState, useEffect, useCallback } from 'react';
import { rolesApi, type Role, type Permission } from '@/api/roles.api';
import { ApiClientError } from '@/api/client';

export function useRoles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([
        rolesApi.list(),
        rolesApi.listAllPermissions(),
      ]);
      setRoles(rolesData);
      setAllPermissions(permsData);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Không tải được danh sách role.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createRole = useCallback(async (name: string) => {
    const role = await rolesApi.create(name);
    setRoles((prev) => [...prev, role].sort((a, b) => a.name.localeCompare(b.name)));
    return role;
  }, []);

  const renameRole = useCallback(async (id: string, name: string) => {
    const updated = await rolesApi.rename(id, name);
    setRoles((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const setPermissions = useCallback(async (id: string, permissionIds: string[]) => {
    const updated = await rolesApi.setPermissions(id, permissionIds);
    setRoles((prev) => prev.map((r) => (r.id === id ? updated : r)));
    return updated;
  }, []);

  const deleteRole = useCallback(async (id: string) => {
    await rolesApi.remove(id);
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }, []);

  return {
    roles,
    allPermissions,
    loading,
    error,
    refetch: fetchAll,
    createRole,
    renameRole,
    setPermissions,
    deleteRole,
  };
}