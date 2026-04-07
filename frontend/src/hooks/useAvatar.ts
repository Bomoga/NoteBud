'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/api/client';

// Fetches the avatar as a blob URL so the auth header is included.
// Returns null if no avatar is set (404) or on error.
export function useAvatarUrl() {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [version, setVersion] = useState(0); // increment to force refetch

  const refetch = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => {
    let revoked = false;
    let objectUrl: string | null = null;

    apiClient
      .get<Blob>('/users/me/avatar', { responseType: 'blob' })
      .then(({ data }) => {
        if (revoked) return;
        objectUrl = URL.createObjectURL(data);
        setBlobUrl(objectUrl);
      })
      .catch(() => {
        if (!revoked) setBlobUrl(null);
      });

    return () => {
      revoked = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [version]);

  return { blobUrl, refetch };
}
