import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * GoogleCallbackPage — mounted at /auth/callback
 *
 * Google OAuth flow ends here:
 *   1. admin-api sets the refresh cookie and redirects to:
 *      /auth/callback#token=<accessToken>
 *   2. This page reads the hash fragment and logs the user in via context.
 *   3. On any failure, redirects to /login?error=google_failed.
 */
export function GoogleCallbackPage() {
  const navigate  = useNavigate();
  const { loginWithToken } = useAuth();
  const processed = useRef(false); // prevent double-processing in React StrictMode

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const hash   = window.location.hash; // e.g. "#token=eyJhbGc..."
    const params = new URLSearchParams(hash.replace('#', '?'));
    const token  = params.get('token');

    if (!token) {
      navigate('/login?error=google_failed', { replace: true });
      return;
    }

    loginWithToken(token).catch(() => {
      navigate('/login?error=google_failed', { replace: true });
    });
  }, [navigate, loginWithToken]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-lg">
      <div className="flex flex-col items-center gap-md">
        {/* Spinner */}
        <svg
          className="animate-spin h-10 w-10 text-primary"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-body-md text-on-surface-variant">Signing you in with Google…</p>
      </div>
    </div>
  );
}

