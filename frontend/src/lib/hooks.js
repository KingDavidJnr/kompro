import { useCallback, useEffect, useState } from 'react';
import api from './api';

/**
 * Minimal data-fetching hook for GET endpoints.
 *
 * Returns the unwrapped `data` payload (the backend uses { message, data }),
 * a loading flag, any error message, a refetch function, and a setData function
 * for optimistic local updates without re-fetching.
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

  const setData = useCallback((updater) => {
    setState((s) => ({
      ...s,
      data: typeof updater === 'function' ? updater(s.data) : updater,
    }));
  }, []);

  useEffect(() => {
    if (immediate) load().catch(() => {});
  }, [load, immediate]);

  return { ...state, refetch: load, setData };
}
