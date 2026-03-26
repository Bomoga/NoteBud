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
  type NotebookResponse,
  type NotebookCreate,
  type NotebookUpdate,
} from './notebooks';
