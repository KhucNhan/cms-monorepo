import { useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';

export type PermissionResource = 'page' | 'media' | 'user' | 'role';
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

  return { can, canAny, canAll, permissions: user?.permissions ?? [] };
}