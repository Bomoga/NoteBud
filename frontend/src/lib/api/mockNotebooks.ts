import type { NotebookCreate, NotebookResponse } from './notebooks';

export const MOCK_NOTEBOOKS: NotebookResponse[] = [
  {
    id: 1,
    title: 'Intro to Biology',
    course_code: 'BIO 101',
    description: 'Cell structure, genetics, and basic ecology.',
    created_at: '2025-02-15T10:00:00Z',
    updated_at: '2025-03-01T14:30:00Z',
    owner_id: 1,
  },
  {
    id: 2,
    title: 'Organic Chemistry',
    course_code: 'CHEM 201',
    description: 'Reaction mechanisms and synthesis.',
    created_at: '2025-02-20T09:00:00Z',
    updated_at: '2025-03-05T11:00:00Z',
    owner_id: 1,
  },
  {
    id: 3,
    title: 'Calculus II',
    course_code: 'MATH 142',
    description: null,
    created_at: '2025-02-10T08:00:00Z',
    updated_at: '2025-02-10T08:00:00Z',
    owner_id: 1,
  },
  {
    id: 4,
    title: 'History of Western Art',
    course_code: 'ARTH 110',
    description: 'From ancient Greece through the Renaissance. Key movements, artists, and cultural context.',
    created_at: '2025-01-25T12:00:00Z',
    updated_at: '2025-03-07T16:45:00Z',
    owner_id: 1,
  },
  {
    id: 5,
    title: 'Introduction to Psychology',
    course_code: 'PSYC 101',
    description: 'Behavior, cognition, and developmental psychology.',
    created_at: '2025-02-01T13:00:00Z',
    updated_at: '2025-03-02T09:15:00Z',
    owner_id: 1,
  },
  {
    id: 6,
    title: 'Data Structures',
    course_code: 'CS 225',
    description: 'Arrays, linked lists, trees, and graphs.',
    created_at: '2025-02-18T11:00:00Z',
    updated_at: '2025-02-28T17:00:00Z',
    owner_id: 1,
  },
];

// Module-scoped mock store so mock create/delete work without persistence.
// This intentionally resets on full page reload / HMR restart.
let mockStore: NotebookResponse[] = [...MOCK_NOTEBOOKS];

function snapshot(): NotebookResponse[] {
  // Shallow clone is enough (NotebookResponse is all primitives/null).
  return mockStore.map((nb) => ({ ...nb }));
}

export function resetMockNotebooks(): void {
  mockStore = [...MOCK_NOTEBOOKS];
}

export function getMockNotebooksSnapshot(): NotebookResponse[] {
  return snapshot();
}

export function getMockNotebooks(): Promise<NotebookResponse[]> {
  return Promise.resolve(snapshot());
}

export function createMockNotebook(
  payload: NotebookCreate
): Promise<NotebookResponse> {
  const nextId = (mockStore.reduce((max, nb) => Math.max(max, nb.id), 0) ?? 0) + 1;
  const now = new Date().toISOString();

  const created: NotebookResponse = {
    id: nextId,
    title: payload.title,
    course_code: payload.course_code,
    description: payload.description ?? null,
    created_at: now,
    updated_at: now,
    owner_id: null,
  };

  mockStore = [...mockStore, created];
  return Promise.resolve({ ...created });
}

export function deleteMockNotebook(id: number): Promise<void> {
  mockStore = mockStore.filter((nb) => nb.id !== id);
  return Promise.resolve();
}
