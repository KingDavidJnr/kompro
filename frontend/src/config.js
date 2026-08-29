/**
 * Frontend runtime configuration sourced from Vite environment variables.
 *
 * - API_URL: base path for backend requests (defaults to /api so the Vite dev
 *   proxy and same-origin production builds both work).
 * - AUTH_TYPE: controls which login methods render ("password" | "sso" | "both").
 * - SSO_PROVIDERS: which SSO buttons to show when SSO is enabled.
 */
export const API_URL = import.meta.env.VITE_API_URL || '/api';

export const AUTH_TYPE = (import.meta.env.VITE_AUTH_TYPE || 'password').toLowerCase();

export const SSO_PROVIDERS = (import.meta.env.VITE_SSO_PROVIDERS || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const SHOW_PASSWORD_LOGIN = AUTH_TYPE === 'password' || AUTH_TYPE === 'both';
export const SHOW_SSO_LOGIN = AUTH_TYPE === 'sso' || AUTH_TYPE === 'both';
