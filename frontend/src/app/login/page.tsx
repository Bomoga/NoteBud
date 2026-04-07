'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogin } from '../../hooks/useAuthMutations';
import { useAuthStore } from '../../lib/store/auth';

export default function LoginPage() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  useEffect(() => {
    if (token) {
      router.replace('/backpack');
    }
  }, [token, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    loginMutation.mutate({ username: username.trim(), password });
  };

  if (token) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      <div className="forest-background absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(180,200,190,0.3)_0%,rgba(200,210,200,0.2)_50%,rgba(180,195,185,0.4)_100%)]" />
      </div>
      <main className="relative z-10 flex min-h-screen items-center justify-center p-6 pt-24 sm:pt-28">
        <div className="glass-panel w-full max-w-md rounded-2xl border border-white/40 p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-gray-900">Sign in</h1>
          <p className="mt-1 text-sm text-gray-600">
            Use the same username and password you registered with. New accounts must use a
            password with at least 8 characters, including at least one letter and one
            number (
            <Link href="/register" className="font-medium text-emerald-700 hover:text-emerald-800">
              see requirements
            </Link>
            ).
          </p>

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
                onChange={(e) => setUsername(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white/80 px-3 py-2 text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
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
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 bg-white/80 px-3 py-2 text-gray-900 shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                required
              />
            </div>

            {loginMutation.isError && (
              <p className="text-sm text-red-600">
                {(loginMutation.error as { response?: { status?: number } })
                  ?.response?.status === 401
                  ? 'Invalid username or password. Try again or create an account.'
                  : 'Something went wrong. Please try again later.'}
              </p>
            )}

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
            >
              {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-600">
            No account?{' '}
            <Link
              href="/register"
              className="font-medium text-emerald-700 hover:text-emerald-800"
            >
              Register
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
