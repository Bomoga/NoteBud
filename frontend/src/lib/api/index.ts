// Base api client for all api calls
export { apiClient } from './client';

export { register, login, type AuthCredentials, type RegisterResponse, type TokenResponse } from './auth';

// Notebook crud operations
export {
  getNotebooks,
  createNotebook,
  getNotebook,
  updateNotebook,
  deleteNotebook,
  uploadFile,
  queryNotebook,
  getNotebookBannerUrl,
  uploadNotebookBanner,
  deleteNotebookBanner,
  type NotebookResponse,
  type NotebookCreate,
  type NotebookUpdate,
  type UploadFileResponse,
  type QueryNotebookResponse,
} from './notebooks';

// Document listing and patching
export {
  listDocuments,
  patchDocument,
  type DocumentResponse,
  type DocumentUpdate,
} from './documents';

// Note crud operations
export {
  listNotes,
  createNote,
  getNote,
  updateNote,
  deleteNote,
  type NoteResponse,
  type NoteCreate,
  type NoteUpdate,
} from './notes';

// RAG chat streaming
export {
  streamChat,
  type ChatCitation,
  type ChatTokenEvent,
  type ChatDoneEvent,
  type ChatEvent,
} from './chat';

// Notebook-to-notebook links
export {
  listLinks,
  createLink,
  deleteLink,
  getSimilarNotebooks,
  type NotebookLinkRead,
  type NotebookLinkInbound,
  type NotebookLinksResponse,
  type SimilarNotebook,
  type NotebookLinkCreate,
  type LinkType,
} from './links';

// Courses and notebook tags
export {
  getCourses,
  addNotebookTag,
  removeNotebookTag,
  type CourseResponse,
  type NotebookTagResponse,
} from './courses';

// Calendar events
export {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  type CalendarEvent,
  type CalendarEventCreate,
  type CalendarEventUpdate,
  type EventType,
} from './events';
