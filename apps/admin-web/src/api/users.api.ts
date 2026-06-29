import { apiClient } from './client';

export interface RoleOption {
  id: string;
  name: string;
}

export interface AdminUser {
  id: string;
  email: string;
  roleId: string;
  role: {
    id: string;
    name: string;
  };
}

export interface CreateUserPayload {
  email: string;
  password: string;
  roleId: string;
}

export interface UpdateUserPayload {
  email?: string;
  password?: string;
  roleId?: string;
}

export const usersApi = {
  getAll: () => apiClient.get<AdminUser[]>('/users'),

  getRoles: () => apiClient.get<RoleOption[]>('/users/roles/list'),

  getOne: (id: string) => apiClient.get<AdminUser>(`/users/${id}`),

  create: (data: CreateUserPayload) => apiClient.post<AdminUser>('/users', data),

  update: (id: string, data: UpdateUserPayload) =>
    apiClient.patch<AdminUser>(`/users/${id}`, data),

  delete: (id: string) => apiClient.delete<{ deleted: boolean }>(`/users/${id}`),
};
