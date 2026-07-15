import type { ReactNode } from 'react';
import { usePermissions, type PermissionString } from '@/hooks/usePermissions';

interface CanProps {
  /** Single permission, e.g. 'role:update' */
  permission?: PermissionString;
  /** User needs at least one of these */
  anyOf?: PermissionString[];
  /** User needs all of these */
  allOf?: PermissionString[];
  /** Rendered when unauthorized instead of nothing (e.g. disabled button, tooltip) */
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Declarative permission gate for JSX.
 *   <Can permission="role:delete"><DeleteButton /></Can>
 *   <Can permission="user:update" fallback={<DisabledSaveButton />}><SaveButton /></Can>
 */
export function Can({ permission, anyOf, allOf, fallback = null, children }: CanProps) {
  const { can, canAny, canAll } = usePermissions();

  let allowed = true;
  if (permission) allowed = can(permission);
  else if (anyOf) allowed = canAny(anyOf);
  else if (allOf) allowed = canAll(allOf);

  return allowed ? <>{children}</> : <>{fallback}</>;
}