import { useEffect, useRef, useState } from 'react';
import { FALLBACK_EVENT, getPlan } from '../api/client';
import type { PlanRequest, PlanResponse } from '../api/types';

export type UsePlan = {
  data: PlanResponse | null;
  isLoading: boolean;
  error: unknown;
  /** True after a static or live request failed and sample data was shown instead. */
  fellBack: boolean;
  dismissFallback: () => void;
};

export const DEBOUNCE_MS = 150;

/**
 * Fetches a plan for the request. Slider changes are debounced (150 ms). Keeps
 * the last good result on screen while a new one loads, and ignores stale replies.
 */
export function usePlan(request: PlanRequest | null): UsePlan {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [isLoading, setLoading] = useState(request !== null);
  const [error, setError] = useState<unknown>(null);
  const [fellBack, setFellBack] = useState(false);
  const seq = useRef(0);
  const first = useRef(true);
  const key = request === null ? null : JSON.stringify(request);

  useEffect(() => {
    const id = ++seq.current;
    if (key === null) {
      // Nothing to fetch (an optional second request that is not needed right now).
      setData(null);
      setError(null);
      setLoading(false);
      first.current = true;
      return;
    }
    setLoading(true);
    const delay = first.current ? 0 : DEBOUNCE_MS;
    first.current = false;
    const timer = window.setTimeout(() => {
      getPlan(JSON.parse(key) as PlanRequest).then(
        (res) => {
          if (id !== seq.current) return;
          setData(res);
          setError(null);
          setLoading(false);
        },
        (err: unknown) => {
          if (id !== seq.current) return;
          setError(err);
          setLoading(false);
        },
      );
    }, delay);
    return () => window.clearTimeout(timer);
  }, [key]);

  useEffect(() => {
    const on = () => setFellBack(true);
    window.addEventListener(FALLBACK_EVENT, on);
    return () => window.removeEventListener(FALLBACK_EVENT, on);
  }, []);

  return { data, isLoading, error, fellBack, dismissFallback: () => setFellBack(false) };
}
