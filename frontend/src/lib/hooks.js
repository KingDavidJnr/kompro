import { useCallback, useEffect, useState } from 'react';
import api from './api';

/**
 * Minimal data-fetching hook for GET endpoints.
 *
 * Returns the unwrapped `data` payload (the backend uses { message, data }),
 * a loading flag, any error message, and a refetch function. It is intentionally
 * tiny; pages that need create/update/delete call `api` directly and then
 * refetch.
 */
export function useGet(path, { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, loading: !!immediate, error: null });

  const load = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    return api
      .get(path)
      .then((res) => {
        const payload = res.data.data;
        setState({ data: payload, loading: false, error: null });
        return payload;
      })
      .catch((err) => {
        const message = err.response?.data?.message || err.message;
        setState({ data: null, loading: false, error: message });
        throw err;
      });
  }, [path]);

  useEffect(() => {
    if (immediate) load().catch(() => {});
  }, [load, immediate]);

  return { ...state, refetch: load };
}
