'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  type NoteCreate,
  type NoteUpdate,
} from '../lib/api';

const notesKey = (notebookId: string) => ['notes', notebookId];

const STALE_TIME_MS = 60 * 1000;

export function useNotes(notebookId: string) {
  return useQuery({
    queryKey: notesKey(notebookId),
    queryFn: () => listNotes(notebookId),
    enabled: !!notebookId,
    staleTime: STALE_TIME_MS,
  });
}

export function useCreateNote(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: NoteCreate) => createNote(notebookId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notesKey(notebookId) });
    },
  });
}

export function useUpdateNote(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ noteId, ...payload }: { noteId: string } & NoteUpdate) =>
      updateNote(notebookId, noteId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notesKey(notebookId) });
    },
  });
}

export function useDeleteNote(notebookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (noteId: string) => deleteNote(notebookId, noteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notesKey(notebookId) });
    },
  });
}
