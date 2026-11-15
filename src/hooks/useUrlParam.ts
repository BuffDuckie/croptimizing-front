import { useCallback, useState } from 'react';

/**
 * A page-level choice kept in the URL (?name=value) so links reopen the same
 * view. The default value is left out of the URL.
 */
export function useUrlParam<T extends string>(name: string, allowed: readonly T[], fallback: T): [T, (v: T) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return fallback;
    const v = new URLSearchParams(window.location.search).get(name);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  });
  const set = useCallback(
    (v: T) => {
      setValue(v);
      const q = new URLSearchParams(window.location.search);
      if (v === fallback) q.delete(name);
      else q.set(name, v);
      const qs = q.toString();
      window.history.replaceState(window.history.state, '', `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`);
    },
    [name, fallback],
  );
  return [value, set];
}
