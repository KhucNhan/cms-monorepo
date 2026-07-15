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
  hydrating: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
  loginWithGoogle: () => void;
  loginWithToken: (token: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [state, setState] = useState<AuthState>({
    user: null,
    loading: false, // chỉ dùng cho login() submit, KHÔNG dựa vào tokenStorage lúc init
    error: null,
  });

  // Cờ riêng cho việc verify token cũ lúc app mount — không liên quan tới form login
  const [hydrating, setHydrating] = useState<boolean>(!!tokenStorage.get());

  useEffect(() => {
    const token = tokenStorage.get();
    if (!token) {
      setHydrating(false);
      return;
    }

    authApi
      .me()
      .then((user) => {
        setState((s) => ({ ...s, user, error: null }));
      })
      .catch(() => {
        tokenStorage.clear();
        setState((s) => ({ ...s, user: null, error: null }));
      })
      .finally(() => {
        setHydrating(false);
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

  const loginWithGoogle = useCallback(() => {
    const apiBase = import.meta.env.VITE_API_URL ?? '/api/v1';
    window.location.href = `${apiBase}/auth/google`;
  }, []);

  const loginWithToken = useCallback(async (token: string) => {
    tokenStorage.set(token);
    try {
      const user = await authApi.me();
      setState({ user, loading: false, error: null });
      navigate('/dashboard');
    } catch (err) {
      tokenStorage.clear();
      setState({ user: null, loading: false, error: null });
      throw err;
    }
  }, [navigate]);


  return (
    <AuthContext.Provider
      value={{ ...state, hydrating, login, logout, loginWithGoogle, loginWithToken, isAuthenticated: !!state.user }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}