'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { login, register } from '../lib/api/auth';
import { useAuthStore } from '../lib/store/auth';
import { getSessionFromAccessToken } from '../lib/decodeJwt';

function applyToken(accessToken: string) {
  const session = getSessionFromAccessToken(accessToken);
  if (!session) return false;
  useAuthStore.getState().setSession(
    accessToken,
    session.userId,
    session.username
  );
  return true;
}

export function useLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      if (applyToken(data.access_token)) {
        router.push('/backpack');
      }
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: register,
  });
}

/** Register then sign in with the same credentials. */
export function useRegisterAndLogin() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: Parameters<typeof register>[0]) => {
      await register(credentials);
      return login(credentials);
    },
    onSuccess: (data) => {
      if (applyToken(data.access_token)) {
        router.push('/backpack');
      }
    },
  });
}
