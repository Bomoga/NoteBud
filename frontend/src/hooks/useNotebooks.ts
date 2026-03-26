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
import {
  getMockNotebooks,
  getMockNotebooksSnapshot,
  createMockNotebook,
  deleteMockNotebook,
} from '../lib/api/mockNotebooks';

const NOTEBOOKS_QUERY_KEY = ['notebooks'];
const STALE_TIME_MS = 60 * 1000;

type UseNotebooksOptions = {
  mock?: boolean;
};

export function useNotebooks(options: UseNotebooksOptions = {}) {
  const useMock = options.mock ?? false;

  return useQuery({
    queryKey: [...NOTEBOOKS_QUERY_KEY, useMock ? 'mock' : 'real'],
    queryFn: useMock ? getMockNotebooks : getNotebooks,
    staleTime: STALE_TIME_MS,
    // In mock mode, render immediately so the demo doesn't wait for an async fetch.
    initialData: useMock ? getMockNotebooksSnapshot() : undefined,
  });
}

export function useCreateNotebook(options: UseNotebooksOptions = {}) {
  const queryClient = useQueryClient();
  const useMock = options.mock ?? false;

  return useMutation({
    mutationFn: (data: NotebookCreate) =>
      useMock ? createMockNotebook(data) : createNotebook(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTEBOOKS_QUERY_KEY });
    },
  });
}

export function useUpdateNotebook(options: UseNotebooksOptions = {}) {
  const queryClient = useQueryClient();
  // Update is not currently part of the mock story, so we keep it wired to the real API.
  // This prevents accidental divergence while the backend is being refactored.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _useMock = options.mock ?? false;

  return useMutation({
    mutationFn: ({ id, ...payload }: { id: number } & NotebookUpdate) =>
      updateNotebook(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTEBOOKS_QUERY_KEY });
    },
  });
}

export function useDeleteNotebook(options: UseNotebooksOptions = {}) {
  const queryClient = useQueryClient();
  const useMock = options.mock ?? false;

  return useMutation({
    mutationFn: (id: number) =>
      useMock ? deleteMockNotebook(id) : deleteNotebook(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTEBOOKS_QUERY_KEY });
    },
  });
}
