// Base api client for all api calls
// Note: Authentication headers (e.g. JWT) must be handled by the client implementation
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
