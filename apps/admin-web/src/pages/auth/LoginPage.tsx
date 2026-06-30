import { useState, type FormEvent, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';

export function LoginPage() {
  const { login, loading, error } = useAuth();

  const emailRef    = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess]           = useState(false);

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
            {/* API error banner */}
            {error && (
              <div className="flex items-center gap-sm p-sm rounded-lg bg-error/10 border border-error/20 text-error text-body-md">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {error}
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
                {/* <a href="#" className="text-label-md text-primary hover:text-on-primary-fixed-variant transition-colors font-semibold">
                  Forgot password?
                </a> */}
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

            {/* Remember me */}
            {/* <div className="flex items-center gap-sm">
              <input
                id="remember"
                type="checkbox"
                className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary/20 focus:ring-offset-0 accent-primary"
              />
              <label htmlFor="remember" className="text-body-md text-on-surface-variant cursor-pointer select-none">
                Remember me for 30 days
              </label>
            </div> */}

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
          {/* <div className="relative py-sm">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant" />
            </div>
            <div className="relative flex justify-center">
              <span className="px-md bg-white/50 text-outline text-label-md uppercase tracking-widest font-bold">
                or connect with
              </span>
            </div>
          </div> */}

          {/* SSO / API Key */}
          {/* <div className="grid grid-cols-2 gap-md">
            {[
              { icon: 'hub', label: 'SSO' },
              { icon: 'key', label: 'API Key' },
            ].map(({ icon, label }) => (
              <button
                key={label}
                className="flex items-center justify-center gap-sm px-md py-sm border border-outline-variant rounded-lg hover:bg-surface-container-high transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">{icon}</span>
                <span className="text-label-md font-label-md text-on-surface">{label}</span>
              </button>
            ))}
          </div> */}
        </div>

        {/* Footer */}
        {/* <p className="text-center text-body-md text-on-surface-variant mt-xl">
          Don't have an account?{' '}
          <a href="#" className="text-primary font-bold hover:underline">Sign up</a>
        </p> */}

        {/* System status */}
        {/* <div className="mt-xl flex items-center justify-center gap-md opacity-40">
          <div className="flex items-center gap-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-[10px] uppercase font-bold tracking-tighter">API Online</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-outline-variant" />
          <span className="text-[10px] uppercase font-bold tracking-tighter">v1.0.0</span>
          <div className="w-1 h-1 rounded-full bg-outline-variant" />
          <span className="text-[10px] uppercase font-bold tracking-tighter">Region: US-EAST</span>
        </div> */}
      </main>
    </div>
  );
}