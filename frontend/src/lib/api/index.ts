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
  type NotebookResponse,
  type NotebookCreate,
  type NotebookUpdate,
  type UploadFileResponse,
  type QueryNotebookResponse,
} from './notebooks';

// Document listing
export {
  listDocuments,
  type DocumentResponse,
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

// Courses and notebook tags
export {
  getCourses,
  addNotebookTag,
  removeNotebookTag,
  type CourseResponse,
  type NotebookTagResponse,
} from './courses';
