'use client';

import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  getNotebooks,
  createNotebook,
  updateNotebook,
  deleteNotebook,
  type NotebookCreate,
  type NotebookUpdate,
} from '../lib/api';

const NOTEBOOKS_QUERY_KEY = ['notebooks'];
const STALE_TIME_MS = 60 * 1000;

export function useNotebooks() {
  return useQuery({
    queryKey: NOTEBOOKS_QUERY_KEY,
    queryFn: getNotebooks,
    staleTime: STALE_TIME_MS,
  });
}

export function useCreateNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: NotebookCreate) => createNotebook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTEBOOKS_QUERY_KEY });
    },
  });
}

export function useUpdateNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & NotebookUpdate) =>
      updateNotebook(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTEBOOKS_QUERY_KEY });
    },
  });
}

export function useDeleteNotebook() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteNotebook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTEBOOKS_QUERY_KEY });
    },
  });
}
