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
    if (token) {
      router.replace('/backpack');
    }
  }, [token, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const local = validateRegisterFields(username, password);
    if (local) {
      setFieldErrors(local);
      return;
    }
    setFieldErrors(null);
    registerMutation.mutate({ username: username.trim(), password });
  };

  if (token) {
    return null;
  }

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
        'Please check username and password against the requirements.'
      : null;

  const genericError =
    registerMutation.isError &&
    !conflictMessage &&
    !validationError
      ? 'Could not create your account. Check your network and try again.'
      : null;

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(180,200,190,0.3)_0%,rgba(200,210,200,0.2)_50%,rgba(180,195,185,0.4)_100%)]" />
      </div>
      <main className="relative z-10 flex min-h-screen items-center justify-center p-6 pt-24 sm:pt-28">
        <div className="glass-panel w-full max-w-md rounded-2xl border border-white/40 p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-gray-900">Create account</h1>
          <p className="mt-1 text-sm text-gray-600">
            Choose a username and password. You will be signed in after registering.
          </p>

          <div className="mt-4 rounded-lg border border-gray-200/80 bg-white/50 px-3 py-2 text-xs text-gray-700">
            <p className="font-medium text-gray-800">Username</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {USERNAME_REQUIREMENTS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-2 font-medium text-gray-800">Password</p>
            <ul className="mt-1 list-inside list-disc space-y-0.5">
              {PASSWORD_REQUIREMENTS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setFieldErrors(null);
                }}
                minLength={USERNAME_MIN}
                maxLength={USERNAME_MAX}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white/80 px-3 py-2 text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
                aria-invalid={Boolean(fieldErrors?.username)}
                aria-describedby={fieldErrors?.username ? 'username-err' : undefined}
              />
              {fieldErrors?.username && (
                <p id="username-err" className="mt-1 text-sm text-red-600">
                  {fieldErrors.username}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors(null);
                }}
                minLength={PASSWORD_MIN}
                maxLength={PASSWORD_MAX}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white/80 px-3 py-2 text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
                aria-invalid={Boolean(fieldErrors?.password)}
              />
              {fieldErrors?.password && (
                <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            {validationError && (
              <p className="text-sm text-red-600">{validationError}</p>
            )}
            {conflictMessage && (
              <p className="text-sm text-amber-800">{conflictMessage}</p>
            )}
            {genericError && (
              <p className="text-sm text-red-600">{genericError}</p>
            )}

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {registerMutation.isPending ? 'Creating account…' : 'Register'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-emerald-700 hover:text-emerald-800"
            >
              Sign in
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
