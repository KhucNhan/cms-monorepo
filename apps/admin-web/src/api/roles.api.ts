import { apiClient } from './client';

export interface Permission {
  id: string;
  resource: string;
  action: string;
}

export interface Role {
  id: string;
  name: string;
  userCount: number;
  permissions: Permission[];
}

export const rolesApi = {
  list: () => apiClient.get<Role[]>('/roles'),
  listAllPermissions: () => apiClient.get<Permission[]>('/roles/permissions/list'),
  create: (name: string) => apiClient.post<Role>('/roles', { name }),
  rename: (id: string, name: string) => apiClient.patch<Role>(`/roles/${id}`, { name }),
  setPermissions: (id: string, permissionIds: string[]) =>
    apiClient.patch<Role>(`/roles/${id}/permissions`, { permissionIds }),
  remove: (id: string) => apiClient.delete<{ deleted: boolean }>(`/roles/${id}`),
};