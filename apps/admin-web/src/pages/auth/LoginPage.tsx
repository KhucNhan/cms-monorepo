import { useState, type FormEvent, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/Input';

const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  no_account:    'No account found for this Google email. Contact an administrator to get access.',
  google_failed: 'Google sign-in failed. Please try again.',
};

export function LoginPage() {
  const { login, loginWithGoogle, loading, error } = useAuth();
  const [searchParams] = useSearchParams();

  const emailRef    = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess]           = useState(false);

  // Read ?error= query param injected by the API redirect on Google OAuth failure
  const googleError        = searchParams.get('error');
  const googleErrorMessage = googleError
    ? (GOOGLE_ERROR_MESSAGES[googleError] ?? 'Sign-in failed. Please try again.')
    : null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const email    = emailRef.current?.value ?? '';
    const password = passwordRef.current?.value ?? '';

    try {
      await login({ email, password });
      setSuccess(true);
      // navigate('/dashboard') happens inside useAuth
    } catch {
      // error is already stored in hook state, no action needed
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-md relative overflow-hidden">
      {/* Atmospheric blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-[10%] -right-[5%] w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px]" />
      </div>

      <main className="w-full max-w-[440px] z-10">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-xl">
          <div className="mb-md p-sm bg-primary/10 rounded-xl">
            <span
              className="material-symbols-outlined text-primary text-[40px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield_person
            </span>
          </div>
          <h1 className="text-h1 font-h1 text-on-background mb-xs">Welcome to Admin</h1>
          <p className="text-body-md text-on-surface-variant">Sign in to your account</p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-xl space-y-lg"
          style={{
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #eaeaf2',
            boxShadow: '0px 20px 25px -5px rgba(33,33,52,0.05), 0px 8px 10px -6px rgba(33,33,52,0.05)',
          }}
        >
          <form className="space-y-md" onSubmit={handleSubmit}>
            {/* Email/password API error banner */}
            {error && (
              <div className="flex items-center gap-sm p-sm rounded-lg bg-error/10 border border-error/20 text-error text-body-md">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
              </div>
            )}

            {/* Google OAuth error banner — shown when API redirects back with ?error= */}
            {googleErrorMessage && (
              <div className="flex items-start gap-sm p-sm rounded-lg bg-error/10 border border-error/20 text-error text-body-md">
                <span className="material-symbols-outlined text-[18px] mt-[1px] shrink-0">error</span>
                {googleErrorMessage}
              </div>
            )}

            {/* Email */}
            <Input
              ref={emailRef}
              label="Email Address"
              type="email"
              placeholder="admin@company.com"
              icon="mail"
              iconPosition="right"
              required
            />

            {/* Password */}
            <div className="space-y-sm">
              <div className="flex items-center justify-between">
                <label className="block text-label-md font-label-md text-on-surface-variant uppercase tracking-wider">
                  Password
                </label>
              </div>
              <Input
                ref={passwordRef}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                icon={showPassword ? 'visibility_off' : 'visibility'}
                iconPosition="right"
                onIconClick={() => setShowPassword((p) => !p)}
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || success}
              className={`
                w-full py-md rounded-lg font-h3 text-h3 transition-all duration-200 shadow-md flex items-center justify-center gap-sm
                ${success
                  ? 'bg-emerald-600 text-white'
                  : 'bg-primary text-on-primary hover:bg-on-primary-fixed-variant active:scale-[0.98] shadow-primary/20'}
                ${(loading || success) ? 'cursor-not-allowed' : ''}
              `}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Authenticating…
                </>
              ) : success ? (
                <>
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  Success
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative py-xs">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-md bg-white/80 text-outline text-label-md uppercase tracking-widest font-bold">
                or
              </span>
            </div>
          </div>

          {/* Continue with Google */}
          <button
            type="button"
            onClick={loginWithGoogle}
            className="
              w-full flex items-center justify-center gap-sm
              py-sm px-md rounded-lg
              bg-white border border-[#dadce0]
              text-[#3c4043] text-body-md font-semibold
              hover:bg-[#f8f9fa] hover:shadow-md
              active:scale-[0.98]
              transition-all duration-200
            "
          >
            {/* Official Google "G" logo — inline SVG, no external dependency */}
            <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              <path fill="none" d="M0 0h48v48H0z"/>
            </svg>
            Continue with Google
          </button>
        </div>
      </main>
    </div>
  );
}