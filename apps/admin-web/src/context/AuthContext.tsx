import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { tokenStorage, ApiClientError } from '@/api/client';
import type { AuthUser, LoginPayload } from '@/types';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: !!tokenStorage.get(), // true ngay từ đầu nếu có token
    error: null,
  });

  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) return;

    authApi
      .me()
      .then((user) => setState({ user, loading: false, error: null }))
      .catch(() => {
        tokenStorage.clear();
        setState({ user: null, loading: false, error: null });
      });
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const { accessToken } = await authApi.login(payload);
      tokenStorage.set(accessToken);
      const user = await authApi.me();
      setState({ user, loading: false, error: null });
      navigate('/dashboard');
    } catch (err) {
      const message =
        err instanceof ApiClientError ? err.message : 'Login failed. Please try again.';
      setState((s) => ({ ...s, loading: false, error: message }));
      throw err;
    }
  }, [navigate]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      tokenStorage.clear();
      setState({ user: null, loading: false, error: null });
      navigate('/login');
    }
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAuthenticated: !!state.user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}