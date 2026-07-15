'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  permissions: string[];
  isLoading: boolean;
}

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  permissions: [],
  isLoading: true,
});

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/**
 * AuthProvider — Client Component.
 *
 * Calls GET /auth/me with credentials: 'include' on mount.
 * If the admin is logged into admin-web (same root domain), the browser automatically
 * attaches the access_token httpOnly cookie to this request — no manual token passing required.
 *
 * Exposes isAuthenticated, permissions[], and isLoading to child components.
 * Does NOT read cookies in any Server Component; keeps app/[slug]/page.tsx statically renderable.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    permissions: [],
    isLoading: true,
  });

  console.log('AuthProvider mounted');

  useEffect(() => {
    console.log('effect');
    fetch(`${API_URL}/api/v1/auth/me`, {
      method: 'GET',
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ data?: { permissions?: string[] } }>;
      })
      .then((json) => {
        const permissions = json?.data?.permissions ?? [];
        setState({ isAuthenticated: permissions.length > 0, permissions, isLoading: false });
      })
      .catch(() => {
        setState({ isAuthenticated: false, permissions: [], isLoading: false });
      });
  }, []);

  const Provider = AuthContext.Provider as any;
  return <Provider value={state}>{children}</Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
