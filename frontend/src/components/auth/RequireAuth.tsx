'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../lib/store/auth';
import { abortAllInFlightRequests, disableAuthHeadersFor } from '../../lib/api/client';

export default function RequireAuth({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();

  const [hydrated, setHydrated] = useState(() =>
    useAuthStore.persist?.hasHydrated() ?? false
  );

  useEffect(() => {
    if (useAuthStore.persist?.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return useAuthStore.persist?.onFinishHydration(() => {
      setHydrated(true);
    });
  }, []);

  const redirectToLogin = () => {
    // Avoid showing cached React Query data after logout/back navigation.
    queryClient.cancelQueries();
    queryClient.clear();
    const from = pathname || '/backpack';
    abortAllInFlightRequests();
    // Prevent any new requests triggered by the still-mounted tree
    // from reattaching stale Authorization during the redirect window.
    disableAuthHeadersFor(10000);
    // Use a full navigation so bfcache/history can't temporarily display protected UI.
    window.location.assign(`/login?from=${encodeURIComponent(from)}`);
  };

  useLayoutEffect(() => {
    if (!hydrated) return;
    if (!token) redirectToLogin();
  }, [hydrated, token]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // bfcache/back-forward can revive a page with stale UI; re-check on pageshow.
    const onPageShow = (e: PageTransitionEvent) => {
      if (!e.persisted) return;
      if (!hydrated) return;
      const currentToken = useAuthStore.getState().token;
      if (!currentToken) redirectToLogin();
    };

    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [hydrated, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Block showing protected UI while we know the user is logged out.
  if (!hydrated) return null;
  if (!token) return null;

  return <>{children}</>;
}

