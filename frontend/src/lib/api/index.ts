// Base api client for all api calls
// JWT header is injected automatically
export { apiClient } from './client';

// Notebook crud operations 
// TODO: Possibly need update functionality
export {
  getNotebooks,
  createNotebook,
  getNotebook,
  deleteNotebook,
  type NotebookResponse,
  type NotebookCreate,
} from './notebooks';
