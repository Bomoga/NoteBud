'use client';

import { useQuery } from '@tanstack/react-query';
import { listDocuments } from '../lib/api/documents';

export const documentsKey = (notebookId: string) => ['documents', notebookId];

export function useDocuments(notebookId: string) {
  return useQuery({
    queryKey: documentsKey(notebookId),
    queryFn: () => listDocuments(notebookId),
    enabled: !!notebookId,
    staleTime: 60 * 1000,
  });
}
