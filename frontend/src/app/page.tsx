'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLogin } from '../hooks/useAuthMutations';
import { useAuthStore } from '../lib/store/auth';
import {
  BookOpenIcon,
  SparklesIcon,
  ShareIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

const FEATURES = [
  { Icon: BookOpenIcon,     label: 'Notebooks',  text: 'Organize notes and documents by course' },
  { Icon: SparklesIcon,     label: 'AI Chat',    text: 'Ask questions grounded in your material' },
  { Icon: ShareIcon,        label: 'Neural Map', text: 'Visualize connections between courses' },
  { Icon: CalendarDaysIcon, label: 'Calendar',   text: 'Track due dates, exams, and holidays' },
];

export default function Home() {
  const router = useRouter();
  const token = useAuthStore((s) => s.token);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const loginMutation = useLogin();

  useEffect(() => {
    if (token) router.replace('/backpack');
  }, [token, router]);

  if (token) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    loginMutation.mutate({ username: username.trim(), password });
  };

  return (
    <>
      {/* Background — darker overlay for drama */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="forest-background absolute inset-0 bg-[url('/forest-bg.png')] bg-center bg-cover bg-no-repeat" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(10,20,15,0.72)_0%,rgba(10,20,15,0.55)_50%,rgba(10,20,15,0.70)_100%)]" />
      </div>

      <main className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 pt-20 pb-16 text-center">

        {/* ── Badge ── */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-emerald-300 tracking-wide">AI-Powered Study Companion</span>
        </div>

        {/* ── Headline ── */}
        <h1 className="max-w-3xl text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight text-white">
          Study smarter,<br />
          <span className="text-emerald-400">not harder.</span>
        </h1>

        <p className="mt-6 max-w-xl text-base sm:text-lg text-white/60 leading-relaxed">
          Bring your course material into one place — then chat with it, map it, and never miss a deadline.
        </p>

        {/* ── Sign-in card ── */}
        <div className="mt-10 w-full max-w-sm">
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-7 shadow-2xl text-left">
            <h2 className="text-lg font-semibold text-white">Sign in to NoteBud</h2>
            <p className="mt-0.5 text-sm text-white/50">Welcome back.</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-3">
              <input
                name="username"
                autoComplete="username"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder-white/30 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />

              {loginMutation.isError && (
                <p className="text-xs text-red-400">
                  {(loginMutation.error as { response?: { status?: number } })?.response?.status === 401
                    ? 'Invalid username or password.'
                    : 'Something went wrong. Please try again.'}
                </p>
              )}

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 disabled:opacity-50 transition-colors"
              >
                {loginMutation.isPending ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-white/40">
              No account?{' '}
              <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
                Register
              </Link>
            </p>
          </div>
        </div>

        {/* ── Feature pills ── */}
        <div className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-3xl">
          {FEATURES.map(({ Icon, label, text }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 rounded-xl border border-white/8 bg-white/4 backdrop-blur-sm px-4 py-4"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/15">
                <Icon className="size-5 text-emerald-400" />
              </div>
              <span className="text-xs font-semibold text-white/80">{label}</span>
              <span className="text-[11px] text-white/40 text-center leading-snug">{text}</span>
            </div>
          ))}
        </div>

      </main>
    </>
  );
}
