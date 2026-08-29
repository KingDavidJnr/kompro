import axios from 'axios';
import { API_URL } from '../config';

/**
 * Shared API client.
 *
 * - Uses relative base URL so cookies are sent same-origin (the Vite proxy
 *   forwards /api to the backend in development).
 * - withCredentials ensures the httpOnly session cookie travels with every
 *   request.
 * - On a 401 we broadcast an event so the auth context can drop the session
 *   and bounce the user back to login, keeping the app session-aware.
 */
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
