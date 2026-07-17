import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

export type PermissionResource = 'page' | 'media' | 'user' | 'role' | 'template';
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'publish';
export type PermissionString = `${PermissionResource}:${PermissionAction}`;

/**
 * Centralized frontend permission check.
 * Mirrors backend @RequirePermissions('resource:action') strings exactly,
 * so a permission string here should always be copy-pastable from a
 * NestJS controller decorator in apps/admin-api.
 *
 * This is UX-only. Backend RolesGuard remains the real source of truth;
 * this hook never grants access, it only hides/disables UI.
 */
export function usePermissions() {
  const { user } = useAuth();

  const permissionSet = useMemo(() => new Set(user?.permissions ?? []), [user]);

  const can = (permission: PermissionString): boolean => permissionSet.has(permission);

  const canAny = (permissions: PermissionString[]): boolean =>
    permissions.some((p) => permissionSet.has(p));

  const canAll = (permissions: PermissionString[]): boolean =>
    permissions.every((p) => permissionSet.has(p));

  // Backend chưa trả role name trong JWT (JwtPayload chỉ có roleId), nên nhãn hiển thị được
  // suy ra từ tập permissions theo đúng role map: Admin (full) > Editor (create/update page & media)
  // > Viewer (read-only). Nếu sau này /auth/me trả thêm role name, đổi chỗ này để lấy trực tiếp.
  const roleLabel = useMemo(() => {
    if (can('role:create') || can('user:create')) return 'Admin';
    if (can('page:create') || can('page:update')) return 'Editor';
    return 'Viewer';
  }, [permissionSet]);

  return { can, canAny, canAll, roleLabel, permissions: user?.permissions ?? [] };
}