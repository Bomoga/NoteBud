'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listLinks,
  createLink,
  deleteLink,
  getSimilarNotebooks,
  listAllLinks,
  type NotebookLinkCreate,
} from '../lib/api/links';

const linksKey = (notebookId: string) => ['links', notebookId];

export function useLinks(notebookId: string) {
  return useQuery({
    queryKey: linksKey(notebookId),
    queryFn: () => listLinks(notebookId),
    enabled: !!notebookId,
    staleTime: 30 * 1000,
  });
}

export function useCreateLink(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: NotebookLinkCreate) => createLink(notebookId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linksKey(notebookId) }),
  });
}

export function useDeleteLink(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => deleteLink(notebookId, linkId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: linksKey(notebookId) }),
  });
}

export function useAllLinks() {
  return useQuery({
    queryKey: ['notebook-links-all'],
    queryFn: listAllLinks,
    staleTime: 30_000,
  });
}

export function useSimilarNotebooks(notebookId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['similar', notebookId],
    queryFn: () => getSimilarNotebooks(notebookId),
    enabled: enabled && !!notebookId,
    staleTime: 60 * 1000,
  });
}
