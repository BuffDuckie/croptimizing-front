import { InfeasibleError, isInfeasible } from './errors';
import { nearest, STATIC_GRID, staticPath } from './grid';
import { infeasibleSchema, planRequestSchema, planResponseSchema } from './schemas';
import type { PlanRequest, PlanResponse } from './types';

export type DataMode = 'sample' | 'static' | 'live';

function mode(): DataMode {
  const m = import.meta.env.VITE_DATA_MODE;
  return m === 'static' || m === 'live' ? m : 'sample';
}

/** Fired on window when a static or live request fails and the client falls back to sample data. */
export const FALLBACK_EVENT = 'croptimizing:fallback';

async function runSample(req: PlanRequest): Promise<PlanResponse> {
  const { runPlan } = await import('../model/engine');
  return runPlan(req);
}

async function fetchJson(url: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(url, init);
  if (res.status === 422) {
    const body = infeasibleSchema.safeParse(await res.json());
    if (body.success) throw new InfeasibleError(body.data);
  }
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

async function fetchStatic(req: PlanRequest): Promise<unknown> {
  const cap = nearest(STATIC_GRID.water, req.waterCapAfPerAcre);
  const risk = nearest(STATIC_GRID.risk, req.riskLevel * 100);
  const soil = nearest(STATIC_GRID.soil, req.minSoilScore);
  const path = staticPath(req.region, cap, risk, soil);
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  if (req.lang === 'es') {
    try {
      return await fetchJson(base + path.replace(`/results/${req.region}/`, `/results/${req.region}/es/`));
    } catch {
      // No Spanish file for this point; the English one has the same numbers.
    }
  }
  return fetchJson(base + path);
}

async function fetchLive(req: PlanRequest): Promise<unknown> {
  const root = (import.meta.env.VITE_API_BASE_URL ?? '').replace(/\/$/, '');
  return fetchJson(`${root}/api/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });
}

/**
 * The one door to plan data. Validates every response with zod. If a static or
 * live request fails, it falls back to the in-browser sample model and fires
 * FALLBACK_EVENT so the UI can show a friendly banner.
 */
export async function getPlan(req: PlanRequest): Promise<PlanResponse> {
  const valid = planRequestSchema.parse(req) as PlanRequest;
  const m = mode();
  if (m === 'sample') return runSample(valid);
  try {
    const raw = m === 'static' ? await fetchStatic(valid) : await fetchLive(valid);
    return planResponseSchema.parse(raw) as PlanResponse;
  } catch (e) {
    if (isInfeasible(e)) throw e;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(FALLBACK_EVENT, { detail: { mode: m, message: String(e) } }));
    }
    return runSample(valid);
  }
}
