import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth.api';
import { tokenStorage, ApiClientError } from '@/api/client';
import type { AuthUser, LoginPayload } from '@/types';

interface AuthState {
    user: AuthUser | null;
    loading: boolean;
    error: string | null;
}

export function useAuth() {
    const navigate = useNavigate();
    const [state, setState] = useState<AuthState>({
        user: null,
        loading: !!tokenStorage.get(),
        error: null,
    });

    // ── Hydrate current user on mount ────────────────────────────────────────
    useEffect(() => {
        const token = tokenStorage.get();
        if (!token) return;

        setState((s) => ({ ...s, loading: true }));
        authApi
            .me()
            .then((user) => setState({ user, loading: false, error: null }))
            .catch(() => {
                tokenStorage.clear();
                setState({ user: null, loading: false, error: null });
            });
    }, []);

    // ── Login ─────────────────────────────────────────────────────────────────
    const login = useCallback(
        async (payload: LoginPayload) => {
            setState((s) => ({ ...s, loading: true, error: null }));
            try {
                // BE trả { accessToken } (sau khi unwrap envelope)
                const { accessToken } = await authApi.login(payload);
                tokenStorage.set(accessToken);

                // Lấy thông tin user từ /auth/me
                const user = await authApi.me();
                setState({ user, loading: false, error: null });
                navigate('/dashboard');
            } catch (err) {
                const message =
                    err instanceof ApiClientError ? err.message : 'Login failed. Please try again.';
                setState((s) => ({ ...s, loading: false, error: message }));
                throw err;
            }
        },
        [navigate],
    );

    // ── Logout ────────────────────────────────────────────────────────────────
    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } finally {
            tokenStorage.clear();
            setState({ user: null, loading: false, error: null });
            navigate('/login');
        }
    }, [navigate]);

    return { ...state, login, logout, isAuthenticated: !!state.user };
}
