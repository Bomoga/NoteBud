// Base api client for all api calls
// Note: Authentication headers (e.g. JWT) must be handled by the client implementation
export { apiClient } from './client';

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

// Courses and notebook tags
export {
  getCourses,
  addNotebookTag,
  removeNotebookTag,
  type CourseResponse,
  type NotebookTagResponse,
} from './courses';
