'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRegisterAndLogin } from '../../hooks/useAuthMutations';
import { useAuthStore } from '../../lib/store/auth';
import { isAxiosError } from 'axios';
import {
  USERNAME_REQUIREMENTS,
  PASSWORD_REQUIREMENTS,
  validateRegisterFields,
  USERNAME_MAX,
  USERNAME_MIN,
  PASSWORD_MAX,
  PASSWORD_MIN,
  firstValidationMessage,
} from '../../lib/authPolicy';

export default function RegisterPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    username?: string;
    password?: string;
  } | null>(null);
  const registerMutation = useRegisterAndLogin();

  useEffect(() => {
    if (token) router.replace('/backpack');
  }, [token, router]);

  if (token) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const local = validateRegisterFields(username, password);
    if (local) { setFieldErrors(local); return; }
    setFieldErrors(null);
    registerMutation.mutate({ username: username.trim(), password });
  };

  const conflictMessage =
    registerMutation.isError &&
    isAxiosError(registerMutation.error) &&
    registerMutation.error.response?.status === 409
      ? 'That username is already taken. Sign in or pick another.'
      : null;

  const validationError =
    registerMutation.isError &&
    isAxiosError(registerMutation.error) &&
    registerMutation.error.response?.status === 422
      ? firstValidationMessage(registerMutation.error.response?.data?.detail) ??
        'Please check your username and password.'
      : null;

  const genericError =
    registerMutation.isError && !conflictMessage && !validationError
      ? 'Could not create your account. Check your network and try again.'
      : null;

  return (
    <>
      {/* Background */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="forest-background absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,20,15,0.72)_0%,rgba(10,20,15,0.55)_50%,rgba(10,20,15,0.70)_100%)]" />
      </div>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pt-20 pb-16 text-center">

        {/* ── Headline ── */}
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-white">
          Create your account
        </h1>
        <p className="mt-3 text-base text-white/50">
          You'll be signed in automatically after registering.
        </p>

        {/* ── Register card ── */}
        <div className="mt-8 w-full max-w-sm text-left">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-7 shadow-2xl">

            {/* Requirements hint */}
            <div className="mb-5 rounded-lg border border-white/8 bg-white/5 px-3.5 py-3 text-xs text-white/40 space-y-1.5">
              <p><span className="text-white/60 font-medium">Username: </span>{USERNAME_REQUIREMENTS.join(' · ')}</p>
              <p><span className="text-white/60 font-medium">Password: </span>{PASSWORD_REQUIREMENTS.join(' · ')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  id="username"
                  name="username"
                  autoComplete="username"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setFieldErrors(null); }}
                  minLength={USERNAME_MIN}
                  maxLength={USERNAME_MAX}
                  required
                  aria-invalid={Boolean(fieldErrors?.username)}
                  aria-describedby={fieldErrors?.username ? 'username-err' : undefined}
                  className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {fieldErrors?.username && (
                  <p id="username-err" className="mt-1 text-xs text-red-400">{fieldErrors.username}</p>
                )}
              </div>

              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setFieldErrors(null); }}
                  minLength={PASSWORD_MIN}
                  maxLength={PASSWORD_MAX}
                  required
                  aria-invalid={Boolean(fieldErrors?.password)}
                  aria-describedby={fieldErrors?.password ? 'password-err' : undefined}
                  className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                {fieldErrors?.password && (
                  <p id="password-err" className="mt-1 text-xs text-red-400">{fieldErrors.password}</p>
                )}
              </div>

              {validationError && <p className="text-xs text-red-400">{validationError}</p>}
              {conflictMessage && <p className="text-xs text-amber-400">{conflictMessage}</p>}
              {genericError    && <p className="text-xs text-red-400">{genericError}</p>}

              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50 transition-colors"
              >
                {registerMutation.isPending ? 'Creating account…' : 'Register'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-white/40">
              Already have an account?{' '}
              <Link href="/" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

      </main>
    </>
  );
}
