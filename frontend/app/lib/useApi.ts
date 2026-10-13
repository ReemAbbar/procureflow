'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch, onDataChanged } from './api';

type Result<T> = { data: T } | { error: string };

async function load<T>(path: string): Promise<Result<T>> {
  try {
    return { data: await apiFetch<T>(path) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Something went wrong' };
  }
}

/**
 * Loads a GET endpoint on mount, and again whenever `emitDataChanged()` fires
 * (pass `refreshOnChange: false` to opt out).
 */
export function useApi<T>(path: string | null, { refreshOnChange = true } = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(path !== null);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((result: Result<T>) => {
    if ('data' in result) {
      setData(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    if (path) apply(await load<T>(path));
  }, [path, apply]);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    const run = () =>
      load<T>(path).then((result) => {
        if (!cancelled) apply(result);
      });
    run();
    const unsubscribe = refreshOnChange ? onDataChanged(run) : undefined;
    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [path, apply, refreshOnChange]);

  return { data, loading, error, reload };
}
