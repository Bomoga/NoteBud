'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listDocuments, patchDocument, type DocumentUpdate } from '../lib/api/documents';

export const documentsKey = (notebookId: string) => ['documents', notebookId];

export function useDocuments(notebookId: string) {
  return useQuery({
    queryKey: documentsKey(notebookId),
    queryFn: () => listDocuments(notebookId),
    enabled: !!notebookId,
    staleTime: 60 * 1000,
  });
}

export function usePatchDocument(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, payload }: { documentId: string; payload: DocumentUpdate }) =>
      patchDocument(notebookId, documentId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentsKey(notebookId) });
    },
  });
}
